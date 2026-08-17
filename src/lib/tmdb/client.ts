import { TMDB_API_BASE } from "./constants";

export class TmdbNotConfiguredError extends Error {}

export function tmdbApiKey(): string | undefined {
  return process.env.TMDB_API_KEY || undefined;
}

export function isTmdbConfigured(): boolean {
  return Boolean(tmdbApiKey());
}

/**
 * TMDB accepte deux formats de clé : l'ancienne clé API v3 (à passer en
 * paramètre `api_key`) et le jeton de lecture v4 (JWT, à passer en
 * `Authorization: Bearer`). On détecte le format pour accepter les deux
 * sans configuration supplémentaire.
 */
function isV4ReadToken(key: string): boolean {
  return key.startsWith("eyJ");
}

export async function tmdbFetch<T>(
  path: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T> {
  const key = tmdbApiKey();
  if (!key) {
    throw new TmdbNotConfiguredError("TMDB_API_KEY n'est pas configurée.");
  }

  const url = new URL(`${TMDB_API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (isV4ReadToken(key)) {
    headers.Authorization = `Bearer ${key}`;
  } else {
    url.searchParams.set("api_key", key);
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`TMDB a répondu ${res.status} pour ${path}.`);
  }
  return res.json();
}
