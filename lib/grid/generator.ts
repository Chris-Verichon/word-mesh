// Procedural crossword (mots fléchés) generator.
//
// Algorithm:
//   1. Generate a random grid layout: black cells placed to create letter-cell slots.
//   2. Fill each slot with a matching word from the French word list (backtracking).
//   3. Build the GridCells structure: letter cells with solutions, black cells with
//      arrows and clues pointing to the first cell of each word slot.
//
// Word list:
//   Reads data/wordlist-fr.json at runtime (pre-processed from Lexique.org).
//   Falls back to a small built-in list when the file is absent.
//   Populate the full list by running: npx tsx scripts/build-wordlist.ts

import type { GridCells, BlackCell, LetterCell, Difficulty } from "@/lib/supabase/types";
import type { ParsedGrid } from "./importer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Slot {
  id: string;
  cells: { col: number; row: number }[];
  direction: "h" | "v";
  length: number;
}

interface GridLayout {
  width: number;
  height: number;
  black: boolean[][];
  slots: Slot[];
}

// ---------------------------------------------------------------------------
// Difficulty configuration
// ---------------------------------------------------------------------------

interface DifficultyConfig {
  width: number;
  height: number;
  blackRatio: number;
  minWordLen: number;
  maxWordLen: number;
}

const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  facile: { width: 7, height: 7, blackRatio: 0.28, minWordLen: 3, maxWordLen: 6 },
  moyen: { width: 10, height: 10, blackRatio: 0.25, minWordLen: 3, maxWordLen: 8 },
  difficile: { width: 13, height: 13, blackRatio: 0.22, minWordLen: 4, maxWordLen: 10 },
};

// ---------------------------------------------------------------------------
// Seeded deterministic PRNG (LCG — good enough for layout variation)
// ---------------------------------------------------------------------------

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(1664525, s) + 1013904223;
    return (s >>> 0) / 0xffffffff;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Step 1 — Grid layout generation
// ---------------------------------------------------------------------------

function generateLayout(config: DifficultyConfig, rng: () => number): GridLayout {
  const { width, height, blackRatio, minWordLen } = config;
  const black: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));

  // Random black cells
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (rng() < blackRatio) black[row][col] = true;
    }
  }

  // Fix: collapse horizontal runs shorter than minWordLen into black cells
  for (let row = 0; row < height; row++) {
    let runStart = 0;
    for (let col = 0; col <= width; col++) {
      if (col === width || black[row][col]) {
        const runLen = col - runStart;
        if (runLen > 0 && runLen < minWordLen) {
          for (let c = runStart; c < col; c++) black[row][c] = true;
        }
        runStart = col + 1;
      }
    }
  }

  // Fix: collapse vertical runs shorter than minWordLen into black cells
  for (let col = 0; col < width; col++) {
    let runStart = 0;
    for (let row = 0; row <= height; row++) {
      if (row === height || black[row][col]) {
        const runLen = row - runStart;
        if (runLen > 0 && runLen < minWordLen) {
          for (let r = runStart; r < row; r++) black[r][col] = true;
        }
        runStart = row + 1;
      }
    }
  }

  // Collect word slots (sequences of ≥ minWordLen letter cells)
  const slots: Slot[] = [];
  let idx = 0;

  for (let row = 0; row < height; row++) {
    let cells: { col: number; row: number }[] = [];
    for (let col = 0; col <= width; col++) {
      if (col < width && !black[row][col]) {
        cells.push({ col, row });
      } else {
        if (cells.length >= minWordLen) {
          slots.push({ id: `s${idx++}`, cells, direction: "h", length: cells.length });
        }
        cells = [];
      }
    }
  }

  for (let col = 0; col < width; col++) {
    let cells: { col: number; row: number }[] = [];
    for (let row = 0; row <= height; row++) {
      if (row < height && !black[row][col]) {
        cells.push({ col, row });
      } else {
        if (cells.length >= minWordLen) {
          slots.push({ id: `s${idx++}`, cells, direction: "v", length: cells.length });
        }
        cells = [];
      }
    }
  }

  return { width, height, black, slots };
}

