import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultHousehold } from "@/lib/household";
import { DISCOVERY_PLATFORM_KEYS } from "@/lib/tmdb/constants";

const VALID_KEYS = new Set(DISCOVERY_PLATFORM_KEYS);

/** Enregistre les plateformes "découverte" sélectionnées par le foyer. */
export async function POST(request: Request) {
  const household = await getDefaultHousehold();
  const body = await request.json().catch(() => ({}));
  const raw = Array.isArray((body as { platforms?: unknown }).platforms)
    ? (body as { platforms: unknown[] }).platforms
    : [];
  const platforms = [
    ...new Set(raw.filter((p): p is string => typeof p === "string" && VALID_KEYS.has(p))),
  ];

  await prisma.household.update({
    where: { id: household.id },
    data: { discoveryPlatforms: platforms },
  });

  return NextResponse.json({ platforms });
}
