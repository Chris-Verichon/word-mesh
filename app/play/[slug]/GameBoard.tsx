"use client";

import { useEffect } from "react";
import { CrosswordGrid } from "@/components/grid/CrosswordGrid";
import { CluePanel } from "@/components/grid/CluePanel";
import { useGrid } from "@/hooks/useGrid";
import type { Grid, RoomState } from "@/lib/supabase/types";

interface GameBoardProps {
  grid: Grid;
  initialState?: RoomState;
  playerColors?: Record<string, string>; // player_id → color
  currentUserId?: string;
}

// Client component: owns all keyboard + selection state via useGrid.
// Wraps CrosswordGrid and CluePanel so the Server Component page stays clean.
export function GameBoard({ grid, initialState, playerColors = {}, currentUserId }: GameBoardProps) {
  const {
    selectedCell,
    activeWordId,
    activeClueCell,
    localState,
    selectCell,
    handleKeyDown,
  } = useGrid(grid.cells, grid.width, grid.height, initialState);

  // Attach keyboard listener to the window for the duration of the game
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* Grid — centered in the available space */}
      <div className="flex flex-1 items-center justify-center p-8">
        <CrosswordGrid
          cells={grid.cells}
          width={grid.width}
          height={grid.height}
          roomState={localState}
          selectedCell={selectedCell ?? undefined}
          activeWordId={activeWordId ?? undefined}
          playerColors={playerColors}
          onCellClick={selectCell}
        />
      </div>

      {/* Clue panel — fixed width, scrollable, highlights the active clue */}
      <aside className="w-72 shrink-0 overflow-y-auto border-l p-5">
        <CluePanel
          cells={grid.cells}
          width={grid.width}
          height={grid.height}
          activeClueId={activeClueCell ?? undefined}
        />
      </aside>
    </div>
  );
}
          height={grid.height}
          activeClueId={activeClueCell ?? undefined}
        />
      </aside>
    </div>
  );
}
