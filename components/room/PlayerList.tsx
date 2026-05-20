import type { RoomPlayer } from "@/lib/supabase/types";

interface PlayerListProps {
  players: RoomPlayer[];
  currentUserId?: string;
}

// Displays a horizontal list of players with their assigned color dot and name.
export function PlayerList({ players, currentUserId }: PlayerListProps) {
  if (players.length === 0) return null;

  return (
    <ul className="flex items-center gap-2" aria-label="Joueurs dans la salle">
      {players.map((player) => {
        const isCurrentUser = player.user_id === currentUserId;
        return (
          <li
            key={player.user_id}
            className="flex items-center gap-1.5"
            title={isCurrentUser ? `${player.display_name} (vous)` : player.display_name}
          >
            {/* Color indicator dot */}
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
              style={{ backgroundColor: player.color }}
              aria-hidden="true"
            />
            <span
              className={`max-w-[80px] truncate text-sm ${
                isCurrentUser ? "font-medium" : "text-muted-foreground"
              }`}
            >
              {player.display_name}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
