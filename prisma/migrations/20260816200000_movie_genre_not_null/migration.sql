-- Backfill any NULL genre before enforcing NOT NULL (no-op if already enforced).
UPDATE "Movie" SET "genre" = '' WHERE "genre" IS NULL;

-- AlterTable
ALTER TABLE "Movie" ALTER COLUMN "genre" SET DEFAULT '';
ALTER TABLE "Movie" ALTER COLUMN "genre" SET NOT NULL;
