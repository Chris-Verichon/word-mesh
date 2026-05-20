import type { SupabaseClient } from "@supabase/supabase-js";

// Small word lists for generating human-readable room slugs (French).
// Format: <adjective>-<noun>-<2-digit number>, e.g. "bleu-chat-42"
const ADJECTIVES = [
  "bleu", "rouge", "vert", "grand", "petit",
  "doux", "frais", "beau", "bon", "vieux",
  "haut", "long", "fort", "sage", "gai",
  "brun", "gris", "vif", "clair", "lent",
];

const NOUNS = [
  "chat", "chien", "maison", "soleil", "lune",
  "mer", "fleur", "roi", "lac", "bois",
  "vent", "feu", "eau", "pre", "pont",
  "ciel", "nuit", "pain", "tour", "parc",
];

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function createSlug(): string {
  const adj = randomFrom(ADJECTIVES);
  const noun = randomFrom(NOUNS);
  const num = Math.floor(Math.random() * 90) + 10; // 10–99
  return `${adj}-${noun}-${num}`;
}

/**
 * Generate a slug that does not already exist in the rooms table.
 * Tries up to 10 times before throwing.
 */
export async function generateUniqueSlug(supabase: SupabaseClient): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const slug = createSlug();
    const { data } = await supabase
      .from("rooms")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
  }
  throw new Error("Unable to generate a unique room slug after 10 attempts");
}
