import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultHousehold } from "@/lib/household";

/**
 * Genres distincts présents dans le catalogue du foyer (Movie.genre est une
 * liste séparée par des virgules), pour proposer des choix d'ambiance lors
 * des questions d'orientation posées après la création d'une session.
 */
export async function GET() {
  const household = await getDefaultHousehold();
  const movies = await prisma.movie.findMany({
    where: { householdId: household.id },
    select: { genre: true },
  });

  const genres = new Set<string>();
  for (const { genre } of movies) {
    for (const part of genre.split(",")) {
      const trimmed = part.trim();
      if (trimmed) genres.add(trimmed);
    }
  }

  return NextResponse.json({
    genres: [...genres].sort((a, b) => a.localeCompare(b, "fr")),
  });
}
