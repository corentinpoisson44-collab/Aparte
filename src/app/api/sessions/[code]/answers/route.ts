import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseAnswers } from "@/lib/orientation";
import { drawSession } from "@/lib/sessionDraw";

/**
 * Enregistre les réponses d'un membre aux questions d'orientation. Dès que
 * tous les membres du foyer ont répondu (ou passé les questions), le tirage
 * part, en mélangeant les réponses de chacun.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const memberId = typeof body.memberId === "string" ? body.memberId : null;

  const session = await prisma.session.findUnique({
    where: { code: code.toUpperCase() },
    include: { household: { include: { members: true } } },
  });

  if (!session) {
    return NextResponse.json({ error: "Session introuvable." }, { status: 404 });
  }
  if (!memberId || !session.household.members.some((m) => m.id === memberId)) {
    return NextResponse.json({ error: "Profil inconnu." }, { status: 400 });
  }
  if (session.drawnAt) {
    // Trop tard pour orienter (l'autre a lancé sans attendre) : pas une
    // erreur pour autant, on rejoint simplement la liste déjà tirée.
    return NextResponse.json({ drawn: true }, { status: 200 });
  }

  const skipped = body.skipped === true;
  const answers = parseAnswers(skipped ? {} : body);
  const data = { ...answers, skipped };

  await prisma.orientationAnswer.upsert({
    where: { sessionId_memberId: { sessionId: session.id, memberId } },
    create: { sessionId: session.id, memberId, ...data },
    update: data,
  });

  const answeredCount = await prisma.orientationAnswer.count({
    where: { sessionId: session.id },
  });
  if (answeredCount < session.household.members.length) {
    return NextResponse.json({ drawn: false }, { status: 200 });
  }

  const outcome = await drawSession(session.id);
  // "Déjà tirés" : l'autre réponse est arrivée en même temps et a
  // déclenché le tirage — c'est tout aussi bien.
  if (!outcome.ok && outcome.reason === "no_movies") {
    return NextResponse.json({ error: outcome.error }, { status: 409 });
  }

  return NextResponse.json({ drawn: true }, { status: 200 });
}
