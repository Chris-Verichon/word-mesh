"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createRoomForUser } from "@/lib/room/create";

// Server Action called by the lobby form to create a room and redirect the user.
export async function createRoom(gridId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { slug } = await createRoomForUser(supabase, gridId, user);

  redirect(`/play/${slug}`);
}
