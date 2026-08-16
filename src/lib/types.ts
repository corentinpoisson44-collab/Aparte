export type Member = { id: string; name: string };

export type MovieDTO = {
  id: string;
  title: string;
  year: number;
  posterUrl: string;
  synopsis: string;
  runtimeMin: number;
  genre: string | null;
  platform: string;
  source: "PLEX" | "DISCOVERY";
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
