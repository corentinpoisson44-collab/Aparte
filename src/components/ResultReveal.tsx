"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MovieDTO, MovieScoreDTO } from "@/lib/types";
import { formatRuntime } from "@/lib/format";
import { MoviePoster } from "@/components/MoviePoster";

const ITEM_WIDTH = 112;
const ITEM_HEIGHT = 168;
const ITEM_GAP = 12;
const STEP = ITEM_WIDTH + ITEM_GAP;
const LOOPS = 4;
const TAIL_LOOPS = 2;
const FAST_MS = 1400;
const SLOW_MS = 2600;
const SLOW_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";

export function ResultReveal({
  movies,
  winnerMovieId,
  scores,
}: {
  movies: MovieDTO[];
  winnerMovieId: string;
  scores: MovieScoreDTO[];
}) {
  const [phase, setPhase] = useState<"spinning" | "revealed">("spinning");
  const [offset, setOffset] = useState(0);
  const [transition, setTransition] = useState<{ ms: number; easing: string }>({
    ms: 0,
    easing: "linear",
  });
  const carouselRef = useRef<HTMLDivElement>(null);
  const revealed = phase === "revealed";
  const [showDetails, setShowDetails] = useState(false);
  const [markedWatched, setMarkedWatched] = useState(false);
  const byId = new Map(movies.map((m) => [m.id, m]));
  const winner = byId.get(winnerMovieId);

  const sortedScores = [...scores].sort((a, b) => b.points - a.points);

  const { stripMovies, targetIndex } = useMemo(() => {
    if (movies.length < 2) return { stripMovies: [] as MovieDTO[], targetIndex: -1 };
    const winnerIndex = movies.findIndex((m) => m.id === winnerMovieId);
    if (winnerIndex === -1) return { stripMovies: [] as MovieDTO[], targetIndex: -1 };
    const arr: MovieDTO[] = [];
    for (let i = 0; i < LOOPS; i++) arr.push(...movies);
    arr.push(...movies.slice(0, winnerIndex + 1));
    const targetIndex = arr.length - 1;
    // Continue the strip past the winner so it doesn't look like the reel
    // simply ran out — using only the other candidates so the winner
    // itself never reappears right next to its landing spot.
    const others = movies.filter((m) => m.id !== winnerMovieId);
    const tailCount = movies.length * TAIL_LOOPS;
    for (let i = 0; i < tailCount; i++) arr.push(others[i % others.length]);
    return { stripMovies: arr, targetIndex };
  }, [movies, winnerMovieId]);

  const midIndex = Math.max(0, targetIndex - movies.length);

  useEffect(() => {
    if (stripMovies.length === 0) {
      const t = setTimeout(() => setPhase("revealed"), 500);
      return () => clearTimeout(t);
    }

    const container = carouselRef.current;
    if (!container) return;
    const width = container.clientWidth;
    const centerOf = (index: number) => width / 2 - (index * STEP + ITEM_WIDTH / 2);

    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setTransition({ ms: FAST_MS, easing: "linear" });
        setOffset(centerOf(midIndex));
      });
    });

    const slowTimer = setTimeout(() => {
      setTransition({ ms: SLOW_MS, easing: SLOW_EASING });
      setOffset(centerOf(targetIndex));
    }, FAST_MS + 30);

    const revealTimer = setTimeout(() => {
      setPhase("revealed");
    }, FAST_MS + SLOW_MS + 150);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(slowTimer);
      clearTimeout(revealTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripMovies.length]);

  async function markWatched() {
    await fetch(`/api/movies/${winnerMovieId}/watched`, { method: "POST" });
    setMarkedWatched(true);
  }

  if (!winner) return null;

  return (
    <div>
      <div className="-mx-4 flex min-h-[70vh] flex-col items-center justify-center overflow-hidden bg-ink px-6 py-16 text-paper sm:mx-0">
        {!revealed ? (
          <div className="flex w-full flex-col items-center">
            <p className="mb-6 animate-fade-in text-xs uppercase tracking-[0.3em] text-paper/50">
              Aparté choisit pour vous…
            </p>
            {stripMovies.length > 0 && (
              <div
                ref={carouselRef}
                className="relative mx-auto w-full max-w-sm overflow-hidden"
                style={{
                  height: ITEM_HEIGHT,
                  maskImage:
                    "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
                  WebkitMaskImage:
                    "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
                }}
              >
                <div
                  className="flex items-center"
                  style={{
                    gap: ITEM_GAP,
                    transform: `translateX(${offset}px)`,
                    transitionProperty: "transform",
                    transitionDuration: `${transition.ms}ms`,
                    transitionTimingFunction: transition.easing,
                    willChange: "transform",
                  }}
                >
                  {stripMovies.map((m, i) => (
                    <MoviePoster
                      key={`${m.id}-${i}`}
                      src={m.posterUrl}
                      title={m.title}
                      alt=""
                      theme="dark"
                      fallbackContent="title"
                      fallbackTextClassName="text-xs"
                      style={{ width: ITEM_WIDTH, height: ITEM_HEIGHT }}
                      className="flex-none object-cover shadow-[0_0_0_1px_rgba(247,244,238,0.1)]"
                    />
                  ))}
                </div>
                <div
                  className="pointer-events-none absolute inset-y-0 border-x-2 border-accent"
                  style={{ left: "50%", width: ITEM_WIDTH, transform: "translateX(-50%)" }}
                  aria-hidden
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex w-full max-w-xs flex-col items-center text-center">
            <p
              className="mb-4 animate-fade-in-up text-xs uppercase tracking-[0.3em] text-paper/50"
            >
              Ce soir, vous regardez
            </p>
            {winner.plexUrl ? (
              <a
                href={winner.plexUrl}
                className="mb-1 animate-scale-in"
                aria-label={`Ouvrir « ${winner.title} » dans Plex`}
              >
                <MoviePoster
                  src={winner.posterUrl}
                  title={winner.title}
                  alt=""
                  theme="dark"
                  className="h-72 w-48 object-cover shadow-[0_0_0_1px_rgba(247,244,238,0.1)] transition-opacity active:opacity-80"
                  fallbackTextClassName="text-5xl"
                />
              </a>
            ) : (
              <MoviePoster
                src={winner.posterUrl}
                title={winner.title}
                theme="dark"
                className="mb-5 h-72 w-48 animate-scale-in object-cover shadow-[0_0_0_1px_rgba(247,244,238,0.1)]"
                fallbackTextClassName="text-5xl"
              />
            )}
            {winner.plexUrl && (
              <p className="mb-4 animate-fade-in text-xs text-paper/40">
                Toucher l&apos;affiche pour l&apos;ouvrir dans Plex
              </p>
            )}
            <h2
              className="animate-fade-in-up font-display text-2xl"
              style={{ animationDelay: "150ms" }}
            >
              {winner.title}
            </h2>
            <p
              className="mt-1 animate-fade-in-up text-sm text-paper/50"
              style={{ animationDelay: "220ms" }}
            >
              {winner.year} · {formatRuntime(winner.runtimeMin)}
            </p>
          </div>
        )}
      </div>

      {revealed && (
        <div className="animate-fade-in-up px-1 py-5" style={{ animationDelay: "280ms" }}>
          <button
            onClick={markWatched}
            disabled={markedWatched}
            className="w-full rounded-sm bg-ink px-4 py-3 font-medium text-paper transition-all duration-150 hover:bg-accent active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
          >
            {markedWatched ? "Marqué comme vu ✓" : "On l'a vu"}
          </button>

          <button
            onClick={() => setShowDetails((v) => !v)}
            className="mt-4 w-full text-center text-sm text-ink/50 transition-colors hover:text-ink"
          >
            {showDetails ? "Masquer" : "Voir comment on a choisi"}
          </button>

          {showDetails && (
            <ul className="mt-3 flex animate-fade-in-up flex-col border-t border-ink/10">
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
                      {s.points} point{s.points > 1 ? "s" : ""}
                      {s.disqualified ? " · écarté (dernier pour l'un de vous)" : ""}
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
