export type Member = { id: string; name: string };

export type MovieDTO = {
  id: string;
  title: string;
  year: number;
  posterUrl: string;
  synopsis: string;
  runtimeMin: number;
  genre: string;
  platform: string;
  source: "PLEX" | "DISCOVERY";
  /** Lien "plex://" ouvert directement par l'appli Plex si elle est installée. */
  plexAppUrl: string | null;
  /** Repli web si l'appli Plex n'est pas installée ou n'intercepte pas le lien. */
  plexWebUrl: string | null;
};

export type MovieScoreDTO = {
  movieId: string;
  points: number;
  disqualified: boolean;
  bestRankPosition: number;
};

export type SessionStateDTO = {
  id: string;
  code: string;
  status: "PENDING" | "REVEALED";
  createdAt: string;
  members: Member[];
  movies: MovieDTO[];
  submittedMemberIds: string[];
  result: { winnerMovieId: string; scores: MovieScoreDTO[] } | null;
};
