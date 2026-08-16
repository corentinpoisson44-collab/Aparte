import { PLEX_TV_BASE, plexHeaders } from "./constants";
import type { PlexConnection, PlexResource } from "./types";

const CONNECTION_TEST_TIMEOUT_MS = 4000;

export async function listResources(
  clientId: string,
  authToken: string
): Promise<PlexResource[]> {
  const res = await fetch(
    `${PLEX_TV_BASE}/api/v2/resources?includeHttps=1&includeRelay=1`,
    { headers: plexHeaders(clientId, authToken) }
  );
  if (!res.ok) {
    throw new Error(`Plex a refusé la liste des serveurs (${res.status}).`);
  }
  return res.json();
}

/** Un Plex Media Server (par opposition à un lecteur, une TV, etc.). */
export function isServerResource(resource: PlexResource): boolean {
  return resource.provides.split(",").includes("server");
}

/**
 * Une ressource peut exposer plusieurs connexions (locale, relay, directe
 * via plex.direct) selon d'où on l'atteint. On les essaie dans l'ordre de
 * préférence (directe non-relay d'abord) et on garde la première qui
 * répond, comme le font les clients Plex officiels.
 */
export async function resolveReachableConnection(
  clientId: string,
  resource: PlexResource
): Promise<PlexConnection | null> {
  const candidates = [...resource.connections].sort((a, b) => {
    const score = (c: PlexConnection) => (c.relay ? 1 : 0) + (c.local ? 0 : 0);
    return score(a) - score(b);
  });

  for (const connection of candidates) {
    try {
      const res = await fetch(`${connection.uri}/identity`, {
        headers: plexHeaders(clientId, resource.accessToken),
        signal: AbortSignal.timeout(CONNECTION_TEST_TIMEOUT_MS),
      });
      if (res.ok) return connection;
    } catch {
      // Connexion injoignable (timeout, DNS, TLS...) : on essaie la suivante.
    }
  }
  return null;
}
