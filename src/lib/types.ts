import type { OrientationAnswers } from "@/lib/orientation";

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
  /**
   * Lien pour ouvrir le film dans Plex : watch.plex.tv (ouvre l'appli
   * directement) si le film a un `slug`, sinon repli app.plex.tv (page web
   * seulement). `null` si Plex n'est pas connecté.
   */
  plexUrl: string | null;
  /** false si ce film ne correspond pas vraiment aux préférences répondues et n'a été ajouté qu'en complément. */
  matchesFilters: boolean;
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
  /** true une fois les films tirés (les deux ont répondu, ou on a lancé sans attendre). */
  drawn: boolean;
  /** Membres ayant répondu aux questions d'orientation (ou les ayant passées). */
  answeredMemberIds: string[];
  /** Réponses de chacun, dévoilées seulement une fois les films tirés. */
  answers: MemberAnswersDTO[];
  result: { winnerMovieId: string; scores: MovieScoreDTO[] } | null;
};

export type MemberAnswersDTO = OrientationAnswers & {
  memberId: string;
  skipped: boolean;
};
