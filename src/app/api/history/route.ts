import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultHousehold } from "@/lib/household";
import { SessionStatus, WatchStatus } from "@/generated/prisma/client";

export async function GET() {
  const household = await getDefaultHousehold();

  const sessions = await prisma.session.findMany({
    where: { householdId: household.id, status: SessionStatus.REVEALED },
    orderBy: { createdAt: "desc" },
    include: {
      sessionMovies: { include: { movie: true } },
      rankings: { include: { member: true } },
      result: true,
    },
  });

  const watchedMovieIds = new Set(
    (
      await prisma.watchHistory.findMany({
        where: { householdId: household.id, status: WatchStatus.WATCHED },
        select: { movieId: true },
      })
    ).map((w) => w.movieId)
  );

  return NextResponse.json({
    sessions: sessions.map((session) => {
      const winner = session.result
        ? session.sessionMovies.find(
            (sm) => sm.movieId === session.result!.winnerMovieId
          )?.movie
        : null;

      return {
        code: session.code,
        createdAt: session.createdAt,
        winnerMovie: winner
          ? {
              id: winner.id,
              title: winner.title,
              year: winner.year,
              posterUrl: winner.posterUrl,
              watched: watchedMovieIds.has(winner.id),
            }
          : null,
        movies: session.sessionMovies.map((sm) => ({
          id: sm.movie.id,
          title: sm.movie.title,
        })),
        rankings: session.rankings.map((r) => ({
          memberName: r.member.name,
          order: JSON.parse(r.order) as string[],
        })),
      };
    }),
  });
}
