-- Les jaquettes Plex passent désormais par le proxy /api/plex/poster
-- (voir src/lib/plex/library.ts) au lieu de pointer directement vers le
-- serveur Plex avec son jeton dans l'URL : on réécrit les URLs existantes.
UPDATE "Movie"
SET "posterUrl" = '/api/plex/poster?thumb=' || replace(
  substring("posterUrl" from '^https?://[^/]+(/library/metadata/[0-9]+/(?:thumb|art)(?:/[0-9]+)?)'),
  '/',
  '%2F'
)
WHERE "source" = 'PLEX'
  AND "posterUrl" ~ '^https?://[^/]+/library/metadata/[0-9]+/(thumb|art)(/[0-9]+)?\?';
