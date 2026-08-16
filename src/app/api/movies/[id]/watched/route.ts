import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultHousehold } from "@/lib/household";
import { WatchStatus } from "@/generated/prisma/client";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: movieId } = await params;
  const household = await getDefaultHousehold();

  const movie = await prisma.movie.findFirst({
    where: { id: movieId, householdId: household.id },
  });
  if (!movie) {
    return NextResponse.json({ error: "Film introuvable." }, { status: 404 });
  }

  const alreadyWatched = await prisma.watchHistory.findFirst({
    where: { householdId: household.id, movieId, status: WatchStatus.WATCHED },
  });
  if (!alreadyWatched) {
    await prisma.watchHistory.create({
      data: { householdId: household.id, movieId, status: WatchStatus.WATCHED },
    });
  }

  return NextResponse.json({ ok: true });
}
