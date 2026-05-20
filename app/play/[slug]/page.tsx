import { FIXTURE_GRID } from "@/lib/grid/fixtures";
import { GameBoard } from "./GameBoard";

// Server Component: fetches grid data and passes it to the interactive GameBoard.
// Real room/slug lookup will be wired in feature/room-system.
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

      {/* Interactive game area — client boundary */}
      <GameBoard grid={grid} />
    </div>
  );
}
