-- ============================================================
-- Word-Mesh — Seed Data
-- 3 test grids for local development.
-- Run AFTER 001_initial_schema.sql.
-- ============================================================

-- Grid 1: 5x5 — "Facile" (easy)
-- Layout (B=black, L=letter):
--   B  L  L  L  B
--   L  L  L  L  L
--   L  L  B  L  L
--   L  L  L  L  L
--   B  L  L  L  B
INSERT INTO grids (id, title, author, difficulty, width, height, cells, source, published)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Grille de test #1',
  'Word-Mesh',
  'facile',
  5,
  5,
  '{
    "0-0": {"type": "black", "arrows": ["right", "down"], "clue_right": "Métal précieux", "clue_down": "Pronom personnel"},
    "1-0": {"type": "letter", "solution": "O", "word_id_h": "w_h_0", "word_id_v": "w_v_1"},
    "2-0": {"type": "letter", "solution": "R", "word_id_h": "w_h_0", "word_id_v": "w_v_2"},
    "3-0": {"type": "letter", "solution": "S", "word_id_h": "w_h_0", "word_id_v": "w_v_3"},
    "4-0": {"type": "black", "arrows": ["down"], "clue_down": "Instrument de musique"},
    "0-1": {"type": "letter", "solution": "I", "word_id_h": "w_h_1", "word_id_v": "w_v_0"},
    "1-1": {"type": "letter", "solution": "L", "word_id_h": "w_h_1", "word_id_v": "w_v_1"},
    "2-1": {"type": "letter", "solution": "E", "word_id_h": "w_h_1", "word_id_v": "w_v_2"},
    "3-1": {"type": "letter", "solution": "S", "word_id_h": "w_h_1", "word_id_v": "w_v_3"},
    "4-1": {"type": "letter", "solution": "L", "word_id_h": "w_h_1", "word_id_v": "w_v_4"},
    "0-2": {"type": "letter", "solution": "L", "word_id_h": "w_h_2", "word_id_v": "w_v_0"},
    "1-2": {"type": "letter", "solution": "E", "word_id_h": "w_h_2", "word_id_v": "w_v_1"},
    "2-2": {"type": "black", "arrows": ["right", "down"], "clue_right": "Relatif au soleil", "clue_down": "Préposition"},
    "3-2": {"type": "letter", "solution": "A", "word_id_h": "w_h_2b", "word_id_v": "w_v_3"},
    "4-2": {"type": "letter", "solution": "U", "word_id_h": "w_h_2b", "word_id_v": "w_v_4"},
    "0-3": {"type": "letter", "solution": "S", "word_id_h": "w_h_3", "word_id_v": "w_v_0"},
    "1-3": {"type": "letter", "solution": "T", "word_id_h": "w_h_3", "word_id_v": "w_v_1"},
    "2-3": {"type": "letter", "solution": "E", "word_id_h": "w_h_3", "word_id_v": "w_v_2"},
    "3-3": {"type": "letter", "solution": "L", "word_id_h": "w_h_3", "word_id_v": "w_v_3"},
    "4-3": {"type": "letter", "solution": "S", "word_id_h": "w_h_3", "word_id_v": "w_v_4"},
    "0-4": {"type": "black", "arrows": ["right"], "clue_right": "Animal domestique"},
    "1-4": {"type": "letter", "solution": "C", "word_id_h": "w_h_4", "word_id_v": "w_v_1"},
    "2-4": {"type": "letter", "solution": "H", "word_id_h": "w_h_4", "word_id_v": "w_v_2"},
    "3-4": {"type": "letter", "solution": "A", "word_id_h": "w_h_4", "word_id_v": "w_v_3"},
    "4-4": {"type": "black", "arrows": [], "clue_right": null, "clue_down": null}
  }'::jsonb,
  'generated',
  true
);

-- Grid 2: 7x7 — "Moyen" (medium) — placeholder structure
INSERT INTO grids (id, title, author, difficulty, width, height, cells, source, published)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Grille de test #2',
  'Word-Mesh',
  'moyen',
  7,
  7,
  '{"0-0": {"type": "black", "arrows": ["right", "down"], "clue_right": "Capital française", "clue_down": "Fleuve"}}'::jsonb,
  'generated',
  true
);

-- Grid 3: 9x9 — "Difficile" (hard) — placeholder structure
INSERT INTO grids (id, title, author, difficulty, width, height, cells, source, published)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'Grille de test #3',
  'Word-Mesh',
  'difficile',
  9,
  9,
  '{"0-0": {"type": "black", "arrows": ["right", "down"], "clue_right": "Mammifère marin", "clue_down": "Astre nocturne"}}'::jsonb,
  'generated',
  true
);
