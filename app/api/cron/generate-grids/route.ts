// GET /api/cron/generate-grids
//
// Vercel cron job — generates one grid per difficulty level and inserts them
// as published grids in Supabase (auto-publish for unattended generation — US30).
//
// Schedule: configured in vercel.json (daily at 02:00 UTC).
// Auth:      Vercel sends Authorization: Bearer <CRON_SECRET> automatically.
//            Set CRON_SECRET in the Vercel environment variables.
//
// Response 200: { generated: N, failed: N, results: [...] }
// Response 401: { error: "Unauthorized" }
// Response 503: { error: "Cron not configured" }

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateGrid } from "@/lib/grid/generator";
import type { Difficulty, Database } from "@/lib/supabase/types";

const DIFFICULTIES: Difficulty[] = ["facile", "moyen", "difficile"];

export const maxDuration = 60; // seconds — requires Vercel Pro for >10s

export async function GET(request: NextRequest): Promise<NextResponse> {
  // ---- Auth ----
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Cron not configured (missing CRON_SECRET)" }, { status: 503 });
  }
  if (request.headers.get("Authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const results: { difficulty: Difficulty; id?: string; error?: string }[] = [];

  // Generate one grid per difficulty
  for (const difficulty of DIFFICULTIES) {
    const parsed = await generateGrid({ difficulty });

    if (!parsed) {
      results.push({ difficulty, error: "Generation failed after max attempts" });
      continue;
    }

    // Explicitly type the payload so TypeScript resolves the correct insert overload
    const payload: Database["public"]["Tables"]["grids"]["Insert"] = {
      title: parsed.title,
      author: "Word-Mesh Generator",
      difficulty: parsed.difficulty,
      width: parsed.width,
      height: parsed.height,
      cells: parsed.cells,
      source: "generated",
      published: true, // auto-publish: US30 requires no manual intervention
    };

    const { data, error } = await supabase
      .from("grids")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      results.push({ difficulty, error: error.message });
    } else {
      results.push({ difficulty, id: data.id });
    }
  }

  const failed = results.filter((r) => r.error).length;
  const generated = results.length - failed;

  return NextResponse.json(
    { generated, failed, results },
    { status: failed === results.length ? 500 : 200 },
  );
}
