// /grids — Grid catalogue page.
// Fetches published grids from Supabase, filtered by difficulty when provided.
// The DifficultyFilter client component updates the URL search params without a full reload.

import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { DifficultyFilter } from "@/components/catalogue/DifficultyFilter";
import { GridCard } from "@/components/catalogue/GridCard";
import type { Difficulty } from "@/lib/supabase/types";

const VALID_DIFFICULTIES: Difficulty[] = ["facile", "moyen", "difficile"];

interface GridsPageProps {
  searchParams: Promise<{ difficulty?: string }>;
}

export const metadata = {
  title: "Catalogue des grilles — Word-Mesh",
  description: "Choisissez une grille de mots fléchés et créez une salle pour jouer avec vos amis.",
};

export default async function GridsPage({ searchParams }: GridsPageProps) {
  const { difficulty } = await searchParams;
  const activeDifficulty = VALID_DIFFICULTIES.includes(difficulty as Difficulty)
    ? (difficulty as Difficulty)
    : null;

  const supabase = await createClient();

  let query = supabase
    .from("grids")
    .select("id, title, difficulty, width, height, cells")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (activeDifficulty) {
    query = query.eq("difficulty", activeDifficulty);
  }

  const { data: grids } = await query;

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif mb-2 text-3xl font-semibold">Catalogue des grilles</h1>
        <p className="text-muted-foreground text-base">
          Choisissez une grille et créez une salle pour jouer avec vos amis.
        </p>
      </div>

      {/* Difficulty filter — wrapped in Suspense because it uses useSearchParams */}
      <div className="mb-6">
        <Suspense fallback={null}>
          <DifficultyFilter />
        </Suspense>
      </div>

      {/* Grid list */}
      {!grids || grids.length === 0 ? (
        <div className="text-muted-foreground py-16 text-center text-sm">
          {activeDifficulty
            ? `Aucune grille « ${activeDifficulty} » disponible pour l'instant.`
            : "Aucune grille disponible pour l'instant."}
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {grids.map((grid) => (
            <li key={grid.id}>
              <GridCard grid={grid} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
