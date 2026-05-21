"use client";

// Client component: difficulty filter buttons that update the URL search params.
// Active filter is derived from the current URL.

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { Difficulty } from "@/lib/supabase/types";

const FILTERS: { value: Difficulty | "all"; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "facile", label: "Facile" },
  { value: "moyen", label: "Moyen" },
  { value: "difficile", label: "Difficile" },
];

export function DifficultyFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = (searchParams.get("difficulty") as Difficulty | null) ?? "all";

  const setFilter = useCallback(
    (value: Difficulty | "all") => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all") {
        params.delete("difficulty");
      } else {
        params.set("difficulty", value);
      }
      router.push(`/grids?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par difficulté">
      {FILTERS.map(({ value, label }) => (
        <Button
          key={value}
          variant={current === value ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter(value)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
