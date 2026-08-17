import { prisma } from "@/lib/prisma";
import { MovieSource, WatchStatus } from "@/generated/prisma/client";

const PLEX_COUNT = 3;
const DISCOVERY_COUNT = 2;
/** Un film rejeté en dernier au moins ce nombre de fois n'est plus reproposé. */
const MAX_REJECTIONS_BEFORE_EXCLUSION = 2;
/** Seuil en minutes séparant un film "plutôt court" d'un film "plutôt long". */
const SHORT_MAX_RUNTIME = 100;

/**
 * Préférences facultatives demandées après la création d'une session pour
 * orienter le tirage (durée, ambiance, valeur sûre vs découverte). Toutes
 * facultatives : un tirage sans préférence se comporte comme avant.
 */
export type DrawFilters = {
  duration?: "short" | "long" | "any";
  genre?: string | null;
  origin?: "library" | "discovery" | "any";
  yearMin?: number | null;
  yearMax?: number | null;
};

function pickRandom<T>(items: T[], count: number): T[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function matchesFilters(
  movie: { runtimeMin: number; genre: string; source: MovieSource; year: number },
  filters: DrawFilters
): boolean {
  if (filters.duration === "short" && movie.runtimeMin > SHORT_MAX_RUNTIME) {
    return false;
  }
  if (filters.duration === "long" && movie.runtimeMin <= SHORT_MAX_RUNTIME) {
    return false;
  }
  if (
    filters.genre &&
    !movie.genre.toLowerCase().includes(filters.genre.toLowerCase())
  ) {
    return false;
  }
  if (filters.origin === "library" && movie.source !== MovieSource.PLEX) {
    return false;
  }
  if (filters.origin === "discovery" && movie.source !== MovieSource.DISCOVERY) {
    return false;
  }
  if (filters.yearMin != null && movie.year < filters.yearMin) {
    return false;
  }
  if (filters.yearMax != null && movie.year > filters.yearMax) {
    return false;
  }
  return true;
}

/**
 * Pioche 5 films pour une nouvelle session : 3 Plex (non vus) + 2 découverte,
 * en excluant les films déjà vus et ceux rejetés en dernier trop souvent.
 * `filters` oriente le tirage vers les préférences du soir, mais reste une
 * priorité souple : si trop peu de films correspondent, on complète avec le
 * reste des films éligibles pour toujours proposer 5 films.
 */
export async function drawMoviesForHousehold(
  householdId: string,
  filters: DrawFilters = {}
) {
  const household = await prisma.household.findUniqueOrThrow({
    where: { id: householdId },
    select: { enabledSources: true },
  });

  const watchHistory = await prisma.watchHistory.findMany({
    where: { householdId },
    select: { movieId: true, status: true },
  });

  const watchedIds = new Set(
    watchHistory
      .filter((h) => h.status === WatchStatus.WATCHED)
      .map((h) => h.movieId)
  );

  const rejectionCounts = new Map<string, number>();
  for (const h of watchHistory) {
    if (h.status === WatchStatus.REJECTED_LAST) {
      rejectionCounts.set(h.movieId, (rejectionCounts.get(h.movieId) ?? 0) + 1);
    }
  }
  const overRejectedIds = new Set(
    [...rejectionCounts.entries()]
      .filter(([, count]) => count >= MAX_REJECTIONS_BEFORE_EXCLUSION)
      .map(([movieId]) => movieId)
  );

  const isEligible = (movieId: string) =>
    !watchedIds.has(movieId) && !overRejectedIds.has(movieId);

  const enabledSources = new Set(household.enabledSources);
  const allMovies = (
    await prisma.movie.findMany({ where: { householdId } })
  ).filter((m) => enabledSources.has(m.platform));
  const filteredMovies = allMovies.filter((m) => matchesFilters(m, filters));

  const plexPool = filteredMovies.filter(
    (m) => m.source === MovieSource.PLEX && isEligible(m.id)
  );
  const discoveryPool = filteredMovies.filter(
    (m) => m.source === MovieSource.DISCOVERY && isEligible(m.id)
  );

  const plexPicks = pickRandom(plexPool, PLEX_COUNT);
  const discoveryPicks = pickRandom(discoveryPool, DISCOVERY_COUNT);

  let picks = [...plexPicks, ...discoveryPicks];

  // Filet de sécurité : si un pool n'a pas assez de films correspondant aux
  // préférences, on complète avec le reste des films éligibles qui
  // respectent encore les préférences, puis, si ça ne suffit toujours pas,
  // avec n'importe quel film éligible — les préférences ne doivent jamais
  // empêcher de proposer 5 films.
  const TARGET = PLEX_COUNT + DISCOVERY_COUNT;
  if (picks.length < TARGET) {
    const pickedIds = new Set(picks.map((m) => m.id));
    const remaining = filteredMovies.filter(
      (m) => isEligible(m.id) && !pickedIds.has(m.id)
    );
    picks = [...picks, ...pickRandom(remaining, TARGET - picks.length)];
  }
  if (picks.length < TARGET) {
    const pickedIds = new Set(picks.map((m) => m.id));
    const remaining = allMovies.filter(
      (m) => isEligible(m.id) && !pickedIds.has(m.id)
    );
    picks = [...picks, ...pickRandom(remaining, TARGET - picks.length)];
  }

  return picks;
}
