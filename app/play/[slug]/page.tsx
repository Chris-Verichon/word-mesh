import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { joinRoomIfNeeded } from "@/lib/room/create";
import { RoomHeader } from "@/components/room/RoomHeader";
import { GameBoard } from "./GameBoard";
import type { Grid, Room, RoomPlayer, RoomState } from "@/lib/supabase/types";

export default async function PlayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch room by slug
  const { data: roomRow } = await supabase
    .from("rooms")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!roomRow) notFound();
  const room = roomRow as Room;

  // Fetch grid
  const { data: gridRow } = await supabase
    .from("grids")
    .select("*")
    .eq("id", room.grid_id)
    .single();

  if (!gridRow) notFound();
  const grid = gridRow as Grid;

  // Auto-join the room if the user is authenticated
  if (user) {
    await joinRoomIfNeeded(supabase, room.id, user);
  }

  // Fetch final player list (after potential join)
  const { data: playerRows } = await supabase
    .from("room_players")
    .select("*")
    .eq("room_id", room.id)
    .order("joined_at");

  const players = (playerRows ?? []) as RoomPlayer[];

  // Build a playerColors map for the GameBoard (player_id → color)
  const playerColors: Record<string, string> = Object.fromEntries(
    players.map((p) => [p.user_id, p.color])
  );

  return (
    <div className="flex h-screen flex-col">
      <RoomHeader
        grid={grid}
        room={room}
        players={players}
        currentUserId={user?.id}
      />
      <GameBoard
        grid={grid}
        initialState={room.state as RoomState}
        playerColors={playerColors}
        currentUserId={user?.id}
      />
    </div>
  );
}
