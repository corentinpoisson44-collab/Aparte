import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultHousehold } from "@/lib/household";

/**
 * Ne supprime pas les films déjà importés (ils restent proposables) :
 * seule la connexion au compte/serveur Plex est effacée.
 */
export async function POST() {
  const household = await getDefaultHousehold();
  await prisma.household.update({
    where: { id: household.id },
    data: {
      plexAuthToken: null,
      plexServerId: null,
      plexServerName: null,
      plexServerBaseUrl: null,
      plexServerAccessToken: null,
      plexLastSyncedAt: null,
    },
  });
  return NextResponse.json({ ok: true });
}
