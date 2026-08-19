import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultHousehold } from "@/lib/household";
import { MovieSource } from "@/generated/prisma/client";

export async function GET() {
  const household = await getDefaultHousehold();

  const moviesCount = await prisma.movie.count({
    where: { householdId: household.id, source: MovieSource.DISCOVERY },
  });

  return NextResponse.json({
    platforms: household.discoveryPlatforms,
    lastSyncedAt: household.discoveryLastSyncedAt,
    moviesCount,
    configured: Boolean(process.env.TMDB_API_KEY),
  });
}
