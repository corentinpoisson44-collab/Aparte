/**
 * Sources connues (Plex + plateformes de streaming courantes en France),
 * proposées comme cases à cocher pour filtrer les films piochés. La valeur
 * doit correspondre exactement au champ `Movie.platform`.
 */
export const KNOWN_SOURCES = [
  "Plex",
  "Netflix",
  "Disney+",
  "Amazon Prime Video",
  "Canal+",
  "Apple TV+",
  "Max",
  "Paramount+",
] as const;

export type KnownSource = (typeof KNOWN_SOURCES)[number];
