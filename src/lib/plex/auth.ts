import { PLEX_TV_BASE, plexHeaders } from "./constants";
import type { PlexPin } from "./types";

/**
 * Flow d'authentification "PIN" de Plex (pas de secret d'appli requis) :
 * on crée un pin, on redirige la personne vers app.plex.tv/auth pour
 * qu'elle lie son compte, puis on sonde le pin jusqu'à obtenir un
 * `authToken`. Voir https://forums.plex.tv/t/authenticating-with-plex/609370
 */
export async function createPin(clientId: string): Promise<PlexPin> {
  const res = await fetch(`${PLEX_TV_BASE}/api/v2/pins?strong=true`, {
    method: "POST",
    headers: plexHeaders(clientId),
  });
  if (!res.ok) {
    throw new Error(`Plex a refusé la création du pin (${res.status}).`);
  }
  return res.json();
}

export function buildAuthUrl(clientId: string, code: string, forwardUrl?: string): string {
  const params = new URLSearchParams({
    clientID: clientId,
    code,
    "context[device][product]": "Aparté",
  });
  // Une fois le compte lié, Plex redirige l'onglet d'auth vers cette URL
  // au lieu de laisser la personne sur app.plex.tv — voir /plex/callback.
  if (forwardUrl) params.set("forwardUrl", forwardUrl);
  return `https://app.plex.tv/auth#?${params.toString()}`;
}

export async function checkPin(clientId: string, pinId: number): Promise<PlexPin> {
  const res = await fetch(`${PLEX_TV_BASE}/api/v2/pins/${pinId}`, {
    headers: plexHeaders(clientId),
  });
  if (!res.ok) {
    throw new Error(`Plex a refusé la vérification du pin (${res.status}).`);
  }
  return res.json();
}
