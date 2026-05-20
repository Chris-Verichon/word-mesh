"use client";

import type { BlackCell, Cell } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export interface GridCellProps {
  id: string; // "col-row", e.g. "2-3"
  cell: Cell;
  value?: string; // player-typed letter (uppercase)
  isSelected?: boolean;
  isActiveWord?: boolean;
  playerColor?: string; // hex color of the player who typed the letter
  onClick?: (id: string) => void;
}

// Arrow indicator rendered inside a black cell clue section
function Arrow({ direction }: { direction: "right" | "down" }) {
  return (
    <span className="shrink-0 text-[10px] font-bold leading-none text-white">
      {direction === "right" ? "→" : "↓"}
    </span>
  );
}

// Content of a black (clue) cell — handles 0, 1 or 2 clue directions
function BlackCellContent({ cell }: { cell: BlackCell }) {
  const hasRight = !!cell.clue_right;
  const hasDown = !!cell.clue_down;

  if (!hasRight && !hasDown) {
    // Solid black cell with no clue
    return null;
  }

  if (hasRight && hasDown) {
    // Cell split into two sections: top for horizontal clue, bottom for vertical
    return (
      <div className="flex h-full w-full flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 items-start gap-0.5 p-[3px]">
          <span className="min-w-0 flex-1 break-words text-[8px] leading-tight text-white/90">
            {cell.clue_right}
          </span>
          <Arrow direction="right" />
        </div>
        <div className="border-t border-white/20" />
        <div className="flex min-h-0 flex-1 items-start gap-0.5 p-[3px]">
          <span className="min-w-0 flex-1 break-words text-[8px] leading-tight text-white/90">
            {cell.clue_down}
          </span>
          <Arrow direction="down" />
        </div>
      </div>
    );
  }

  // Single clue (right or down)
  const clue = hasRight ? cell.clue_right : cell.clue_down;
  const direction = hasRight ? "right" : "down";

  return (
    <div className="flex h-full w-full items-start gap-0.5 p-[3px]">
      <span className="min-w-0 flex-1 break-words text-[8px] leading-tight text-white/90">
        {clue}
      </span>
      <Arrow direction={direction} />
    </div>
  );
}

export function GridCell({
  id,
  cell,
  value,
  isSelected = false,
  isActiveWord = false,
  playerColor,
  onClick,
}: GridCellProps) {
  // Black (clue) cells are non-interactive
  if (cell.type === "black") {
    return (
      <div className="bg-foreground h-full w-full overflow-hidden" aria-hidden="true">
        <BlackCellContent cell={cell} />
      </div>
    );
  }

  // Letter cell
  return (
    <button
      type="button"
      onClick={() => onClick?.(id)}
      className={cn(
        "relative flex h-full w-full items-center justify-center text-xl font-bold uppercase transition-colors",
        // Background variants
        isSelected && "bg-primary/20 ring-2 ring-inset ring-primary",
        isActiveWord && !isSelected && "bg-primary/8",
        !isSelected && !isActiveWord && "bg-background hover:bg-muted/40",
      )}
      aria-label={`Case ${id}${value ? `, lettre ${value}` : ""}`}
    >
      {/* Player color tint overlay */}
      {playerColor && value && (
        <span
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{ backgroundColor: playerColor }}
        />
      )}
      {/* Typed letter */}
      <span
        className="relative font-sans"
        style={playerColor && value ? { color: playerColor } : undefined}
      >
        {value ?? ""}
      </span>
    </button>
  );
}
