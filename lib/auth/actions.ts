"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Sign in anonymously with a display name.
// The display name is stored in the user metadata and synced to the profiles table.
export async function signInAnonymously(displayName: string, redirectTo: string = "/play") {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInAnonymously({
    options: {
      data: { display_name: displayName.trim() },
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect(redirectTo);
}

// Initiate Google OAuth flow.
export async function signInWithGoogle(redirectTo: string = "/play") {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${redirectTo}`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}

// Sign out the current user.
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
