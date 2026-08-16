"use client";

import { useEffect, useState } from "react";

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
    return <p className="p-6 text-center text-ink/50">Chargement…</p>;
  }

  if (sessions.length === 0) {
    return (
      <p className="p-6 text-center text-ink/50">
        Aucune session terminée pour le moment.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-6 font-display text-2xl">Historique</h1>
      <ul className="flex flex-col border-t border-ink/10">
        {sessions.map((s) => (
          <li key={s.code} className="flex gap-4 border-b border-ink/10 py-4">
            {s.winnerMovie && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.winnerMovie.posterUrl}
                alt={s.winnerMovie.title}
                className="h-24 w-16 shrink-0 object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wide text-ink/40">
                {new Date(s.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}{" "}
                · {s.code}
              </p>
              <p className="truncate font-display text-lg">
                {s.winnerMovie?.title ?? "—"}
                {s.winnerMovie?.watched && (
                  <span className="ml-2 text-xs font-sans text-accent">vu ✓</span>
                )}
              </p>
              <p className="mt-1 text-xs text-ink/50">
                {s.rankings
                  .map((r) => `${r.memberName} : ${r.order.length} films classés`)
                  .join(" · ")}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
