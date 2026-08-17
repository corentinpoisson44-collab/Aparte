import { prisma } from "@/lib/prisma";
import type { Household } from "@/generated/prisma/client";
import { MovieSource } from "@/generated/prisma/client";
import { placeholderPoster } from "@/lib/poster-placeholder";
import { KNOWN_SOURCES } from "@/lib/sources";
import { isTmdbConfigured, tmdbFetch, TmdbNotConfiguredError } from "./client";
import { MOVIES_PER_PLATFORM, TMDB_POSTER_BASE, TMDB_WATCH_REGION } from "./constants";
import { resolveProviderIds } from "./providers";

export { TmdbNotConfiguredError };

type DiscoverResponse = { results: Array<{ id: number }> };
type MovieDetails = {
  title: string;
  overview: string | null;
  release_date: string | null;
  poster_path: string | null;
  runtime: number | null;
  genres: Array<{ name: string }>;
};

const DETAILS_CONCURRENCY = 6;

/** Exécute `fn` sur `items` avec au plus `limit` appels en vol, dans l'ordre des résultats. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Reconstitue, pour chaque plateforme connue (hors Plex), les films
 * actuellement disponibles au streaming en France via l'API "discover" de
 * TMDB filtrée par fournisseur (`with_watch_providers`). Un même film peut
 * apparaître sur plusieurs plateformes : la première rencontrée gagne (le
 * modèle `Movie` ne porte qu'une seule plateforme par film).
 */
export async function syncTmdbCatalog(
  household: Household,
  onProgress?: (imported: number, total: number) => void
) {
  if (!isTmdbConfigured()) {
    throw new TmdbNotConfiguredError("TMDB_API_KEY n'est pas configurée côté serveur.");
  }

  const providerIds = await resolveProviderIds();
  const platforms = KNOWN_SOURCES.filter((p) => p !== "Plex" && providerIds[p] !== undefined);

  const platformByTmdbId = new Map<number, string>();
  const orderedIds: number[] = [];

  for (const platform of platforms) {
    const { results } = await tmdbFetch<DiscoverResponse>("/discover/movie", {
      with_watch_providers: providerIds[platform],
      watch_region: TMDB_WATCH_REGION,
      sort_by: "popularity.desc",
      include_adult: "false",
      language: "fr-FR",
      page: 1,
    });
    for (const r of results.slice(0, MOVIES_PER_PLATFORM)) {
      if (!platformByTmdbId.has(r.id)) {
        platformByTmdbId.set(r.id, platform);
        orderedIds.push(r.id);
      }
    }
  }

  const total = orderedIds.length;
  let imported = 0;
  onProgress?.(imported, total);

  await mapWithConcurrency(orderedIds, DETAILS_CONCURRENCY, async (tmdbId) => {
    const platform = platformByTmdbId.get(tmdbId)!;
    const details = await tmdbFetch<MovieDetails>(`/movie/${tmdbId}`, { language: "fr-FR" });

    const data = {
      title: details.title,
      year: details.release_date ? new Date(details.release_date).getFullYear() : 0,
      synopsis: details.overview ?? "",
      runtimeMin: details.runtime ?? 0,
      genre: details.genres.slice(0, 2).map((g) => g.name).join(", "),
      posterUrl: details.poster_path
        ? `${TMDB_POSTER_BASE}${details.poster_path}`
        : placeholderPoster(details.title),
    };

    const existing = await prisma.movie.findUnique({
      where: { householdId_tmdbId: { householdId: household.id, tmdbId } },
      select: { id: true },
    });

    if (existing) {
      // La plateforme n'est jamais réécrite : elle reste celle où le film a
      // été découvert la première fois, pour éviter qu'il change de
      // plateforme au fil des synchronisations.
      await prisma.movie.update({ where: { id: existing.id }, data });
    } else {
      await prisma.movie.create({
        data: {
          ...data,
          householdId: household.id,
          tmdbId,
          platform,
          source: MovieSource.DISCOVERY,
        },
      });
    }

    imported++;
    onProgress?.(imported, total);
  });

  await prisma.household.update({
    where: { id: household.id },
    data: { tmdbLastSyncedAt: new Date() },
  });

  return { imported, platformsCount: platforms.length };
}
