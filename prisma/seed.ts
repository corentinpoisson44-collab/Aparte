import { PrismaClient, MovieSource } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { placeholderPoster } from "../src/lib/poster-placeholder";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL manquante (voir .env.example).");
}

neonConfig.webSocketConstructor = ws;
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const mockMovies: Array<{
  title: string;
  year: number;
  synopsis: string;
  runtimeMin: number;
  genre: string;
  platform: string;
  source: MovieSource;
  slug: string;
}> = [
  // Bibliothèque Plex (non vus)
  {
    title: "Le Voyage de Chihiro",
    year: 2001,
    synopsis:
      "Une fillette de dix ans, en instance de déménagement, s'égare avec ses parents dans un monde parallèle peuplé d'esprits.",
    runtimeMin: 125,
    genre: "Animation, Fantastique",
    platform: "Plex",
    source: MovieSource.PLEX,
    slug: "chihiro",
  },
  {
    title: "Blade Runner 2049",
    year: 2017,
    synopsis:
      "Un nouveau blade runner découvre un secret enfoui depuis longtemps qui a le potentiel de plonger ce qu'il reste de la société dans le chaos.",
    runtimeMin: 164,
    genre: "Science-fiction",
    platform: "Plex",
    source: MovieSource.PLEX,
    slug: "blade-runner-2049",
  },
  {
    title: "Parasite",
    year: 2019,
    synopsis:
      "Toute la famille de Ki-taek est au chômage. Elle s'intéresse particulièrement au train de vie de la richissime famille Park.",
    runtimeMin: 132,
    genre: "Thriller, Drame",
    platform: "Plex",
    source: MovieSource.PLEX,
    slug: "parasite",
  },
  {
    title: "Mad Max: Fury Road",
    year: 2015,
    synopsis:
      "Dans un désert post-apocalyptique, Max rejoint une rebelle en fuite pour échapper à un tyran et à son armée.",
    runtimeMin: 120,
    genre: "Action, Science-fiction",
    platform: "Plex",
    source: MovieSource.PLEX,
    slug: "mad-max-fury-road",
  },
  {
    title: "Whiplash",
    year: 2014,
    synopsis:
      "Un jeune batteur de jazz intègre un conservatoire réputé et se heurte à un professeur tyrannique déterminé à révéler son potentiel.",
    runtimeMin: 107,
    genre: "Drame, Musique",
    platform: "Plex",
    source: MovieSource.PLEX,
    slug: "whiplash",
  },
  {
    title: "Le Grand Budapest Hotel",
    year: 2014,
    synopsis:
      "Les aventures de Gustave H., concierge légendaire d'un célèbre hôtel européen, et de Zero Moustafa, le jeune groom devenu son plus fidèle ami.",
    runtimeMin: 100,
    genre: "Comédie, Aventure",
    platform: "Plex",
    source: MovieSource.PLEX,
    slug: "grand-budapest-hotel",
  },
  {
    title: "Interstellar",
    year: 2014,
    synopsis:
      "Une équipe d'explorateurs voyage à travers un trou de ver dans l'espace pour tenter d'assurer la survie de l'humanité.",
    runtimeMin: 169,
    genre: "Science-fiction, Drame",
    platform: "Plex",
    source: MovieSource.PLEX,
    slug: "interstellar",
  },
  {
    title: "Portrait de la jeune fille en feu",
    year: 2019,
    synopsis:
      "France, 1770. Marianne, peintre, est chargée de réaliser le portrait de mariage d'Héloïse sans que celle-ci ne pose.",
    runtimeMin: 122,
    genre: "Drame, Romance",
    platform: "Plex",
    source: MovieSource.PLEX,
    slug: "portrait-jeune-fille-feu",
  },
  // Les films "découverte" (Netflix, Disney+, etc.) ne sont plus seedés en
  // dur : ils viennent du vrai catalogue TMDB, voir src/lib/tmdb/sync.ts et
  // "Mettre à jour le catalogue" sur la page d'accueil (nécessite
  // TMDB_API_KEY).
];

async function main() {
  const household = await prisma.household.upsert({
    where: { id: "default-household" },
    update: {},
    create: {
      id: "default-household",
      name: "Notre foyer",
      members: {
        create: [{ name: "Corentin" }, { name: "Partenaire" }],
      },
    },
  });

  for (const m of mockMovies) {
    await prisma.movie.upsert({
      where: { id: `seed-${m.slug}` },
      update: {},
      create: {
        id: `seed-${m.slug}`,
        householdId: household.id,
        title: m.title,
        year: m.year,
        synopsis: m.synopsis,
        runtimeMin: m.runtimeMin,
        genre: m.genre,
        platform: m.platform,
        source: m.source,
        posterUrl: placeholderPoster(m.title),
      },
    });
  }

  console.log(`Seed OK: household ${household.id}, ${mockMovies.length} films.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
