import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { seedMovieCatalog } from "../src/lib/seed-movies";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL manquante (voir .env.example).");
}

neonConfig.webSocketConstructor = ws;
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  if (!process.env.TMDB_API_KEY) {
    console.warn(
      "TMDB_API_KEY absente : affiches placeholder et genres de repli utilisés (voir .env.example)."
    );
  }

  const result = await seedMovieCatalog(prisma);

  for (const title of result.notFound) {
    console.warn(`TMDB : aucun résultat pour "${title}", repli utilisé.`);
  }

  console.log(
    `Seed OK: household ${result.householdId}, ${result.total} films` +
      (result.tmdbConfigured
        ? ` (${result.tmdbMatches}/${result.total} trouvés sur TMDB).`
        : ".")
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
