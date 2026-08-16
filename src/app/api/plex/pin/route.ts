import { NextResponse } from "next/server";
import { getDefaultHousehold } from "@/lib/household";
import { ensurePlexClientId } from "@/lib/plex/sync";
import { buildAuthUrl, createPin } from "@/lib/plex/auth";

/** Démarre le flow d'authentification Plex : crée un pin à afficher/ouvrir. */
export async function POST() {
  const household = await getDefaultHousehold();
  const clientId = await ensurePlexClientId(household);

  const pin = await createPin(clientId);
  const authUrl = buildAuthUrl(clientId, pin.code);

  return NextResponse.json({ id: pin.id, authUrl });
}
