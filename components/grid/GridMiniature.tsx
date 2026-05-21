// Renders a small SVG preview of a crossword grid structure.
// Only shows black vs. letter cells — no text, no arrows.
// Suitable for catalogue cards and thumbnails.

import type { Grid } from "@/lib/supabase/types";

interface GridMiniatureProps {
  cells: Grid["cells"];
  width: number;
  height: number;
  /** SVG size in pixels. Default: 80 */
  size?: number;
}

export function GridMiniature({ cells, width, height, size = 80 }: GridMiniatureProps) {
  const cellSize = size / Math.max(width, height);
  const svgWidth = cellSize * width;
  const svgHeight = cellSize * height;

  const rects: React.ReactNode[] = [];

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const id = `${col}-${row}`;
      const cell = cells[id];
      const isBlack = !cell || cell.type === "black";

      rects.push(
        <rect
          key={id}
          x={col * cellSize}
          y={row * cellSize}
          width={cellSize}
          height={cellSize}
          fill={isBlack ? "currentColor" : "transparent"}
          stroke="currentColor"
          strokeWidth={0.5}
          strokeOpacity={isBlack ? 0 : 0.25}
        />,
      );
    }
  }

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      aria-hidden="true"
      className="text-foreground/80"
    >
      {rects}
    </svg>
  );
}
