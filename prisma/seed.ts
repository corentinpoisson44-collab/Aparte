import { PrismaClient, MovieSource } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { fetchTmdbGenreMap, searchTmdbMovie } from "../src/lib/tmdb";

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
  platform: string;
  source: MovieSource;
  slug: string;
  // Repli utilisé si TMDB_API_KEY n'est pas configurée ou si la recherche échoue.
  fallbackGenre: string;
}> = [
  // Bibliothèque Plex (non vus)
  {
    title: "Le Voyage de Chihiro",
    year: 2001,
    synopsis:
      "Une fillette de dix ans, en instance de déménagement, s'égare avec ses parents dans un monde parallèle peuplé d'esprits.",
    runtimeMin: 125,
    platform: "Plex",
    source: MovieSource.PLEX,
    slug: "chihiro",
    fallbackGenre: "Animation, Fantastique",
  },
  {
    title: "Blade Runner 2049",
    year: 2017,
    synopsis:
      "Un nouveau blade runner découvre un secret enfoui depuis longtemps qui a le potentiel de plonger ce qu'il reste de la société dans le chaos.",
    runtimeMin: 164,
    platform: "Plex",
    source: MovieSource.PLEX,
    slug: "blade-runner-2049",
    fallbackGenre: "Science-fiction",
  },
  {
    title: "Parasite",
    year: 2019,
    synopsis:
      "Toute la famille de Ki-taek est au chômage. Elle s'intéresse particulièrement au train de vie de la richissime famille Park.",
    runtimeMin: 132,
    platform: "Plex",
    source: MovieSource.PLEX,
    slug: "parasite",
    fallbackGenre: "Thriller, Drame",
  },
  {
    title: "Mad Max: Fury Road",
    year: 2015,
    synopsis:
      "Dans un désert post-apocalyptique, Max rejoint une rebelle en fuite pour échapper à un tyran et à son armée.",
    runtimeMin: 120,
    platform: "Plex",
    source: MovieSource.PLEX,
    slug: "mad-max-fury-road",
    fallbackGenre: "Action, Science-fiction",
  },
  {
    title: "Whiplash",
    year: 2014,
    synopsis:
      "Un jeune batteur de jazz intègre un conservatoire réputé et se heurte à un professeur tyrannique déterminé à révéler son potentiel.",
    runtimeMin: 107,
    platform: "Plex",
    source: MovieSource.PLEX,
    slug: "whiplash",
    fallbackGenre: "Drame, Musique",
  },
  {
    title: "Le Grand Budapest Hotel",
    year: 2014,
    synopsis:
      "Les aventures de Gustave H., concierge légendaire d'un célèbre hôtel européen, et de Zero Moustafa, le jeune groom devenu son plus fidèle ami.",
    runtimeMin: 100,
    platform: "Plex",
    source: MovieSource.PLEX,
    slug: "grand-budapest-hotel",
    fallbackGenre: "Comédie, Drame",
  },
  {
    title: "Interstellar",
    year: 2014,
    synopsis:
      "Une équipe d'explorateurs voyage à travers un trou de ver dans l'espace pour tenter d'assurer la survie de l'humanité.",
    runtimeMin: 169,
    platform: "Plex",
    source: MovieSource.PLEX,
    slug: "interstellar",
    fallbackGenre: "Science-fiction, Aventure",
  },
  {
    title: "Portrait de la jeune fille en feu",
    year: 2019,
    synopsis:
      "France, 1770. Marianne, peintre, est chargée de réaliser le portrait de mariage d'Héloïse sans que celle-ci ne pose.",
    runtimeMin: 122,
    platform: "Plex",
    source: MovieSource.PLEX,
    slug: "portrait-jeune-fille-feu",
    fallbackGenre: "Drame, Romance",
  },
  // Découverte (hors bibliothèque, streaming)
  {
    title: "Everything Everywhere All at Once",
    year: 2022,
    synopsis:
      "Une femme d'origine chinoise doit se connecter à des versions parallèles d'elle-même pour empêcher la destruction du multivers.",
    runtimeMin: 140,
    platform: "Netflix",
    source: MovieSource.DISCOVERY,
    slug: "everything-everywhere",
    fallbackGenre: "Science-fiction, Comédie, Action",
  },
  {
    title: "Dune",
    year: 2021,
    synopsis:
      "Paul Atreides, jeune homme brillant, doit se rendre sur la planète la plus dangereuse de l'univers pour assurer l'avenir de sa famille et de son peuple.",
    runtimeMin: 155,
    platform: "Disney+",
    source: MovieSource.DISCOVERY,
    slug: "dune",
    fallbackGenre: "Science-fiction, Aventure",
  },
  {
    title: "La La Land",
    year: 2016,
    synopsis:
      "Une actrice en devenir et un musicien de jazz tombent amoureux tout en essayant de concilier leurs carrières respectives à Los Angeles.",
    runtimeMin: 128,
    platform: "Netflix",
    source: MovieSource.DISCOVERY,
    slug: "la-la-land",
    fallbackGenre: "Comédie, Drame, Romance",
  },
  {
    title: "Knives Out",
    year: 2019,
    synopsis:
      "Après le meurtre d'un patriarche de la littérature policière, un détective enquête sur chaque membre de la famille pour trouver le meurtrier.",
    runtimeMin: 130,
    platform: "Amazon Prime Video",
    source: MovieSource.DISCOVERY,
    slug: "knives-out",
    fallbackGenre: "Policier, Comédie, Mystère",
  },
  {
    title: "Spider-Man: Into the Spider-Verse",
    year: 2018,
    synopsis:
      "Miles Morales devient Spider-Man et rejoint des héros venus d'univers parallèles pour sauver le multivers.",
    runtimeMin: 117,
    platform: "Netflix",
    source: MovieSource.DISCOVERY,
    slug: "spiderverse",
    fallbackGenre: "Animation, Action, Aventure",
  },
  {
    title: "The Grand Seduction",
    year: 2013,
    synopsis:
      "Les habitants d'un petit village de pêcheurs tentent de convaincre un jeune médecin de s'y installer pour sauver leur économie locale.",
    runtimeMin: 113,
    platform: "Amazon Prime Video",
    source: MovieSource.DISCOVERY,
    slug: "grand-seduction",
    fallbackGenre: "Comédie, Drame",
  },
  {
    title: "Soul",
    year: 2020,
    synopsis:
      "Un professeur de musique dont l'âme se retrouve séparée de son corps découvre ce qui rend vraiment la vie digne d'être vécue.",
    runtimeMin: 100,
    platform: "Disney+",
    source: MovieSource.DISCOVERY,
    slug: "soul",
    fallbackGenre: "Animation, Comédie, Fantastique",
  },
];

