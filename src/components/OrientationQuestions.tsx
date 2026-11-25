"use client";

import { useState } from "react";
import {
  EMPTY_ANSWERS,
  ERA_OPTIONS,
  MOOD_OPTIONS,
  TIME_OPTIONS,
  VETO_OPTIONS,
  type OrientationAnswers,
  type Veto,
} from "@/lib/orientation";

const ANY = "any";
const STEP_COUNT = 4;
/** Pause pour laisser voir la sélection avant de passer à l'écran suivant. */
const ADVANCE_DELAY_MS = 220;

type Choice = { value: string; emoji: string; label: string; hint?: string };

const ANY_CHOICE: Choice = { value: ANY, emoji: "🤷", label: "Peu importe" };
const NO_VETO_CHOICE: Choice = { value: ANY, emoji: "👌", label: "Tout me va" };
const MULTI_HINT = "Plusieurs choix possibles.";

/** Questions à choix multiple et le champ de réponse (liste) correspondant. */
type MultiField = "moods" | "eras";

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Formulations tirées au hasard à chaque fois, pour que le questionnaire
 * sonne comme une conversation plutôt qu'un formulaire — avec quelques
 * clins d'œil au jour et à l'heure.
 */
function phrasings(now: Date) {
  const day = now.getDay();
  const hour = now.getHours();
  const clock = `${hour}h${String(now.getMinutes()).padStart(2, "0")}`;
  const evening = hour >= 17 || hour < 4;
  const late = hour >= 21 || hour < 4;

  const mood = ["Quel mood ce soir ?", "Tu te sens comment, là ?", "Ce soir, t'as envie de quoi ?"];
  if (evening && day === 0) mood.push("Dimanche soir… plutôt cocooning ?");
  if (evening && day === 5) mood.push("Vendredi soir ! Quel mood ?");

  const time = [
    "Pas trop le temps, besoin d'un film court ?",
    "On a combien de temps devant nous ?",
    "Côté temps, t'es large ?",
  ];
  if (late) time.push(`Il est ${clock}… film court ou on a la soirée devant nous ?`);

  return {
    mood: pick(mood),
    time: pick(time),
    veto: pick([
      "Un truc que tu ne veux surtout pas ce soir ?",
      "Des envies de veto ?",
      "Quelque chose à éviter absolument ?",
    ]),
    era: pick([
      "Plutôt vieux classique ou sorti récemment ?",
      "On voyage dans le temps ?",
      "Une époque qui te tente ?",
    ]),
  };
}

/**
 * Questions posées à chaque membre avant le tirage — un écran par question :
 * mood, temps dispo, veto, époque. Mood et époque sont à choix multiple
 * (bouton pour valider) ; le temps (une durée max) et le veto, à choix
 * unique (on avance dès qu'on touche une réponse). Les réponses restent secrètes ; dès que
 * les deux ont répondu, le serveur tire les films en mélangeant les envies
 * de chacun (voir POST /api/sessions/[code]/answers). Tout est facultatif :
 * "peu importe" laisse la main à l'autre.
 */
