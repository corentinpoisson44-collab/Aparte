import { prisma } from "@/lib/prisma";
import { MovieSource, WatchStatus } from "@/generated/prisma/client";

const PLEX_COUNT = 3;
const DISCOVERY_COUNT = 2;
/** Un film rejeté en dernier au moins ce nombre de fois n'est plus reproposé. */
const MAX_REJECTIONS_BEFORE_EXCLUSION = 2;

function pickRandom<T>(items: T[], count: number): T[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Pioche 5 films pour une nouvelle session : 3 Plex (non vus) + 2 découverte,
 * en excluant les films déjà vus et ceux rejetés en dernier trop souvent.
 */
export async function drawMoviesForHousehold(householdId: string) {
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
  const plexPool = allMovies.filter(
    (m) => m.source === MovieSource.PLEX && isEligible(m.id)
  );
  const discoveryPool = allMovies.filter(
    (m) => m.source === MovieSource.DISCOVERY && isEligible(m.id)
  );

  const plexPicks = pickRandom(plexPool, PLEX_COUNT);
  const discoveryPicks = pickRandom(discoveryPool, DISCOVERY_COUNT);

  let picks = [...plexPicks, ...discoveryPicks];

  // Filet de sécurité : si un pool n'a pas assez de films, on complète avec
  // le reste des films éligibles pour toujours proposer 5 films.
  const TARGET = PLEX_COUNT + DISCOVERY_COUNT;
  if (picks.length < TARGET) {
    const pickedIds = new Set(picks.map((m) => m.id));
    const remaining = allMovies.filter(
      (m) => isEligible(m.id) && !pickedIds.has(m.id)
    );
    picks = [...picks, ...pickRandom(remaining, TARGET - picks.length)];
  }

  return picks;
}
