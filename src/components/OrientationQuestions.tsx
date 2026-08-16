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
type Answers = { duration: Duration; genre: string | null; origin: Origin };

const STEP_COUNT = 3;
/** Pause pour laisser voir la sélection avant de passer à l'écran suivant. */
const ADVANCE_DELAY_MS = 220;

/**
 * Questions posées juste après la création d'une session pour orienter le
 * tirage : durée, ambiance/genre, valeur sûre ou découverte — un écran par
 * question, comme un petit questionnaire mobile. Le tirage n'a lieu qu'une
 * fois la dernière réponse donnée (voir POST /api/sessions/[code]/draw) —
 * tout est facultatif, "peu importe" partout revient au tirage sans
 * préférence.
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
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    duration: "any",
    genre: null,
    origin: "any",
  });
  const [picked, setPicked] = useState<string | null>(null);
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

  async function draw(finalAnswers: Answers) {
    setDrawing(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${code}/draw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalAnswers),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data.error ?? "Impossible de tirer les films pour le moment, réessaie."
        );
        setPicked(null);
        return;
      }
      onDrawn();
    } catch {
      setError("Petit souci de connexion — réessaie.");
      setPicked(null);
    } finally {
      setDrawing(false);
    }
  }

  function pickDuration(value: Duration) {
    setPicked(value);
    setAnswers((a) => ({ ...a, duration: value }));
    window.setTimeout(() => {
      setPicked(null);
      setStep(1);
    }, ADVANCE_DELAY_MS);
  }

  function pickGenre(value: string) {
    const genre = value === "any" ? null : value;
    setPicked(value);
    setAnswers((a) => ({ ...a, genre }));
    window.setTimeout(() => {
      setPicked(null);
      setStep(2);
    }, ADVANCE_DELAY_MS);
  }

  function pickOrigin(value: Origin) {
    setPicked(value);
    const finalAnswers = { ...answers, origin: value };
    setAnswers(finalAnswers);
    window.setTimeout(() => draw(finalAnswers), ADVANCE_DELAY_MS);
  }

  function back() {
    if (step === 0) {
      onCancel();
      return;
    }
    setError(null);
    setPicked(null);
    setStep((s) => s - 1);
  }

  const genreOptions = [
    ...genres.map((g) => ({ value: g, label: g })),
    { value: "any", label: "Peu importe" },
  ];

  return (
    <div className="flex min-h-[22rem] flex-col">
      <div className="mb-8 flex items-center gap-3">
        <button
          onClick={back}
          disabled={drawing}
          aria-label={step === 0 ? "Annuler" : "Retour"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-lg text-ink/50 transition-colors hover:text-ink disabled:opacity-40"
        >
          {step === 0 ? "×" : "‹"}
        </button>
        <div className="flex flex-1 gap-1.5">
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-ink" : "bg-ink/15"
              }`}
            />
          ))}
        </div>
      </div>

      {step === 0 && (
        <QuestionScreen
          stepKey="duration"
          title="On oriente un peu ?"
          subtitle="Côté durée, vous êtes plutôt…"
          options={DURATION_OPTIONS}
          picked={picked}
          onPick={pickDuration}
        />
      )}
      {step === 1 && (
        <QuestionScreen
          stepKey="genre"
          subtitle="Côté ambiance, vous êtes plutôt…"
          options={genreOptions}
          picked={picked}
          onPick={pickGenre}
        />
      )}
      {step === 2 && (
        <QuestionScreen
          stepKey="origin"
          subtitle="Ce soir, plutôt…"
          options={ORIGIN_OPTIONS}
          picked={picked}
          onPick={pickOrigin}
          loading={drawing}
          loadingLabel="On pioche…"
        />
      )}

      {error && <p className="mt-4 animate-fade-in text-sm text-accent">{error}</p>}
    </div>
  );
}

function QuestionScreen<T extends string>({
  stepKey,
  title,
  subtitle,
  options,
  picked,
  onPick,
  loading,
  loadingLabel,
}: {
  stepKey: string;
  title?: string;
  subtitle: string;
  options: readonly { value: T; label: string }[];
  picked: string | null;
  onPick: (value: T) => void;
  loading?: boolean;
  loadingLabel?: string;
}) {
  return (
    <div key={stepKey} className="flex animate-fade-in-up flex-col gap-4">
      {title && <h2 className="font-display text-xl">{title}</h2>}
      <p className="text-ink/60">{subtitle}</p>
      <div className="flex flex-col gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={loading}
            onClick={() => onPick(opt.value)}
            className={`rounded-sm border px-4 py-3 text-left font-display text-lg transition-all duration-150 active:scale-[0.99] disabled:opacity-50 ${
              picked === opt.value
                ? "border-ink bg-ink text-paper"
                : "border-ink/20 hover:border-ink"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {loading && (
        <p className="animate-fade-in text-sm text-ink/50">{loadingLabel}</p>
      )}
    </div>
  );
}
