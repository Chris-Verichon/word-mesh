import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createRoomForUser } from "@/lib/room/create";

// POST /api/rooms — create a new room for an authenticated user.
// Body: { gridId: string }
// Returns: { slug: string }
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let gridId: string;
  try {
    const body = await request.json();
    gridId = body?.gridId;
    if (!gridId || typeof gridId !== "string") throw new Error("invalid gridId");
  } catch {
    return NextResponse.json({ error: "Paramètre gridId manquant ou invalide" }, { status: 400 });
  }

  try {
    const { slug } = await createRoomForUser(supabase, gridId, user);
    return NextResponse.json({ slug }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
