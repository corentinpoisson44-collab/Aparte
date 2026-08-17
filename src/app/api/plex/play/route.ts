import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultHousehold } from "@/lib/household";
import { listPlexClients, playMovieOnClient } from "@/lib/plex/clients";
import { PlexNotConnectedError, PlexServerUnreachableError } from "@/lib/plex/sync";

export async function POST(request: Request) {
  const household = await getDefaultHousehold();
  const body = await request.json().catch(() => null);

  if (
    !body ||
    typeof body.movieId !== "string" ||
    typeof body.machineIdentifier !== "string"
  ) {
    return NextResponse.json(
      { error: "Corps invalide : 'movieId' et 'machineIdentifier' sont requis." },
      { status: 400 }
    );
  }

  const movie = await prisma.movie.findFirst({
    where: { id: body.movieId, householdId: household.id },
  });
  if (!movie || !movie.plexKey) {
    return NextResponse.json(
      { error: "Ce film n'est pas disponible sur Plex." },
      { status: 400 }
    );
  }

  try {
    const clients = await listPlexClients(household);
    const client = clients.find((c) => c.machineIdentifier === body.machineIdentifier);
    if (!client) {
      return NextResponse.json({ error: "Ce lecteur n'est plus joignable." }, { status: 404 });
    }
    await playMovieOnClient(household, client, movie.plexKey);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof PlexNotConnectedError || err instanceof PlexServerUnreachableError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("Échec du lancement de la lecture Plex :", err);
    return NextResponse.json({ error: "Erreur inattendue." }, { status: 500 });
  }
}
