import { prisma } from "@/lib/prisma";
import { MovieSource, WatchStatus } from "@/generated/prisma/client";

/** Nombre de films proposés par défaut, et part qui vient de la bibliothèque Plex (le reste en découverte). */
const DEFAULT_COUNT = 5;
const PLEX_SHARE = 0.6;
/** Un film rejeté en dernier au moins ce nombre de fois n'est plus reproposé. */
const MAX_REJECTIONS_BEFORE_EXCLUSION = 2;
/** Seuil en minutes séparant un film "plutôt court" d'un film "plutôt long". */
const SHORT_MAX_RUNTIME = 100;
/**
 * Seuil (note du public Plex, /10) séparant un film "connu" d'une "pépite"
 * plus confidentielle. Un film sans note (non reconnu par le catalogue
 * Plex) est traité comme une pépite : l'absence de note est elle-même un
 * signe de notoriété faible.
 */
const KNOWN_RATING_THRESHOLD = 7;

/**
 * Préférences facultatives demandées après la création d'une session pour
 * orienter le tirage (durée, ambiance, notoriété). Toutes facultatives :
 * un tirage sans préférence se comporte comme avant.
 */
export type DrawFilters = {
  duration?: "short" | "long" | "any";
  genre?: string | null;
  popularity?: "known" | "hidden" | "any";
  yearMin?: number | null;
  yearMax?: number | null;
  /** Nombre de films à proposer (par défaut DEFAULT_COUNT). */
  count?: number;
};

function pickRandom<T>(items: T[], count: number): T[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function matchesFilters(
  movie: {
    runtimeMin: number;
    genre: string;
    audienceRating: number | null;
    year: number;
  },
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
  const isKnown =
    movie.audienceRating != null && movie.audienceRating >= KNOWN_RATING_THRESHOLD;
  if (filters.popularity === "known" && !isKnown) {
    return false;
  }
  if (filters.popularity === "hidden" && isKnown) {
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
 * Pioche `filters.count` films (5 par défaut) pour une nouvelle session,
 * ~60% Plex (non vus) et le reste découverte, en excluant les films déjà
 * vus et ceux rejetés en dernier trop souvent. `filters` oriente le tirage
 * vers les préférences du soir, mais reste une priorité souple : si trop
 * peu de films correspondent, on complète avec le reste des films
 * éligibles pour toujours proposer le nombre de films demandé — ceux qui
 * ne correspondent pas vraiment aux préférences sont marqués
 * `matchesFilters: false` pour que l'interface puisse le signaler.
 */
export async function drawMoviesForHousehold(
  householdId: string,
  filters: DrawFilters = {}
) {
  const target = Math.max(1, Math.round(filters.count ?? DEFAULT_COUNT));
  const plexCount = Math.max(1, Math.round(target * PLEX_SHARE));
  const discoveryCount = Math.max(0, target - plexCount);

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

  // Plateformes autres que Plex désactivées : on ne pioche que dans la
  // bibliothèque Plex synchronisée.
  const allMovies = await prisma.movie.findMany({
    where: { householdId, platform: "Plex" },
  });
  const filteredMovies = allMovies.filter((m) => matchesFilters(m, filters));

  const plexPool = filteredMovies.filter(
    (m) => m.source === MovieSource.PLEX && isEligible(m.id)
  );
  const discoveryPool = filteredMovies.filter(
    (m) => m.source === MovieSource.DISCOVERY && isEligible(m.id)
  );

  const plexPicks = pickRandom(plexPool, plexCount);
  const discoveryPicks = pickRandom(discoveryPool, discoveryCount);

  let picks = [...plexPicks, ...discoveryPicks];

  // Filet de sécurité : si un pool n'a pas assez de films correspondant aux
  // préférences, on complète avec le reste des films éligibles qui
  // respectent encore les préférences, puis, si ça ne suffit toujours pas,
  // avec n'importe quel film éligible — les préférences ne doivent jamais
  // empêcher de proposer le nombre de films demandé.
  if (picks.length < target) {
    const pickedIds = new Set(picks.map((m) => m.id));
    const remaining = filteredMovies.filter(
      (m) => isEligible(m.id) && !pickedIds.has(m.id)
    );
    picks = [...picks, ...pickRandom(remaining, target - picks.length)];
  }
  if (picks.length < target) {
    const pickedIds = new Set(picks.map((m) => m.id));
    const remaining = allMovies.filter(
      (m) => isEligible(m.id) && !pickedIds.has(m.id)
    );
    picks = [...picks, ...pickRandom(remaining, target - picks.length)];
  }

  // Certains films de ce dernier filet ne respectent pas vraiment les
  // préférences (ou n'ont même pas pu être filtrés dessus) : on l'indique
  // par film plutôt que de le passer sous silence.
  return picks.map((m) => ({ ...m, matchesFilters: matchesFilters(m, filters) }));
}
