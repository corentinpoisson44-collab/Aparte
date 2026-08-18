-- Note du public Plex (/10) utilisée comme repère de notoriété pour le
-- filtre "connu / confidentiel" des questions d'orientation, à la place de
-- la distinction bibliothèque Plex vs découverte (voir src/lib/draw.ts).
ALTER TABLE "Movie" ADD COLUMN "audienceRating" DOUBLE PRECISION;
