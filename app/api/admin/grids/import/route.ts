// POST /api/admin/grids/import
//
// Protected admin route — imports a single grid (IPUZ or native Word-Mesh JSON)
// and inserts it as a draft (published: false) in Supabase.
//
// Auth: requires  Authorization: Bearer <IMPORT_SECRET>
//
// Request body (JSON):
//   {
//     data:        object          — the grid payload (IPUZ or Word-Mesh JSON)
//     format?:    "ipuz" | "wordmesh"  — auto-detected if omitted
//     difficulty?: "facile" | "moyen" | "difficile"  — overrides parsed value
//   }
//
// Response 201: { id: string }
// Response 400: { error: string }  — missing/invalid body
// Response 401: { error: string }  — missing/wrong secret
// Response 422: { error: string }  — parse error
// Response 500: { error: string }  — DB error

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseGrid, detectFormat, type ImportFormat } from "@/lib/grid/importer";
import type { Difficulty } from "@/lib/supabase/types";

const VALID_DIFFICULTIES: Difficulty[] = ["facile", "moyen", "difficile"];

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ---- Authentication ----
  const secret = process.env.IMPORT_SECRET;
  if (!secret) {
    // Fail closed: if the env var is not configured, reject all requests
    return NextResponse.json({ error: "Import endpoint not configured" }, { status: 503 });
  }

  const auth = request.headers.get("Authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ---- Parse request body ----
  let body: { data?: unknown; format?: string; difficulty?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (!body.data || typeof body.data !== "object") {
    return NextResponse.json({ error: 'Missing required field "data"' }, { status: 400 });
  }

  const format =
    body.format === "ipuz" || body.format === "wordmesh"
      ? (body.format as ImportFormat)
      : detectFormat(body.data);

  // ---- Parse the grid ----
  let parsed;
  try {
    parsed = parseGrid(body.data, format);
  } catch (err) {
    return NextResponse.json(
      { error: `Parse error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 422 },
    );
  }

  // Override difficulty if provided and valid
  if (body.difficulty && VALID_DIFFICULTIES.includes(body.difficulty as Difficulty)) {
    parsed.difficulty = body.difficulty as Difficulty;
  }

  // ---- Insert into Supabase as a draft ----
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("grids")
    .insert({
      title: parsed.title,
      author: parsed.author ?? null,
      difficulty: parsed.difficulty,
      width: parsed.width,
      height: parsed.height,
      cells: parsed.cells,
      source: "imported",
      published: false, // always starts as draft (US29)
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
