"use client";

import { useEffect, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { CrosswordGrid } from "@/components/grid/CrosswordGrid";
import { CluePanel } from "@/components/grid/CluePanel";
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

// Client component: owns keyboard/selection state, Realtime sync, and Presence.
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
  });

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

  // Merge for display: remote (includes DB snapshot) then local overrides
  const mergedState = useMemo(
    () => ({ ...remoteState, ...localState }),
    [remoteState, localState]
  );

  // Keep a ref to the latest mergedState so the debounced persist always uses fresh data
  const mergedStateRef = useRef(mergedState);
  useEffect(() => {
    mergedStateRef.current = mergedState;
  }, [mergedState]);

  // Debounced DB persistence: 2s after the last local keystroke, save full merged state
  useEffect(() => {
    if (Object.keys(localState).length === 0) return;

    const timer = setTimeout(async () => {
      await supabase
        .from("rooms")
        .update({ state: mergedStateRef.current })
        .eq("id", roomId);
    }, 2000);

    return () => clearTimeout(timer);
  }, [localState, roomId, supabase]);

  // Global keyboard listener
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
          roomState={mergedState}
          selectedCell={selectedCell ?? undefined}
          activeWordId={activeWordId ?? undefined}
          playerColors={playerColors}
          cursorMap={cursorMap}
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
  const supabase = useMemo(() => createClient(), []);

  // Current player's color (used when writing CellState entries)
  const currentColor = currentUserId ? (playerColors[currentUserId] ?? "") : "";

  // Remote state: seeded with DB snapshot, updated by other players' broadcasts
  const { remoteState, broadcastCell } = useRoomRealtime(
    roomId,
    currentUserId ?? "anon",
    initialState
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
  });

  // Merge for display: remote (includes DB snapshot) then local overrides
  const mergedState = useMemo(
    () => ({ ...remoteState, ...localState }),
    [remoteState, localState]
  );

  // Keep a ref to the latest mergedState so the debounced persist always uses fresh data
  const mergedStateRef = useRef(mergedState);
  useEffect(() => {
    mergedStateRef.current = mergedState;
  }, [mergedState]);

  // Debounced DB persistence: 2s after the last local keystroke, save full merged state
  useEffect(() => {
    if (Object.keys(localState).length === 0) return;

    const timer = setTimeout(async () => {
      await supabase
        .from("rooms")
        .update({ state: mergedStateRef.current })
        .eq("id", roomId);
    }, 2000);

    return () => clearTimeout(timer);
  }, [localState, roomId, supabase]);

  // Global keyboard listener
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
          roomState={mergedState}
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
