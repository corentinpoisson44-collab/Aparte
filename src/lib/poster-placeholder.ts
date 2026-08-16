/**
 * Affiche placeholder en SVG (pas de dépendance à un service d'images
 * externe) : couleur + initiales dérivées du titre.
 */
export function placeholderPoster(title: string): string {
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
