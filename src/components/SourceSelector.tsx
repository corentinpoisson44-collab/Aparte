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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/household/sources");
        if (!res.ok) throw new Error();
        const data: SourcesResponse = await res.json();
        if (cancelled) return;
        setAvailable(data.available);
        setEnabled(new Set(data.enabled));
      } catch {
        if (!cancelled) setError("Impossible de charger les sources.");
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
      setError("Erreur réseau, la sélection n'a peut-être pas été sauvegardée.");
    } finally {
      setSaving(false);
    }
  }

  if (!available) return null;

  return (
    <div className="rounded-lg border border-stone-300 p-4">
      <h2 className="mb-2 text-sm font-medium text-stone-700">Sources</h2>
      <p className="mb-3 text-sm text-stone-500">
        Choisis les sources dans lesquelles piocher des films.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {available.map((source) => (
          <label
            key={source}
            className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm"
          >
            <input
              type="checkbox"
              checked={enabled.has(source)}
              onChange={() => toggle(source)}
              disabled={saving}
              className="h-4 w-4 shrink-0 accent-stone-900"
            />
            {source}
          </label>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
