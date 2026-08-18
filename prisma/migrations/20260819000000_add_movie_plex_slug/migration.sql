-- Identifiant "watch.plex.tv/movie/{slug}" renvoyé par le serveur Plex,
-- utilisé pour ouvrir directement un film dans l'appli Plex (voir
-- src/lib/plex/library.ts).
ALTER TABLE "Movie" ADD COLUMN "plexSlug" TEXT;
