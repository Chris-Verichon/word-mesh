"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CrosswordGrid } from "@/components/grid/CrosswordGrid";
import { CluePanel } from "@/components/grid/CluePanel";
import { Button } from "@/components/ui/button";
import { useGrid } from "@/hooks/useGrid";
import { useRoomRealtime } from "@/hooks/useRoomRealtime";
import { usePresence } from "@/hooks/usePresence";
import type { Grid, RoomState } from "@/lib/supabase/types";

interface GameBoardProps {
  grid: Grid;
  roomId: string;
  initialState?: RoomState;
  playerColors?: Record<string, string>; // player_id → color
  currentUserId?: string;
  currentDisplayName?: string;
}

// Client component: owns keyboard/selection state, Realtime sync, Presence, and Validation.
export function GameBoard({
  grid,
  roomId,
  initialState = {},
  playerColors = {},
  currentUserId,
  currentDisplayName = "Joueur",
}: GameBoardProps) {
  const supabase = useMemo(() => createClient(), []);

  // Current player's color
  const currentColor = currentUserId ? (playerColors[currentUserId] ?? "") : "";

  // Remote state: seeded with DB snapshot, updated by other players' broadcasts
  const { remoteState, broadcastCell } = useRoomRealtime(
    roomId,
    currentUserId ?? "anon",
    initialState
  );

  // Verified state: cells confirmed correct this session (overlays remote)
  const [verifiedState, setVerifiedState] = useState<RoomState>({});

  // Wrong cells: cellIds that failed the last verification run
  const [wrongCells, setWrongCells] = useState<Set<string>>(new Set());

  // Display state without local: remote snapshot merged with verified
  const displayState = useMemo(
    () => ({ ...remoteState, ...verifiedState }),
    [remoteState, verifiedState]
  );

  // Locked cells: any cell with verified_at cannot be edited
  const lockedCells = useMemo(
    () =>
      new Set(
        Object.entries(displayState)
          .filter(([, cs]) => cs.verified_at !== null)
          .map(([id]) => id)
      ),
    [displayState]
  );

  // Local state: only this player's typed letters in the current session
  const {
    selectedCell,
    activeWordId,
    activeClueCell,
    localState,
    selectCell,
    handleKeyDown,
  } = useGrid(grid.cells, grid.width, grid.height, {
    playerId: currentUserId,
    playerColor: currentColor,
    onCellChange: broadcastCell,
    lockedCells,
  });

  // Full display state: remote+verified then local overrides
  const fullDisplayState = useMemo(
    () => ({ ...displayState, ...localState }),
    [displayState, localState]
  );

  // Presence: track cursor position, expose other players' cursors
  const { cursorMap } = usePresence(
    roomId,
    {
      userId: currentUserId ?? "anon",
      displayName: currentDisplayName,
      color: currentColor,
    },
    selectedCell
  );

  // Completion: all letter cells have verified_at set
  const totalLetterCells = useMemo(
    () => Object.values(grid.cells).filter((c) => c.type === "letter").length,
    [grid.cells]
  );
  const verifiedCount = Object.values(fullDisplayState).filter(
    (cs) => cs.verified_at !== null
  ).length;
  const isComplete = totalLetterCells > 0 && verifiedCount === totalLetterCells;

  // Ref to latest fullDisplayState for the debounced DB save
  const fullDisplayStateRef = useRef(fullDisplayState);
  useEffect(() => {
    fullDisplayStateRef.current = fullDisplayState;
  }, [fullDisplayState]);

  // Debounced DB persistence: 2s after the last local keystroke
  useEffect(() => {
    if (Object.keys(localState).length === 0) return;

    const timer = setTimeout(async () => {
      await supabase
        .from("rooms")
        .update({ state: fullDisplayStateRef.current })
        .eq("id", roomId);
    }, 2000);

    return () => clearTimeout(timer);
  }, [localState, roomId, supabase]);

  // Verification: compare all non-verified filled cells against the solution
  const handleVerify = useCallback(async () => {
    const newVerified: RoomState = {};
    const newWrong = new Set<string>();

    for (const [cellId, cellState] of Object.entries(fullDisplayState)) {
      if (cellState.verified_at !== null) continue; // already locked
      const gridCell = grid.cells[cellId];
      if (gridCell?.type !== "letter" || !cellState.value) continue;

      if (cellState.value === gridCell.solution) {
        newVerified[cellId] = {
          ...cellState,
          verified_at: new Date().toISOString(),
        };
      } else {
        newWrong.add(cellId);
      }
    }

    setWrongCells(newWrong);

    if (Object.keys(newVerified).length > 0) {
      setVerifiedState((prev) => ({ ...prev, ...newVerified }));

      // Broadcast each newly verified cell to other players
      for (const [cellId, cellState] of Object.entries(newVerified)) {
        broadcastCell(cellId, cellState);
      }

      // Persist immediately (skip the debounce)
      const saved = { ...fullDisplayState, ...newVerified };
      await supabase.from("rooms").update({ state: saved }).eq("id", roomId);
    }

    // Mark room as completed when every letter cell is verified
    const newTotal = Object.keys(newVerified).length + verifiedCount;
    if (newWrong.size === 0 && newTotal === totalLetterCells) {
      await supabase
        .from("rooms")
        .update({ status: "completed" })
        .eq("id", roomId);
    }
  }, [
    fullDisplayState,
    grid.cells,
    broadcastCell,
    verifiedCount,
    totalLetterCells,
    roomId,
    supabase,
  ]);

  // Global keyboard listener
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const hasUnverifiedFilled = Object.entries(fullDisplayState).some(
    ([, cs]) => cs.value && cs.verified_at === null
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Completion banner */}
      {isComplete && (
        <div className="flex items-center justify-center gap-2 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          <span>🎉</span>
          <span>Félicitations — grille complète !</span>
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Grid — centered in the available space */}
        <div className="flex flex-1 items-center justify-center p-8">
          <CrosswordGrid
            cells={grid.cells}
            width={grid.width}
            height={grid.height}
            roomState={fullDisplayState}
            selectedCell={selectedCell ?? undefined}
            activeWordId={activeWordId ?? undefined}
            playerColors={playerColors}
            cursorMap={cursorMap}
            wrongCells={wrongCells}
            onCellClick={selectCell}
          />
        </div>

        {/* Clue panel — fixed width, scrollable */}
        <aside className="flex w-72 shrink-0 flex-col overflow-hidden border-l">
          {/* Verify button pinned at top */}
          <div className="shrink-0 border-b p-4">
            <Button
              onClick={handleVerify}
              disabled={!hasUnverifiedFilled || isComplete}
              className="w-full"
              variant={isComplete ? "outline" : "default"}
            >
              {isComplete ? "✓ Grille vérifiée" : "Vérifier"}
            </Button>
            {wrongCells.size > 0 && !isComplete && (
              <p className="mt-2 text-center text-xs text-red-600 dark:text-red-400">
                {wrongCells.size} case{wrongCells.size > 1 ? "s" : ""} incorrecte
                {wrongCells.size > 1 ? "s" : ""}
              </p>
            )}
          </div>

          {/* Scrollable clue list */}
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <CluePanel
              cells={grid.cells}
              width={grid.width}
              height={grid.height}
              activeClueId={activeClueCell ?? undefined}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
