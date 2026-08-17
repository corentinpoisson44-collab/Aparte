import { tmdbFetch } from "./client";
import { TMDB_PROVIDER_NAME_ALIASES, TMDB_WATCH_REGION } from "./constants";

type WatchProvidersResponse = {
  results: Array<{ provider_id: number; provider_name: string }>;
};

let cachedProviderIds: Record<string, number> | null = null;

function normalize(name: string): string {
  return name.toLowerCase().replace(/[+]/g, " plus").replace(/\s+/g, " ").trim();
}

/**
 * Résout l'identifiant TMDB de chaque plateforme connue (hors Plex) pour la
 * région FR, en comparant les noms renvoyés par TMDB à nos alias connus.
 * Mis en cache en mémoire le temps du process (les identifiants TMDB sont
 * stables).
 */
export async function resolveProviderIds(): Promise<Record<string, number>> {
  if (cachedProviderIds) return cachedProviderIds;

  const { results } = await tmdbFetch<WatchProvidersResponse>("/watch/providers/movie", {
    watch_region: TMDB_WATCH_REGION,
  });

  const byNormalizedName = new Map(results.map((p) => [normalize(p.provider_name), p.provider_id]));

  const resolved: Record<string, number> = {};
  for (const [platform, aliases] of Object.entries(TMDB_PROVIDER_NAME_ALIASES)) {
    for (const alias of aliases) {
      const id = byNormalizedName.get(normalize(alias));
      if (id !== undefined) {
        resolved[platform] = id;
        break;
      }
    }
  }

  cachedProviderIds = resolved;
  return resolved;
}
