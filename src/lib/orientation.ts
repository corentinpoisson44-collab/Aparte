/**
 * Questions d'orientation posées à chaque membre avant le tirage (mood,
 * temps dispo, veto, époque) et façon de combiner les réponses des deux.
 * Module partagé client/serveur : pas d'accès base ici.
 */

import { formatRuntime } from "@/lib/format";

export type Option<T extends string> = {
  value: T;
  emoji: string;
  label: string;
  /** Précision affichée en petit sous le libellé (ex. "1h40 max"). */
  hint?: string;
};

// ─── Mood ────────────────────────────────────────────────────────────────

export const MOOD_OPTIONS = [
  { value: "cocooning", emoji: "🛋️", label: "Cocooning" },
  { value: "laugh", emoji: "😂", label: "Juste rigoler" },
  { value: "adrenaline", emoji: "💥", label: "Adrénaline" },
  { value: "chills", emoji: "😱", label: "Frissons" },
  { value: "brain", emoji: "🤯", label: "Se retourner le cerveau" },
  { value: "cry", emoji: "😭", label: "Prêt·e à pleurer" },
] as const satisfies readonly Option<string>[];
export type Mood = (typeof MOOD_OPTIONS)[number]["value"];

/**
 * Genres (normalisés, comparés par "contient") couverts par chaque mood.
 * Les genres Plex arrivent en français ou en anglais selon la langue de la
 * bibliothèque : on liste les deux.
 */
const MOOD_GENRES: Record<Mood, string[]> = {
  cocooning: ["comedie", "comedy", "romance", "animation", "famil"],
  laugh: ["comedie", "comedy"],
  adrenaline: ["action", "aventure", "adventure", "thriller"],
  chills: ["horreur", "horror", "epouvante", "thriller"],
  brain: ["science", "sci-fi", "mystere", "mystery", "drame", "drama", "documentaire", "documentary"],
  cry: ["drame", "drama", "romance"],
};

// ─── Temps dispo ─────────────────────────────────────────────────────────

/** Durée max des films (minutes) pour chaque choix ; `null` = pas de limite. */
const TIME_MAX_RUNTIME = { quick: 100, normal: 140, night: null } as const;

export const TIME_OPTIONS = [
  {
    value: "quick",
    emoji: "⚡",
    label: "Vite fait",
    hint: `${formatRuntime(TIME_MAX_RUNTIME.quick)} max`,
  },
  {
    value: "normal",
    emoji: "🍿",
    label: "Normal",
    hint: `${formatRuntime(TIME_MAX_RUNTIME.normal)} max`,
  },
  { value: "night", emoji: "🌙", label: "On a toute la nuit", hint: "sans limite" },
] as const satisfies readonly Option<string>[];
export type TimeBudget = (typeof TIME_OPTIONS)[number]["value"];

/** Ordre "du plus pressé au moins pressé" : à deux, le plus pressé l'emporte. */
const TIME_ORDER: TimeBudget[] = ["quick", "normal", "night"];
/**
 * Nombre de films proposés (plus demandé) : 5 de base, 7 quand les moods
 * diffèrent pour faire de la place aux deux envies — dans la limite des
 * films qui collent vraiment aux critères (voir src/lib/draw.ts), sans
 * jamais descendre sous 5.
 */
export const MIN_COUNT = 5;
const MIXED_MOODS_COUNT = 7;

// ─── Veto ────────────────────────────────────────────────────────────────

export const VETO_OPTIONS = [
  { value: "scary", emoji: "🚫", label: "Rien qui fait peur" },
  { value: "sad", emoji: "🚫", label: "Rien de trop triste" },
  { value: "animation", emoji: "🚫", label: "Pas d'animation" },
] as const satisfies readonly Option<string>[];
export type Veto = (typeof VETO_OPTIONS)[number]["value"];

const VETO_GENRES: Record<Veto, string[]> = {
  scary: ["horreur", "horror", "epouvante"],
  sad: ["drame", "drama", "guerre", "war"],
  animation: ["animation"],
};

// ─── Époque ──────────────────────────────────────────────────────────────

export const ERA_OPTIONS = [
  { value: "classic", emoji: "📼", label: "Vieux classique" },
  { value: "y2k", emoji: "📀", label: "Années 90–2000" },
  { value: "recent", emoji: "🆕", label: "Récent" },
] as const satisfies readonly Option<string>[];
export type Era = (typeof ERA_OPTIONS)[number]["value"];

export type YearRange = { min: number | null; max: number | null };
const ERA_RANGES: Record<Era, YearRange> = {
  classic: { min: null, max: 1989 },
  y2k: { min: 1990, max: 2009 },
  recent: { min: 2010, max: null },
};

// ─── Réponses ────────────────────────────────────────────────────────────

