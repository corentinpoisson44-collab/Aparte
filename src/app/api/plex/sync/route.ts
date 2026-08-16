import { NextResponse, after } from "next/server";
import { getDefaultHousehold } from "@/lib/household";
import {
  PlexNotConnectedError,
  PlexSyncAlreadyRunningError,
  beginPlexSync,
  runPlexSync,
} from "@/lib/plex/sync";

/**
 * Démarre une synchronisation sans attendre qu'elle se termine (une grosse
 * bibliothèque peut prendre du temps) : le client suit la progression via
 * `GET /api/plex/status`.
 */
export async function POST() {
  const household = await getDefaultHousehold();

  try {
    await beginPlexSync(household);
  } catch (err) {
    if (err instanceof PlexSyncAlreadyRunningError || err instanceof PlexNotConnectedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }

  after(() => runPlexSync(household));

  return NextResponse.json({ started: true }, { status: 202 });
}
