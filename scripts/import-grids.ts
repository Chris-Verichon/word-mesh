#!/usr/bin/env tsx
// scripts/import-grids.ts
//
// Bulk-imports grid files from a local directory into Word-Mesh via the admin API.
// Supports .json (Word-Mesh native or IPUZ) and .ipuz files.
//
// Usage:
//   IMPORT_SECRET=<secret> npx tsx scripts/import-grids.ts <directory> [options]
//
// Options:
//   --url <base>       Base URL of the running app (default: http://localhost:3000)
//   --difficulty <d>   Override difficulty for all grids: facile | moyen | difficile
//
// Each successfully imported grid is created as a draft (published: false).
// Publish grids manually via the Supabase dashboard or a future admin UI.

import { readdir, readFile } from "fs/promises";
import { join, extname, basename } from "path";

// ---------------------------------------------------------------------------
// Config from env / args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function getArg(flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : undefined;
}

const dir = args.find((a) => !a.startsWith("--") && args.indexOf(a) === args.findIndex((x) => x === a));
const baseUrl = getArg("--url") ?? "http://localhost:3000";
const difficultyOverride = getArg("--difficulty");

const IMPORT_SECRET = process.env.IMPORT_SECRET ?? "";

// ---------------------------------------------------------------------------
// Import a single file
// ---------------------------------------------------------------------------

async function importFile(filePath: string): Promise<void> {
  const ext = extname(filePath).toLowerCase();
  const name = basename(filePath);
  const format: "ipuz" | "wordmesh" = ext === ".ipuz" ? "ipuz" : "wordmesh";

  // Read and parse the file
  let raw: unknown;
  try {
    const content = await readFile(filePath, "utf-8");
    raw = JSON.parse(content);
  } catch {
    console.error(`[SKIP] ${name} — could not read or parse as JSON`);
    return;
  }

  // Build request body
  const body: Record<string, unknown> = { data: raw, format };
  if (difficultyOverride) body.difficulty = difficultyOverride;

  // Call the import API
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/admin/grids/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${IMPORT_SECRET}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error(`[FAIL] ${name} — network error: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const json = (await res.json()) as { error?: string };
      if (json.error) message += `: ${json.error}`;
    } catch {
      // ignore parse error on error response
    }
    console.error(`[FAIL] ${name} — ${message}`);
    return;
  }

  const { id } = (await res.json()) as { id: string };
  console.log(`[OK]   ${name} → id: ${id} (draft)`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (!dir) {
    console.error("Usage: IMPORT_SECRET=<secret> npx tsx scripts/import-grids.ts <directory> [--url <base>] [--difficulty <d>]");
    process.exit(1);
  }

  if (!IMPORT_SECRET) {
    console.error("Error: IMPORT_SECRET environment variable is not set");
    process.exit(1);
  }

  // Collect matching files
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    console.error(`Error: cannot read directory "${dir}"`);
    process.exit(1);
  }

  const files = entries
    .filter((f) => [".json", ".ipuz"].includes(extname(f).toLowerCase()))
    .map((f) => join(dir, f));

  if (files.length === 0) {
    console.log(`No .json or .ipuz files found in "${dir}"`);
    process.exit(0);
  }

  console.log(`Importing ${files.length} file(s) from "${dir}" → ${baseUrl}`);
  if (difficultyOverride) console.log(`  difficulty override: ${difficultyOverride}`);
  console.log();

  for (const file of files) {
    await importFile(file);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
