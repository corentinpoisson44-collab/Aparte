import { prisma } from "@/lib/prisma";
import type { Household } from "@/generated/prisma/client";
import { MovieSource } from "@/generated/prisma/client";
import { placeholderPoster } from "@/lib/poster-placeholder";
import { DISCOVERY_PLATFORMS, MOVIES_PER_PLATFORM, WATCH_REGION } from "./constants";
import { tmdbFetch, TmdbNotConfiguredError } from "./client";

export { TmdbNotConfiguredError };

type TmdbProvider = { provider_id: number; provider_name: string };
type TmdbGenre = { id: number; name: string };
type TmdbDiscoverResult = {
  id: number;
  title: string;
  overview?: string;
  poster_path: string | null;
  release_date?: string;
  genre_ids?: number[];
};
type TmdbMovieDetails = {
  runtime: number | null;
  genres?: { id: number; name: string }[];
};

/** Normalise un nom de plateforme pour comparaison (accents, casse, ponctuation). */
function normalizeProviderName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tmdbPosterUrl(posterPath: string | null): string | null {
  return posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : null;
}

async function fetchProviderIdsByName(): Promise<Map<string, number>> {
  const data = await tmdbFetch<{ results: TmdbProvider[] }>("/watch/providers/movie", {
    watch_region: WATCH_REGION,
  });
  const map = new Map<string, number>();
  for (const provider of data.results) {
    map.set(normalizeProviderName(provider.provider_name), provider.provider_id);
  }
  return map;
}

async function fetchGenreNamesById(): Promise<Map<number, string>> {
  const data = await tmdbFetch<{ genres: TmdbGenre[] }>("/genre/movie/list", {});
  return new Map(data.genres.map((g) => [g.id, g.name]));
}

/**
 * Pioche jusqu'à `MOVIES_PER_PLATFORM` films disponibles en abonnement
 * (flatrate) sur ce provider, triés par popularité.
 */
async function fetchDiscoverMovies(providerId: number): Promise<TmdbDiscoverResult[]> {
  const data = await tmdbFetch<{ results: TmdbDiscoverResult[] }>("/discover/movie", {
    watch_region: WATCH_REGION,
    with_watch_providers: String(providerId),
    with_watch_monetization_types: "flatrate",
    sort_by: "popularity.desc",
    include_adult: "false",
    page: "1",
  });
  return data.results.slice(0, MOVIES_PER_PLATFORM);
}

/**
 * Synchronise le catalogue "découverte" du foyer : pour chaque plateforme
 * activée (`Household.discoveryPlatforms`), récupère ses films les plus
 * populaires disponibles en abonnement (région `WATCH_REGION`) via TMDB, et
 * les upsert dans `Movie` (source = DISCOVERY, `platform` = libellé de la
 * plateforme). Un même film disponible sur plusieurs plateformes activées
 * n'est stocké qu'une fois (dernière plateforme traitée gagne l'affichage).
 */
export async function syncTmdbDiscovery(
  household: Household,
  onProgress?: (imported: number, total: number) => void
) {
  const selectedKeys = new Set(household.discoveryPlatforms);
  const selectedPlatforms = DISCOVERY_PLATFORMS.filter((p) => selectedKeys.has(p.key));

  if (selectedPlatforms.length === 0) {
    return { imported: 0, platformsSynced: [], unavailablePlatforms: [] };
  }

  const [providerIdsByName, genreNamesById] = await Promise.all([
    fetchProviderIdsByName(),
    fetchGenreNamesById(),
  ]);

  const jobs: { platform: (typeof DISCOVERY_PLATFORMS)[number]; providerId: number }[] = [];
  const unavailablePlatforms: string[] = [];
  for (const platform of selectedPlatforms) {
    const providerId = platform.nameMatch
      .map(normalizeProviderName)
      .map((name) => providerIdsByName.get(name))
      .find((id): id is number => id != null);
    if (providerId != null) {
      jobs.push({ platform, providerId });
    } else {
      unavailablePlatforms.push(platform.label);
    }
  }

  const pending: { movie: TmdbDiscoverResult; platform: (typeof DISCOVERY_PLATFORMS)[number] }[] =
    [];
  for (const job of jobs) {
    const movies = await fetchDiscoverMovies(job.providerId);
    for (const movie of movies) pending.push({ movie, platform: job.platform });
  }

  const total = pending.length;
  let imported = 0;
  onProgress?.(imported, total);

  for (const { movie, platform } of pending) {
    const details = await tmdbFetch<TmdbMovieDetails>(`/movie/${movie.id}`).catch(() => null);
    const genre = details?.genres?.length
      ? details.genres
          .slice(0, 2)
          .map((g) => g.name)
          .join(", ")
      : (movie.genre_ids ?? [])
          .map((id) => genreNamesById.get(id))
          .filter((name): name is string => Boolean(name))
          .slice(0, 2)
          .join(", ");

    const data = {
      title: movie.title,
      year: movie.release_date ? Number(movie.release_date.slice(0, 4)) || 0 : 0,
      synopsis: movie.overview ?? "",
      runtimeMin: details?.runtime ?? 0,
      genre,
      platform: platform.label,
      posterUrl: tmdbPosterUrl(movie.poster_path) ?? placeholderPoster(movie.title),
    };

    await prisma.movie.upsert({
      where: { householdId_tmdbId: { householdId: household.id, tmdbId: movie.id } },
      update: data,
      create: {
        householdId: household.id,
        tmdbId: movie.id,
        source: MovieSource.DISCOVERY,
        ...data,
      },
    });
    imported++;
    onProgress?.(imported, total);
  }

  await prisma.household.update({
    where: { id: household.id },
    data: { discoveryLastSyncedAt: new Date() },
  });

  return {
    imported,
    platformsSynced: jobs.map((j) => j.platform.label),
    unavailablePlatforms,
  };
}
