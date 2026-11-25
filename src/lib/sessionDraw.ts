import { prisma } from "@/lib/prisma";
import { drawMoviesForHousehold } from "@/lib/draw";
import { combineAnswers, parseAnswers } from "@/lib/orientation";
import { WatchStatus } from "@/generated/prisma/client";

export type DrawOutcome =
  | { ok: true }
  | { ok: false; reason: "already_drawn" | "no_movies"; error: string };

/**
 * Tire les films d'une session à partir des réponses d'orientation déjà
 * enregistrées (celles des deux membres, ou d'un seul si on lance sans
 * attendre). Le tirage n'a lieu qu'une fois : `drawnAt` est posé de façon
 * atomique avant de piocher, si bien que deux réponses arrivées en même
 * temps ne déclenchent pas deux tirages.
 */
export async function drawSession(sessionId: string): Promise<DrawOutcome> {
  const claimed = await prisma.session.updateMany({
    where: { id: sessionId, drawnAt: null },
    data: { drawnAt: new Date() },
  });
  if (claimed.count === 0) {
    return { ok: false, reason: "already_drawn", error: "Les films ont déjà été tirés pour cette session." };
  }

  const session = await prisma.session.findUniqueOrThrow({
    where: { id: sessionId },
    include: { orientationAnswers: true },
  });

  const criteria = combineAnswers(
    session.orientationAnswers.filter((a) => !a.skipped).map(parseAnswers)
  );

  const movies = await drawMoviesForHousehold(session.householdId, criteria);

  if (movies.length === 0) {
    // Rien à proposer : on libère la session pour qu'un futur essai (après
    // une synchro Plex, par exemple) reste possible.
    await prisma.session.update({ where: { id: sessionId }, data: { drawnAt: null } });
    return {
      ok: false,
      reason: "no_movies",
      error: "Plus aucun film disponible à proposer (tout a été vu ou trop souvent rejeté).",
    };
  }

  // Requêtes indépendantes plutôt qu'une écriture imbriquée : pas de vraie
  // exigence d'atomicité ici (un échec partiel laisse juste une session
  // incomplète, sans conséquence pour l'utilisateur).
  await prisma.sessionMovie.createMany({
    data: movies.map((m) => ({
      sessionId: session.id,
      movieId: m.id,
      matchesFilters: m.matchesFilters,
    })),
  });

  await prisma.watchHistory.createMany({
    data: movies.map((m) => ({
      householdId: session.householdId,
      movieId: m.id,
      sessionId: session.id,
      status: WatchStatus.PROPOSED,
    })),
  });

  return { ok: true };
}
