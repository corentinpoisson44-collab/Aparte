-- Mood et époque passent à choix multiple : listes à la place d'une valeur.
ALTER TABLE "OrientationAnswer" ADD COLUMN "moods" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "OrientationAnswer" ADD COLUMN "eras" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "OrientationAnswer" SET "moods" = ARRAY["mood"] WHERE "mood" IS NOT NULL;
UPDATE "OrientationAnswer" SET "eras" = ARRAY["era"] WHERE "era" IS NOT NULL;

ALTER TABLE "OrientationAnswer" DROP COLUMN "mood";
ALTER TABLE "OrientationAnswer" DROP COLUMN "era";