// Repli si TMDB_API_KEY n'est pas configurée ou si un film n'est pas trouvé :
// affiche placeholder en SVG, couleur dérivée du titre.
function placeholderPoster(title: string): string {
  let hash = 0;
  for (const char of title) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const hue = hash % 360;
  const initials = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600">
    <rect width="400" height="600" fill="hsl(${hue},45%,80%)"/>
    <text x="200" y="300" font-family="sans-serif" font-size="120" font-weight="600"
      fill="hsl(${hue},35%,35%)" text-anchor="middle" dominant-baseline="middle">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

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

  const tmdbApiKey = process.env.TMDB_API_KEY;
  const genreMap = tmdbApiKey ? await fetchTmdbGenreMap(tmdbApiKey) : null;
  if (!tmdbApiKey) {
    console.warn(
      "TMDB_API_KEY absente : affiches placeholder et genres de repli utilisés (voir .env.example)."
    );
  }

  let tmdbMatches = 0;

  for (const m of mockMovies) {
    let tmdbId: number | null = null;
    let posterUrl = placeholderPoster(m.title);
    let genre = m.fallbackGenre;

    if (tmdbApiKey && genreMap) {
      try {
        const match = await searchTmdbMovie(tmdbApiKey, m.title, m.year, genreMap);
        if (match) {
          tmdbId = match.tmdbId;
          posterUrl = match.posterUrl ?? posterUrl;
          genre = match.genre || genre;
          tmdbMatches += 1;
        } else {
          console.warn(`TMDB : aucun résultat pour "${m.title}" (${m.year}), repli utilisé.`);
        }
      } catch (err) {
        console.warn(`TMDB : recherche échouée pour "${m.title}" :`, err);
      }
    }

    await prisma.movie.upsert({
      where: { id: `seed-${m.slug}` },
      update: { posterUrl, genre, tmdbId },
      create: {
        id: `seed-${m.slug}`,
        householdId: household.id,
        title: m.title,
        year: m.year,
        synopsis: m.synopsis,
        runtimeMin: m.runtimeMin,
        platform: m.platform,
        source: m.source,
        posterUrl,
        genre,
        tmdbId,
      },
    });
  }

  console.log(
    `Seed OK: household ${household.id}, ${mockMovies.length} films` +
      (tmdbApiKey ? ` (${tmdbMatches}/${mockMovies.length} trouvés sur TMDB).` : ".")
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
