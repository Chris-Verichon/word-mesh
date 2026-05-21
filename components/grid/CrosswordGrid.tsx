"use client";

import type { GridCells, RoomState } from "@/lib/supabase/types";
import { GridCell } from "./GridCell";

// Cell size in rem — used for both width/height of each cell
const CELL_SIZE_REM = 4; // 64px at base font size

interface CrosswordGridProps {
  cells: GridCells;
  width: number;
  height: number;
  // Optional: filled in by future realtime/navigation features
  roomState?: RoomState;
  selectedCell?: string;
  activeWordId?: string;
  playerColors?: Record<string, string>; // player_id → hex color
  cursorMap?: Record<string, string>; // cellId → color of the player whose cursor is there
  wrongCells?: Set<string>; // cellIds where the typed letter does not match the solution
  onCellClick?: (id: string) => void;
}

export function CrosswordGrid({
  cells,
  width,
  height,
  roomState = {},
  selectedCell,
  activeWordId,
  playerColors = {},
  cursorMap = {},
  wrongCells,
  onCellClick,
}: CrosswordGridProps) {
  return (
    // The 1px gap + bg-border trick creates thin grid lines between cells
    <div
      className="overflow-hidden rounded-sm border border-border bg-border shadow-md"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${width}, ${CELL_SIZE_REM}rem)`,
        gridTemplateRows: `repeat(${height}, ${CELL_SIZE_REM}rem)`,
        gap: "1px",
      }}
      role="grid"
      aria-label="Grille de mots fléchés"
    >
      {Array.from({ length: height }, (_, row) =>
        Array.from({ length: width }, (_, col) => {
          const id = `${col}-${row}`;
          const cell = cells[id];

          // Fallback for sparse grids (seed data with missing cells)
          if (!cell) {
            return (
              <div
                key={id}
                className="bg-foreground"
                aria-hidden="true"
              />
            );
          }

          const cellState = roomState[id];
          const playerColor = cellState?.player_id
            ? playerColors[cellState.player_id]
            : undefined;

          const isActiveWord =
            activeWordId != null &&
            cell.type === "letter" &&
            (cell.word_id_h === activeWordId || cell.word_id_v === activeWordId);

          return (
            <div key={id} role="gridcell">
              <GridCell
                id={id}
                cell={cell}
                value={cellState?.value}
                isSelected={selectedCell === id}
                isActiveWord={isActiveWord}
                playerColor={playerColor}
                cursorColor={cursorMap[id]}
                isVerified={!!cellState?.verified_at}
                isWrong={wrongCells?.has(id) ?? false}
                onClick={onCellClick}
              />
            </div>
          );
        })
      )}
    </div>
  );
}
