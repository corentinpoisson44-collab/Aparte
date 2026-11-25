import type { NextRequest } from "next/server";
import { getDefaultHousehold } from "@/lib/household";
import { fetchPlexPoster, isPlexThumbPath } from "@/lib/plex/library";
import { discoverServer } from "@/lib/plex/sync";

/**
 * Proxy des jaquettes Plex : le navigateur charge l'image depuis Aparté,
 * et c'est le serveur qui va la chercher sur le serveur Plex avec le jeton
 * (jamais exposé côté client). Si l'adresse mémorisée du serveur Plex ne
 * répond plus, on la redécouvre une fois avant d'abandonner.
 */
export async function GET(request: NextRequest) {
  const thumb = request.nextUrl.searchParams.get("thumb");
  if (!thumb || !isPlexThumbPath(thumb)) {
    return new Response("Jaquette invalide.", { status: 400 });
  }

  const household = await getDefaultHousehold();
  const { plexClientId, plexServerBaseUrl, plexServerAccessToken } = household;
  if (!plexClientId || !household.plexAuthToken) {
    return new Response("Plex non connecté.", { status: 404 });
  }

  const tryFetch = async (baseUrl: string, token: string) => {
    try {
      const res = await fetchPlexPoster(baseUrl, plexClientId, token, thumb);
      return res.ok ? res : null;
    } catch {
      return null;
    }
  };

  let res =
    plexServerBaseUrl && plexServerAccessToken
      ? await tryFetch(plexServerBaseUrl, plexServerAccessToken)
      : null;

  if (!res) {
    try {
      const server = await discoverServer(household);
      res = await tryFetch(server.baseUrl, server.accessToken);
    } catch {
      res = null;
    }
  }

  if (!res || !res.body) {
    return new Response("Jaquette indisponible.", { status: 502 });
  }

  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "image/jpeg",
      // Le chemin de la jaquette contient un horodatage qui change quand
      // elle est modifiée dans Plex : on peut la garder longtemps en cache
      // (navigateur et CDN Vercel), ce qui évite de solliciter le serveur Plex.
      "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400",
    },
  });
}
