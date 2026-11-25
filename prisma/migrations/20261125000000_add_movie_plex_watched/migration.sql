-- Statut "déjà vu" remonté par le serveur Plex (viewCount > 0) lors de la
-- synchronisation : ces films sont exclus du tirage.
ALTER TABLE "Movie" ADD COLUMN "plexWatched" BOOLEAN NOT NULL DEFAULT false;
