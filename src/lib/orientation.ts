/**
 * Questions d'orientation posées à chaque membre avant le tirage (mood,
 * temps dispo, veto, époque) et façon de combiner les réponses des deux.
 * Module partagé client/serveur : pas d'accès base ici.
 */

export type Option<T extends string> = { value: T; emoji: string; label: string };

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

export const TIME_OPTIONS = [
  { value: "quick", emoji: "⚡", label: "Vite fait" },
  { value: "normal", emoji: "🍿", label: "Normal" },
  { value: "night", emoji: "🌙", label: "On a toute la nuit" },
] as const satisfies readonly Option<string>[];
export type TimeBudget = (typeof TIME_OPTIONS)[number]["value"];

/** Ordre "du plus pressé au moins pressé" : à deux, le plus pressé l'emporte. */
const TIME_ORDER: TimeBudget[] = ["quick", "normal", "night"];
const TIME_MAX_RUNTIME: Record<TimeBudget, number | null> = {
  quick: 100,
  normal: 140,
  night: null,
};
/**
 * Le nombre de films proposés n'est plus demandé : il découle du temps dispo
 * (au moins 5 films, un peu plus quand on a toute la nuit).
 */
const TIME_COUNT: Record<TimeBudget, number> = { quick: 5, normal: 5, night: 6 };
const DEFAULT_COUNT = 5;

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

/** Réponses d'un membre ; `null` = "peu importe" (aucune préférence). */
export type OrientationAnswers = {
  mood: Mood | null;
  time: TimeBudget | null;
  vetoes: Veto[];
  era: Era | null;
};

export const EMPTY_ANSWERS: OrientationAnswers = {
  mood: null,
  time: null,
  vetoes: [],
  era: null,
};

function oneOf<T extends string>(options: readonly Option<T>[], value: unknown): T | null {
  return options.some((o) => o.value === value) ? (value as T) : null;
}

/** Valide des réponses reçues de l'extérieur (corps de requête, base). */
export function parseAnswers(raw: unknown): OrientationAnswers {
  const r = (raw ?? {}) as Record<string, unknown>;
  const vetoes = Array.isArray(r.vetoes)
    ? [...new Set(r.vetoes.map((v) => oneOf(VETO_OPTIONS, v)).filter((v): v is Veto => v !== null))]
    : [];
  return {
    mood: oneOf(MOOD_OPTIONS, r.mood),
    time: oneOf(TIME_OPTIONS, r.time),
    vetoes,
    era: oneOf(ERA_OPTIONS, r.era),
  };
}

// ─── Combinaison des réponses des deux membres ──────────────────────────

/** Critères de tirage issus du mélange des réponses de chacun. */
export type DrawCriteria = {
  /** Un ensemble de genres par membre ayant choisi un mood ; vide = pas de contrainte. */
  moodGenreSets: string[][];
  /** Durée max en minutes (la plus courte des deux) ; `null` = pas de limite. */
  maxRuntime: number | null;
  /** Époques acceptées (union) ; vide = toutes. */
  eraRanges: YearRange[];
  /** Genres exclus (vetos cumulés des deux). */
  excludedGenres: string[];
  /** Nombre de films à proposer, déduit du temps dispo. */
  count: number;
};

/**
 * Mélange les réponses : moods additionnés (les films qui plaisent aux deux
 * passent en priorité, voir src/lib/draw.ts), le plus pressé l'emporte sur
 * la durée, vetos cumulés, époques additionnées. "Peu importe" ne vote pas :
 * il laisse la main à l'autre.
 */
export function combineAnswers(all: OrientationAnswers[]): DrawCriteria {
  const times = all.map((a) => a.time).filter((t): t is TimeBudget => t !== null);
  const time = times.length
    ? TIME_ORDER[Math.min(...times.map((t) => TIME_ORDER.indexOf(t)))]
    : null;

  const moods = [...new Set(all.map((a) => a.mood).filter((m): m is Mood => m !== null))];
  const eras = [...new Set(all.map((a) => a.era).filter((e): e is Era => e !== null))];
  const vetoes = [...new Set(all.flatMap((a) => a.vetoes))];

  return {
    moodGenreSets: moods.map((m) => MOOD_GENRES[m]),
    maxRuntime: time ? TIME_MAX_RUNTIME[time] : null,
    eraRanges: eras.map((e) => ERA_RANGES[e]),
    excludedGenres: vetoes.flatMap((v) => VETO_GENRES[v]),
    count: time ? TIME_COUNT[time] : DEFAULT_COUNT,
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
