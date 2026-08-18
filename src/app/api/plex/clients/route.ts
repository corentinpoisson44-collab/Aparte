import { NextResponse } from "next/server";
import { getDefaultHousehold } from "@/lib/household";
import { listPlexClients } from "@/lib/plex/clients";
import { PlexNotConnectedError, PlexServerUnreachableError } from "@/lib/plex/sync";

export async function GET() {
  const household = await getDefaultHousehold();
  if (!household.plexAuthToken) {
    return NextResponse.json({
      clients: [],
      error: "Compte Plex non connecté — connecte-toi depuis la page d'accueil.",
    });
  }

  try {
    const clients = await listPlexClients(household);
    // baseUrl/commandToken sont des détails de contrôle interne (avec jeton
    // d'accès) : on ne renvoie au navigateur que ce qui sert à l'affichage.
    return NextResponse.json({
      clients: clients.map((c) => ({
        machineIdentifier: c.machineIdentifier,
        name: c.name,
        product: c.product,
      })),
    });
  } catch (err) {
    if (err instanceof PlexNotConnectedError || err instanceof PlexServerUnreachableError) {
      return NextResponse.json({ clients: [], error: err.message });
    }
    console.error("Échec de la récupération des lecteurs Plex :", err);
    return NextResponse.json({ clients: [], error: "Erreur inattendue." });
  }
}
