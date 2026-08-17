"use client";

import { useCallback, useEffect, useState } from "react";

type TmdbStatus = {
  configured: boolean;
  lastSyncedAt: string | null;
  moviesCount: number;
};

/**
 * Statut de l'intégration TMDB (catalogue Netflix, Disney+, etc.) et bouton
 * de synchronisation. Contrairement à Plex, il n'y a pas de connexion par
 * compte : une seule clé `TMDB_API_KEY` côté serveur donne accès au
 * catalogue de toutes les plateformes de streaming. Tant qu'elle n'est pas
 * configurée, ces plateformes ne proposent aucun film au tirage.
 */
export function TmdbConnect() {
  const [status, setStatus] = useState<TmdbStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ imported: number; total: number } | null>(
    null
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/tmdb/status");
      if (!res.ok) throw new Error();
      setStatus(await res.json());
    } catch {
      setError("Impossible de vérifier le catalogue TMDB pour le moment.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/tmdb/status");
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) setError("Impossible de vérifier le catalogue TMDB pour le moment.");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function sync() {
    setSyncing(true);
    setError(null);
    setMessage(null);
    setSyncProgress(null);
    let sawDone = false;
    let sawError = false;
    try {
      const res = await fetch("/api/tmdb/sync", { method: "POST" });
      if (!res.body) throw new Error();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (!line) continue;

          const event = JSON.parse(line);
          if (event.type === "progress") {
            setSyncProgress({ imported: event.imported, total: event.total });
          } else if (event.type === "done") {
            sawDone = true;
            setMessage(
              `${event.imported} film${event.imported > 1 ? "s" : ""} à jour sur ${event.platformsCount} plateforme${event.platformsCount > 1 ? "s" : ""}.`
            );
          } else if (event.type === "error") {
            sawError = true;
            setError(event.error ?? "La mise à jour a échoué, réessaie.");
          }
        }
      }

      if (sawDone) {
        await loadStatus();
      } else if (!sawError) {
        setError("La mise à jour a été interrompue, réessaie.");
      }
    } catch {
      setError("Petit souci de connexion pendant la mise à jour.");
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  }

  if (!status) return null;

  return (
    <div className="animate-fade-in-up rounded-sm border border-ink/15 p-4">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-ink/50">
        Catalogue streaming
      </h2>

      {!status.configured ? (
        <p className="text-sm text-ink/60">
          Netflix, Disney+ et les autres plateformes ne proposeront aucun
          film tant que la clé TMDB n&apos;est pas configurée côté serveur
          (variable <code className="text-ink/80">TMDB_API_KEY</code>).
        </p>
      ) : (
        <>
          <p className="mb-3 text-sm text-ink/60">
            {status.moviesCount} film{status.moviesCount > 1 ? "s" : ""} prêt
            {status.moviesCount > 1 ? "s" : ""} à être proposés
            {status.lastSyncedAt &&
              `, mis à jour le ${new Date(status.lastSyncedAt).toLocaleString("fr-FR")}`}
            .
          </p>
          <button
            onClick={sync}
            disabled={syncing}
            className="w-full rounded-sm bg-ink px-4 py-2 text-sm font-medium text-paper transition-all duration-150 hover:bg-accent active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
          >
            {syncing
              ? syncProgress && syncProgress.total > 0
                ? `Mise à jour… ${syncProgress.imported}/${syncProgress.total}`
                : "Mise à jour…"
              : "Mettre à jour le catalogue"}
          </button>
          {syncing && (
            <div
              role="progressbar"
              aria-label="Progression de la mise à jour du catalogue TMDB"
              aria-valuemin={0}
              aria-valuemax={syncProgress?.total ?? undefined}
              aria-valuenow={syncProgress?.imported}
              className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink/10"
            >
              <div
                className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
                style={{
                  width:
                    syncProgress && syncProgress.total > 0
                      ? `${Math.min(100, Math.round((syncProgress.imported / syncProgress.total) * 100))}%`
                      : "15%",
                }}
              />
            </div>
          )}
        </>
      )}

      {message && <p className="mt-2 animate-fade-in text-sm text-ink/70">{message}</p>}
      {error && <p className="mt-2 animate-fade-in text-sm text-accent">{error}</p>}
    </div>
  );
}
