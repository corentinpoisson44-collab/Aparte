import { prisma } from "@/lib/prisma";
import { MovieSource, WatchStatus } from "@/generated/prisma/client";
import { hasAnyGenre, movieGenres, type DrawCriteria } from "@/lib/orientation";

/** Part des films qui vient de la bibliothèque Plex (le reste en découverte). */
const PLEX_SHARE = 0.6;
/** Un film rejeté en dernier au moins ce nombre de fois n'est plus reproposé. */
const MAX_REJECTIONS_BEFORE_EXCLUSION = 2;

type DrawableMovie = { runtimeMin: number; genre: string; year: number };

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

/** Le veto est le seul critère qu'on ne relâche jamais, sauf en tout dernier recours. */
function isVetoed(movie: DrawableMovie, criteria: DrawCriteria): boolean {
  return hasAnyGenre(movieGenres(movie.genre), criteria.excludedGenres);
}

/** Indices des moods (un par membre) auxquels le film correspond. */
function matchedMoods(movie: DrawableMovie, criteria: DrawCriteria): number[] {
  const genres = movieGenres(movie.genre);
  return criteria.moodGenreSets
    .map((set, i) => (hasAnyGenre(genres, set) ? i : -1))
    .filter((i) => i >= 0);
}

function matchesCriteria(movie: DrawableMovie, criteria: DrawCriteria): boolean {
  if (isVetoed(movie, criteria)) return false;
  if (criteria.moodGenreSets.length > 0 && matchedMoods(movie, criteria).length === 0) {
    return false;
  }
  // Durée inconnue (0) : on ne l'écarte pas pour autant.
  if (criteria.maxRuntime != null && movie.runtimeMin > criteria.maxRuntime) {
    return false;
  }
  if (
    criteria.eraRanges.length > 0 &&
    !criteria.eraRanges.some(
      (r) => (r.min == null || movie.year >= r.min) && (r.max == null || movie.year <= r.max)
    )
  ) {
    return false;
  }
  return true;
}

/**
 * Pioche `count` films en équilibrant les moods de chacun : d'abord les
 * films qui collent aux deux moods, puis un coup pour l'un, un coup pour
 * l'autre — pour que deux envies différentes donnent une liste mélangée
 * plutôt qu'une liste qui penche d'un seul côté par hasard.
 */
function pickBalanced<T extends DrawableMovie>(
  pool: T[],
  count: number,
  criteria: DrawCriteria
): T[] {
  const sets = criteria.moodGenreSets.length;
  if (sets <= 1) return shuffle(pool).slice(0, count);

  const both: T[] = [];
  const perMood: T[][] = Array.from({ length: sets }, () => []);
  // Films hors moods (paliers du filet de sécurité) : en dernier.
  const rest: T[] = [];
  for (const movie of shuffle(pool)) {
    const matched = matchedMoods(movie, criteria);
    if (matched.length === sets) both.push(movie);
    else if (matched.length > 0) perMood[matched[0]].push(movie);
    else rest.push(movie);
  }

  const picks = both.slice(0, count);
  let turn = 0;
  while (picks.length < count && perMood.some((b) => b.length > 0)) {
    const bucket = perMood[turn % sets];
    const next = bucket.shift();
    if (next) picks.push(next);
    turn++;
  }
  return [...picks, ...rest.slice(0, count - picks.length)];
}

/**
 * Pioche `criteria.count` films pour une nouvelle session, ~60% Plex (non
 * vus) et le reste découverte, en excluant les films déjà vus et ceux
 * rejetés en dernier trop souvent. `criteria` (le mélange des réponses aux
 * questions d'orientation, voir src/lib/orientation.ts) oriente le tirage
 * mais reste une priorité souple : si trop peu de films correspondent, on
 * complète avec d'autres films éligibles — sans jamais enfreindre un veto,
 * sauf en tout dernier recours — pour toujours proposer le nombre de films
 * prévu. Ceux qui ne correspondent pas vraiment sont marqués
 * `matchesFilters: false` pour que l'interface puisse le signaler.
 */
export async function drawMoviesForHousehold(
  householdId: string,
  criteria: DrawCriteria
) {
  const target = Math.max(1, Math.round(criteria.count));
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
  // bibliothèque Plex synchronisée, sans les films déjà marqués comme vus
  // sur le serveur Plex (exclusion stricte, même en filet de sécurité).
  const allMovies = await prisma.movie.findMany({
    where: { householdId, platform: "Plex", plexWatched: false },
  });
  const filteredMovies = allMovies.filter((m) => matchesCriteria(m, criteria));

  const plexPool = filteredMovies.filter(
    (m) => m.source === MovieSource.PLEX && isEligible(m.id)
  );
  const discoveryPool = filteredMovies.filter(
    (m) => m.source === MovieSource.DISCOVERY && isEligible(m.id)
  );

  const plexPicks = pickBalanced(plexPool, plexCount, criteria);
  const discoveryPicks = pickBalanced(discoveryPool, discoveryCount, criteria);

  let picks = [...plexPicks, ...discoveryPicks];

  // Filet de sécurité, par paliers : d'abord les autres films éligibles qui
  // respectent les préférences (l'autre pool), puis ceux qui respectent au
  // moins les vetos, et seulement en dernier recours n'importe quel film
  // éligible — les préférences ne doivent jamais empêcher de proposer le
  // nombre de films prévu.
  const fallbacks = [
    (m: (typeof allMovies)[number]) => filteredMovies.includes(m),
    (m: (typeof allMovies)[number]) => !isVetoed(m, criteria),
    () => true,
  ];
  for (const accept of fallbacks) {
    if (picks.length >= target) break;
    const pickedIds = new Set(picks.map((m) => m.id));
    const remaining = allMovies.filter(
      (m) => accept(m) && isEligible(m.id) && !pickedIds.has(m.id)
    );
    picks = [...picks, ...pickBalanced(remaining, target - picks.length, criteria)];
  }

  // Certains films de ce dernier filet ne respectent pas vraiment les
  // préférences (ou n'ont même pas pu être filtrés dessus) : on l'indique
  // par film plutôt que de le passer sous silence.
  return picks.map((m) => ({ ...m, matchesFilters: matchesCriteria(m, criteria) }));
}
