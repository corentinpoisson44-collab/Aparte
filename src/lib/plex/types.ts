export type PlexPin = {
  id: number;
  code: string;
  authToken: string | null;
  expiresAt: string;
};

export type PlexConnection = {
  protocol: string;
  address: string;
  port: number;
  uri: string;
  local: boolean;
  relay: boolean;
};

export type PlexResource = {
  name: string;
  provides: string; // liste séparée par des virgules, ex: "server,player"
  clientIdentifier: string;
  accessToken: string;
  owned: boolean;
  presence: boolean;
  connections: PlexConnection[];
};

export type PlexLibrarySection = {
  key: string;
  title: string;
  type: string; // "movie", "show", ...
};

export type PlexMovie = {
  ratingKey: string;
  title: string;
  year?: number;
  summary?: string;
  thumb?: string;
  duration?: number; // ms
  Genre?: { tag: string }[];
  /** Identifiant "watch.plex.tv/movie/{slug}", absent si non reconnu par le catalogue Plex. */
  slug?: string;
};
