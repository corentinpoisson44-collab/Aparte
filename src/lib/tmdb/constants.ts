export const TMDB_API_BASE = "https://api.themoviedb.org/3";
export const TMDB_POSTER_BASE = "https://image.tmdb.org/t/p/w500";

/** Région utilisée pour filtrer les fournisseurs de streaming disponibles. */
export const TMDB_WATCH_REGION = "FR";

/**
 * Association plateforme Aparté -> nom(s) tels que renvoyés par
 * `/watch/providers/movie` pour la région FR (les noms TMDB ne
 * correspondent pas toujours exactement au libellé affiché dans l'app).
 */
export const TMDB_PROVIDER_NAME_ALIASES: Record<string, string[]> = {
  Netflix: ["Netflix"],
  "Disney+": ["Disney Plus", "Disney+"],
  "Amazon Prime Video": ["Amazon Prime Video"],
  "Canal+": ["Canal+"],
  "Apple TV+": ["Apple TV Plus", "Apple TV+"],
  Max: ["Max", "HBO Max"],
  "Paramount+": ["Paramount Plus", "Paramount+"],
};

/** Nombre de films importés par plateforme à chaque synchronisation. */
export const MOVIES_PER_PLATFORM = 20;
