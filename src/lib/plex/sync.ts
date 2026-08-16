import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import type { Household } from "@/generated/prisma/client";
import { MovieSource, PlexSyncStatus } from "@/generated/prisma/client";
import { isServerResource, listResources, resolveReachableConnection } from "./discovery";
import { fetchSectionMovies, listMovieSections, plexPosterUrl } from "./library";
import { placeholderPoster } from "@/lib/poster-placeholder";
import type { PlexMovie } from "./types";

export class PlexNotConnectedError extends Error {}
export class PlexServerUnreachableError extends Error {}
export class PlexSyncAlreadyRunningError extends Error {}

/** Nombre de films importés entre deux écritures de la progression. */
const PROGRESS_BATCH_SIZE = 10;

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

/**
 * Marque le foyer comme "synchro en cours" (rapide, à `await`er avant de
 * répondre à la requête HTTP) puis rend la main : le vrai travail se fait
 * dans `runPlexSync`, lancé via `after()` pour ne pas bloquer la réponse
 * sur une bibliothèque qui peut prendre du temps à importer.
 */
export async function beginPlexSync(household: Household) {
  if (household.plexSyncStatus === PlexSyncStatus.RUNNING) {
    throw new PlexSyncAlreadyRunningError("Une synchronisation est déjà en cours.");
  }
  if (!household.plexAuthToken) {
    throw new PlexNotConnectedError("Compte Plex non connecté.");
  }
  await prisma.household.update({
    where: { id: household.id },
    data: {
      plexSyncStatus: PlexSyncStatus.RUNNING,
      plexSyncTotal: null,
      plexSyncImported: 0,
      plexSyncError: null,
    },
  });
}

function movieUpsertData(householdId: string, movie: PlexMovie, baseUrl: string, accessToken: string) {
  const shared = {
    title: movie.title,
    year: movie.year ?? 0,
    synopsis: movie.summary ?? "",
    runtimeMin: movie.duration ? Math.round(movie.duration / 60000) : 0,
    posterUrl: movie.thumb
      ? plexPosterUrl(baseUrl, accessToken, movie.thumb)
      : placeholderPoster(movie.title),
  };
  return {
    update: shared,
    create: {
      ...shared,
      householdId,
      plexKey: movie.ratingKey,
      platform: "Plex",
      source: MovieSource.PLEX,
    },
  };
}

/** Le vrai travail de synchronisation, avec suivi de progression en base. */
export async function runPlexSync(household: Household) {
  try {
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

    await prisma.household.update({
      where: { id: household.id },
      data: { plexSyncTotal: movies.length },
    });

    let imported = 0;
    for (const movie of movies) {
      const { update, create } = movieUpsertData(
        household.id,
        movie,
        server.baseUrl,
        server.accessToken
      );
      await prisma.movie.upsert({
        where: { householdId_plexKey: { householdId: household.id, plexKey: movie.ratingKey } },
        update,
        create,
      });
      imported++;

      if (imported % PROGRESS_BATCH_SIZE === 0 || imported === movies.length) {
        await prisma.household.update({
          where: { id: household.id },
          data: { plexSyncImported: imported },
        });
      }
    }

    await prisma.household.update({
      where: { id: household.id },
      data: { plexSyncStatus: PlexSyncStatus.IDLE, plexLastSyncedAt: new Date() },
    });
  } catch (err) {
    await prisma.household.update({
      where: { id: household.id },
      data: {
        plexSyncStatus: PlexSyncStatus.ERROR,
        plexSyncError:
          err instanceof Error ? err.message : "Erreur inconnue pendant la synchronisation.",
      },
    });
  }
}
