import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { drawSession } from "@/lib/sessionDraw";

/**
 * "Lancer sans attendre" : tire les films tout de suite avec les réponses
 * d'orientation déjà données, sans attendre que l'autre membre réponde.
 * (Normalement, le tirage part tout seul quand les deux ont répondu — voir
 * POST /api/sessions/[code]/answers.)
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const session = await prisma.session.findUnique({
    where: { code: code.toUpperCase() },
    select: { id: true, code: true },
  });

  if (!session) {
    return NextResponse.json({ error: "Session introuvable." }, { status: 404 });
  }

  const outcome = await drawSession(session.id);
  // Déjà tirés (l'autre vient de répondre) : le but est atteint.
  if (!outcome.ok && outcome.reason === "no_movies") {
    return NextResponse.json({ error: outcome.error }, { status: 409 });
  }

  return NextResponse.json({ code: session.code }, { status: 200 });
}
