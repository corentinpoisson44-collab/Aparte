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

  // Requêtes indépendantes plutôt qu'une écriture imbriquée : pas de vraie
  // exigence d'atomicité ici (un échec partiel régénère juste une session
  // vide/incomplète, sans conséquence pour l'utilisateur).
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
