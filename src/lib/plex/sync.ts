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

/** Champs d'un film recopiés depuis Plex à chaque synchro. */
type PlexMovieFields = {
  title: string;
  year: number;
  synopsis: string;
  runtimeMin: number;
  genre: string;
  posterUrl: string;
  plexSlug: string | null;
  plexWatched: boolean;
};

const FIELD_NAMES: (keyof PlexMovieFields)[] = [
  "title",
  "year",
  "synopsis",
  "runtimeMin",
  "genre",
  "posterUrl",
  "plexSlug",
  "plexWatched",
];

/** Taille des lots d'écriture : une requête SQL par lot. */
const WRITE_BATCH_SIZE = 500;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function toFields(movie: PlexMovie): PlexMovieFields {
  return {
    title: movie.title,
    year: movie.year ?? 0,
    synopsis: movie.summary ?? "",
    runtimeMin: movie.duration ? Math.round(movie.duration / 60000) : 0,
    genre: plexGenreLabel(movie),
    posterUrl: movie.thumb
      ? plexPosterUrl(movie.thumb)
      : placeholderPoster(movie.title),
    plexSlug: movie.slug ?? null,
    plexWatched: (movie.viewCount ?? 0) > 0,
  };
}

/**
 * Synchronise la bibliothèque Plex en un minimum d'allers-retours vers la
 * base : une lecture des films déjà connus, puis des insertions et mises à
 * jour groupées par lots — uniquement pour les films nouveaux ou modifiés.
 * (Un upsert par film dépassait le temps maximal de la fonction serverless
 * sur les grosses bibliothèques, et la synchro était coupée en cours.)
 */
export async function syncPlexLibrary(
  household: Household,
  onProgress?: (processed: number, total: number) => void
) {
  const clientId = await ensurePlexClientId(household);
  const server = await discoverServer({ ...household, plexClientId: clientId });

  const sections = await listMovieSections(server.baseUrl, clientId, server.accessToken);
  if (sections.length === 0) {
    throw new PlexServerUnreachableError(
      `Aucune bibliothèque de films trouvée sur "${server.name}".`
    );
  }

  const sectionMovies = await Promise.all(
    sections.map((section) =>
      fetchSectionMovies(server.baseUrl, clientId, server.accessToken, section.key)
    )
  );

  // Un même film peut apparaître dans plusieurs bibliothèques : on dédoublonne.
  const plexMovies = new Map<string, PlexMovieFields>();
  for (const movie of sectionMovies.flat()) {
    plexMovies.set(movie.ratingKey, toFields(movie));
  }

  const total = plexMovies.size;
  let processed = 0;
  onProgress?.(processed, total);

  const existing = await prisma.movie.findMany({
    where: { householdId: household.id, plexKey: { in: [...plexMovies.keys()] } },
    select: {
      id: true,
      plexKey: true,
      title: true,
      year: true,
      synopsis: true,
      runtimeMin: true,
      genre: true,
      posterUrl: true,
      plexSlug: true,
      plexWatched: true,
    },
  });
  const existingByKey = new Map(existing.map((m) => [m.plexKey as string, m]));

  const toCreate: (PlexMovieFields & { plexKey: string })[] = [];
  const toUpdate: (PlexMovieFields & { id: string })[] = [];
  for (const [plexKey, fields] of plexMovies) {
    const current = existingByKey.get(plexKey);
    if (!current) {
      toCreate.push({ ...fields, plexKey });
    } else if (FIELD_NAMES.some((f) => current[f] !== fields[f])) {
      toUpdate.push({ ...fields, id: current.id });
    } else {
      processed++;
    }
  }
  onProgress?.(processed, total);

  for (const batch of chunk(toCreate, WRITE_BATCH_SIZE)) {
    await prisma.movie.createMany({
      data: batch.map((m) => ({
        ...m,
        householdId: household.id,
        platform: "Plex",
        source: MovieSource.PLEX,
      })),
      skipDuplicates: true,
    });
    processed += batch.length;
    onProgress?.(processed, total);
  }

  // Mise à jour groupée : les nouvelles valeurs sont passées en un seul
  // paramètre JSON, décodé côté Postgres, pour faire tout le lot en une requête.
  for (const batch of chunk(toUpdate, WRITE_BATCH_SIZE)) {
    await prisma.$executeRaw`
      UPDATE "Movie" AS m SET
        "title" = v."title",
        "year" = v."year",
        "synopsis" = v."synopsis",
        "runtimeMin" = v."runtimeMin",
        "genre" = v."genre",
        "posterUrl" = v."posterUrl",
        "plexSlug" = v."plexSlug",
        "plexWatched" = v."plexWatched"
      FROM jsonb_to_recordset(${JSON.stringify(batch)}::jsonb) AS v(
        "id" text,
        "title" text,
        "year" integer,
        "synopsis" text,
        "runtimeMin" integer,
        "genre" text,
        "posterUrl" text,
        "plexSlug" text,
        "plexWatched" boolean
      )
      WHERE m."id" = v."id"
    `;
    processed += batch.length;
    onProgress?.(processed, total);
  }

  await prisma.household.update({
    where: { id: household.id },
    data: { plexLastSyncedAt: new Date() },
  });

  return {
    total,
    added: toCreate.length,
    updated: toUpdate.length,
    sectionsCount: sections.length,
    serverName: server.name,
  };
}
