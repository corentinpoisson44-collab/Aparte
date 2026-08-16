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
    return <p className="p-6 text-center text-stone-500">Chargement…</p>;
  }

  if (sessions.length === 0) {
    return (
      <p className="p-6 text-center text-stone-500">
        Aucune session terminée pour le moment.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold">Historique</h1>
      <ul className="flex flex-col gap-3">
        {sessions.map((s) => (
          <li
            key={s.code}
            className="flex gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm"
          >
            {s.winnerMovie && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.winnerMovie.posterUrl}
                alt={s.winnerMovie.title}
                className="h-20 w-14 shrink-0 rounded-md object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-stone-400">
                {new Date(s.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}{" "}
                · {s.code}
              </p>
              <p className="truncate font-medium">
                {s.winnerMovie?.title ?? "—"}
                {s.winnerMovie?.watched && (
                  <span className="ml-2 text-xs text-emerald-600">vu ✓</span>
                )}
              </p>
              <p className="mt-1 text-xs text-stone-500">
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
