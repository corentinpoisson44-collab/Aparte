/**
 * En-têtes attendus par toutes les API Plex (plex.tv comme un Plex Media
 * Server) : identifient l'appli ("device") indépendamment du compte
 * utilisateur. `X-Plex-Client-Identifier` doit rester stable dans le temps
 * pour un même foyer — voir `Household.plexClientId`.
 */
export function plexHeaders(clientId: string, token?: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Plex-Product": "Aparté",
    "X-Plex-Version": "1.0",
    "X-Plex-Device": "Web",
    "X-Plex-Device-Name": "Aparté",
    "X-Plex-Platform": "Web",
    "X-Plex-Client-Identifier": clientId,
  };
  if (token) headers["X-Plex-Token"] = token;
  return headers;
}

export const PLEX_TV_BASE = "https://plex.tv";
