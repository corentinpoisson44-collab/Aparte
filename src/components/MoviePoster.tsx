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

/**
 * Affiche `posterUrl`, avec un repli sur les initiales du titre si l'image
 * ne charge pas (poster manquant/supprimé côté Plex, réseau…) plutôt qu'une
 * icône de lien cassé.
 */
export function MoviePoster({
  src,
  title,
  alt = title,
  className,
  style,
  fallbackTextClassName = "text-lg",
}: {
  src: string;
  title: string;
  /** Texte alternatif de l'image ; par défaut le titre, passer "" pour un poster décoratif (ex : carrousel où le titre est répété). */
  alt?: string;
  className?: string;
  style?: CSSProperties;
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
        className={`flex items-center justify-center bg-ink/10 font-display tracking-wide text-ink/40 ${fallbackTextClassName} ${className ?? ""}`}
      >
        {initials(title)}
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
