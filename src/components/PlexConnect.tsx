"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PlexStatus = {
  connected: boolean;
  serverName: string | null;
  lastSyncedAt: string | null;
  moviesCount: number;
};

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 3 * 60 * 1000;

/**
 * Connexion au compte Plex (flow "pin", pas de mot de passe saisi dans
 * l'app) puis synchronisation de la bibliothèque de films dans le foyer.
 */
export function PlexConnect() {
  const [status, setStatus] = useState<PlexStatus | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ imported: number; total: number } | null>(
    null
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/plex/status");
      if (!res.ok) throw new Error();
      setStatus(await res.json());
    } catch {
      setError("Impossible de vérifier ta connexion Plex pour le moment.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/plex/status");
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) setError("Impossible de vérifier ta connexion Plex pour le moment.");
      }
    }
    load();
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function connect() {
    setError(null);
    setMessage(null);
    // Ouvrir la fenêtre de façon synchrone (dans le handler de clic) pour
    // éviter que le navigateur bloque le popup une fois l'URL connue.
    const popup = window.open("", "_blank", "width=480,height=640");
    setConnecting(true);
    try {
      const res = await fetch("/api/plex/pin", { method: "POST" });
      if (!res.ok) throw new Error();
      const { id, authUrl } = await res.json();

      if (popup) popup.location.href = authUrl;
      else window.open(authUrl, "_blank");

      const startedAt = Date.now();
      pollRef.current = setInterval(async () => {
        if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
          if (pollRef.current) clearInterval(pollRef.current);
          setConnecting(false);
          setError("Ça a pris trop de temps — réessaie de te connecter.");
          return;
        }
        try {
          const pollRes = await fetch(`/api/plex/pin/${id}`);
          if (!pollRes.ok) return;
          const data = await pollRes.json();
          if (data.linked) {
            if (pollRef.current) clearInterval(pollRef.current);
            setConnecting(false);
            await loadStatus();
            setMessage(
              data.serverName
                ? `Connecté à « ${data.serverName} ».`
                : "Ton compte Plex est connecté."
            );
            if (data.serverError) setError(data.serverError);
          }
        } catch {
          // on retente au prochain intervalle
        }
      }, POLL_INTERVAL_MS);
    } catch {
      setConnecting(false);
      popup?.close();
      setError("La connexion à Plex n'a pas pu démarrer, réessaie.");
    }
  }

  async function sync() {
    setSyncing(true);
    setError(null);
    setMessage(null);
    setSyncProgress(null);
    let sawDone = false;
    let sawError = false;
    try {
      const res = await fetch("/api/plex/sync", { method: "POST" });
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
              `${event.imported} film${event.imported > 1 ? "s" : ""} ajouté${event.imported > 1 ? "s" : ""} depuis « ${event.serverName} ».`
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

  async function disconnect() {
    setError(null);
    setMessage(null);
    await fetch("/api/plex/disconnect", { method: "POST" });
    await loadStatus();
  }

  if (!status) return null;

  return (
    <div className="animate-fade-in-up rounded-sm border border-ink/15 p-4">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-ink/50">
        Tes films Plex
      </h2>

      {!status.connected ? (
        <>
          <p className="mb-3 text-sm text-ink/60">
            Connecte ton compte Plex pour qu&apos;Aparté propose les films
            que vous avez déjà, plutôt qu&apos;une liste générique.
          </p>
          <button
            onClick={connect}
            disabled={connecting}
            className="w-full rounded-sm border border-ink px-4 py-2 text-sm font-medium transition-all duration-150 hover:bg-ink hover:text-paper active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
          >
            {connecting ? "Connexion en cours…" : "Se connecter à Plex"}
          </button>
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-ink/60">
            Connecté{status.serverName ? ` à « ${status.serverName} »` : ""}
            {" — "}
            {status.moviesCount} film{status.moviesCount > 1 ? "s" : ""} prêt
            {status.moviesCount > 1 ? "s" : ""} à être proposés
            {status.lastSyncedAt &&
              `, mis à jour le ${new Date(status.lastSyncedAt).toLocaleString("fr-FR")}`}
            .
          </p>
          <div className="flex gap-2">
            <button
              onClick={sync}
              disabled={syncing}
              className="flex-1 rounded-sm bg-ink px-4 py-2 text-sm font-medium text-paper transition-all duration-150 hover:bg-accent active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            >
              {syncing
                ? syncProgress && syncProgress.total > 0
                  ? `Mise à jour… ${syncProgress.imported}/${syncProgress.total}`
                  : "Mise à jour…"
                : "Mettre à jour mes films"}
            </button>
            <button
              onClick={disconnect}
              disabled={syncing}
              className="shrink-0 rounded-sm border border-ink/20 px-4 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            >
              Déconnecter
            </button>
          </div>
          {syncing && (
            <div
              role="progressbar"
              aria-label="Progression de la mise à jour Plex"
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
