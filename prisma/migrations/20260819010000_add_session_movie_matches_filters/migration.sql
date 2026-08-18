-- Indique si un film proposé correspond réellement aux préférences (durée,
-- genre, période, provenance) répondues pour la session, ou s'il a été
-- ajouté en complément faute d'assez de films correspondants (voir
-- src/lib/draw.ts).
ALTER TABLE "SessionMovie" ADD COLUMN "matchesFilters" BOOLEAN NOT NULL DEFAULT true;
