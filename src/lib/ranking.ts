export type MemberRanking = {
  memberId: string;
  /** movieId ordered from most wanted (index 0) to least wanted (last index) */
  order: string[];
};

export type MovieScore = {
  movieId: string;
  points: number;
  disqualified: boolean;
  bestRankPosition: number; // 0 = premier choix de quelqu'un, plus petit = mieux
};

export type RankingResult = {
  winnerMovieId: string;
  scores: MovieScore[];
  /** true si le garde-fou a dû être ignoré car il disqualifiait tous les films */
  guardRailOverridden: boolean;
};

/**
 * Borda count + garde-fou : un film classé dernier par au moins une personne
 * est disqualifié même s'il a le meilleur score total. En cas d'égalité,
 * le film avec le meilleur classement individuel le plus haut l'emporte.
 * Si le garde-fou disqualifie tous les films (chacun a rejeté un film
 * différent en dernier), il est ignoré pour éviter une session sans gagnant.
 */
export function computeRankingResult(
  movieIds: string[],
  rankings: MemberRanking[]
): RankingResult {
  if (movieIds.length === 0) {
    throw new Error("computeRankingResult: movieIds is empty");
  }
  const n = movieIds.length;
  const lastPosition = n - 1;

  const points = new Map<string, number>(movieIds.map((id) => [id, 0]));
  const disqualified = new Map<string, boolean>(
    movieIds.map((id) => [id, false])
  );
  const bestRankPosition = new Map<string, number>(
    movieIds.map((id) => [id, lastPosition])
  );

  for (const ranking of rankings) {
    ranking.order.forEach((movieId, position) => {
      if (!points.has(movieId)) return; // ignore movies not part of this session
      points.set(movieId, (points.get(movieId) ?? 0) + (n - position));
      if (position === lastPosition) {
        disqualified.set(movieId, true);
      }
      if (position < (bestRankPosition.get(movieId) ?? lastPosition)) {
        bestRankPosition.set(movieId, position);
      }
    });
  }

  const pickWinner = (candidates: string[]) => {
    let best = candidates[0];
    for (const movieId of candidates.slice(1)) {
      const p = points.get(movieId) ?? 0;
      const bestP = points.get(best) ?? 0;
      if (p > bestP) {
        best = movieId;
      } else if (p === bestP) {
        const rank = bestRankPosition.get(movieId) ?? lastPosition;
        const bestRank = bestRankPosition.get(best) ?? lastPosition;
        if (rank < bestRank) {
          best = movieId;
        } else if (rank === bestRank && movieId < best) {
          // égalité totale : ordre déterministe pour un résultat stable
          best = movieId;
        }
      }
    }
    return best;
  };

  const eligible = movieIds.filter((id) => !disqualified.get(id));
  const guardRailOverridden = eligible.length === 0;
  const winnerMovieId = pickWinner(guardRailOverridden ? movieIds : eligible);

  const scores: MovieScore[] = movieIds.map((movieId) => ({
    movieId,
    points: points.get(movieId) ?? 0,
    disqualified: disqualified.get(movieId) ?? false,
    bestRankPosition: bestRankPosition.get(movieId) ?? lastPosition,
  }));

  return { winnerMovieId, scores, guardRailOverridden };
}
