import { NextResponse } from "next/server";
import { getDefaultHousehold } from "@/lib/household";

export async function GET() {
  const household = await getDefaultHousehold();
  return NextResponse.json({
    members: household.members.map((m) => ({ id: m.id, name: m.name })),
  });
}
