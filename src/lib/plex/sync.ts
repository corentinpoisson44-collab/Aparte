import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import type { Household } from "@/generated/prisma/client";
import { MovieSource } from "@/generated/prisma/client";
import { isServerResource, listResources, resolveReachableConnection } from "./discovery";
import { fetchSectionMovies, listMovieSections, plexPosterUrl } from "./library";
import { placeholderPoster } from "@/lib/poster-placeholder";
import type { PlexMovie } from "./types";

export class PlexNotConnectedError extends Error {}
export class PlexServerUnreachableError extends Error {}

/** Génère (et persiste) l'identifiant d'appareil stable requis par l'API Plex. */
export async function ensurePlexClientId(household: Household): Promise<string> {
  if (household.plexClientId) return household.plexClientId;
  const clientId = randomUUID();
  await prisma.household.update({
    where: { id: household.id },
    data: { plexClientId: clientId },
  });
  return clientId;
}

/**
 * Redécouvre le serveur Plex du foyer (les URLs de connexion peuvent
 * changer) et persiste la connexion retenue. Si `plexServerId` est déjà
 * connu, on retrouve la même ressource ; sinon on prend le premier serveur
 * possédé par le compte.
 */
export async function discoverServer(household: Household) {
  if (!household.plexClientId || !household.plexAuthToken) {
    throw new PlexNotConnectedError("Compte Plex non connecté.");
  }

  const resources = (await listResources(household.plexClientId, household.plexAuthToken))
    .filter(isServerResource);

  const resource = household.plexServerId
    ? resources.find((r) => r.clientIdentifier === household.plexServerId)
    : resources.find((r) => r.owned) ?? resources[0];

  if (!resource) {
    throw new PlexServerUnreachableError(
      "Aucun serveur Plex trouvé sur ce compte."
    );
  }

  const connection = await resolveReachableConnection(household.plexClientId, resource);
  if (!connection) {
    throw new PlexServerUnreachableError(
      `Serveur Plex "${resource.name}" injoignable (réseau local ou accès distant désactivé ?).`
    );
  }

  await prisma.household.update({
    where: { id: household.id },
    data: {
      plexServerId: resource.clientIdentifier,
      plexServerName: resource.name,
      plexServerBaseUrl: connection.uri,
      plexServerAccessToken: resource.accessToken,
    },
  });

  return {
    baseUrl: connection.uri,
    accessToken: resource.accessToken,
    name: resource.name,
  };
}

function plexGenreLabel(movie: PlexMovie): string {
  if (!movie.Genre || movie.Genre.length === 0) return "";
  return movie.Genre.slice(0, 2)
    .map((g) => g.tag)
    .join(", ");
}

export async function syncPlexLibrary(
  household: Household,
  onProgress?: (imported: number, total: number) => void
) {
  const clientId = await ensurePlexClientId(household);
  const server = await discoverServer({ ...household, plexClientId: clientId });

  const sections = await listMovieSections(server.baseUrl, clientId, server.accessToken);
  if (sections.length === 0) {
    throw new PlexServerUnreachableError(
      `Aucune bibliothèque de films trouvée sur "${server.name}".`
    );
  }

  const movies: PlexMovie[] = [];
  for (const section of sections) {
    movies.push(
      ...(await fetchSectionMovies(server.baseUrl, clientId, server.accessToken, section.key))
    );
  }

  const total = movies.length;
  let imported = 0;
  onProgress?.(imported, total);

  for (const movie of movies) {
    await prisma.movie.upsert({
      where: {
        householdId_plexKey: { householdId: household.id, plexKey: movie.ratingKey },
      },
      update: {
        title: movie.title,
        year: movie.year ?? 0,
        synopsis: movie.summary ?? "",
        runtimeMin: movie.duration ? Math.round(movie.duration / 60000) : 0,
        genre: plexGenreLabel(movie),
        posterUrl: movie.thumb
          ? plexPosterUrl(server.baseUrl, server.accessToken, movie.thumb)
          : placeholderPoster(movie.title),
        plexSlug: movie.slug ?? null,
      },
      create: {
        householdId: household.id,
        plexKey: movie.ratingKey,
        title: movie.title,
        year: movie.year ?? 0,
        synopsis: movie.summary ?? "",
        runtimeMin: movie.duration ? Math.round(movie.duration / 60000) : 0,
        genre: plexGenreLabel(movie),
        posterUrl: movie.thumb
          ? plexPosterUrl(server.baseUrl, server.accessToken, movie.thumb)
          : placeholderPoster(movie.title),
        plexSlug: movie.slug ?? null,
        platform: "Plex",
        source: MovieSource.PLEX,
      },
    });
    imported++;
    onProgress?.(imported, total);
  }

  await prisma.household.update({
    where: { id: household.id },
    data: { plexLastSyncedAt: new Date() },
  });

  return { imported, sectionsCount: sections.length, serverName: server.name };
}
