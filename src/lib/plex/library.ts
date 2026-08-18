import { plexHeaders } from "./constants";
import type { PlexLibrarySection, PlexMovie } from "./types";

type SectionsResponse = {
  MediaContainer: { Directory: PlexLibrarySection[] };
};

type SectionItemsResponse = {
  MediaContainer: { Metadata?: PlexMovie[] };
};

export async function listMovieSections(
  baseUrl: string,
  clientId: string,
  serverToken: string
): Promise<PlexLibrarySection[]> {
  const res = await fetch(`${baseUrl}/library/sections`, {
    headers: plexHeaders(clientId, serverToken),
  });
  if (!res.ok) {
    throw new Error(`Le serveur Plex a refusé la liste des bibliothèques (${res.status}).`);
  }
  const data: SectionsResponse = await res.json();
  return data.MediaContainer.Directory.filter((d) => d.type === "movie");
}

export async function fetchSectionMovies(
  baseUrl: string,
  clientId: string,
  serverToken: string,
  sectionKey: string
): Promise<PlexMovie[]> {
  const res = await fetch(`${baseUrl}/library/sections/${sectionKey}/all?type=1`, {
    headers: plexHeaders(clientId, serverToken),
  });
  if (!res.ok) {
    throw new Error(`Le serveur Plex a refusé la lecture de la bibliothèque (${res.status}).`);
  }
  const data: SectionItemsResponse = await res.json();
  return data.MediaContainer.Metadata ?? [];
}

export function plexPosterUrl(baseUrl: string, serverToken: string, thumb: string): string {
  return `${baseUrl}${thumb}?X-Plex-Token=${encodeURIComponent(serverToken)}`;
}

/**
 * Lien web "app.plex.tv" vers la fiche d'un film — utilisé en repli quand
 * Plex n'a pas pu associer le film à une entrée de son catalogue (pas de
 * `slug`, voir `plexWatchUrl`) : ce lien fonctionne dans un navigateur,
 * mais `app.plex.tv` n'est pas un domaine "universal link" reconnu par
 * l'appli iOS/Android — il ne l'ouvre pas directement dedans.
 */
export function plexWebUrl(serverId: string, ratingKey: string): string {
  const key = encodeURIComponent(`/library/metadata/${ratingKey}`);
  return `https://app.plex.tv/desktop/#!/server/${serverId}/details?key=${key}`;
}

/**
 * Lien "watch.plex.tv" vers la fiche d'un film — domaine associé à l'appli
 * Plex (iOS/Android) qui l'ouvre directement dedans (c'est le format
 * généré par le bouton "Partager" natif de l'appli), avec repli automatique
 * sur la page web si l'appli n'est pas installée. Le `slug` est fourni
 * directement par le serveur Plex (voir `plexSlug` sur `Movie`) ; il est
 * absent si le film n'a pas été reconnu par le catalogue Plex.
 */
export function plexWatchUrl(slug: string): string {
  return `https://watch.plex.tv/movie/${slug}`;
}
