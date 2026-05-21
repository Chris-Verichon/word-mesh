#!/usr/bin/env tsx
// scripts/build-wordlist.ts
//
// Downloads the Lexique.org 3.83 TSV and extracts a filtered French word list.
// Outputs data/wordlist-fr.json with ASCII-normalized uppercase words.
//
// Filters applied:
//   - 3–12 letters
//   - No hyphens, spaces or digits
//   - Minimum frequency threshold (removes extremely rare words)
//   - Normalized to ASCII uppercase (é→E, à→A, etc.)
//
// Usage:
//   npx tsx scripts/build-wordlist.ts
//
// Requires internet access. Takes ~30s to download and process.

import { createWriteStream, existsSync } from "fs";
import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import { join } from "path";
import { createInterface } from "readline";
import { createReadStream } from "fs";

const LEXIQUE_URL =
  "http://www.lexique.org/databases/Lexique383/Lexique383.tsv";
const TSV_CACHE = join(process.cwd(), "data", "_lexique383.tsv");
const OUTPUT = join(process.cwd(), "data", "wordlist-fr.json");

// Minimum film-frequency to include a word (higher = more common words only)
const MIN_FREQ = 0.5;
// Length range
const MIN_LEN = 3;
const MAX_LEN = 12;

// Normalize: strip diacritics, uppercase, ASCII letters only
function normalize(word: string): string {
  return word
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

async function downloadTsv(): Promise<void> {
  if (existsSync(TSV_CACHE)) {
    console.log(`Using cached TSV: ${TSV_CACHE}`);
    return;
  }
  console.log(`Downloading Lexique.org 3.83 TSV…`);
  const res = await fetch(LEXIQUE_URL);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);

  await mkdir(join(process.cwd(), "data"), { recursive: true });
  const dest = createWriteStream(TSV_CACHE);
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    dest.write(Buffer.from(value));
  }
  await new Promise<void>((resolve, reject) => {
    dest.close((err) => (err ? reject(err) : resolve()));
  });
  console.log("Download complete.");
}

async function parseTsv(): Promise<string[]> {
  // TSV columns (0-indexed):
  //   0  = ortho (word)
  //   1  = phon
  //   3  = cgram (grammatical category)
  //   8  = freqlemfilms2 (frequency per million in films)
  //   9  = freqlemlivres (frequency per million in books)

  const wordSet = new Set<string>();
  const rl = createInterface({ input: createReadStream(TSV_CACHE) });
  let isHeader = true;

  for await (const line of rl) {
    if (isHeader) { isHeader = false; continue; }
    const cols = line.split("\t");
    const raw = cols[0]?.trim();
    if (!raw) continue;

    // Skip words with spaces, hyphens or digits
    if (/[\s\-\d']/.test(raw)) continue;

    // Frequency filter (use films freq, fallback to books)
    const freq = parseFloat(cols[8] ?? "0") || parseFloat(cols[9] ?? "0");
    if (freq < MIN_FREQ) continue;

    const word = normalize(raw);
    if (!word || word.length < MIN_LEN || word.length > MAX_LEN) continue;

    wordSet.add(word);
  }

  return [...wordSet].sort();
}

async function main(): Promise<void> {
  await mkdir(join(process.cwd(), "data"), { recursive: true });

  try {
    await downloadTsv();
  } catch (err) {
    console.error(`Error downloading Lexique.org: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  console.log("Parsing TSV…");
  const words = await parseTsv();
  console.log(`Extracted ${words.length} words.`);

  await writeFile(OUTPUT, JSON.stringify(words, null, 0), "utf-8");
  console.log(`Word list written to: ${OUTPUT}`);

  // Clean up cache
  await unlink(TSV_CACHE).catch(() => {});
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
