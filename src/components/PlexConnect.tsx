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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/plex/status");
      if (!res.ok) throw new Error();
      setStatus(await res.json());
    } catch {
      setError("Impossible de charger l'état de la connexion Plex.");
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
        if (!cancelled) setError("Impossible de charger l'état de la connexion Plex.");
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
          setError("Délai dépassé, réessaie la connexion Plex.");
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
                ? `Connecté au serveur Plex "${data.serverName}".`
                : "Compte Plex connecté."
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
      setError("Impossible de démarrer la connexion Plex.");
    }
  }

  async function sync() {
    setSyncing(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/plex/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Échec de la synchronisation Plex.");
        return;
      }
      setMessage(`${data.imported} film(s) importé(s) depuis "${data.serverName}".`);
      await loadStatus();
    } catch {
      setError("Erreur réseau pendant la synchronisation.");
    } finally {
      setSyncing(false);
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
          <div className="flex gap-2">
            <button
              onClick={sync}
              disabled={syncing}
              className="flex-1 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {syncing ? "Synchronisation…" : "Synchroniser ma bibliothèque"}
            </button>
            <button
              onClick={disconnect}
              className="shrink-0 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium"
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
