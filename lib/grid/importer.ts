// Grid importer — parses external grid files into the Word-Mesh GridCells format.
//
// Supported formats:
//   - "wordmesh" — native Word-Mesh JSON (direct GridCells structure)
//   - "ipuz"     — standard IPUZ crossword format (http://ipuz.org/v2)
//
// Usage:
//   const parsed = parseGrid(rawJson);          // auto-detect
//   const parsed = parseGrid(rawJson, "ipuz");  // explicit format

import type { GridCells, BlackCell, LetterCell, Difficulty } from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ImportFormat = "ipuz" | "wordmesh";

export interface ParsedGrid {
  title: string;
  author?: string;
  difficulty: Difficulty;
  width: number;
  height: number;
  cells: GridCells;
}

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

/**
 * Returns "ipuz" if the object has a `puzzle` array (IPUZ crossword),
 * otherwise returns "wordmesh" (native format).
 */
export function detectFormat(raw: unknown): ImportFormat {
  if (typeof raw === "object" && raw !== null && "puzzle" in raw) return "ipuz";
  return "wordmesh";
}

// ---------------------------------------------------------------------------
// Native Word-Mesh JSON parser
// ---------------------------------------------------------------------------

function parseNative(raw: unknown): ParsedGrid {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid JSON: expected an object");
  }
  const obj = raw as Record<string, unknown>;

  if (!obj.title || typeof obj.title !== "string") throw new Error("Missing `title`");
  if (typeof obj.width !== "number") throw new Error("Missing or invalid `width`");
  if (typeof obj.height !== "number") throw new Error("Missing or invalid `height`");
  if (!obj.cells || typeof obj.cells !== "object" || Array.isArray(obj.cells)) {
    throw new Error("Missing or invalid `cells`");
  }

  const diff = typeof obj.difficulty === "string" ? obj.difficulty : "moyen";
  if (!["facile", "moyen", "difficile"].includes(diff)) {
    throw new Error(`Invalid difficulty value: "${diff}"`);
  }

  return {
    title: obj.title,
    author: typeof obj.author === "string" ? obj.author : undefined,
    difficulty: diff as Difficulty,
    width: obj.width,
    height: obj.height,
    cells: obj.cells as GridCells,
  };
}

// ---------------------------------------------------------------------------
// IPUZ crossword parser
// ---------------------------------------------------------------------------

// Minimal IPUZ shape we care about
interface IpuzDoc {
  title?: string;
  author?: string;
  dimensions?: { width: number; height: number };
  puzzle: (string | number)[][];
  solution: (string | null | 0)[][];
  clues?: {
    Across?: { number: number; clue: string }[];
    Down?: { number: number; clue: string }[];
  };
}

function parseIpuz(raw: unknown): ParsedGrid {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid IPUZ: expected an object");
  }
  const doc = raw as IpuzDoc;

  if (!Array.isArray(doc.puzzle)) throw new Error("Missing `puzzle` array in IPUZ");
  if (!Array.isArray(doc.solution)) throw new Error("Missing `solution` array in IPUZ");

  const height = doc.puzzle.length;
  const width = doc.puzzle[0]?.length ?? 0;
  if (height === 0 || width === 0) throw new Error("Empty IPUZ puzzle grid");

  // Build clue lookup maps
  const acrossClues = new Map<number, string>();
  const downClues = new Map<number, string>();
  for (const { number: n, clue } of doc.clues?.Across ?? []) acrossClues.set(n, clue);
  for (const { number: n, clue } of doc.clues?.Down ?? []) downClues.set(n, clue);

  // Helpers
  const isBlack = (r: number, c: number) => doc.puzzle[r]?.[c] === "#";
  const letterAt = (r: number, c: number): string | null => {
    const v = doc.solution[r]?.[c];
    if (!v || v === 0 || v === "." || v === "#") return null;
    return String(v).toUpperCase();
  };

  // First pass — build skeleton cells
  const cells: GridCells = {};
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const id = `${col}-${row}`;
      if (isBlack(row, col)) {
        // arrows and clues will be filled in the third pass
        cells[id] = { type: "black", arrows: [], clue_right: undefined, clue_down: undefined };
      } else {
        const sol = letterAt(row, col);
        if (sol) {
          cells[id] = { type: "letter", solution: sol, word_id_h: null, word_id_v: null };
        }
      }
    }
  }

  // Second pass — assign word IDs
  let wIdx = 0;

  // Horizontal word IDs
  for (let row = 0; row < height; row++) {
    let wordId: string | null = null;
    for (let col = 0; col < width; col++) {
      const id = `${col}-${row}`;
      const cell = cells[id];
      if (!cell || cell.type === "black") { wordId = null; continue; }
      const prevBlankOrEdge =
        col === 0 || !cells[`${col - 1}-${row}`] || cells[`${col - 1}-${row}`].type === "black";
      const nextLetter = cells[`${col + 1}-${row}`]?.type === "letter";
      if (prevBlankOrEdge && nextLetter) wordId = `w_h_${wIdx++}`;
      if (wordId) (cell as LetterCell).word_id_h = wordId;
    }
  }

  // Vertical word IDs
  for (let col = 0; col < width; col++) {
    let wordId: string | null = null;
    for (let row = 0; row < height; row++) {
      const id = `${col}-${row}`;
      const cell = cells[id];
      if (!cell || cell.type === "black") { wordId = null; continue; }
      const prevBlankOrEdge =
        row === 0 || !cells[`${col}-${row - 1}`] || cells[`${col}-${row - 1}`].type === "black";
      const nextLetter = cells[`${col}-${row + 1}`]?.type === "letter";
      if (prevBlankOrEdge && nextLetter) wordId = `w_v_${wIdx++}`;
      if (wordId) (cell as LetterCell).word_id_v = wordId;
    }
  }

  // Third pass — map IPUZ clue numbers to black cells preceding each word
  // IPUZ numbered cells sit at the start of each across/down word.
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const num = doc.puzzle[row][col];
      if (typeof num !== "number" || num <= 0) continue;

      const across = acrossClues.get(num);
      const down = downClues.get(num);

      // Across: clue sits in the black cell immediately to the left
      if (across) {
        const blackId = `${col - 1}-${row}`;
        const bc = cells[blackId];
        if (bc?.type === "black") {
          (bc as BlackCell).clue_right = across;
          if (!(bc as BlackCell).arrows.includes("right")) {
            (bc as BlackCell).arrows.push("right");
          }
        }
      }

      // Down: clue sits in the black cell immediately above
      if (down) {
        const blackId = `${col}-${row - 1}`;
        const bc = cells[blackId];
        if (bc?.type === "black") {
          (bc as BlackCell).clue_down = down;
          if (!(bc as BlackCell).arrows.includes("down")) {
            (bc as BlackCell).arrows.push("down");
          }
        }
      }
    }
  }

  return {
    title: doc.title ?? "Grille importée",
    author: doc.author,
    difficulty: "moyen", // IPUZ has no difficulty field — default to "moyen"
    width,
    height,
    cells,
  };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Parses raw JSON into a ParsedGrid ready to be inserted into Supabase.
 * Auto-detects the format when `format` is omitted.
 * Throws a descriptive Error on invalid input.
 */
export function parseGrid(raw: unknown, format?: ImportFormat): ParsedGrid {
  const fmt = format ?? detectFormat(raw);
  return fmt === "ipuz" ? parseIpuz(raw) : parseNative(raw);
}
