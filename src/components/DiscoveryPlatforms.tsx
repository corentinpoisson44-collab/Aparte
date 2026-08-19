"use client";

import { useEffect, useState } from "react";
import { DISCOVERY_PLATFORMS } from "@/lib/tmdb/constants";

type DiscoveryStatus = {
  platforms: string[];
  lastSyncedAt: string | null;
  moviesCount: number;
  configured: boolean;
};

/**
 * Sélection des plateformes de streaming "découverte" (en plus de Plex) et
 * synchronisation de leur catalogue via TMDB — voir src/lib/tmdb/.
 */
export function DiscoveryPlatforms() {
  const [status, setStatus] = useState<DiscoveryStatus | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ imported: number; total: number } | null>(
    null
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadStatus() {
    try {
      const res = await fetch("/api/discovery/status");
      if (!res.ok) throw new Error();
      const data: DiscoveryStatus = await res.json();
      setStatus(data);
      setSelected(data.platforms);
    } catch {
      setError("Impossible de vérifier tes plateformes pour le moment.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/discovery/status");
        if (!res.ok) throw new Error();
        const data: DiscoveryStatus = await res.json();
        if (!cancelled) {
          setStatus(data);
          setSelected(data.platforms);
        }
      } catch {
        if (!cancelled) setError("Impossible de vérifier tes plateformes pour le moment.");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(key: string) {
    const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
    setSelected(next);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/discovery/platforms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platforms: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setError("Petit souci de connexion — réessaie.");
      setSelected(selected);
    } finally {
      setSaving(false);
    }
  }

  async function sync() {
    setSyncing(true);
    setError(null);
    setMessage(null);
    setSyncProgress(null);
    let sawDone = false;
    let sawError = false;
    let unavailablePlatforms: string[] = [];
    try {
      const res = await fetch("/api/discovery/sync", { method: "POST" });
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
            unavailablePlatforms = event.unavailablePlatforms ?? [];
            setMessage(
              event.imported > 0
                ? `${event.imported} film${event.imported > 1 ? "s" : ""} ajouté${event.imported > 1 ? "s" : ""}.`
                : "Aucun nouveau film à ajouter."
            );
          } else if (event.type === "error") {
            sawError = true;
            setError(event.error ?? "La mise à jour a échoué, réessaie.");
          }
        }
      }

      if (sawDone) {
        await loadStatus();
        if (unavailablePlatforms.length > 0) {
          setError(
            `Indisponible pour l'instant chez ce fournisseur de catalogue : ${unavailablePlatforms.join(", ")}.`
          );
        }
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

  if (!status || !status.configured) return null;

  return (
    <div className="animate-fade-in-up rounded-sm border border-ink/15 p-4">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-ink/50">
        Autres plateformes
      </h2>
      <p className="mb-3 text-sm text-ink/60">
        Coche celles auxquelles vous êtes abonnés pour qu&apos;Aparté y pioche
        aussi des films.
      </p>

      <div className="mb-3 grid grid-cols-2 gap-2">
        {DISCOVERY_PLATFORMS.map((platform) => (
          <label
            key={platform.key}
            className={`flex cursor-pointer items-center justify-center rounded-sm border px-3 py-2 text-center text-sm transition-colors ${
              selected.includes(platform.key)
                ? "border-ink bg-ink text-paper"
                : "border-ink/20 hover:border-ink"
            } ${saving ? "opacity-60" : ""}`}
          >
            <input
              type="checkbox"
              checked={selected.includes(platform.key)}
              onChange={() => toggle(platform.key)}
              disabled={saving}
              className="sr-only"
            />
            {platform.label}
          </label>
        ))}
      </div>

      {selected.length > 0 && (
        <>
          <button
            onClick={sync}
            disabled={syncing}
            className="w-full rounded-sm bg-ink px-4 py-2 text-sm font-medium text-paper transition-all duration-150 hover:bg-accent active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
          >
            {syncing
              ? syncProgress && syncProgress.total > 0
                ? `Mise à jour… ${syncProgress.imported}/${syncProgress.total}`
                : "Mise à jour…"
              : "Mettre à jour mes films"}
          </button>
          {syncing && (
            <div
              role="progressbar"
              aria-label="Progression de la mise à jour"
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
          <p className="mt-2 text-xs text-ink/50">
            {status.moviesCount} film{status.moviesCount > 1 ? "s" : ""} de ces plateformes prêt
            {status.moviesCount > 1 ? "s" : ""} à être proposés
            {status.lastSyncedAt &&
              `, mis à jour le ${new Date(status.lastSyncedAt).toLocaleString("fr-FR")}`}
            .
          </p>
        </>
      )}

      {message && <p className="mt-2 animate-fade-in text-sm text-ink/70">{message}</p>}
      {error && <p className="mt-2 animate-fade-in text-sm text-accent">{error}</p>}
    </div>
  );
}
