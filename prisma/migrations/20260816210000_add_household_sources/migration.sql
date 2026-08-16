-- AlterTable
ALTER TABLE "Household" ADD COLUMN     "enabledSources" TEXT[] DEFAULT ARRAY['Plex', 'Netflix', 'Disney+', 'Amazon Prime Video', 'Canal+', 'Apple TV+', 'Max', 'Paramount+']::TEXT[];

-- Backfill : les foyers existants démarrent avec toutes les sources activées.
UPDATE "Household" SET "enabledSources" = ARRAY['Plex', 'Netflix', 'Disney+', 'Amazon Prime Video', 'Canal+', 'Apple TV+', 'Max', 'Paramount+']::TEXT[] WHERE "enabledSources" IS NULL;

ALTER TABLE "Household" ALTER COLUMN "enabledSources" SET NOT NULL;
