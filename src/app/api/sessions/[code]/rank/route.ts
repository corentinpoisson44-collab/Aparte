import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeRankingResult } from "@/lib/ranking";
import { SessionStatus, WatchStatus } from "@/generated/prisma/client";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await req.json();
  const memberId: unknown = body?.memberId;
  const order: unknown = body?.order;

  if (typeof memberId !== "string" || !Array.isArray(order)) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const session = await prisma.session.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      sessionMovies: true,
      rankings: true,
      household: { include: { members: true } },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session introuvable." }, { status: 404 });
  }

  if (session.status === SessionStatus.REVEALED) {
    return NextResponse.json(
      { error: "Cette session est déjà terminée." },
      { status: 409 }
    );
  }

  const isMember = session.household.members.some((m) => m.id === memberId);
  if (!isMember) {
    return NextResponse.json(
      { error: "Ce profil ne fait pas partie de ce foyer." },
      { status: 403 }
    );
  }

  const sessionMovieIds = new Set(session.sessionMovies.map((sm) => sm.movieId));
  const orderIds = order as string[];
  const validOrder =
    orderIds.length === sessionMovieIds.size &&
    orderIds.every((id) => sessionMovieIds.has(id)) &&
    new Set(orderIds).size === orderIds.length;

  if (!validOrder) {
    return NextResponse.json(
      { error: "Le classement doit contenir chaque film de la session une seule fois." },
      { status: 400 }
    );
  }

  await prisma.ranking.upsert({
    where: { sessionId_memberId: { sessionId: session.id, memberId } },
    update: { order: JSON.stringify(orderIds) },
    create: { sessionId: session.id, memberId, order: JSON.stringify(orderIds) },
  });

  const totalMembers = session.household.members.length;
  const submittedCount = await prisma.ranking.count({
    where: { sessionId: session.id },
  });

  if (submittedCount < totalMembers) {
    return NextResponse.json({ revealed: false });
  }

  const allRankings = await prisma.ranking.findMany({
    where: { sessionId: session.id },
  });

  const { winnerMovieId, scores, guardRailOverridden } = computeRankingResult(
    [...sessionMovieIds],
    allRankings.map((r) => ({
      memberId: r.memberId,
      order: JSON.parse(r.order) as string[],
    }))
  );

  const lastRankedMovieIds = new Set<string>();
  for (const r of allRankings) {
    const memberOrder = JSON.parse(r.order) as string[];
    lastRankedMovieIds.add(memberOrder[memberOrder.length - 1]);
  }

  // Requêtes indépendantes plutôt qu'un $transaction([...]) : pas de vraie
  // exigence d'atomicité ici.
  await prisma.sessionResult.create({
    data: {
      sessionId: session.id,
      winnerMovieId,
      scores: JSON.stringify(scores),
    },
  });
  await prisma.session.update({
    where: { id: session.id },
    data: { status: SessionStatus.REVEALED },
  });
  if (lastRankedMovieIds.size > 0) {
    await prisma.watchHistory.createMany({
      data: [...lastRankedMovieIds].map((movieId) => ({
        householdId: session.householdId,
        movieId,
        sessionId: session.id,
        status: WatchStatus.REJECTED_LAST,
      })),
    });
  }

  return NextResponse.json({ revealed: true, winnerMovieId, guardRailOverridden });
}
