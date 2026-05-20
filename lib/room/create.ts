import type { SupabaseClient, User } from "@supabase/supabase-js";
import { generateUniqueSlug } from "./slug";
import { PLAYER_COLORS } from "./colors";

// Derive a display name from Supabase user metadata (anonymous or OAuth).
function getDisplayName(user: User): string {
  return (
    (user.user_metadata?.display_name as string | undefined) ??
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    "Joueur"
  );
}

interface CreateRoomResult {
  slug: string;
  roomId: string;
}

/**
 * Create a new room for the given grid and add the user as the first player.
 * The room expires after 48 hours.
 */
export async function createRoomForUser(
  supabase: SupabaseClient,
  gridId: string,
  user: User
): Promise<CreateRoomResult> {
  const slug = await generateUniqueSlug(supabase);

  const { data: room, error } = await supabase
    .from("rooms")
    .insert({
      slug,
      grid_id: gridId,
      owner_id: user.id,
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    })
    .select("id, slug")
    .single();

  if (error || !room) throw new Error("Impossible de créer la salle");

  await supabase.from("room_players").insert({
    room_id: room.id,
    user_id: user.id,
    display_name: getDisplayName(user),
    color: PLAYER_COLORS[0],
  });

  return { slug: room.slug, roomId: room.id };
}

/**
 * Add the user to the room as a player if they have not already joined.
 * Color is assigned based on current player count (cycles through PLAYER_COLORS).
 * Returns true if the user was newly added, false if already present.
 */
export async function joinRoomIfNeeded(
  supabase: SupabaseClient,
  roomId: string,
  user: User
): Promise<boolean> {
  // Check if already joined
  const { data: existing } = await supabase
    .from("room_players")
    .select("user_id")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return false;

  // Count current players to assign the next color
  const { count } = await supabase
    .from("room_players")
    .select("*", { count: "exact", head: true })
    .eq("room_id", roomId);

  const colorIndex = (count ?? 0) % PLAYER_COLORS.length;

  await supabase.from("room_players").insert({
    room_id: roomId,
    user_id: user.id,
    display_name: getDisplayName(user),
    color: PLAYER_COLORS[colorIndex],
  });

  return true;
}