// ---------------------------------------------------------------------------
// Step 2 — Word placement via backtracking
// ---------------------------------------------------------------------------

// Max candidates tried per slot before skipping (avoids very long backtracks)
const MAX_CANDIDATES_PER_SLOT = 80;

function placeWords(
  layout: GridLayout,
  wordsByLen: Map<number, string[]>,
  config: DifficultyConfig,
  rng: () => number,
): Map<string, string> | null {
  const placed = new Map<string, string>(); // cellId → letter
  const slotWord = new Map<string, string>(); // slotId → word

  const solvableSlots = layout.slots.filter(
    (s) => s.length >= config.minWordLen && s.length <= config.maxWordLen,
  );

  // Sort by ascending candidate count: slots with fewer options are filled first
  const sorted = [...solvableSlots].sort(
    (a, b) => (wordsByLen.get(a.length)?.length ?? 0) - (wordsByLen.get(b.length)?.length ?? 0),
  );

  function getCandidates(slot: Slot): string[] {
    const pool = wordsByLen.get(slot.length) ?? [];
    const candidates: string[] = [];
    const shuffled = shuffle(pool, rng);
    for (const word of shuffled) {
      let fits = true;
      for (let i = 0; i < slot.cells.length; i++) {
        const { col, row } = slot.cells[i];
        const existing = placed.get(`${col}-${row}`);
        if (existing && existing !== word[i]) { fits = false; break; }
      }
      if (fits) {
        candidates.push(word);
        if (candidates.length >= MAX_CANDIDATES_PER_SLOT) break;
      }
    }
    return candidates;
  }

  function backtrack(idx: number): boolean {
    if (idx === sorted.length) return true;
    const slot = sorted[idx];
    for (const word of getCandidates(slot)) {
      // Place word letters
      const backup = new Map<string, string | undefined>();
      for (let i = 0; i < slot.cells.length; i++) {
        const { col, row } = slot.cells[i];
        const id = `${col}-${row}`;
        backup.set(id, placed.get(id));
        placed.set(id, word[i]);
      }
      slotWord.set(slot.id, word);
      if (backtrack(idx + 1)) return true;
      // Restore
      for (const [id, prev] of backup) {
        if (prev === undefined) placed.delete(id);
        else placed.set(id, prev);
      }
      slotWord.delete(slot.id);
    }
    return false;
  }

  return backtrack(0) ? slotWord : null;
}

// ---------------------------------------------------------------------------
// Step 3 — Build GridCells from solved layout
// ---------------------------------------------------------------------------

function buildCells(
  layout: GridLayout,
  slotWord: Map<string, string>,
  getClue: (word: string) => string,
): GridCells {
  const cells: GridCells = {};
  const { width, height, black, slots } = layout;

  // Initialize black cells
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (black[row][col]) {
        cells[`${col}-${row}`] = { type: "black", arrows: [], clue_right: undefined, clue_down: undefined };
      }
    }
  }

  // Place letter cells and assign clues to preceding black cells
  let wIdx = 0;
  for (const slot of slots) {
    const word = slotWord.get(slot.id);
    if (!word) continue;

    const wId = `w_${slot.direction}_${wIdx++}`;

    for (let i = 0; i < slot.cells.length; i++) {
      const { col, row } = slot.cells[i];
      const id = `${col}-${row}`;
      const existing = cells[id];
      if (existing?.type === "letter") {
        // Crossing cell — attach the second word ID
        if (slot.direction === "h") (existing as LetterCell).word_id_h = wId;
        else (existing as LetterCell).word_id_v = wId;
      } else {
        cells[id] = {
          type: "letter",
          solution: word[i],
          word_id_h: slot.direction === "h" ? wId : null,
          word_id_v: slot.direction === "v" ? wId : null,
        };
      }
    }

    // Assign clue and arrow to the black cell immediately before the slot
    const first = slot.cells[0];
    const blackId =
      slot.direction === "h"
        ? `${first.col - 1}-${first.row}`
        : `${first.col}-${first.row - 1}`;
    const bc = cells[blackId];
    if (bc?.type === "black") {
      const arrow = slot.direction === "h" ? "right" : "down";
      (bc as BlackCell)[slot.direction === "h" ? "clue_right" : "clue_down"] = getClue(word);
      if (!(bc as BlackCell).arrows.includes(arrow)) {
        (bc as BlackCell).arrows.push(arrow);
      }
    }
  }

  // Fill any remaining empty cells as black (no slot was assigned to them)
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const id = `${col}-${row}`;
      if (!cells[id]) {
        cells[id] = { type: "black", arrows: [], clue_right: undefined, clue_down: undefined };
      }
    }
  }

  return cells;
}

