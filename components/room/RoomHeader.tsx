import type { Grid, Room, RoomPlayer } from "@/lib/supabase/types";
import { PlayerList } from "./PlayerList";
import { ShareButton } from "./ShareButton";

interface RoomHeaderProps {
  grid: Grid;
  room: Room;
  players: RoomPlayer[];
  currentUserId?: string;
}

// Server Component — renders the room title, difficulty, player list, and share button.
// ShareButton is a client island embedded here.
export function RoomHeader({ grid, room, players, currentUserId }: RoomHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b px-6 py-3">
      {/* Left: title + difficulty */}
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="font-serif truncate text-xl font-semibold">{grid.title}</h1>
        <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-3 py-0.5 text-xs capitalize">
          {grid.difficulty}
        </span>
      </div>

      {/* Right: player list + share button */}
      <div className="flex items-center gap-4 shrink-0">
        <PlayerList players={players} currentUserId={currentUserId} />
        <ShareButton slug={room.slug} />
      </div>
    </header>
  );
}
