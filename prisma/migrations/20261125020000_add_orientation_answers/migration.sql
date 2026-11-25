-- Questions d'orientation posées aux deux membres : réponses par membre,
-- et horodatage du tirage pour qu'il n'ait lieu qu'une fois.
ALTER TABLE "Session" ADD COLUMN "drawnAt" TIMESTAMP(3);

-- Les sessions déjà tirées le restent.
UPDATE "Session" SET "drawnAt" = "createdAt"
WHERE EXISTS (SELECT 1 FROM "SessionMovie" sm WHERE sm."sessionId" = "Session"."id");

CREATE TABLE "OrientationAnswer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "mood" TEXT,
    "time" TEXT,
    "vetoes" TEXT[],
    "era" TEXT,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrientationAnswer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrientationAnswer_sessionId_memberId_key" ON "OrientationAnswer"("sessionId", "memberId");

ALTER TABLE "OrientationAnswer" ADD CONSTRAINT "OrientationAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrientationAnswer" ADD CONSTRAINT "OrientationAnswer_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
