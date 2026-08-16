import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultHousehold } from "@/lib/household";
import { PlexSyncStatus } from "@/generated/prisma/client";

/**
 * Ne supprime pas les films déjà importés (ils restent proposables) :
 * seule la connexion au compte/serveur Plex est effacée. Une synchro en
 * cours ne sera plus reflétée en base une fois le jeton effacé (elle
 * échouera au prochain appel à discoverServer), donc on réinitialise aussi
 * son état pour ne pas laisser le client bloqué en "synchronisation".
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
      plexSyncStatus: PlexSyncStatus.IDLE,
      plexSyncTotal: null,
      plexSyncImported: 0,
      plexSyncError: null,
    },
  });
  return NextResponse.json({ ok: true });
}
