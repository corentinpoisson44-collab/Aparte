/**
 * Région utilisée pour interroger les "watch providers" TMDB (catalogue et
 * disponibilité en flatrate/abonnement varient par pays) — le foyer type
 * d'Aparté est en France, d'où OCS et Canal+ dans la liste.
 */
export const WATCH_REGION = "FR";

/** Nombre de films récupérés par plateforme sélectionnée à chaque synchro. */
export const MOVIES_PER_PLATFORM = 20;

/**
 * Plateformes "découverte" proposées au foyer, en plus de sa bibliothèque
 * Plex. `label` est aussi la valeur stockée dans `Movie.platform` (doit
 * rester stable : les mocks de `prisma/seed.ts` s'y réfèrent). `nameMatch`
 * liste les noms TMDB (normalisés via `normalizeProviderName`, voir
 * `discovery.ts`) susceptibles de désigner cette plateforme dans
 * `/watch/providers/movie` pour `WATCH_REGION` — TMDB n'expose pas d'id
 * stable par plateforme indépendant de la région, donc on résout par nom
 * plutôt que de figer des ids.
 */
export const DISCOVERY_PLATFORMS = [
  { key: "NETFLIX", label: "Netflix", nameMatch: ["netflix"] },
  { key: "DISNEY_PLUS", label: "Disney+", nameMatch: ["disney plus", "disney+"] },
  {
    key: "PRIME_VIDEO",
    label: "Amazon Prime Video",
    nameMatch: ["amazon prime video", "prime video"],
  },
  { key: "OCS", label: "OCS", nameMatch: ["ocs"] },
  { key: "HBO", label: "HBO", nameMatch: ["hbo max", "max", "hbo"] },
  { key: "CANAL_PLUS", label: "Canal+", nameMatch: ["canal+", "canal plus"] },
] as const;

export type DiscoveryPlatformKey = (typeof DISCOVERY_PLATFORMS)[number]["key"];

export const DISCOVERY_PLATFORM_KEYS: readonly string[] = DISCOVERY_PLATFORMS.map((p) => p.key);
