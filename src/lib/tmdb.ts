const TMDB_API_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

type TmdbGenre = { id: number; name: string };
type TmdbSearchResult = {
  id: number;
  poster_path: string | null;
  genre_ids: number[];
  release_date?: string;
};

export type TmdbMovieMatch = {
  tmdbId: number;
  posterUrl: string | null;
  genre: string;
};

/** Genres TMDB (langue fr-FR), à récupérer une seule fois par run. */
export async function fetchTmdbGenreMap(apiKey: string): Promise<Map<number, string>> {
  const url = `${TMDB_API_BASE}/genre/movie/list?language=fr-FR&api_key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TMDB genre list a échoué (${res.status}).`);
  }
  const data = (await res.json()) as { genres: TmdbGenre[] };
  return new Map(data.genres.map((g) => [g.id, g.name]));
}

/**
 * Cherche un film par titre + année sur TMDB et retourne son affiche et son
 * genre. Retourne null si aucun résultat ne correspond.
 */
export async function searchTmdbMovie(
  apiKey: string,
  title: string,
  year: number,
  genreMap: Map<number, string>
): Promise<TmdbMovieMatch | null> {
  const params = new URLSearchParams({
    query: title,
    year: String(year),
    language: "fr-FR",
    api_key: apiKey,
  });
  const res = await fetch(`${TMDB_API_BASE}/search/movie?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`TMDB search a échoué pour "${title}" (${res.status}).`);
  }
  const data = (await res.json()) as { results: TmdbSearchResult[] };

  // On préfère un résultat dont l'année de sortie correspond exactement,
  // sinon on retombe sur le premier résultat (trié par pertinence par TMDB).
  const best =
    data.results.find((r) => r.release_date?.startsWith(String(year))) ??
    data.results[0];

  if (!best) return null;

  const genre = best.genre_ids
    .map((id) => genreMap.get(id))
    .filter((name): name is string => Boolean(name))
    .join(", ");

  return {
    tmdbId: best.id,
    posterUrl: best.poster_path ? `${TMDB_IMAGE_BASE}${best.poster_path}` : null,
    genre,
  };
}
