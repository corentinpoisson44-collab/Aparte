"use client";

import { useEffect, useState } from "react";
import type { MovieDTO, MovieScoreDTO } from "@/lib/types";
import { formatRuntime } from "@/lib/format";

const COUNTDOWN_START = 3;
const TICK_MS = 1300;

type PlexPlayerClient = {
  machineIdentifier: string;
  name: string;
  product: string;
};

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
  const [clients, setClients] = useState<PlexPlayerClient[] | null>(null);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [launching, setLaunching] = useState<string | null>(null);
  const [launchMessage, setLaunchMessage] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!revealed) return;
    let cancelled = false;
    fetch("/api/plex/clients")
      .then((res) => (res.ok ? res.json() : { clients: [] }))
      .then((data: { clients?: PlexPlayerClient[]; error?: string }) => {
        if (cancelled) return;
        setClients(data.clients ?? []);
        setClientsError(data.error ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setClients([]);
          setClientsError("Impossible de chercher un lecteur Plex pour le moment.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [revealed]);

  async function markWatched() {
    await fetch(`/api/movies/${winnerMovieId}/watched`, { method: "POST" });
    setMarkedWatched(true);
  }

  async function launchOnClient(machineIdentifier: string) {
    setLaunching(machineIdentifier);
    setLaunchError(null);
    setLaunchMessage(null);
    try {
      const res = await fetch("/api/plex/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId: winnerMovieId, machineIdentifier }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLaunchError(data.error ?? "Impossible de lancer la lecture, réessaie.");
        return;
      }
      setLaunchMessage("Lecture lancée !");
    } catch {
      setLaunchError("Petit souci de connexion — réessaie.");
    } finally {
      setLaunching(null);
    }
  }

  if (!winner) return null;

  return (
    <div>
      <div className="-mx-4 flex min-h-[70vh] flex-col items-center justify-center overflow-hidden bg-ink px-6 py-16 text-paper sm:mx-0">
        {!revealed ? (
          <>
            <p className="mb-6 animate-fade-in text-xs uppercase tracking-[0.3em] text-paper/50">
              Aparté choisit pour vous…
            </p>
            <span
              key={count}
              className="animate-count-pop font-display text-[7rem] leading-none text-accent"
            >
              {count > 0 ? count : "—"}
            </span>
          </>
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={winner.posterUrl}
                  alt={winner.title}
                  className="h-72 w-48 object-cover shadow-[0_0_0_1px_rgba(247,244,238,0.1)] transition-opacity active:opacity-80"
                />
              </a>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={winner.posterUrl}
                alt={winner.title}
                className="mb-5 h-72 w-48 animate-scale-in object-cover shadow-[0_0_0_1px_rgba(247,244,238,0.1)]"
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
          {clients && (
            <div className="mb-3 flex flex-col gap-2">
              {clients.length > 0 ? (
                clients.map((c) => (
                  <button
                    key={c.machineIdentifier}
                    onClick={() => launchOnClient(c.machineIdentifier)}
                    disabled={launching !== null}
                    className="w-full rounded-sm border border-ink bg-paper px-4 py-3 font-medium text-ink transition-all duration-150 hover:bg-ink hover:text-paper active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                  >
                    {launching === c.machineIdentifier
                      ? "Lancement…"
                      : `▶ Lancer sur ${c.name}`}
                  </button>
                ))
              ) : (
                <p className="text-center text-sm text-ink/40">
                  {clientsError ??
                    "Aucun lecteur Plex trouvé — ouvre l'appli Plex sur ta TV (avec le même compte) pour pouvoir lancer la lecture depuis ici."}
                </p>
              )}
              {launchMessage && (
                <p className="animate-fade-in text-center text-sm text-ink/70">{launchMessage}</p>
              )}
              {launchError && (
                <p className="animate-fade-in text-center text-sm text-accent">{launchError}</p>
              )}
            </div>
          )}

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
