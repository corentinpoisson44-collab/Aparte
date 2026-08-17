import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { drawMoviesForHousehold, type DrawFilters } from "@/lib/draw";
import { WatchStatus } from "@/generated/prisma/client";

function parseYear(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseFilters(body: unknown): DrawFilters {
  const b = (body ?? {}) as Record<string, unknown>;
  return {
    duration: b.duration === "short" || b.duration === "long" ? b.duration : "any",
    genre: typeof b.genre === "string" && b.genre.trim() ? b.genre.trim() : null,
    origin: b.origin === "library" || b.origin === "discovery" ? b.origin : "any",
    yearMin: parseYear(b.yearMin),
    yearMax: parseYear(b.yearMax),
  };
}

/**
 * Tire les films d'une session déjà créée, en fonction des réponses aux
 * questions d'orientation (durée, ambiance, valeur sûre vs découverte).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const session = await prisma.session.findUnique({
    where: { code: code.toUpperCase() },
    include: { sessionMovies: true },
  });

  if (!session) {
    return NextResponse.json({ error: "Session introuvable." }, { status: 404 });
  }

  if (session.sessionMovies.length > 0) {
    return NextResponse.json(
      { error: "Les films ont déjà été tirés pour cette session." },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const filters = parseFilters(body);

  const movies = await drawMoviesForHousehold(session.householdId, filters);

  if (movies.length === 0) {
    return NextResponse.json(
      {
        error:
          "Plus aucun film disponible à proposer (tout a été vu ou trop souvent rejeté).",
      },
      { status: 409 }
    );
  }

  // Requêtes indépendantes plutôt qu'une écriture imbriquée : pas de vraie
  // exigence d'atomicité ici (un échec partiel laisse juste une session
  // incomplète, sans conséquence pour l'utilisateur).
  await prisma.sessionMovie.createMany({
    data: movies.map((m) => ({ sessionId: session.id, movieId: m.id })),
  });

  await prisma.watchHistory.createMany({
    data: movies.map((m) => ({
      householdId: session.householdId,
      movieId: m.id,
      sessionId: session.id,
      status: WatchStatus.PROPOSED,
    })),
  });

  return NextResponse.json({ code: session.code }, { status: 200 });
}
