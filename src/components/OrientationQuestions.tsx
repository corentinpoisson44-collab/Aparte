"use client";

import { useEffect, useState } from "react";

const DURATION_OPTIONS = [
  { value: "short", label: "Plutôt court" },
  { value: "long", label: "Plutôt long" },
  { value: "any", label: "Peu importe" },
] as const;

const ORIGIN_OPTIONS = [
  { value: "library", label: "Une valeur sûre" },
  { value: "discovery", label: "Une découverte" },
  { value: "any", label: "Peu importe" },
] as const;

type Duration = (typeof DURATION_OPTIONS)[number]["value"];
type Origin = (typeof ORIGIN_OPTIONS)[number]["value"];

/**
 * Questions posées juste après la création d'une session pour orienter le
 * tirage : durée, ambiance/genre, valeur sûre ou découverte. Le tirage
 * n'a lieu qu'une fois ces préférences envoyées (voir POST
 * /api/sessions/[code]/draw) — tout est facultatif, "peu importe" partout
 * revient au tirage sans préférence.
 */
export function OrientationQuestions({
  code,
  onDrawn,
  onCancel,
}: {
  code: string;
  onDrawn: () => void;
  onCancel: () => void;
}) {
  const [genres, setGenres] = useState<string[]>([]);
  const [duration, setDuration] = useState<Duration>("any");
  const [genre, setGenre] = useState<string | null>(null);
  const [origin, setOrigin] = useState<Origin>("any");
  const [drawing, setDrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/household/genres")
      .then((res) => (res.ok ? res.json() : { genres: [] }))
      .then((data: { genres?: string[] }) => {
        if (!cancelled) setGenres(data.genres ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function draw() {
    setDrawing(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${code}/draw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration, genre, origin }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data.error ?? "Impossible de tirer les films pour le moment, réessaie."
        );
        return;
      }
      onDrawn();
    } catch {
      setError("Petit souci de connexion — réessaie.");
    } finally {
      setDrawing(false);
    }
  }

  const genreOptions = [
    ...genres.map((g) => ({ value: g, label: g })),
    { value: "any", label: "Peu importe" },
  ];

  return (
    <div className="flex animate-fade-in-up flex-col gap-6">
      <div>
        <h2 className="mb-1 font-display text-xl">On oriente un peu ?</h2>
        <p className="text-sm text-ink/60">
          Quelques questions pour piocher des films qui vous correspondent ce
          soir — tout est facultatif.
        </p>
      </div>

      <Question label="Côté durée">
        <Chips options={DURATION_OPTIONS} value={duration} onChange={setDuration} />
      </Question>

      <Question label="Côté ambiance">
        <Chips
          options={genreOptions}
          value={genre ?? "any"}
          onChange={(v) => setGenre(v === "any" ? null : v)}
        />
      </Question>

      <Question label="Côté envie">
        <Chips options={ORIGIN_OPTIONS} value={origin} onChange={setOrigin} />
      </Question>

      <div>
        <button
          onClick={draw}
          disabled={drawing}
          className="w-full rounded-sm bg-ink px-4 py-3 font-medium text-paper transition-all duration-150 hover:bg-accent active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
        >
          {drawing ? "On pioche…" : "Tirer les films"}
        </button>
        {error && <p className="mt-2 text-sm text-accent">{error}</p>}
        <button
          onClick={onCancel}
          disabled={drawing}
          className="mt-3 w-full text-center text-sm text-ink/50 transition-colors hover:text-ink"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

function Question({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium uppercase tracking-[0.15em] text-ink/50">
        {label}
      </label>
      {children}
    </div>
  );
}

function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-sm border px-3 py-2 text-sm transition-colors ${
            value === opt.value
              ? "border-ink bg-ink text-paper"
              : "border-ink/20 text-ink/70 hover:border-ink/40"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
