"use client";

import {
  ERA_OPTIONS,
  MOOD_OPTIONS,
  TIME_OPTIONS,
  VETO_OPTIONS,
  optionLabel,
  sameSet,
  type Option,
} from "@/lib/orientation";
import type { MemberAnswersDTO } from "@/lib/types";

type Line = { label: string; text: string; agreed: boolean };

function labels<T extends string>(options: readonly Option<T>[], values: readonly T[]): string {
  return values.map((v) => optionLabel(options, v)).join(", ");
}

/**
 * Compare une question entre les deux : raccord, l'un répond "peu importe"
 * et on suit l'autre, ou envies différentes — avec la façon dont on
 * les a combinées (voir `combineAnswers` dans src/lib/orientation.ts).
 * Liste vide = "peu importe" ; une question à choix unique passe une liste
 * d'au plus un élément.
 */
function compare<T extends string>(
  label: string,
  options: readonly Option<T>[],
  mine: readonly T[],
  theirs: readonly T[],
  partnerName: string,
  mixed: (mine: string, theirs: string) => string
): Line | null {
  if (mine.length === 0 && theirs.length === 0) return null;
  if (sameSet(mine, theirs)) {
    return { label, text: `${labels(options, mine)} tous les deux 🎯`, agreed: true };
  }
  if (theirs.length === 0) {
    return {
      label,
      text: `Peu importe pour ${partnerName} → on a suivi ton choix : ${labels(options, mine)}`,
      agreed: true,
    };
  }
  if (mine.length === 0) {
    return {
      label,
      text: `Peu importe pour toi → on a suivi ${partnerName} : ${labels(options, theirs)}`,
      agreed: true,
    };
  }
  const common = mine.filter((v) => theirs.includes(v));
  if (common.length > 0) {
    // Choix multiples qui se recoupent : raccord sur l'essentiel.
    return {
      label,
      text: `Toi : ${labels(options, mine)} · ${partnerName} : ${labels(options, theirs)} → ${labels(options, common)} en commun 🎯`,
      agreed: true,
    };
  }
  return {
    label,
    text: mixed(labels(options, mine), labels(options, theirs)),
    agreed: false,
  };
}

function buildLines(me: MemberAnswersDTO, partner: MemberAnswersDTO, partnerName: string): Line[] {
  const one = <T,>(v: T | null) => (v === null ? [] : [v]);
  const lines: (Line | null)[] = [
    compare("Mood", MOOD_OPTIONS, me.moods, partner.moods, partnerName, (a, b) =>
      `Toi : ${a} · ${partnerName} : ${b} → on a mélangé les deux 😄`
    ),
    compare("Temps", TIME_OPTIONS, one(me.time), one(partner.time), partnerName, (a, b) => {
      const order = TIME_OPTIONS.map((o) => o.value);
      const rushed =
        order.indexOf(me.time!) <= order.indexOf(partner.time!) ? a : b;
      return `Toi : ${a} · ${partnerName} : ${b} → le plus pressé l'emporte, ${rushed}`;
    }),
    compare("Époque", ERA_OPTIONS, me.eras, partner.eras, partnerName, (a, b) =>
      `Toi : ${a} · ${partnerName} : ${b} → un peu des deux`
    ),
  ];

  const vetoes = [...new Set([...me.vetoes, ...partner.vetoes])];
  if (vetoes.length > 0) {
    const list = labels(VETO_OPTIONS, vetoes);
    const sameVetoes = sameSet(me.vetoes, partner.vetoes);
    const bothVetoed = me.vetoes.length > 0 && partner.vetoes.length > 0;
    lines.push({
      label: "Vetos",
      text: sameVetoes
        ? `Mêmes vetos : ${list} 🎯`
        : bothVetoed
          ? `Vetos cumulés : ${list}`
          : me.vetoes.length > 0
            ? `Tes vetos, respectés : ${list}`
            : `Les vetos de ${partnerName}, respectés : ${list}`,
      // Un seul des deux a posé des vetos : pas un désaccord pour autant.
      agreed: sameVetoes || !bothVetoed,
    });
  }

  return lines.filter((l): l is Line => l !== null);
}

/**
 * Petit écran entre le tirage et le classement : les réponses de chacun,
 * secrètes jusque-là, et où vous étiez raccord (ou pas).
 */
export function MatchSummary({
  me,
  partner,
  partnerName,
  onContinue,
}: {
  me: MemberAnswersDTO;
  partner: MemberAnswersDTO;
  partnerName: string;
  onContinue: () => void;
}) {
  const lines = buildLines(me, partner, partnerName);
  const agreedCount = lines.filter((l) => l.agreed).length;
  const headline =
    lines.length === 0
      ? "Ni l'un ni l'autre n'aviez de préférence 🤷"
      : agreedCount === lines.length
        ? "Sur la même longueur d'onde 🎯"
        : agreedCount === 0
          ? "Deux envies bien différentes… on a mélangé 😄"
          : "Raccord sur pas mal de choses 👌";

  return (
    <div className="flex animate-fade-in-up flex-col gap-6 py-6">
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-[0.15em] text-ink/50">
          Vos réponses
        </p>
        <h2 className="font-display text-2xl leading-tight">{headline}</h2>
      </div>
      {lines.length > 0 && (
        <ul className="flex flex-col gap-3">
          {lines.map((l, i) => (
            <li
              key={l.label}
              className={`animate-fade-in-up border-l-2 pl-3 ${
                l.agreed ? "border-ink" : "border-accent"
              }`}
              style={{ animationDelay: `${120 + i * 120}ms` }}
            >
              <p className="text-xs uppercase tracking-[0.15em] text-ink/50">{l.label}</p>
              <p>{l.text}</p>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={onContinue}
        className="w-full rounded-sm bg-ink px-4 py-3 font-medium text-paper transition-all duration-150 hover:bg-accent active:scale-[0.98]"
      >
        Voir les films
      </button>
    </div>
  );
}
