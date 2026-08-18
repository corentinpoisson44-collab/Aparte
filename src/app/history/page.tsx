"use client";

import { useEffect, useState } from "react";
import { MoviePoster } from "@/components/MoviePoster";

type HistorySession = {
  code: string;
  createdAt: string;
  winnerMovie: { id: string; title: string; year: number; posterUrl: string; watched: boolean } | null;
  movies: { id: string; title: string }[];
  rankings: { memberName: string; order: string[] }[];
};

export default function HistoryPage() {
  const [sessions, setSessions] = useState<HistorySession[] | null>(null);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((data) => setSessions(data.sessions));
  }, []);

  if (!sessions) {
    return <p className="animate-fade-in p-6 text-center text-ink/50">Un instant…</p>;
  }

  if (sessions.length === 0) {
    return (
      <p className="animate-fade-in p-6 text-center text-ink/50">
        Pas encore de soirée film ensemble — lancez votre première session !
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-6 animate-fade-in-up font-display text-2xl">
        Vos soirées
      </h1>
      <ul className="flex flex-col border-t border-ink/10">
        {sessions.map((s, index) => (
          <li
            key={s.code}
            className="flex animate-fade-in-up gap-4 border-b border-ink/10 py-4"
            style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
          >
            {s.winnerMovie && (
              <MoviePoster
                src={s.winnerMovie.posterUrl}
                title={s.winnerMovie.title}
                className="h-24 w-16 shrink-0 object-cover"
                fallbackTextClassName="text-sm"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wide text-ink/40">
                {new Date(s.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              <p className="truncate font-display text-lg">
                {s.winnerMovie?.title ?? "—"}
                {s.winnerMovie?.watched && (
                  <span className="ml-2 text-xs font-sans text-accent">vu ✓</span>
                )}
              </p>
              <p className="mt-1 text-xs text-ink/50">
                Classé par {s.rankings.map((r) => r.memberName).join(" et ")}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
