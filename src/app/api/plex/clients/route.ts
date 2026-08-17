import { NextResponse } from "next/server";
import { getDefaultHousehold } from "@/lib/household";
import { listPlexClients } from "@/lib/plex/clients";
import { PlexNotConnectedError, PlexServerUnreachableError } from "@/lib/plex/sync";

export async function GET() {
  const household = await getDefaultHousehold();
  if (!household.plexAuthToken) {
    return NextResponse.json({ clients: [] });
  }

  try {
    const clients = await listPlexClients(household);
    return NextResponse.json({ clients });
  } catch (err) {
    if (err instanceof PlexNotConnectedError || err instanceof PlexServerUnreachableError) {
      return NextResponse.json({ clients: [], error: err.message });
    }
    console.error("Échec de la récupération des lecteurs Plex :", err);
    return NextResponse.json({ clients: [], error: "Erreur inattendue." });
  }
}
