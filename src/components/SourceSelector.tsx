"use client";

import { useEffect, useState } from "react";

type SourcesResponse = { available: string[]; enabled: string[] };

/**
 * Cases à cocher pour choisir les sources (Plex + plateformes de streaming)
 * dont les films sont proposés lors du tirage.
 */
export function SourceSelector() {
  const [available, setAvailable] = useState<string[] | null>(null);
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [tmdbConfigured, setTmdbConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [sourcesRes, tmdbRes] = await Promise.all([
          fetch("/api/household/sources"),
          fetch("/api/tmdb/status"),
        ]);
        if (!sourcesRes.ok) throw new Error();
        const data: SourcesResponse = await sourcesRes.json();
        if (cancelled) return;
        setAvailable(data.available);
        setEnabled(new Set(data.enabled));
        if (tmdbRes.ok) setTmdbConfigured((await tmdbRes.json()).configured);
      } catch {
        if (!cancelled) setError("Impossible de charger tes plateformes pour le moment.");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(source: string) {
    const next = new Set(enabled);
    if (next.has(source)) next.delete(source);
    else next.add(source);
    setEnabled(next);

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/household/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: [...next] }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setError("Petit souci de connexion, ton choix n'a peut-être pas été enregistré.");
    } finally {
      setSaving(false);
    }
  }

  if (!available) return null;

  return (
    <div
      className="animate-fade-in-up rounded-sm border border-ink/15 p-4"
      style={{ animationDelay: "60ms" }}
    >
      <h2 className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-ink/50">
        Vos plateformes
      </h2>
      <p className="mb-3 text-sm text-ink/60">
        Coche celles où vous avez l&apos;habitude de regarder, pour que les
        films proposés soient ceux que vous pouvez vraiment lancer ce soir.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {available.map((source) => {
          const disconnected = source !== "Plex" && !tmdbConfigured;
          return (
            <label
              key={source}
              title={disconnected ? "Nécessite la synchro du catalogue TMDB ci-dessus." : undefined}
              className="flex items-center gap-2 rounded-sm border border-ink/15 px-3 py-2 text-sm transition-colors has-[:checked]:border-ink/40 has-[:disabled]:opacity-40"
            >
              <input
                type="checkbox"
                checked={enabled.has(source)}
                onChange={() => toggle(source)}
                disabled={saving || disconnected}
                className="h-4 w-4 shrink-0 accent-accent"
              />
              {source}
            </label>
          );
        })}
      </div>
      {!tmdbConfigured && (
        <p className="mt-2 text-sm text-ink/50">
          Les plateformes hors Plex nécessitent une synchro du catalogue
          TMDB pour proposer des films (voir ci-dessus).
        </p>
      )}
      {error && <p className="mt-2 animate-fade-in text-sm text-accent">{error}</p>}
    </div>
  );
}
