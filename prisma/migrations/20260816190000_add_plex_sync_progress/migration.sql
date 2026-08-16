-- CreateEnum
CREATE TYPE "PlexSyncStatus" AS ENUM ('IDLE', 'RUNNING', 'ERROR');

-- AlterTable
ALTER TABLE "Household" ADD COLUMN     "plexSyncStatus" "PlexSyncStatus" NOT NULL DEFAULT 'IDLE',
ADD COLUMN     "plexSyncTotal" INTEGER,
ADD COLUMN     "plexSyncImported" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "plexSyncError" TEXT;
