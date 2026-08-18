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
  /** Lien pour ouvrir directement le film dans Plex (app ou web), si disponible. */
  plexUrl: string | null;
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
