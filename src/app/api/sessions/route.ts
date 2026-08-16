import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultHousehold } from "@/lib/household";
import { drawMoviesForHousehold } from "@/lib/draw";
import { newSessionCode } from "@/lib/session-code";
import { WatchStatus } from "@/generated/prisma/client";

export async function POST() {
  const household = await getDefaultHousehold();
  const movies = await drawMoviesForHousehold(household.id);

  if (movies.length === 0) {
    return NextResponse.json(
      {
        error:
          "Plus aucun film disponible à proposer (tout a été vu ou trop souvent rejeté).",
      },
      { status: 409 }
    );
  }

  const code = newSessionCode();

  // Pas de $transaction/écriture imbriquée : l'adapter HTTP de Neon ne
  // supporte aucune transaction, on enchaîne donc des requêtes indépendantes.
  const session = await prisma.session.create({
    data: { code, householdId: household.id },
  });

  await prisma.sessionMovie.createMany({
    data: movies.map((m) => ({ sessionId: session.id, movieId: m.id })),
  });

  await prisma.watchHistory.createMany({
    data: movies.map((m) => ({
      householdId: household.id,
      movieId: m.id,
      sessionId: session.id,
      status: WatchStatus.PROPOSED,
    })),
  });

  return NextResponse.json({ code: session.code }, { status: 201 });
}
