import { NextResponse } from "next/server";
import { getDefaultHousehold } from "@/lib/household";
import {
  PlexNotConnectedError,
  PlexServerUnreachableError,
  syncPlexLibrary,
} from "@/lib/plex/sync";

export async function POST() {
  const household = await getDefaultHousehold();

  try {
    const result = await syncPlexLibrary(household);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof PlexNotConnectedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof PlexServerUnreachableError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}
