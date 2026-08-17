import type { Household } from "@/generated/prisma/client";
import { plexHeaders } from "./constants";
import { PlexNotConnectedError, PlexServerUnreachableError } from "./sync";

const REQUEST_TIMEOUT_MS = 5000;

export type PlexPlayerClient = {
  machineIdentifier: string;
  name: string;
  product: string;
  address: string;
  port: number;
};

type ClientsResponse = {
  MediaContainer: {
    Server?: Array<{
      name: string;
      product: string;
      address: string;
      port: string | number;
      machineIdentifier: string;
      protocolCapabilities?: string;
    }>;
  };
};

/**
 * Lecteurs Plex (TV, box, appli) actuellement annoncés auprès du serveur du
 * foyer et capables de recevoir une commande de lecture.
 */
export async function listPlexClients(household: Household): Promise<PlexPlayerClient[]> {
  if (!household.plexClientId || !household.plexServerBaseUrl || !household.plexServerAccessToken) {
    throw new PlexNotConnectedError("Compte Plex non connecté.");
  }

  const res = await fetch(`${household.plexServerBaseUrl}/clients`, {
    headers: plexHeaders(household.plexClientId, household.plexServerAccessToken),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }).catch(() => {
    throw new PlexServerUnreachableError("Le serveur Plex est injoignable.");
  });
  if (!res.ok) {
    throw new PlexServerUnreachableError(`Le serveur Plex a refusé la liste des lecteurs (${res.status}).`);
  }

  const data: ClientsResponse = await res.json();
  return (data.MediaContainer.Server ?? [])
    .filter((c) => (c.protocolCapabilities ?? "").split(",").includes("playback"))
    .map((c) => ({
      machineIdentifier: c.machineIdentifier,
      name: c.name,
      product: c.product,
      address: c.address,
      port: Number(c.port),
    }));
}

/**
 * Demande directement au lecteur (et non au serveur) de lancer la lecture
 * d'un film de la bibliothèque — c'est ainsi que les clients Plex (dont les
 * apps TV) exposent leur contrôle sur le réseau local, en HTTP non chiffré,
 * indépendamment du serveur.
 */
export async function playMovieOnClient(
  household: Household,
  client: PlexPlayerClient,
  plexKey: string
): Promise<void> {
  if (!household.plexClientId || !household.plexServerBaseUrl || !household.plexServerAccessToken || !household.plexServerId) {
    throw new PlexNotConnectedError("Compte Plex non connecté.");
  }

  const server = new URL(household.plexServerBaseUrl);
  const params = new URLSearchParams({
    key: `/library/metadata/${plexKey}`,
    offset: "0",
    machineIdentifier: household.plexServerId,
    protocol: server.protocol.replace(":", ""),
    address: server.hostname,
    port: server.port || (server.protocol === "https:" ? "443" : "80"),
    token: household.plexServerAccessToken,
    commandID: "1",
  });

  const res = await fetch(
    `http://${client.address}:${client.port}/player/playback/playMedia?${params}`,
    {
      headers: plexHeaders(household.plexClientId, household.plexServerAccessToken),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }
  ).catch(() => {
    throw new PlexServerUnreachableError(`Le lecteur "${client.name}" est injoignable.`);
  });
  if (!res.ok) {
    throw new PlexServerUnreachableError(`Le lecteur "${client.name}" a refusé la lecture (${res.status}).`);
  }
}
