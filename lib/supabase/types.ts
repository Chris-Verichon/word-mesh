// ============================================================
// Word-Mesh — Database Types
// Auto-generated shape matching the Supabase schema.
// Update when the schema changes.
// ============================================================

export type Difficulty = "facile" | "moyen" | "difficile";
export type GridSource = "generated" | "imported" | "community";
export type RoomStatus = "active" | "completed" | "archived";

// ------------------------------------------------------------------
// Cell types — the JSONB structure stored in grids.cells
// ------------------------------------------------------------------

export type CellArrow = "right" | "down" | "right-down" | "down-right";

export interface BlackCell {
  type: "black";
  arrows: CellArrow[];
  clue_right?: string;
  clue_down?: string;
}

export interface LetterCell {
  type: "letter";
  solution: string; // single uppercase letter
  word_id_h: string | null; // horizontal word group id
  word_id_v: string | null; // vertical word group id
}

export type Cell = BlackCell | LetterCell;

export type GridCells = Record<string, Cell>; // key: "col-row", e.g. "3-7"

// ------------------------------------------------------------------
// Room state — the JSONB structure stored in rooms.state
// ------------------------------------------------------------------

export interface CellState {
  value: string; // player's typed letter (uppercase)
  player_id: string;
  color: string;
  verified_at: string | null; // ISO timestamp if the letter was verified correct
}

export type RoomState = Record<string, CellState>; // key: "col-row"

// ------------------------------------------------------------------
// Table row types
// ------------------------------------------------------------------

export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  stats: {
    completed: number;
    total_letters: number;
  };
  created_at: string;
}

export interface Grid {
  id: string;
  title: string;
  author: string | null;
  difficulty: Difficulty;
  width: number;
  height: number;
  cells: GridCells;
  source: GridSource;
  published: boolean;
  created_at: string;
}

export interface Room {
  id: string;
  slug: string;
  grid_id: string;
  owner_id: string | null;
  state: RoomState;
  status: RoomStatus;
  created_at: string;
  expires_at: string | null;
}

export interface RoomPlayer {
  room_id: string;
  user_id: string;
  display_name: string;
  color: string;
  cursor_cell: string | null;
  joined_at: string;
  last_seen: string;
}

// ------------------------------------------------------------------
// Supabase Database generic type (used to type the client)
// ------------------------------------------------------------------

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at"> & { created_at?: string };
        Update: Partial<Omit<Profile, "id">>;
      };
      grids: {
        Row: Grid;
        Insert: Omit<Grid, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<Grid, "id">>;
      };
      rooms: {
        Row: Room;
        Insert: Omit<Room, "id" | "created_at" | "state"> & {
          id?: string;
          created_at?: string;
          state?: RoomState;
        };
        Update: Partial<Omit<Room, "id">>;
      };
      room_players: {
        Row: RoomPlayer;
        Insert: Omit<RoomPlayer, "joined_at" | "last_seen"> & {
          joined_at?: string;
          last_seen?: string;
        };
        Update: Partial<Omit<RoomPlayer, "room_id" | "user_id">>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      difficulty: Difficulty;
      grid_source: GridSource;
      room_status: RoomStatus;
    };
  };
};
