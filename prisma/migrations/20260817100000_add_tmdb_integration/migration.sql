-- AlterTable
ALTER TABLE "Household" ADD COLUMN     "tmdbLastSyncedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Movie_householdId_tmdbId_key" ON "Movie"("householdId", "tmdbId");
