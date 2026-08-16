import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const session = await prisma.session.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      sessionMovies: { include: { movie: true } },
      rankings: true,
      result: true,
      household: { include: { members: true } },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session introuvable." }, { status: 404 });
  }

  const movies = session.sessionMovies.map((sm) => sm.movie);

  const result = session.result
    ? {
        winnerMovieId: session.result.winnerMovieId,
        scores: JSON.parse(session.result.scores) as unknown,
      }
    : null;

  return NextResponse.json({
    id: session.id,
    code: session.code,
    status: session.status,
    createdAt: session.createdAt,
    members: session.household.members.map((m) => ({ id: m.id, name: m.name })),
    movies: movies.map((m) => ({
      id: m.id,
      title: m.title,
      year: m.year,
      posterUrl: m.posterUrl,
      synopsis: m.synopsis,
      runtimeMin: m.runtimeMin,
      platform: m.platform,
      source: m.source,
    })),
    submittedMemberIds: session.rankings.map((r) => r.memberId),
    result,
  });
}
