"use client";

import { useState } from "react";
import type { CSSProperties } from "react";

/** Jusqu'à 2 initiales à partir des premiers mots significatifs du titre. */
function initials(title: string): string {
  const letters = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "");
  return letters.join("") || "?";
}

const THEME_CLASSES = {
  // Sur fond paper (clair) : la majorité des posters, fond clair par défaut.
  light: "bg-ink/10 text-ink/40",
  // Sur fond ink (carrousel/gagnant de ResultReveal) : les classes "light"
  // y seraient quasi invisibles (fond sombre sur fond sombre).
  dark: "bg-paper/10 text-paper/50",
} as const;

/**
 * Affiche `posterUrl`, avec un repli si l'image ne charge pas (poster
 * manquant/supprimé côté Plex, réseau…) plutôt qu'une icône de lien cassé :
 * les initiales du titre par défaut, ou le titre en entier via
 * `fallbackContent="title"` (carrousel où une simple initiale ne suffit
 * pas à identifier le film).
 */
export function MoviePoster({
  src,
  title,
  alt = title,
  className,
  style,
  theme = "light",
  fallbackContent = "initials",
  fallbackTextClassName = "text-lg",
}: {
  src: string;
  title: string;
  /** Texte alternatif de l'image ; par défaut le titre, passer "" pour un poster décoratif (ex : carrousel où le titre est répété). */
  alt?: string;
  className?: string;
  style?: CSSProperties;
  /** Contexte de fond du poster, pour garder le repli lisible dans les deux cas. */
  theme?: "light" | "dark";
  fallbackContent?: "initials" | "title";
  fallbackTextClassName?: string;
}) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        style={style}
        className={`flex items-center justify-center p-1.5 text-center font-display tracking-wide ${THEME_CLASSES[theme]} ${fallbackTextClassName} ${className ?? ""}`}
      >
        <span className={fallbackContent === "title" ? "line-clamp-4 w-full leading-tight" : ""}>
          {fallbackContent === "title" ? title : initials(title)}
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      style={style}
      className={className}
      onError={() => setErrored(true)}
    />
  );
}
