import { NextResponse } from "next/server";
import { getDefaultHousehold } from "@/lib/household";
import { ensurePlexClientId } from "@/lib/plex/sync";
import { buildAuthUrl, createPin } from "@/lib/plex/auth";

/** Démarre le flow d'authentification Plex : crée un pin à afficher/ouvrir. */
export async function POST(req: Request) {
  const household = await getDefaultHousehold();
  const clientId = await ensurePlexClientId(household);

  const pin = await createPin(clientId);
  const forwardUrl = new URL("/plex/callback", req.url).toString();
  const authUrl = buildAuthUrl(clientId, pin.code, forwardUrl);

  return NextResponse.json({ id: pin.id, authUrl });
}
