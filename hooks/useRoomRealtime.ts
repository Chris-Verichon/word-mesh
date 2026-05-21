"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CellState, RoomState } from "@/lib/supabase/types";

interface CellUpdatePayload {
  cellId: string;
  cellState: CellState | null;
  userId: string;
}

/**
 * Subscribes to a Supabase Realtime broadcast channel for the room.
 *
 * - `remoteState` is seeded with the DB snapshot (`initialState`) and updated
 *   in real-time as other players broadcast cell changes.
 * - `broadcastCell` sends a cell update to the channel so peers see it instantly.
 */
export function useRoomRealtime(
  roomId: string,
  currentUserId: string,
  initialState: RoomState = {}
) {
  // Start with the DB snapshot so existing letters are visible immediately
  const [remoteState, setRemoteState] = useState<RoomState>(initialState);

  // Stable supabase client (createBrowserClient is a singleton internally)
  const supabase = useMemo(() => createClient(), []);

  // Keep a ref to the channel so broadcastCell can access it without re-renders
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "broadcast",
        { event: "cell_update" },
        ({ payload }: { payload: CellUpdatePayload }) => {
          // Ignore reflections of our own broadcasts
          if (payload.userId === currentUserId) return;

          setRemoteState((prev) => {
            if (payload.cellState === null) {
              const next = { ...prev };
              delete next[payload.cellId];
              return next;
            }
            return { ...prev, [payload.cellId]: payload.cellState };
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, currentUserId, supabase]);

  const broadcastCell = useCallback(
    (cellId: string, cellState: CellState | null) => {
      channelRef.current?.send({
        type: "broadcast",
        event: "cell_update",
        payload: {
          cellId,
          cellState,
          userId: currentUserId,
        } satisfies CellUpdatePayload,
      });
    },
    [currentUserId]
  );

  return { remoteState, broadcastCell };
}
