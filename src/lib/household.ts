import { prisma } from "@/lib/prisma";

/**
 * v0 : un seul foyer (couple), pas d'authentification multi-foyer.
 * Le foyer par défaut est créé par `prisma/seed.ts`.
 */
export async function getDefaultHousehold() {
  const household = await prisma.household.findFirst({
    orderBy: { createdAt: "asc" },
    include: { members: { orderBy: { createdAt: "asc" } } },
  });
  if (!household) {
    throw new Error(
      "Aucun foyer trouvé — as-tu lancé `npm run db:seed` ?"
    );
  }
  return household;
}
