import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultHousehold } from "@/lib/household";
import { MovieSource, PlexSyncStatus } from "@/generated/prisma/client";

export async function GET() {
  const household = await getDefaultHousehold();

  const moviesCount = household.plexAuthToken
    ? await prisma.movie.count({
        where: { householdId: household.id, source: MovieSource.PLEX, plexKey: { not: null } },
      })
    : 0;

  return NextResponse.json({
    connected: Boolean(household.plexAuthToken),
    serverName: household.plexServerName,
    lastSyncedAt: household.plexLastSyncedAt,
    moviesCount,
    sync: {
      syncing: household.plexSyncStatus === PlexSyncStatus.RUNNING,
      imported: household.plexSyncImported,
      total: household.plexSyncTotal,
      error: household.plexSyncStatus === PlexSyncStatus.ERROR ? household.plexSyncError : null,
    },
  });
}
