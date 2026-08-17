import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultHousehold } from "@/lib/household";
import { isTmdbConfigured } from "@/lib/tmdb/client";
import { MovieSource } from "@/generated/prisma/client";

export async function GET() {
  const household = await getDefaultHousehold();
  const configured = isTmdbConfigured();

  const moviesCount = configured
    ? await prisma.movie.count({
        where: { householdId: household.id, source: MovieSource.DISCOVERY, tmdbId: { not: null } },
      })
    : 0;

  return NextResponse.json({
    configured,
    lastSyncedAt: household.tmdbLastSyncedAt,
    moviesCount,
  });
}
