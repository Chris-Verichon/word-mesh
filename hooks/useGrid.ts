"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { CellState, GridCells, RoomState } from "@/lib/supabase/types";

// --------------- Grid coordinate helpers ---------------

function parseId(id: string): [number, number] {
  const [col, row] = id.split("-").map(Number);
  return [col, row];
}

function makeId(col: number, row: number): string {
  return `${col}-${row}`;
}

function isLetterCell(cells: GridCells, id: string): boolean {
  return cells[id]?.type === "letter";
}

/**
 * Move from `id` by (dx, dy). Returns the new id only if it is a letter cell,
 * or null if out of bounds / black cell.
 */
function step(
  cells: GridCells,
  id: string,
  dx: number,
  dy: number,
  width: number,
  height: number
): string | null {
  const [col, row] = parseId(id);
  const nc = col + dx;
  const nr = row + dy;
  if (nc < 0 || nc >= width || nr < 0 || nr >= height) return null;
  const newId = makeId(nc, nr);
  return isLetterCell(cells, newId) ? newId : null;
}

/**
 * Walk backward from `id` in the given direction until reaching a black cell or grid edge.
 * Returns the id of the black cell that holds the clue, or null if the word starts at the edge.
 */
function findClueCell(
  cells: GridCells,
  id: string,
  direction: "h" | "v"
): string | null {
  const dx = direction === "h" ? -1 : 0;
  const dy = direction === "v" ? -1 : 0;
  let [col, row] = parseId(id);

  while (true) {
    const pc = col + dx;
    const pr = row + dy;
    if (pc < 0 || pr < 0) return null; // word starts at grid edge
    const prevId = makeId(pc, pr);
    const prevCell = cells[prevId];
    if (!prevCell || prevCell.type === "black") return prevId;
    col = pc;
    row = pr;
  }
}

// --------------- Public interface ---------------

export interface UseGridOptions {
  /** Current player's user id — written into CellState. */
  playerId?: string;
  /** Current player's CSS color — written into CellState. */
  playerColor?: string;
  /**
   * Called whenever a cell changes (letter written or deleted).
   * Use this to broadcast updates to other players via Realtime.
   */
  onCellChange?: (cellId: string, cellState: CellState | null) => void;
  /** Cell ids that are locked (verified correct). Typing and backspace are disabled on these. */
  lockedCells?: Set<string>;
}

export interface UseGridReturn {
  selectedCell: string | null;
  activeWordId: string | null;
  activeDirection: "h" | "v";
  /** Id of the black cell whose clue is currently active — used to highlight CluePanel. */
  activeClueCell: string | null;
  localState: RoomState;
  selectCell: (id: string) => void;
  handleKeyDown: (e: KeyboardEvent) => void;
}

