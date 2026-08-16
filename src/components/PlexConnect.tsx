"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PlexStatus = {
  connected: boolean;
  serverName: string | null;
  lastSyncedAt: string | null;
  moviesCount: number;
  sync: {
    syncing: boolean;
    imported: number;
    total: number | null;
    error: string | null;
  };
};

const PIN_POLL_INTERVAL_MS = 2000;
const PIN_POLL_TIMEOUT_MS = 3 * 60 * 1000;
const SYNC_POLL_INTERVAL_MS = 1500;

/**
 * Connexion au compte Plex (flow "pin", pas de mot de passe saisi dans
 * l'app) puis synchronisation de la bibliothèque de films dans le foyer.
 * La synchro peut prendre du temps sur une grosse bibliothèque : elle
 * tourne côté serveur en tâche de fond, et ce composant sonde sa
 * progression plutôt que d'attendre une seule requête bloquante.
 */
export function PlexConnect() {
  const [status, setStatus] = useState<PlexStatus | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pinPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadStatus = useCallback(async (): Promise<PlexStatus | null> => {
    try {
      const res = await fetch("/api/plex/status");
      if (!res.ok) throw new Error();
      const data: PlexStatus = await res.json();
      setStatus(data);
      return data;
    } catch {
      setError("Impossible de charger l'état de la connexion Plex.");
      return null;
    }
  }, []);

  const watchSyncProgress = useCallback(() => {
    if (syncPollRef.current) return;
    syncPollRef.current = setInterval(async () => {
      const data = await loadStatus();
      if (data && !data.sync.syncing) {
        if (syncPollRef.current) clearInterval(syncPollRef.current);
        syncPollRef.current = null;
        if (data.sync.error) {
          setError(data.sync.error);
        } else {
          setMessage(`${data.moviesCount} film(s) synchronisé(s) depuis "${data.serverName}".`);
        }
      }
    }, SYNC_POLL_INTERVAL_MS);
  }, [loadStatus]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/plex/status");
        if (!res.ok) throw new Error();
        const data: PlexStatus = await res.json();
        if (cancelled) return;
        setStatus(data);
        if (data.sync.syncing) watchSyncProgress();
      } catch {
        if (!cancelled) setError("Impossible de charger l'état de la connexion Plex.");
      }
    }
    load();
    return () => {
      cancelled = true;
      if (pinPollRef.current) clearInterval(pinPollRef.current);
      if (syncPollRef.current) clearInterval(syncPollRef.current);
    };
  }, [watchSyncProgress]);

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
      pinPollRef.current = setInterval(async () => {
        if (Date.now() - startedAt > PIN_POLL_TIMEOUT_MS) {
          if (pinPollRef.current) clearInterval(pinPollRef.current);
          setConnecting(false);
          setError("Délai dépassé, réessaie la connexion Plex.");
          return;
        }
        try {
          const pollRes = await fetch(`/api/plex/pin/${id}`);
          if (!pollRes.ok) return;
          const data = await pollRes.json();
          if (data.linked) {
            if (pinPollRef.current) clearInterval(pinPollRef.current);
            setConnecting(false);
            await loadStatus();
            setMessage(
              data.serverName
                ? `Connecté au serveur Plex "${data.serverName}".`
                : "Compte Plex connecté."
            );
            if (data.serverError) setError(data.serverError);
          }
        } catch {
          // on retente au prochain intervalle
        }
      }, PIN_POLL_INTERVAL_MS);
    } catch {
      setConnecting(false);
      popup?.close();
      setError("Impossible de démarrer la connexion Plex.");
    }
  }

  async function sync() {
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/plex/sync", { method: "POST" });
      if (!res.ok && res.status !== 409) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Échec du démarrage de la synchronisation.");
        return;
      }
      await loadStatus();
      watchSyncProgress();
    } catch {
      setError("Erreur réseau pendant la synchronisation.");
    }
  }

  async function disconnect() {
    setError(null);
    setMessage(null);
    await fetch("/api/plex/disconnect", { method: "POST" });
    await loadStatus();
  }

  if (!status) return null;

  const syncState = status.sync;
  const progressPct =
    syncState.syncing && syncState.total ? Math.round((syncState.imported / syncState.total) * 100) : null;

  return (
    <div className="rounded-lg border border-stone-300 p-4">
      <h2 className="mb-2 text-sm font-medium text-stone-700">Bibliothèque Plex</h2>

      {!status.connected ? (
        <>
          <p className="mb-3 text-sm text-stone-500">
            Connecte ton compte Plex pour piocher dans les films de ta
            bibliothèque plutôt que dans une liste fixe.
          </p>
          <button
            onClick={connect}
            disabled={connecting}
            className="w-full rounded-lg border border-stone-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {connecting ? "En attente de connexion…" : "Se connecter à Plex"}
          </button>
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-stone-500">
            Connecté{status.serverName ? ` à "${status.serverName}"` : ""}
            {" — "}
            {status.moviesCount} film(s) importé(s)
            {status.lastSyncedAt &&
              `, dernière synchro ${new Date(status.lastSyncedAt).toLocaleString("fr-FR")}`}
            .
          </p>

          {syncState.syncing && (
            <div className="mb-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
                <div
                  className="h-full bg-stone-900 transition-all"
                  style={{ width: progressPct !== null ? `${progressPct}%` : "20%" }}
                />
              </div>
              <p className="mt-1 text-xs text-stone-500">
                {syncState.total !== null
                  ? `Synchronisation… ${syncState.imported} / ${syncState.total} films`
                  : "Synchronisation… récupération de la bibliothèque"}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={sync}
              disabled={syncState.syncing}
              className="flex-1 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {syncState.syncing ? "Synchronisation…" : "Synchroniser ma bibliothèque"}
            </button>
            <button
              onClick={disconnect}
              disabled={syncState.syncing}
              className="shrink-0 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Déconnecter
            </button>
          </div>
        </>
      )}

      {message && <p className="mt-2 text-sm text-green-700">{message}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
