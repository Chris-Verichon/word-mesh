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

export type BlackCell = {
  type: "black";
  arrows: CellArrow[];
  clue_right?: string;
  clue_down?: string;
};

export type LetterCell = {
  type: "letter";
  solution: string; // single uppercase letter
  word_id_h: string | null; // horizontal word group id
  word_id_v: string | null; // vertical word group id
};

export type Cell = BlackCell | LetterCell;

export type GridCells = Record<string, Cell>; // key: "col-row", e.g. "3-7"

// ------------------------------------------------------------------
// Room state — the JSONB structure stored in rooms.state
// ------------------------------------------------------------------

export type CellState = {
  value: string; // player's typed letter (uppercase)
  player_id: string;
  color: string;
  verified_at: string | null; // ISO timestamp if the letter was verified correct
};

export type RoomState = Record<string, CellState>; // key: "col-row"

// ------------------------------------------------------------------
// Table row types
// ------------------------------------------------------------------

export type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  stats: {
    completed: number;
    total_letters: number;
  };
  created_at: string;
};

export type Grid = {
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
};

export type Room = {
  id: string;
  slug: string;
  grid_id: string;
  owner_id: string | null;
  state: RoomState;
  status: RoomStatus;
  created_at: string;
  expires_at: string | null;
};

export type RoomPlayer = {
  room_id: string;
  user_id: string;
  display_name: string;
  color: string;
  cursor_cell: string | null;
  joined_at: string;
  last_seen: string;
};

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
        Relationships: [];
      };
      grids: {
        Row: Grid;
        Insert: Omit<Grid, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<Grid, "id">>;
        Relationships: [];
      };
      rooms: {
        Row: Room;
        Insert: Omit<Room, "id" | "created_at" | "state"> & {
          id?: string;
          created_at?: string;
          state?: RoomState;
        };
        Update: Partial<Omit<Room, "id">>;
        Relationships: [
          {
            foreignKeyName: "rooms_grid_id_fkey";
            columns: ["grid_id"];
            isOneToOne: false;
            referencedRelation: "grids";
            referencedColumns: ["id"];
          },
        ];
      };
      room_players: {
        Row: RoomPlayer;
        Insert: Omit<RoomPlayer, "joined_at" | "last_seen"> & {
          joined_at?: string;
          last_seen?: string;
        };
        Update: Partial<Omit<RoomPlayer, "room_id" | "user_id">>;
        Relationships: [
          {
            foreignKeyName: "room_players_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      difficulty: Difficulty;
      grid_source: GridSource;
      room_status: RoomStatus;
    };
  };
};
