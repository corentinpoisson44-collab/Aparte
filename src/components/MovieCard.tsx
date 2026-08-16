import type { MovieDTO } from "@/lib/types";

export function MovieCard({
  movie,
  rank,
  draggable,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  movie: MovieDTO;
  rank?: number;
  draggable?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
      {rank !== undefined && (
        <div className="flex w-7 shrink-0 items-center justify-center text-lg font-semibold text-stone-400">
          {rank}
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={movie.posterUrl}
        alt={movie.title}
        className="h-24 w-16 shrink-0 rounded-md object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate font-medium">{movie.title}</h3>
          <span className="shrink-0 text-sm text-stone-400">{movie.year}</span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-stone-500">
          {movie.synopsis}
        </p>
        <div className="mt-2 flex items-center gap-2 text-xs text-stone-500">
          <span className="rounded-full bg-stone-100 px-2 py-0.5">
            {movie.platform}
          </span>
          <span>{movie.runtimeMin} min</span>
        </div>
      </div>
      {(onMoveUp || onMoveDown) && (
        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            onPointerDown={(e) => e.stopPropagation()}
            disabled={!canMoveUp}
            aria-label="Monter dans le classement"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-500 disabled:opacity-30 active:bg-stone-100"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            onPointerDown={(e) => e.stopPropagation()}
            disabled={!canMoveDown}
            aria-label="Descendre dans le classement"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-500 disabled:opacity-30 active:bg-stone-100"
          >
            ▼
          </button>
        </div>
      )}
      {draggable && (
        <div aria-hidden="true" className="shrink-0 px-1 text-stone-300">
          ⠿
        </div>
      )}
    </div>
  );
}
