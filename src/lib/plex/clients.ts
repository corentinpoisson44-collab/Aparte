import type { Household } from "@/generated/prisma/client";
import { plexHeaders } from "./constants";
import { listResources } from "./discovery";
import { PlexNotConnectedError, PlexServerUnreachableError } from "./sync";
import type { PlexResource } from "./types";

const REQUEST_TIMEOUT_MS = 5000;

export type PlexPlayerClient = {
  machineIdentifier: string;
  name: string;
  product: string;
  /** URL de contrôle du lecteur (jamais renvoyée au navigateur). */
  baseUrl: string;
  /** Jeton à présenter à CE lecteur pour qu'il accepte la commande. */
  commandToken: string;
};

type LocalClientsResponse = {
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
 * Lecteurs annoncés localement auprès du serveur Plex du foyer (protocole
 * GDM "historique") — ne couvre en pratique que les vieux clients
 * (Home Theater, Roku, anciennes apps Android/Fire TV avec "Advertise as
 * player" activé). La plupart des apps TV natives actuelles (Apple TV,
 * Android TV/Google TV, apps constructeur) ne s'y annoncent pas.
 */
async function listLocalPlexClients(household: Household): Promise<PlexPlayerClient[]> {
  if (!household.plexClientId || !household.plexServerBaseUrl || !household.plexServerAccessToken) {
    return [];
  }

  const res = await fetch(`${household.plexServerBaseUrl}/clients`, {
    headers: plexHeaders(household.plexClientId, household.plexServerAccessToken),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }).catch(() => null);
  if (!res || !res.ok) return [];

  const data: LocalClientsResponse = await res.json();
  return (data.MediaContainer.Server ?? [])
    .filter((c) => (c.protocolCapabilities ?? "").split(",").includes("playback"))
    .map((c) => ({
      machineIdentifier: c.machineIdentifier,
      name: c.name,
      product: c.product,
      baseUrl: `http://${c.address}:${c.port}`,
      commandToken: household.plexServerAccessToken!,
    }));
}

function isPlayerResource(resource: PlexResource): boolean {
  return resource.provides.split(",").includes("player");
}

/**
 * Lecteurs enregistrés sur le compte Plex (plex.tv/api/v2/resources,
 * `provides` contient "player") — c'est ce que les apps Plex modernes
 * (dont la plupart des apps TV) utilisent pour apparaître comme cible d'un
 * "Lire sur…", indépendamment du protocole GDM local.
 */
async function listAccountPlexClients(household: Household): Promise<PlexPlayerClient[]> {
  if (!household.plexClientId || !household.plexAuthToken) return [];

  const resources = await listResources(household.plexClientId, household.plexAuthToken).catch(
    () => [] as PlexResource[]
  );

  return resources
    .filter((r) => isPlayerResource(r) && r.connections.length > 0)
    .map((r) => {
      const connection = r.connections.find((c) => !c.relay) ?? r.connections[0];
      return {
        machineIdentifier: r.clientIdentifier,
        name: r.name,
        product: r.name,
        baseUrl: connection.uri,
        commandToken: r.accessToken,
      };
    });
}

/**
 * Lecteurs Plex (TV, box, appli) potentiellement joignables pour recevoir
 * une commande de lecture, en combinant les deux sources de découverte
 * Plex (voir les fonctions ci-dessus) — un même lecteur peut apparaître
 * dans les deux, on déduplique par `machineIdentifier`.
 */
export async function listPlexClients(household: Household): Promise<PlexPlayerClient[]> {
  if (!household.plexClientId || !household.plexAuthToken) {
    throw new PlexNotConnectedError("Compte Plex non connecté.");
  }

  const [local, account] = await Promise.all([
    listLocalPlexClients(household),
    listAccountPlexClients(household),
  ]);

  const seen = new Set<string>();
  const merged: PlexPlayerClient[] = [];
  for (const client of [...local, ...account]) {
    if (seen.has(client.machineIdentifier)) continue;
    seen.add(client.machineIdentifier);
    merged.push(client);
  }
  return merged;
}

/**
 * Demande directement au lecteur (et non au serveur) de lancer la lecture
 * d'un film de la bibliothèque — c'est ainsi que les clients Plex exposent
 * leur contrôle, indépendamment du serveur.
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
    // Jeton du SERVEUR : c'est ce que le lecteur présentera pour aller
    // chercher le média, distinct du jeton utilisé ci-dessous pour
    // authentifier la commande auprès du lecteur lui-même.
    token: household.plexServerAccessToken,
    commandID: "1",
  });

  const res = await fetch(`${client.baseUrl}/player/playback/playMedia?${params}`, {
    headers: plexHeaders(household.plexClientId, client.commandToken),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }).catch(() => {
    throw new PlexServerUnreachableError(`Le lecteur "${client.name}" est injoignable.`);
  });
  if (!res.ok) {
    throw new PlexServerUnreachableError(`Le lecteur "${client.name}" a refusé la lecture (${res.status}).`);
  }
}
