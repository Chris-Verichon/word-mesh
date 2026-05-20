-- ============================================================
-- Word-Mesh — Initial Schema
-- Migration: 001_initial_schema.sql
-- ============================================================

-- -------------------------
-- profiles
-- Extends auth.users with display info and stats.
-- -------------------------
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE,
  avatar_url  TEXT,
  stats       JSONB NOT NULL DEFAULT '{"completed": 0, "total_letters": 0}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create a profile row when a user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- -------------------------
-- grids
-- Stores crossword puzzle definitions.
-- -------------------------
CREATE TABLE grids (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  author      TEXT,
  difficulty  TEXT NOT NULL DEFAULT 'moyen' CHECK (difficulty IN ('facile', 'moyen', 'difficile')),
  width       INT NOT NULL CHECK (width BETWEEN 5 AND 20),
  height      INT NOT NULL CHECK (height BETWEEN 5 AND 20),
  -- cells: map of "col-row" -> cell definition (type, solution, arrows, clues...)
  cells       JSONB NOT NULL,
  source      TEXT NOT NULL DEFAULT 'generated' CHECK (source IN ('generated', 'imported', 'community')),
  published   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Allow fast filtering by difficulty and published status
CREATE INDEX grids_difficulty_idx ON grids (difficulty) WHERE published = true;
CREATE INDEX grids_published_idx ON grids (published, created_at DESC);

-- -------------------------
-- rooms
-- A collaborative game session tied to a grid.
-- -------------------------
CREATE TABLE rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- human-readable URL slug, e.g. "bleu-chat-42"
  slug        TEXT UNIQUE NOT NULL,
  grid_id     UUID NOT NULL REFERENCES grids(id),
  owner_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- state: map of "col-row" -> { value, player_id, color, verified_at }
  state       JSONB NOT NULL DEFAULT '{}'::jsonb,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- anonymous rooms expire after 24h
  expires_at  TIMESTAMPTZ
);

CREATE INDEX rooms_slug_idx ON rooms (slug);
CREATE INDEX rooms_status_idx ON rooms (status, created_at DESC);

-- -------------------------
-- room_players
-- Tracks who is in a room and their current presence state.
-- -------------------------
CREATE TABLE room_players (
  room_id       UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  -- assigned player color as HSL string, e.g. "hsl(220, 70%, 55%)"
  color         TEXT NOT NULL,
  -- last cell the player's cursor was on
  cursor_cell   TEXT,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX room_players_room_idx ON room_players (room_id);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE grids        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;

-- profiles: users can read all profiles, only update their own
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- grids: anyone can read published grids
CREATE POLICY "grids_select_published" ON grids FOR SELECT USING (published = true);

-- rooms: readable by members of that room
CREATE POLICY "rooms_select" ON rooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_players
      WHERE room_players.room_id = rooms.id
        AND room_players.user_id = auth.uid()
    )
  );

-- rooms: state writable only by room members
CREATE POLICY "rooms_update_state" ON rooms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM room_players
      WHERE room_players.room_id = rooms.id
        AND room_players.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM room_players
      WHERE room_players.room_id = rooms.id
        AND room_players.user_id = auth.uid()
    )
  );

-- room_players: members can see other members in the same room
CREATE POLICY "room_players_select" ON room_players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_players rp
      WHERE rp.room_id = room_players.room_id
        AND rp.user_id = auth.uid()
    )
  );

-- room_players: users can insert themselves
CREATE POLICY "room_players_insert" ON room_players FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- room_players: users can update their own row (cursor, last_seen)
CREATE POLICY "room_players_update" ON room_players FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- Realtime
-- Enable realtime on rooms so clients receive live state updates.
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_players;
