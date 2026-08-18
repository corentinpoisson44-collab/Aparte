/**
 * Teinte de fond pour une ligne du classement, du plus "envie" (vert) au
 * moins "envie" (rouge, même teinte que l'accent) — retour visuel immédiat
 * sur l'ordre en cours, indépendant du nombre de films de la session.
 */
export function rankTint(rank: number, total: number): string {
  const t = total > 1 ? (rank - 1) / (total - 1) : 0;
  // 142° (vert) → -10° ≡ 350° (rouge), en passant par le jaune/orange
  // plutôt que par le cyan/bleu (le chemin direct entre les deux teintes).
  const hue = 142 - 152 * t;
  return `hsl(${hue} 65% 91%)`;
}
