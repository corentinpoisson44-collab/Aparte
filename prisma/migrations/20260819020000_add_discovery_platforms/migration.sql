-- Plateformes de streaming "découverte" (Netflix, Disney+, Prime Video,
-- OCS, HBO, Canal+) sélectionnées par le foyer pour la pioche TMDB, et
-- horodatage de sa dernière synchronisation (voir src/lib/tmdb/).
ALTER TABLE "Household" ADD COLUMN     "discoveryPlatforms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Household" ADD COLUMN     "discoveryLastSyncedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Movie_householdId_tmdbId_key" ON "Movie"("householdId", "tmdbId");
