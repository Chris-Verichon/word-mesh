import type { GridCells } from "@/lib/supabase/types";

interface Clue {
  cellId: string; // "col-row" of the source black cell
  text: string;
  col: number;
  row: number;
}

// Extract horizontal and vertical clues from the cells map, sorted top-to-bottom left-to-right
function extractClues(
  cells: GridCells,
  width: number,
  height: number
): { horizontal: Clue[]; vertical: Clue[] } {
  const horizontal: Clue[] = [];
  const vertical: Clue[] = [];

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const cell = cells[`${col}-${row}`];
      if (cell?.type === "black") {
        if (cell.clue_right) {
          horizontal.push({ cellId: `${col}-${row}`, text: cell.clue_right, col, row });
        }
        if (cell.clue_down) {
          vertical.push({ cellId: `${col}-${row}`, text: cell.clue_down, col, row });
        }
      }
    }
  }

  return { horizontal, vertical };
}

interface CluePanelProps {
  cells: GridCells;
  width: number;
  height: number;
  // Optional: cell id of the currently active clue — will be highlighted
  activeClueId?: string;
}

export function CluePanel({ cells, width, height, activeClueId }: CluePanelProps) {
  const { horizontal, vertical } = extractClues(cells, width, height);

  return (
    <div className="flex flex-col gap-6">
      <ClueSection title="→ Horizontaux" clues={horizontal} activeClueId={activeClueId} />
      <ClueSection title="↓ Verticaux" clues={vertical} activeClueId={activeClueId} />
    </div>
  );
}

function ClueSection({
  title,
  clues,
  activeClueId,
}: {
  title: string;
  clues: Clue[];
  activeClueId?: string;
}) {
  if (clues.length === 0) return null;

  return (
    <section>
      <h2 className="font-serif mb-3 text-base font-semibold tracking-wide">{title}</h2>
      <ul className="flex flex-col gap-1.5">
        {clues.map((clue) => {
          const isActive = activeClueId === clue.cellId;
          return (
            <li
              key={clue.cellId}
              className={`flex gap-2 rounded-md px-2 py-1 text-sm transition-colors ${
                isActive ? "bg-primary/15 font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {/* Grid coordinates (col, row) — 1-indexed for readability */}
              <span className="text-muted-foreground w-10 shrink-0 text-xs tabular-nums">
                {clue.col + 1},{clue.row + 1}
              </span>
              <span>{clue.text}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
