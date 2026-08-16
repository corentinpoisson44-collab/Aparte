"use client";

import { useState } from "react";
import { MovieCard } from "@/components/MovieCard";
import type { MovieDTO, MovieScoreDTO } from "@/lib/types";

export function ResultReveal({
  movies,
  winnerMovieId,
  scores,
}: {
  movies: MovieDTO[];
  winnerMovieId: string;
  scores: MovieScoreDTO[];
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [markedWatched, setMarkedWatched] = useState(false);
  const byId = new Map(movies.map((m) => [m.id, m]));
  const winner = byId.get(winnerMovieId);

  const sortedScores = [...scores].sort((a, b) => b.points - a.points);

  async function markWatched() {
    await fetch(`/api/movies/${winnerMovieId}/watched`, { method: "POST" });
    setMarkedWatched(true);
  }

  if (!winner) return null;

  return (
    <div>
      <p className="mb-2 text-center text-sm uppercase tracking-wide text-stone-500">
        Vous allez regarder
      </p>
      <MovieCard movie={winner} />

      <button
        onClick={markWatched}
        disabled={markedWatched}
        className="mt-4 w-full rounded-lg bg-stone-900 px-4 py-3 font-medium text-white disabled:opacity-50"
      >
        {markedWatched ? "Marqué comme vu ✓" : "Marquer comme vu"}
      </button>

      <button
        onClick={() => setShowDetails((v) => !v)}
        className="mt-4 w-full text-center text-sm text-stone-500 hover:text-stone-900"
      >
        {showDetails ? "Masquer le détail" : "Voir le détail du calcul"}
      </button>

      {showDetails && (
        <ul className="mt-3 flex flex-col gap-2">
          {sortedScores.map((s) => {
            const movie = byId.get(s.movieId);
            if (!movie) return null;
            return (
              <li
                key={s.movieId}
                className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
              >
                <span className={s.disqualified ? "text-stone-400 line-through" : ""}>
                  {movie.title}
                </span>
                <span className="text-stone-500">
                  {s.points} pts{s.disqualified ? " · disqualifié (dernier)" : ""}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