/**
 * Réponses d'un membre ; `null` ou liste vide = "peu importe" (aucune
 * préférence). Mood et époque sont à choix multiple ; le temps (une durée
 * max) et le veto sont à choix unique — `vetoes` reste une liste d'au plus
 * un élément, les vetos des deux membres se cumulant au tirage.
 */
export type OrientationAnswers = {
  moods: Mood[];
  time: TimeBudget | null;
  vetoes: Veto[];
  eras: Era[];
};

export const EMPTY_ANSWERS: OrientationAnswers = {
  moods: [],
  time: null,
  vetoes: [],
  eras: [],
};

function oneOf<T extends string>(options: readonly Option<T>[], value: unknown): T | null {
  return options.some((o) => o.value === value) ? (value as T) : null;
}

/** Valeurs valides et sans doublon d'une liste (une valeur seule est acceptée aussi). */
function someOf<T extends string>(options: readonly Option<T>[], raw: unknown): T[] {
  const items = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
  return [...new Set(items.map((v) => oneOf(options, v)).filter((v): v is T => v !== null))];
}

/** Valide des réponses reçues de l'extérieur (corps de requête, base). */
export function parseAnswers(raw: unknown): OrientationAnswers {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    // `mood` / `era` : ancien format à choix unique, encore accepté.
    moods: someOf(MOOD_OPTIONS, r.moods ?? r.mood),
    time: oneOf(TIME_OPTIONS, r.time),
    vetoes: someOf(VETO_OPTIONS, r.vetoes).slice(0, 1),
    eras: someOf(ERA_OPTIONS, r.eras ?? r.era),
  };
}

/** Mêmes valeurs, dans n'importe quel ordre. */
export function sameSet<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((v) => b.includes(v));
}

// ─── Combinaison des réponses des deux membres ──────────────────────────

/** Critères de tirage issus du mélange des réponses de chacun. */
export type DrawCriteria = {
  /**
   * Un ensemble de genres par membre ayant choisi au moins un mood (les
   * genres de tous ses moods) ; vide = pas de contrainte.
   */
  moodGenreSets: string[][];
  /** Durée max en minutes (la plus courte des deux) ; `null` = pas de limite. */
  maxRuntime: number | null;
  /** Époques acceptées (union) ; vide = toutes. */
  eraRanges: YearRange[];
  /** Genres exclus (vetos cumulés des deux). */
  excludedGenres: string[];
  /** Nombre de films visé (5, ou 7 si les moods des deux diffèrent). */
  count: number;
  /** Plancher : on propose toujours au moins ce nombre de films. */
  minCount: number;
};

/**
 * Mélange les réponses : moods additionnés (chacun peut en cocher plusieurs ;
 * les films qui plaisent aux deux passent en priorité, voir
 * src/lib/draw.ts), le plus pressé l'emporte sur la durée, vetos cumulés,
 * époques additionnées. "Peu importe" ne vote pas : il laisse la main à
 * l'autre.
 */
export function combineAnswers(all: OrientationAnswers[]): DrawCriteria {
  const times = all.map((a) => a.time).filter((t): t is TimeBudget => t !== null);
  const time = times.length
    ? TIME_ORDER[Math.min(...times.map((t) => TIME_ORDER.indexOf(t)))]
    : null;

  // Un vote par membre ayant choisi des moods (deux choix identiques n'en font qu'un).
  const moodVotes: Mood[][] = [];
  for (const { moods } of all) {
    if (moods.length > 0 && !moodVotes.some((v) => sameSet(v, moods))) moodVotes.push(moods);
  }
  const eras = [...new Set(all.flatMap((a) => a.eras))];
  const vetoes = [...new Set(all.flatMap((a) => a.vetoes))];

  return {
    moodGenreSets: moodVotes.map((moods) => [...new Set(moods.flatMap((m) => MOOD_GENRES[m]))]),
    maxRuntime: time ? TIME_MAX_RUNTIME[time] : null,
    eraRanges: eras.map((e) => ERA_RANGES[e]),
    excludedGenres: vetoes.flatMap((v) => VETO_GENRES[v]),
    count: moodVotes.length > 1 ? MIXED_MOODS_COUNT : MIN_COUNT,
    minCount: MIN_COUNT,
  };
}

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Genres d'un film (format "Action, Science-fiction"), normalisés. */
export function movieGenres(genre: string): string[] {
  return genre.split(",").map(normalize).filter(Boolean);
}

export function hasAnyGenre(genres: string[], keywords: string[]): boolean {
  return genres.some((g) => keywords.some((k) => g.includes(k)));
}

// ─── Libellés ────────────────────────────────────────────────────────────

export function optionLabel<T extends string>(
  options: readonly Option<T>[],
  value: T
): string {
  const opt = options.find((o) => o.value === value);
  return opt ? `${opt.emoji} ${opt.label}` : value;
}