export function OrientationQuestions({
  code,
  memberId,
  onDone,
  onCancel,
}: {
  code: string;
  memberId: string;
  /** `drawn` : true si cette réponse était la dernière attendue et que les films sont tirés. */
  onDone: (drawn: boolean) => void;
  /** Absent : pas de bouton pour quitter au premier écran. */
  onCancel?: () => void;
}) {
  const [titles] = useState(() => phrasings(new Date()));
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OrientationAnswers>(EMPTY_ANSWERS);
  const [picked, setPicked] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(body: Partial<OrientationAnswers> & { skipped?: boolean }) {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${code}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, ...body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Impossible d'envoyer tes réponses pour le moment, réessaie.");
        setPicked(null);
        return;
      }
      onDone(Boolean(data.drawn));
    } catch {
      setError("Petit souci de connexion — réessaie.");
      setPicked(null);
    } finally {
      setSending(false);
    }
  }

  /** Enregistre une réponse, puis passe à l'écran suivant (ou envoie tout au dernier). */
  function answer(value: string, patch: Partial<OrientationAnswers>) {
    setPicked(value);
    const next = { ...answers, ...patch };
    setAnswers(next);
    window.setTimeout(() => {
      setPicked(null);
      if (step < STEP_COUNT - 1) setStep(step + 1);
      else submit(next);
    }, ADVANCE_DELAY_MS);
  }

  /** Coche / décoche une option d'une question à choix multiple. */
  function toggle(field: MultiField, value: string) {
    setAnswers((a) => {
      const current = a[field] as string[];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...a, [field]: next };
    });
  }

  /** Props communes aux questions à choix multiple ("Peu importe" vide la liste et avance). */
  function multi(field: MultiField) {
    const selected = answers[field] as string[];
    return {
      isPicked: (v: string) => (v === ANY ? picked === ANY : selected.includes(v)),
      onPick: (v: string) => (v === ANY ? answer(v, { [field]: [] }) : toggle(field, v)),
      footer: selected.length > 0 && (
        <button
          type="button"
          disabled={sending}
          onClick={() => {
            if (step < STEP_COUNT - 1) setStep(step + 1);
            else submit(answers);
          }}
          className="w-full animate-fade-in rounded-sm bg-ink px-4 py-3 font-medium text-paper transition-all duration-150 hover:bg-accent active:scale-[0.98] disabled:opacity-50"
        >
          {step < STEP_COUNT - 1 ? "C'est tout" : "C'est parti"}
        </button>
      ),
    };
  }

  function back() {
    if (step === 0) {
      onCancel?.();
      return;
    }
    setError(null);
    setPicked(null);
    setStep((s) => s - 1);
  }

  const orAny = (value: string) => (value === ANY ? null : value);
  const showBack = step > 0 || onCancel;

  return (
    <div className="flex min-h-[24rem] flex-col">
      <div className="mb-8 flex items-center gap-3">
        {showBack ? (
          <button
            onClick={back}
            disabled={sending}
            aria-label={step === 0 ? "Annuler" : "Retour"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-lg text-ink/50 transition-colors hover:text-ink disabled:opacity-40"
          >
            {step === 0 ? "×" : "‹"}
          </button>
        ) : (
          <span className="h-8 w-0" />
        )}
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
        <button
          type="button"
          onClick={() => submit({ skipped: true })}
          disabled={sending}
          className="shrink-0 text-sm text-ink/40 underline-offset-4 transition-colors hover:text-ink/70 hover:underline disabled:opacity-40"
        >
          Passer
        </button>
      </div>

      {step === 0 && (
        <QuestionScreen
          stepKey="mood"
          title={titles.mood}
          hint={`4 petites questions avant les films — tes réponses restent secrètes 🤫 ${MULTI_HINT}`}
          choices={[...MOOD_OPTIONS, ANY_CHOICE]}
          {...multi("moods")}
        />
      )}
      {step === 1 && (
        <QuestionScreen
          stepKey="time"
          title={titles.time}
          choices={[...TIME_OPTIONS, ANY_CHOICE]}
          isPicked={(v) => (picked ?? answers.time) === v}
          onPick={(v) => answer(v, { time: orAny(v) as OrientationAnswers["time"] })}
        />
      )}
      {step === 2 && (
        <QuestionScreen
          stepKey="veto"
          title={titles.veto}
          choices={[...VETO_OPTIONS, NO_VETO_CHOICE]}
          isPicked={(v) => (picked ?? answers.vetoes[0] ?? null) === v}
          onPick={(v) => answer(v, { vetoes: v === ANY ? [] : [v as Veto] })}
        />
      )}
      {step === 3 && (
        <QuestionScreen
          stepKey="era"
          title={titles.era}
          hint={MULTI_HINT}
          choices={[...ERA_OPTIONS, ANY_CHOICE]}
          {...multi("eras")}
          loading={sending}
        />
      )}

      {error && <p className="mt-4 animate-fade-in text-sm text-accent">{error}</p>}
    </div>
  );
}

function QuestionScreen({
  stepKey,
  title,
  hint,
  choices,
  isPicked,
  onPick,
  footer,
  loading,
}: {
  stepKey: string;
  title: string;
  hint?: string;
  choices: readonly Choice[];
  isPicked: (value: string) => boolean;
  onPick: (value: string) => void;
  footer?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div key={stepKey} className="flex animate-fade-in-up flex-col gap-4">
      <div>
        <h2 className="font-display text-2xl leading-tight">{title}</h2>
        {hint && <p className="mt-1 text-sm text-ink/50">{hint}</p>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {choices.map((c) => (
          <button
            key={c.value}
            type="button"
            disabled={loading}
            aria-pressed={isPicked(c.value)}
            onClick={() => onPick(c.value)}
            className={`flex items-center justify-center rounded-sm border text-center font-display leading-tight transition-all duration-150 active:scale-[0.97] disabled:opacity-50 ${
              // "Peu importe" / "Tout me va" : toute la largeur de la grille,
              // pour qu'on le repère tout de suite.
              c.value === ANY
                ? "col-span-3 gap-3 px-4 py-6 text-lg"
                : "aspect-square flex-col gap-1.5 p-2 text-sm"
            } ${
              isPicked(c.value)
                ? "border-ink bg-ink text-paper"
                : "border-ink/20 hover:border-ink"
            }`}
          >
            <span className={`${c.value === ANY ? "text-3xl" : "text-2xl"} leading-none`}>
              {c.emoji}
            </span>
            <span>
              {c.label}
              {c.hint && (
                <span
                  className={`mt-1 block font-sans text-xs ${
                    isPicked(c.value) ? "text-paper/70" : "text-ink/50"
                  }`}
                >
                  {c.hint}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
      {footer}
      {loading && <p className="animate-fade-in text-sm text-ink/50">C&apos;est noté…</p>}
    </div>
  );
}
