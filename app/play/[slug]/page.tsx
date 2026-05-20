import { FIXTURE_GRID } from "@/lib/grid/fixtures";
import { CrosswordGrid } from "@/components/grid/CrosswordGrid";
import { CluePanel } from "@/components/grid/CluePanel";

// Static render for feature/grid-display.
// Room data and real-time sync will be wired in feature/room-system.
// The slug is ignored for now — the fixture grid is always displayed.
export default async function PlayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await params; // consumed to satisfy Next.js 16 async params requirement

  const grid = FIXTURE_GRID;

  return (
    <div className="flex h-screen flex-col">
      {/* Room header */}
      <header className="flex shrink-0 items-center justify-between border-b px-6 py-3">
        <h1 className="font-serif text-xl font-semibold">{grid.title}</h1>
        <span className="bg-muted text-muted-foreground rounded-full px-3 py-0.5 text-sm capitalize">
          {grid.difficulty}
        </span>
      </header>

      {/* Main game area: grid + clue panel */}
      <main className="flex min-h-0 flex-1 overflow-hidden">
        {/* Grid — centered in remaining space */}
        <div className="flex flex-1 items-center justify-center p-8">
          <CrosswordGrid cells={grid.cells} width={grid.width} height={grid.height} />
        </div>

        {/* Clue panel — fixed width, scrollable */}
        <aside className="w-72 shrink-0 overflow-y-auto border-l p-5">
          <CluePanel cells={grid.cells} width={grid.width} height={grid.height} />
        </aside>
      </main>
    </div>
  );
}
