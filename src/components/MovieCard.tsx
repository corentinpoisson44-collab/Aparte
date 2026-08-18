"use client";

import { useState } from "react";
import type { MovieDTO } from "@/lib/types";
import { formatRuntime } from "@/lib/format";
import { MoviePoster } from "@/components/MoviePoster";
import { rankTint } from "@/lib/rankColor";

export function MovieCard({
  movie,
  rank,
  total,
  draggable,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  movie: MovieDTO;
  rank?: number;
  /** Nombre de films classés, pour situer `rank` sur le dégradé vert → rouge. */
  total?: number;
  draggable?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const tint = rank !== undefined && total !== undefined ? rankTint(rank, total) : undefined;

  return (
    <div
      onClick={() => setExpanded((v) => !v)}
      style={tint ? { backgroundColor: tint } : undefined}
      className={`flex cursor-pointer items-stretch gap-4 border-b border-ink/10 py-3 transition hover:brightness-95 ${tint ? "" : "bg-paper hover:bg-ink/[0.025]"}`}
    >
      {rank !== undefined && (
        <div className="flex w-9 shrink-0 items-start justify-center pt-1 font-display text-3xl leading-none text-ink/25">
          {rank}
        </div>
      )}
      <MoviePoster
        src={movie.posterUrl}
        title={movie.title}
        className="h-28 w-[4.5rem] shrink-0 object-cover"
        fallbackTextClassName="text-base"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate font-display text-lg">{movie.title}</h3>
          <span className="shrink-0 text-sm text-ink/40">{movie.year}</span>
        </div>
        <p
          className={`mt-1 text-sm text-ink/60 ${expanded ? "" : "line-clamp-2"}`}
        >
          {movie.synopsis}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs uppercase tracking-wide text-ink/45">
          <span>{movie.platform}</span>
          {movie.genre && <span>{movie.genre}</span>}
          {!movie.matchesFilters && (
            <span
              className="text-accent"
              title="Ajouté en complément : ne correspond pas à tous tes critères"
            >
              hors critères
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-accent">
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-3.5 w-3.5"
            >
              <circle cx="10" cy="10" r="7.5" />
              <path d="M10 6v4l2.5 2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {formatRuntime(movie.runtimeMin)}
          </span>
        </div>
      </div>
      {(onMoveUp || onMoveDown) && (
        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp?.();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            disabled={!canMoveUp}
            aria-label="Monter dans le classement"
            className="flex h-9 w-9 items-center justify-center rounded-sm border border-ink/15 text-ink/50 transition-all duration-150 disabled:opacity-30 active:scale-95 active:bg-ink/5"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown?.();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            disabled={!canMoveDown}
            aria-label="Descendre dans le classement"
            className="flex h-9 w-9 items-center justify-center rounded-sm border border-ink/15 text-ink/50 transition-all duration-150 disabled:opacity-30 active:scale-95 active:bg-ink/5"
          >
            ▼
          </button>
        </div>
      )}
      {draggable && (
        <div aria-hidden="true" className="shrink-0 self-center px-1 text-ink/25">
          ⠿
        </div>
      )}
    </div>
  );
}
