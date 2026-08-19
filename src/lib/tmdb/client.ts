const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export class TmdbNotConfiguredError extends Error {}

/**
 * Requête à l'API TMDB v3 (clé API en query param — voir
 * https://developer.themoviedb.org/reference/intro/getting-started).
 * `TMDB_API_KEY` doit être fournie en variable d'environnement ; aucune
 * synchro "découverte" n'est possible sans elle.
 */
export async function tmdbFetch<T>(
  path: string,
  params: Record<string, string> = {}
): Promise<T> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new TmdbNotConfiguredError(
      "Clé API TMDB manquante (variable d'environnement TMDB_API_KEY)."
    );
  }

  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "fr-FR");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`TMDB a refusé la requête ${path} (${res.status}).`);
  }
  return res.json() as Promise<T>;
}
