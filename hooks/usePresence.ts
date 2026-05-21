"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface PresenceUser {
  userId: string;
  displayName: string;
  color: string;
  cursorCell: string | null;
}

interface CurrentUser {
  userId: string;
  displayName: string;
  color: string;
}

/**
 * Supabase Realtime Presence channel for the room.
 *
 * Broadcasts the current user's cursor position whenever `cursorCell` changes.
 * Tracks all connected players and exposes:
 * - `onlineUsers`   — full list of currently connected players
 * - `onlineUserIds` — Set of user ids (for online/offline badges)
 * - `cursorMap`     — cellId → color of the OTHER player whose cursor is there
 */
export function usePresence(
  roomId: string,
  currentUser: CurrentUser,
  cursorCell: string | null
) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Keep a ref so the cursor can be updated without re-creating the channel
  const cursorCellRef = useRef(cursorCell);

  // Broadcast cursor updates to peers whenever the selection changes
  useEffect(() => {
    cursorCellRef.current = cursorCell;
    channelRef.current?.track({
      userId: currentUser.userId,
      displayName: currentUser.displayName,
      color: currentUser.color,
      cursorCell,
    });
  }, [cursorCell, currentUser]);

  // Create the presence channel once per room/user combination
  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}:presence`, {
        config: { presence: { key: currentUser.userId } },
      })
      .on("presence", { event: "sync" }, () => {
        // Rebuild the online-users list from the full presence snapshot
        const state = channel.presenceState();
        const users: PresenceUser[] = [];
        for (const presences of Object.values(state)) {
          // Take the most recent entry for each key (presences is an array)
          const latest = presences[presences.length - 1] as unknown as PresenceUser;
          if (latest?.userId) {
            users.push({
              userId: latest.userId,
              displayName: latest.displayName,
              color: latest.color,
              cursorCell: latest.cursorCell ?? null,
            });
          }
        }
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Announce ourselves as soon as the subscription is confirmed
          await channel.track({
            userId: currentUser.userId,
            displayName: currentUser.displayName,
            color: currentUser.color,
            cursorCell: cursorCellRef.current,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // Only re-create when the room or the current user changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, currentUser.userId, supabase]);

  // cellId → color of the OTHER player whose cursor is on that cell
  const cursorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const user of onlineUsers) {
      if (user.userId !== currentUser.userId && user.cursorCell) {
        map[user.cursorCell] = user.color;
      }
    }
    return map;
  }, [onlineUsers, currentUser.userId]);

  const onlineUserIds = useMemo(
    () => new Set(onlineUsers.map((u) => u.userId)),
    [onlineUsers]
  );

  return { onlineUsers, onlineUserIds, cursorMap };
}
