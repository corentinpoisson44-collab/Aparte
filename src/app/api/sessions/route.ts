import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultHousehold } from "@/lib/household";
import { newSessionCode } from "@/lib/session-code";

/**
 * Crée la session sans tirer les films : le tirage n'a lieu qu'une fois les
 * questions d'orientation (nombre de films, ambiance, notoriété)
 * répondues, voir POST /api/sessions/[code]/draw.
 */
export async function POST() {
  const household = await getDefaultHousehold();
  const code = newSessionCode();

  const session = await prisma.session.create({
    data: { code, householdId: household.id },
  });

  return NextResponse.json({ code: session.code }, { status: 201 });
}
