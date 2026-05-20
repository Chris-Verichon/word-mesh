// Player colors matching the CSS variables defined in app/globals.css.
// Values are stored as-is in the database and used in React style attributes.
export const PLAYER_COLORS = [
  "oklch(0.6 0.18 255)",  // bleu   — var(--player-1)
  "oklch(0.6 0.16 155)",  // vert   — var(--player-2)
  "oklch(0.6 0.16 65)",   // orange — var(--player-3)
  "oklch(0.6 0.2 25)",    // rouge  — var(--player-4)
  "oklch(0.55 0.18 300)", // violet — var(--player-5)
  "oklch(0.6 0.2 340)",   // rose   — var(--player-6)
] as const;

export type PlayerColor = (typeof PLAYER_COLORS)[number];
