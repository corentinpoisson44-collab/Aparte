/**
 * Emoji par genre pour repérer l'ambiance d'un coup d'œil (affichage
 * uniquement — les genres viennent tels quels de Plex/`prisma/seed.ts`).
 * Les clés sont normalisées (minuscules, sans accents) pour matcher malgré
 * les variantes de casse ou d'orthographe.
 */
const GENRE_EMOJIS: Record<string, string> = {
  action: "💥",
  aventure: "🗺️",
  adventure: "🗺️",
  animation: "🎨",
  comedie: "😂",
  "comedie musicale": "🎤",
  comedy: "😂",
  musical: "🎤",
  crime: "🔫",
  policier: "🕵️",
  documentaire: "🎥",
  documentary: "🎥",
  drame: "🎭",
  drama: "🎭",
  famille: "👨‍👩‍👧‍👦",
  family: "👨‍👩‍👧‍👦",
  fantastique: "🧙",
  fantasy: "🧙",
  guerre: "⚔️",
  war: "⚔️",
  histoire: "📜",
  history: "📜",
  horreur: "👻",
  horror: "👻",
  musique: "🎵",
  music: "🎵",
  mystere: "🔍",
  mystery: "🔍",
  romance: "💕",
  "science-fiction": "🚀",
  "science fiction": "🚀",
  "sci-fi": "🚀",
  thriller: "😱",
  western: "🤠",
  biopic: "📖",
  sport: "🏆",
  telefilm: "📺",
  "court metrage": "🎞️",
};

const FALLBACK_EMOJI = "🎬";

function normalize(genre: string): string {
  return genre
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Emoji associé à un genre (ou 🎬 par défaut si inconnu). */
export function genreEmoji(genre: string): string {
  return GENRE_EMOJIS[normalize(genre)] ?? FALLBACK_EMOJI;
}

/**
 * Formate une liste de genres séparés par des virgules (format de
 * `Movie.genre`) en préfixant chaque genre de son emoji, ex.
 * "Animation, Fantastique" → "🎨 Animation, 🧙 Fantastique".
 */
export function formatGenresWithEmojis(genre: string): string {
  return genre
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `${genreEmoji(part)} ${part}`)
    .join(", ");
}
