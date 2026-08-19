-- Plateformes de streaming "découverte" (Netflix, Disney+, Prime Video,
-- OCS, HBO, Canal+) sélectionnées par le foyer pour la pioche TMDB, et
-- horodatage de sa dernière synchronisation (voir src/lib/tmdb/).
--
-- IF NOT EXISTS partout : cette migration a échoué en prod avec "relation
-- already exists" sur l'index (P3018 / 42P07), signe que son DDL avait déjà
-- été appliqué lors d'une tentative précédente dont l'enregistrement du
-- succès dans _prisma_migrations a été interrompu (cf. le problème
-- d'advisory lock Neon documenté dans le README) — la rendre idempotente
-- permet à `prisma migrate deploy` de la rejouer sans erreur quel que soit
-- l'état réel de la base après `prisma migrate resolve --rolled-back`.
ALTER TABLE "Household" ADD COLUMN IF NOT EXISTS "discoveryPlatforms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Household" ADD COLUMN IF NOT EXISTS "discoveryLastSyncedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Movie_householdId_tmdbId_key" ON "Movie"("householdId", "tmdbId");
