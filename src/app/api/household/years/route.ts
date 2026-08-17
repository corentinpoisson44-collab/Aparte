import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultHousehold } from "@/lib/household";

/**
 * Bornes (année la plus ancienne / la plus récente) du catalogue du foyer,
 * pour cadrer le curseur de date de sortie proposé lors des questions
 * d'orientation posées après la création d'une session.
 */
export async function GET() {
  const household = await getDefaultHousehold();
  const movies = await prisma.movie.findMany({
    where: { householdId: household.id },
    select: { year: true },
  });

  // year = 0 est la valeur posée quand Plex ne fournit pas de métadonnée
  // d'année (voir src/lib/plex/sync.ts) : ce n'est pas une vraie date de
  // sortie, elle fausserait les bornes vers l'an 0.
  const years = movies.map((m) => m.year).filter((y) => y > 0);

  if (years.length === 0) {
    const currentYear = new Date().getFullYear();
    return NextResponse.json({ min: currentYear - 50, max: currentYear });
  }

  return NextResponse.json({ min: Math.min(...years), max: Math.max(...years) });
}