export function useGrid(
  cells: GridCells,
  width: number,
  height: number,
  options: UseGridOptions = {}
): UseGridReturn {
  const { playerId = "local", playerColor = "", onCellChange, lockedCells } = options;

  // Use refs so handleKeyDown stays stable across option changes
  const playerIdRef = useRef(playerId);
  const playerColorRef = useRef(playerColor);
  const onCellChangeRef = useRef(onCellChange);
  const lockedCellsRef = useRef(lockedCells);
  useEffect(() => {
    playerIdRef.current = playerId;
    playerColorRef.current = playerColor;
    onCellChangeRef.current = onCellChange;
    lockedCellsRef.current = lockedCells;
  });

  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [activeDirection, setActiveDirection] = useState<"h" | "v">("h");
  // Local state tracks only the current user's typed letters this session
  const [localState, setLocalState] = useState<RoomState>({});

  // Derive active word id from selection + direction
  const activeWordId = (() => {
    if (!selectedCell) return null;
    const cell = cells[selectedCell];
    if (cell?.type !== "letter") return null;
    return activeDirection === "h" ? cell.word_id_h : cell.word_id_v;
  })();

  // Derive the source black cell of the active clue
  const activeClueCell = selectedCell
    ? findClueCell(cells, selectedCell, activeDirection)
    : null;

  const selectCell = useCallback(
    (id: string) => {
      const cell = cells[id];
      if (cell?.type !== "letter") return;

      if (id === selectedCell) {
        // Toggle direction on re-click (only if the cell has both directions)
        setActiveDirection((d) => {
          const next = d === "h" ? "v" : "h";
          const nextWordId = next === "h" ? cell.word_id_h : cell.word_id_v;
          return nextWordId ? next : d;
        });
      } else {
        setSelectedCell(id);
        // Default to horizontal if the cell belongs to an h-word, else vertical
        setActiveDirection(cell.word_id_h ? "h" : "v");
      }
    },
    [selectedCell, cells]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!selectedCell) return;

      const { key } = e;

      // Arrow navigation — move one cell, update direction to match axis
      if (["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(key)) {
        e.preventDefault();
        const dx = key === "ArrowRight" ? 1 : key === "ArrowLeft" ? -1 : 0;
        const dy = key === "ArrowDown" ? 1 : key === "ArrowUp" ? -1 : 0;
        const next = step(cells, selectedCell, dx, dy, width, height);
        if (next) {
          setSelectedCell(next);
          if (dx !== 0) setActiveDirection("h");
          if (dy !== 0) setActiveDirection("v");
        }
        return;
      }

      // Backspace — clear current cell, or move to previous cell and clear it
      if (key === "Backspace") {
        e.preventDefault();
        if (lockedCellsRef.current?.has(selectedCell)) {
          // Verified cells cannot be cleared — just move the cursor back
          const dx = activeDirection === "h" ? -1 : 0;
          const dy = activeDirection === "v" ? -1 : 0;
          const prev = step(cells, selectedCell, dx, dy, width, height);
          if (prev) setSelectedCell(prev);
          return;
        }
        if (localState[selectedCell]?.value) {
          setLocalState((s) => {
            const next = { ...s };
            delete next[selectedCell];
            return next;
          });
          onCellChangeRef.current?.(selectedCell, null);
        } else {
          const dx = activeDirection === "h" ? -1 : 0;
          const dy = activeDirection === "v" ? -1 : 0;
          const prev = step(cells, selectedCell, dx, dy, width, height);
          if (prev) {
            setSelectedCell(prev);
            setLocalState((s) => {
              const next = { ...s };
              delete next[prev];
              return next;
            });
            onCellChangeRef.current?.(prev, null);
          }
        }
        return;
      }

      // Letter input — normalize accented French characters to their ASCII base
      if (/^[a-zA-ZÀ-ÿ]$/.test(key)) {
        e.preventDefault();
        // Verified cells are locked — skip but advance cursor
        if (lockedCellsRef.current?.has(selectedCell)) {
          const dx = activeDirection === "h" ? 1 : 0;
          const dy = activeDirection === "v" ? 1 : 0;
          const next = step(cells, selectedCell, dx, dy, width, height);
          if (next) setSelectedCell(next);
          return;
        }
        const letter = key
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toUpperCase();

        const cellState: CellState = {
          value: letter,
          player_id: playerIdRef.current,
          color: playerColorRef.current,
          verified_at: null,
        };
        setLocalState((s) => ({ ...s, [selectedCell]: cellState }));
        onCellChangeRef.current?.(selectedCell, cellState);

        // Advance cursor to next cell in the active word direction
        const dx = activeDirection === "h" ? 1 : 0;
        const dy = activeDirection === "v" ? 1 : 0;
        const next = step(cells, selectedCell, dx, dy, width, height);
        if (next) setSelectedCell(next);
      }
    },
    [selectedCell, localState, activeDirection, cells, width, height]
  );

  return {
    selectedCell,
    activeWordId,
    activeDirection,
    activeClueCell,
    localState,
    selectCell,
    handleKeyDown,
  };
}
