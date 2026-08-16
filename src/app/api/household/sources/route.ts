import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultHousehold } from "@/lib/household";
import { KNOWN_SOURCES } from "@/lib/sources";

export async function GET() {
  const household = await getDefaultHousehold();
  return NextResponse.json({
    available: KNOWN_SOURCES,
    enabled: household.enabledSources,
  });
}

export async function POST(request: Request) {
  const household = await getDefaultHousehold();
  const body = await request.json().catch(() => null);

  if (!body || !Array.isArray(body.enabled) || !body.enabled.every((s: unknown) => typeof s === "string")) {
    return NextResponse.json({ error: "Corps invalide : 'enabled' doit être un tableau de chaînes." }, { status: 400 });
  }

  const enabled = (body.enabled as string[]).filter((s) =>
    (KNOWN_SOURCES as readonly string[]).includes(s)
  );

  await prisma.household.update({
    where: { id: household.id },
    data: { enabledSources: enabled },
  });

  return NextResponse.json({ available: KNOWN_SOURCES, enabled });
}
