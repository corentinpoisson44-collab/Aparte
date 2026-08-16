import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultHousehold } from "@/lib/household";
import { checkPin } from "@/lib/plex/auth";
import { discoverServer } from "@/lib/plex/sync";

/**
 * Sondé par le client toutes les ~2s après ouverture de l'auth Plex.
 * Dès que le pin porte un `authToken`, on le persiste puis on tente de
 * découvrir le serveur (best-effort : le compte reste lié même si aucun
 * serveur n'est trouvable tout de suite).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const household = await getDefaultHousehold();

  if (!household.plexClientId) {
    return NextResponse.json(
      { error: "Aucune tentative de connexion Plex en cours." },
      { status: 409 }
    );
  }

  const pin = await checkPin(household.plexClientId, Number(id));
  if (!pin.authToken) {
    return NextResponse.json({ linked: false });
  }

  await prisma.household.update({
    where: { id: household.id },
    data: { plexAuthToken: pin.authToken },
  });

  let serverName: string | null = null;
  let serverError: string | null = null;
  try {
    const server = await discoverServer({ ...household, plexAuthToken: pin.authToken });
    serverName = server.name;
  } catch (err) {
    serverError = err instanceof Error ? err.message : "Serveur Plex introuvable.";
  }

  return NextResponse.json({ linked: true, serverName, serverError });
}
