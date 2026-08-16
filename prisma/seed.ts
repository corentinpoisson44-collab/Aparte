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
  // Découverte (hors bibliothèque, streaming)
  {
    title: "Everything Everywhere All at Once",
    year: 2022,
    synopsis:
      "Une femme d'origine chinoise doit se connecter à des versions parallèles d'elle-même pour empêcher la destruction du multivers.",
    runtimeMin: 140,
    genre: "Science-fiction, Comédie",
    platform: "Netflix",
    source: MovieSource.DISCOVERY,
    slug: "everything-everywhere",
  },
  {
    title: "Dune",
    year: 2021,
    synopsis:
      "Paul Atreides, jeune homme brillant, doit se rendre sur la planète la plus dangereuse de l'univers pour assurer l'avenir de sa famille et de son peuple.",
    runtimeMin: 155,
    genre: "Science-fiction, Aventure",
    platform: "Disney+",
    source: MovieSource.DISCOVERY,
    slug: "dune",
  },
  {
    title: "La La Land",
    year: 2016,
    synopsis:
      "Une actrice en devenir et un musicien de jazz tombent amoureux tout en essayant de concilier leurs carrières respectives à Los Angeles.",
    runtimeMin: 128,
    genre: "Comédie musicale, Romance",
    platform: "Netflix",
    source: MovieSource.DISCOVERY,
    slug: "la-la-land",
  },
  {
    title: "Knives Out",
    year: 2019,
    synopsis:
      "Après le meurtre d'un patriarche de la littérature policière, un détective enquête sur chaque membre de la famille pour trouver le meurtrier.",
    runtimeMin: 130,
    genre: "Policier, Comédie",
    platform: "Amazon Prime Video",
    source: MovieSource.DISCOVERY,
    slug: "knives-out",
  },
  {
    title: "Spider-Man: Into the Spider-Verse",
    year: 2018,
    synopsis:
      "Miles Morales devient Spider-Man et rejoint des héros venus d'univers parallèles pour sauver le multivers.",
    runtimeMin: 117,
    genre: "Animation, Action",
    platform: "Netflix",
    source: MovieSource.DISCOVERY,
    slug: "spiderverse",
  },
  {
    title: "The Grand Seduction",
    year: 2013,
    synopsis:
      "Les habitants d'un petit village de pêcheurs tentent de convaincre un jeune médecin de s'y installer pour sauver leur économie locale.",
    runtimeMin: 113,
    genre: "Comédie",
    platform: "Amazon Prime Video",
    source: MovieSource.DISCOVERY,
    slug: "grand-seduction",
  },
  {
    title: "Soul",
    year: 2020,
    synopsis:
      "Un professeur de musique dont l'âme se retrouve séparée de son corps découvre ce qui rend vraiment la vie digne d'être vécue.",
    runtimeMin: 100,
    genre: "Animation, Fantastique",
    platform: "Disney+",
    source: MovieSource.DISCOVERY,
    slug: "soul",
  },
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
