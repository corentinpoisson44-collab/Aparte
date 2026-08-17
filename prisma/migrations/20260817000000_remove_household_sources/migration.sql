-- Plateformes autres que Plex désactivées : le foyer ne pioche plus que dans
-- sa bibliothèque Plex, il n'y a donc plus de sources à choisir.
ALTER TABLE "Household" DROP COLUMN "enabledSources";
