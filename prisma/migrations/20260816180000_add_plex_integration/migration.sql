-- AlterTable
ALTER TABLE "Household" ADD COLUMN     "plexClientId" TEXT,
ADD COLUMN     "plexAuthToken" TEXT,
ADD COLUMN     "plexServerId" TEXT,
ADD COLUMN     "plexServerName" TEXT,
ADD COLUMN     "plexServerBaseUrl" TEXT,
ADD COLUMN     "plexServerAccessToken" TEXT,
ADD COLUMN     "plexLastSyncedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Movie_householdId_plexKey_key" ON "Movie"("householdId", "plexKey");