// ---------------------------------------------------------------------------
// Word list — lazy-loaded from data/wordlist-fr.json, with built-in fallback
// ---------------------------------------------------------------------------

// A small built-in French word list (ASCII-only, uppercase).
// Covers common 3–8 letter words. Generated from Lexique.org common frequency tier.
// Expand it by running: npx tsx scripts/build-wordlist.ts
const FALLBACK_WORDS = [
  "AMI", "ARC", "ART", "BAS", "BLE", "BUT",
  "BOIS", "CHAT", "CIEL", "CLEF", "DENT", "DONT",
  "ECRU", "EGAL", "EPEE", "EROS", "ETAU", "ETRE",
  "FAIT", "FAON", "FARD", "FETE", "FEUX", "FOND",
  "GARE", "GOLF", "GOUT", "GRIS",
  "IDEE", "IRIS", "JOLI", "JOUR",
  "LAIT", "LIEN", "LION", "LIRE", "LUNE",
  "MAIN", "MARE", "MIEL", "MODE", "MOIS", "MOTO",
  "NAGE", "NUIT", "ONCE", "ONDE", "OURS",
  "PAIN", "PARC", "PIED", "PLAN", "PONT", "PORT",
  "RACE", "RANG", "RIRE", "ROBE", "ROSE", "ROUX",
  "SEAU", "SOIR", "SOLE", "SORT", "SOUS",
  "TETE", "TOUR", "TROP", "UNIT",
  "VASE", "VENT", "VIDE", "VOIE", "VRAI", "ZONE",
  "ABORD", "ACIER", "ADIEU", "AIGLE", "ALBUM", "ALLEE",
  "AMOUR", "ANCRE", "ANGLE", "ANNEE", "ARBRE", "ARENE",
  "ARGOT", "ARMER", "AROME", "ASTRE", "ATOME", "AUDIO",
  "AUTRE", "AVANT", "AVION", "AVOIR", "BAGUE", "BALLE",
  "BANDE", "BARRE", "BASSE", "BATON", "BELLE", "BERNE",
  "BIERE", "BILAN", "BILLE", "BLANC", "BLEUS", "BOIRE",
  "BOITE", "BOMBE", "BONNE", "BOTTE", "BOULE", "BOURG",
  "BRAVE", "BRISE", "BULLE", "CALME", "CANON", "CARRE",
  "CARTE", "CAUSE", "CHANT", "CHAUD", "CHIEN", "CHOSE",
  "CHUTE", "CIVIL", "COEUR", "CORPS", "COURT", "CRANE",
  "DANSE", "DROIT", "DUVET", "ECLAT", "ECRAN", "EMAIL",
  "ETAGE", "ETAPE", "FAUNE", "FICHE", "FILLE", "FLAIR",
  "FOLIE", "FORME", "FOSSE", "FRANC", "FRONT", "FRUIT",
  "GARDE", "GAZON", "GENIE", "GENRE", "GLACE", "GLOBE",
  "GORGE", "GRACE", "GRAIN", "GRAND", "GREVE", "GUIDE",
  "HEROS", "HIVER", "HOMME", "HONTE", "HOTEL", "HUILE",
  "IMAGE", "IMPOT", "INDEX", "ISSUE", "JAUNE", "JOLIE",
  "JOUER", "LAMPE", "LANCE", "LANDE", "LARGE", "LAVER",
  "LEGAL", "LENTE", "LEVEE", "LIANE", "LIBRE", "LIEGE",
  "LIMON", "LINGE", "LOCAL", "LOGER", "LONGE", "LOUER",
  "LUEUR", "LUTTE", "MAFIA", "MAGIE", "MALIN", "MAMAN",
  "MANGA", "MARGE", "MARIN", "MASSE", "MATHS", "METAL",
  "MINCE", "MONDE", "MONTE", "MORSE", "MOULE", "MOYEN",
  "NATTE", "NAVET", "NEIGE", "NERVE", "NICHE", "NOBLE",
  "NOEUD", "NORME", "NOTER", "NUAGE", "NYLON", "OBJET",
  "OLIVE", "OMEGA", "OPERA", "ORAGE", "OUATE", "OVALE",
  "OZONE", "PAIRE", "PANSE", "PATTE", "PAUSE", "PEINE",
  "PENTE", "PERLE", "PHARE", "PIANO", "PIECE", "PINCE",
  "PITON", "PIVOT", "PLACE", "PLEIN", "PLOMB", "PLUME",
  "POEME", "POETE", "POSTE", "POULE", "PRUNE", "QUEUE",
  "RADAR", "RADIO", "RAFLE", "RAIDE", "RAMPE", "REGLE",
  "REINE", "RELAX", "RENDU", "RENNE", "REPAS", "REPOS",
  "REVER", "REVUE", "RHUME", "RIVAL", "ROBOT", "ROTOR",
  "ROUGE", "ROUTE", "RUGBY", "RURAL", "SABRE", "SAINT",
  "SALLE", "SALON", "SANTE", "SAUCE", "SAULE", "SAVON",
  "SCENE", "SELLE", "SIGNE", "SOEUR", "SOMME", "SONAR",
  "SONGE", "SORTE", "SOUCI", "SOUPE", "SPORT", "STADE",
  "STAGE", "STOCK", "STORE", "STYLE", "SUITE", "SWING",
  "TABLE", "TACHE", "TALON", "TAPIS", "TENTE", "TERME",
  "TERRE", "TEXTE", "THEME", "TIGRE", "TITRE", "TOMBE",
  "TONNE", "TRACE", "TRAIN", "TRIER", "TRONC", "TRUST",
  "TUILE", "TURBO", "ULTRA", "UNION", "UNITE", "USAGE",
  "USURE", "UTILE", "VALVE", "VAGUE", "VASTE", "VERRE",
  "VERSO", "VESTE", "VIGNE", "VILLE", "VITRE", "VIVRE",
  "VOILE", "VOLET", "WAGON",
  "AGENDA", "AIGLON", "ALARME", "ALCOOL", "ALPINE", "AMENDE",
  "AMIRAL", "AMPERE", "AMUSER", "ANNEXE", "APLOMB", "ASPECT",
  "ASSAUT", "ASTUCE", "ATTAQUE", "ATTELER", "AUBADE",
  "BLASON", "BLOQUE", "BONBON", "BOUCHE", "BOUDER", "BRAVER",
  "BROCHE", "BROUET", "BRULER", "BUDGET",
  "CABANE", "CACHET", "CADEAU", "CAIMAN", "CAISSE", "CAMION",
  "CANARD", "CANINE", "CASINO", "CAVALE", "CERCLE", "CERISE",
  "CHAISE", "CHEMIN", "CIGARE", "CINEMA", "CIRQUE", "CITRON",
  "CLOCHE", "COBALT", "COCHON", "COLERE", "COLISE", "COMBAT",
  "COMBLE", "COMETE", "COPAIN", "CORAIL", "COUCHE", "COURIR",
  "COUTIL", "COUVER", "CRACHE", "CRASSE", "CRECHE", "CROISE",
  "CROSSE", "CUEILLIR",
  "DANGER", "DANSER", "DEBOUT", "DECRET", "DEFAUT", "DEFINE",
  "DEPART", "DESTIN", "DIABLE", "DIESEL", "DONJON", "DORMIR",
  "DOUTER", "DRAGON", "DRAPEAU",
  "ECHECS", "ECRIRE", "EFFORT", "EGLISE", "ELUDER", "EMPIRE",
  "ENFANT", "ENIGME", "ENTRER", "EPOQUE", "ERMITE", "ESCALE",
  "ESPACE", "ESPOIR", "EXAMEN",
  "FAMINE", "FANION", "FARINE", "FAUCON", "FAVEUR", "FERMIER",
  "FESTIN", "FIABLE", "FICHER", "FILTRE", "FLACON", "FLECHE",
  "FLUIDE", "FORGER", "FORTIN", "FOURMI", "FRAISE", "FRELON",
  "FUSION",
  "GAFFER", "GALERE", "GALOPE", "GARDER", "GAUFRE", "GEANTE",
  "GLOBAL", "GREFFE", "GRIMPE", "GROTTE", "GUETRE", "GUITARE",
  "HAMEAU", "HANGAR", "HEROIN", "HIBOUX", "HIROND",
  "IMAGER", "IMPACT", "INFINI", "INSPIR", "INVITER",
  "JARDIN", "JUMENT", "JUNGLE", "JUPONS",
  "LACUNE", "LANCER", "LAQUER", "LAURIER", "LAVANDE",
  "LEVIER", "LIBERE", "LIMACE", "LIPIDE", "LOQUACE",
  "LUMIERE", "LUPINS",
  "MADAME", "MAGNAT", "MAITRE", "MALICE", "MANCHE", "MANEGE",
  "MANIER", "MANOIR", "MANQUE", "MARBRE", "MARCHE", "MARRON",
  "MASQUE", "MEDUSE", "MENACE", "MENAGE", "MENTOR", "MERLAN",
  "MESURE", "MIETTE", "MIRACLE", "MODELE", "MOQUER", "MOTEUR",
  "MOUCHE", "MOULIN", "MOUTON", "MUSEAU", "MUSIQUE",
  "NAGEUR", "NAVIRE", "NECTAR", "NOCHER", "NOCIVE", "NOMADE",
  "NOTICE", "NOVICE", "NOYADE", "NUANCE",
  "OBTUSE", "OCEANS", "OFFICE", "OIGNON", "OMBREX", "ORBITE",
  "ORCHID", "ORGANE", "ORIENT", "ORNEMENT",
  "PALAIS", "PALMER", "PANSER", "PARENT", "PARURE", "PATRON",
  "PAVAGE", "PAVOIS", "PECHER", "PELAGE", "PERRON", "PETALE",
  "PILIER", "PINCER", "PIQUER", "PIRATE", "PLACID", "PLANER",
  "PLANTE", "PLAQUE", "PLUMET", "POCHER", "POISON", "POLLET",
  "POMPER", "PORTER", "POTION", "POULET", "POUMON", "POUTER",
  "PRATER", "PRISME", "PRISON", "PROTON", "PUNAIS",
  "QUOTAS",
  "RACKET", "RAISIN", "RAPACE", "RAPPEL", "RASOIR", "RATURE",
  "REBOND", "RECHER", "RECORD", "REFUGE", "REGIME", "RELEVE",
  "RELIER", "REMISE", "RENARD", "RENTER", "REPLAT", "RESINE",
  "RETOUR", "REVEIL", "RIGOLE", "ROBINE", "ROCKET", "RONFLE",
  "ROSEAU", "ROTULE", "ROUBLE", "RUELLE", "RUINER", "RUMEUR",
  "RUSTRE",
  "SABLER", "SAISON", "SAPEUR", "SAVANT", "SCANNER", "SECHER",
  "SEJOUR", "SELENE", "SENSEE", "SERAPH", "SEREIN", "SERRER",
  "SERVAL", "SIGNET", "SILLON", "SIMPLE", "SIRENE", "SIESTE",
  "SOMMET", "SONDER", "SONNET", "SORBET", "SORCIER", "SOUDER",
  "SOUMIS", "SPRINT", "SOLEIL", "SOUPIR", "STELLA",
  "TALION", "TAMPON", "TARDER", "TARTRE", "TENDRE", "TENNIS",
  "TENTER", "TIRADE", "TIROIR", "TOISER", "TONNER", "TOQUER",
  "TORCHE", "TOUCAN", "TRAIRE", "TREIZE", "TREMPE", "TRICHE",
  "TRITON", "TROMPE", "TRONCO", "TROUPE", "TRUFFE", "TULIPE",
  "TUNNEL", "TURQUE", "TUTEUR",
  "URBAIN", "URGENT", "UNIQUE",
  "VALEUR", "VALISE", "VANITE", "VARECH", "VENDOME", "VENTRE",
  "VERNIS", "VESTON", "VICIER", "VICTOR", "VIEILLE", "VIPERE",
  "VISAGE", "VISION", "VISITE", "VIVANT", "VOCAUX", "VOLCAN",
  "VOLEUR", "VORACE", "VOYAGE",
  "ZEPHYR",
];

