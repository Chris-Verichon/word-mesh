// Home page — landing page with "Grille du Jour" feature (US27) and CTA to the catalogue.
// The daily grid is the most recently published grid (sorted by created_at DESC).

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { GridCard } from "@/components/catalogue/GridCard";

export default async function Home() {
  const supabase = await createClient();

  // Daily grid: latest published grid
  const { data: dailyGrid } = await supabase
    .from("grids")
    .select("id, title, difficulty, width, height, cells")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-20">
      {/* Hero */}
      <section className="mb-16 max-w-xl text-center">
        <h1 className="font-serif mb-4 text-4xl font-semibold tracking-tight">Word-Mesh</h1>
        <p className="text-muted-foreground mb-8 text-lg">
          Mots fléchés collaboratifs en temps réel. Résolvez les grilles avec vos amis, où que vous
          soyez.
        </p>
        <Link href="/grids" className={buttonVariants({ size: "lg" })}>
          Voir toutes les grilles
        </Link>
      </section>

      {/* Daily grid */}
      {dailyGrid && (
        <section className="w-full max-w-xs">
          <h2 className="font-serif mb-4 text-center text-xl font-semibold">Grille du Jour</h2>
          <GridCard grid={dailyGrid} />
        </section>
      )}
    </main>
  );
}

