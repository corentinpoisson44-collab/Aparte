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
 * Lien "app.plex.tv" vers la fiche d'un film : sur mobile/desktop avec
 * l'appli Plex installée, l'OS l'ouvre directement dedans (domaine
 * vérifié par Plex) plutôt que dans un navigateur.
 */
export function plexWebUrl(serverId: string, ratingKey: string): string {
  const key = encodeURIComponent(`/library/metadata/${ratingKey}`);
  return `https://app.plex.tv/desktop/#!/server/${serverId}/details?key=${key}`;
}
