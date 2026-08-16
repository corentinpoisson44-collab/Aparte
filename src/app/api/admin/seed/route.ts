import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedMovieCatalog } from "@/lib/seed-movies";

/**
 * Déclenche le seed du catalogue de films (foyer + 15 films, affiches et
 * genres enrichis via TMDB) depuis le navigateur, sans terminal ni accès
 * direct à la base — pratique pour peupler l'environnement de prod/preview
 * déployé sur Vercel. Protégée par ADMIN_SEED_SECRET pour ne pas être
 * déclenchable par n'importe qui : GET /api/admin/seed?secret=...
 */
export async function GET(req: Request) {
  const expectedSecret = process.env.ADMIN_SEED_SECRET;
  if (!expectedSecret) {
    return NextResponse.json(
      { error: "ADMIN_SEED_SECRET n'est pas configurée sur cet environnement." },
      { status: 500 }
    );
  }

  const providedSecret = new URL(req.url).searchParams.get("secret");
  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const result = await seedMovieCatalog(prisma);

  return NextResponse.json({
    ok: true,
    householdId: result.householdId,
    films: result.total,
    tmdbConfigured: result.tmdbConfigured,
    tmdbMatches: result.tmdbMatches,
    notFound: result.notFound,
  });
}