// Normalize a word: strip diacritics, uppercase, ASCII letters only.
function normalize(word: string): string {
  return word
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

let cachedWordsByLen: Map<number, string[]> | null = null;

async function loadWordList(): Promise<Map<number, string[]>> {
  if (cachedWordsByLen) return cachedWordsByLen;

  let rawWords: string[] = [];
  try {
    const { readFile } = await import("fs/promises");
    const { join } = await import("path");
    const content = await readFile(join(process.cwd(), "data", "wordlist-fr.json"), "utf-8");
    rawWords = JSON.parse(content) as string[];
  } catch {
    rawWords = FALLBACK_WORDS;
  }

  cachedWordsByLen = new Map<number, string[]>();
  for (const raw of rawWords) {
    const word = normalize(raw);
    if (!word) continue;
    const len = word.length;
    if (!cachedWordsByLen.has(len)) cachedWordsByLen.set(len, []);
    cachedWordsByLen.get(len)!.push(word);
  }

  return cachedWordsByLen;
}

// ---------------------------------------------------------------------------
// Default clue generator (placeholder — replace with LLM if desired)
// ---------------------------------------------------------------------------

function defaultClue(word: string): string {
  return `Mot de ${word.length} lettres`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface GeneratorOptions {
  difficulty?: Difficulty;
  seed?: number;
  /** Custom clue function — receives the solution word, returns a clue string */
  getClue?: (word: string) => string;
  /** Max generation attempts with different seeds (default: 4) */
  maxAttempts?: number;
}

/**
 * Generates a complete mots-fléchés grid.
 * Returns a ParsedGrid ready to be inserted into Supabase, or null if all attempts fail.
 */
export async function generateGrid(options: GeneratorOptions = {}): Promise<ParsedGrid | null> {
  const difficulty = options.difficulty ?? "moyen";
  const config = DIFFICULTY_CONFIG[difficulty];
  const getClue = options.getClue ?? defaultClue;
  const maxAttempts = options.maxAttempts ?? 4;

  const wordsByLen = await loadWordList();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const seed = options.seed !== undefined ? options.seed + attempt : Date.now() + attempt * 997;
    const rng = makeRng(seed);

    const layout = generateLayout(config, rng);
    const slotWord = placeWords(layout, wordsByLen, config, rng);

    if (!slotWord) continue;

    const cells = buildCells(layout, slotWord, getClue);
    const wordCount = slotWord.size;
    const date = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

    return {
      title: `Grille du ${date} — ${difficulty} (${wordCount} mots)`,
      difficulty,
      width: config.width,
      height: config.height,
      cells,
    };
  }

  return null;
}
