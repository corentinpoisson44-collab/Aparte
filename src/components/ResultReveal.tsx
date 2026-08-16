"use client";

import { useEffect, useState } from "react";
import type { MovieDTO, MovieScoreDTO } from "@/lib/types";
import { formatRuntime } from "@/lib/format";

const COUNTDOWN_START = 3;
const TICK_MS = 550;

export function ResultReveal({
  movies,
  winnerMovieId,
  scores,
}: {
  movies: MovieDTO[];
  winnerMovieId: string;
  scores: MovieScoreDTO[];
}) {
  const [count, setCount] = useState(COUNTDOWN_START);
  const [revealed, setRevealed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [markedWatched, setMarkedWatched] = useState(false);
  const byId = new Map(movies.map((m) => [m.id, m]));
  const winner = byId.get(winnerMovieId);

  const sortedScores = [...scores].sort((a, b) => b.points - a.points);

  useEffect(() => {
    if (revealed) return;
    if (count === 0) {
      const t = setTimeout(() => setRevealed(true), TICK_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCount((c) => c - 1), TICK_MS);
    return () => clearTimeout(t);
  }, [count, revealed]);

  async function markWatched() {
    await fetch(`/api/movies/${winnerMovieId}/watched`, { method: "POST" });
    setMarkedWatched(true);
  }

  if (!winner) return null;

  return (
    <div>
      <div className="-mx-4 flex min-h-[70vh] flex-col items-center justify-center bg-ink px-6 py-16 text-paper sm:mx-0">
        {!revealed ? (
          <>
            <p className="mb-6 text-xs uppercase tracking-[0.3em] text-paper/50">
              Aparté révèle…
            </p>
            <span
              key={count}
              className="font-display text-[7rem] leading-none text-accent"
            >
              {count > 0 ? count : "—"}
            </span>
          </>
        ) : (
          <div className="flex w-full max-w-xs flex-col items-center text-center">
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-paper/50">
              Vous allez regarder
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={winner.posterUrl}
              alt={winner.title}
              className="mb-5 h-72 w-48 object-cover shadow-[0_0_0_1px_rgba(247,244,238,0.1)]"
            />
            <h2 className="font-display text-2xl">{winner.title}</h2>
            <p className="mt-1 text-sm text-paper/50">
              {winner.year} · {formatRuntime(winner.runtimeMin)}
            </p>
          </div>
        )}
      </div>

      {revealed && (
        <div className="px-1 py-5">
          <button
            onClick={markWatched}
            disabled={markedWatched}
            className="w-full rounded-sm bg-ink px-4 py-3 font-medium text-paper transition-colors hover:bg-accent disabled:opacity-50"
          >
            {markedWatched ? "Marqué comme vu ✓" : "Marquer comme vu"}
          </button>

          <button
            onClick={() => setShowDetails((v) => !v)}
            className="mt-4 w-full text-center text-sm text-ink/50 hover:text-ink"
          >
            {showDetails ? "Masquer le détail" : "Voir le détail du calcul"}
          </button>

          {showDetails && (
            <ul className="mt-3 flex flex-col border-t border-ink/10">
              {sortedScores.map((s) => {
                const movie = byId.get(s.movieId);
                if (!movie) return null;
                return (
                  <li
                    key={s.movieId}
                    className="flex items-center justify-between border-b border-ink/10 py-2 text-sm"
                  >
                    <span className={s.disqualified ? "text-ink/35 line-through" : ""}>
                      {movie.title}
                    </span>
                    <span className="text-ink/50">
                      {s.points} pts{s.disqualified ? " · disqualifié (dernier)" : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
