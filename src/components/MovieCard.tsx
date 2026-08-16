import type { MovieDTO } from "@/lib/types";

export function MovieCard({
  movie,
  rank,
  dragHandleProps,
}: {
  movie: MovieDTO;
  rank?: number;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
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
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className="flex shrink-0 cursor-grab touch-none items-center px-1 text-stone-300 active:cursor-grabbing"
          aria-label="Glisser pour réordonner"
        >
          ⠿
        </div>
      )}
    </div>
  );
}
