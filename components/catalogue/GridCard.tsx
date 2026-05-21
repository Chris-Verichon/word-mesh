// GridCard — displays a single grid in the catalogue.
// Shows a SVG miniature of the grid structure, title, difficulty badge and a "Créer une salle" button.

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GridMiniature } from "@/components/grid/GridMiniature";
import { createRoom } from "@/app/play/actions";
import type { Grid, Difficulty } from "@/lib/supabase/types";

type GridSummary = Pick<Grid, "id" | "title" | "difficulty" | "width" | "height" | "cells">;

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  facile: "Facile",
  moyen: "Moyen",
  difficile: "Difficile",
};

// Map difficulty to Tailwind color classes for the badge
const DIFFICULTY_CLASS: Record<Difficulty, string> = {
  facile: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  moyen: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  difficile: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

interface GridCardProps {
  grid: GridSummary;
}

export function GridCard({ grid }: GridCardProps) {
  const createRoomForGrid = createRoom.bind(null, grid.id);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <div className="mb-3 flex items-start justify-between gap-2">
          <CardTitle className="font-serif text-base leading-snug">{grid.title}</CardTitle>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${DIFFICULTY_CLASS[grid.difficulty]}`}
          >
            {DIFFICULTY_LABEL[grid.difficulty]}
          </span>
        </div>

        {/* SVG miniature centered */}
        <div className="bg-muted/40 flex items-center justify-center rounded-md p-3">
          <GridMiniature cells={grid.cells} width={grid.width} height={grid.height} size={96} />
        </div>
      </CardHeader>

      <CardContent className="text-muted-foreground pb-3 text-xs">
        {grid.width}&thinsp;&times;&thinsp;{grid.height} cases
      </CardContent>

      <CardFooter className="mt-auto pt-0">
        <form action={createRoomForGrid} className="w-full">
          <Button type="submit" size="sm" className="w-full">
            Créer une salle
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
