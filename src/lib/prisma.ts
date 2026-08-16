import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeonHttp } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL manquante (voir .env.example).");
}

// Adapter HTTP (pas WebSocket) : une requête = un appel HTTPS, adapté aux
// fonctions serverless de Vercel. Pas de transactions interactives, mais le
// code n'en utilise pas (uniquement des $transaction([...]) en lot).
const adapter = new PrismaNeonHttp(process.env.DATABASE_URL, {});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
