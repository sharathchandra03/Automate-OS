/**
 * Supabase Realtime helpers for AutomateOS.
 *
 * Usage in any React page/component:
 *
 *   useRealtimeMessages(conversationId, (msg) => {
 *     setMessages((prev) => [...prev, msg]);
 *   });
 *
 *   useRealtimeConversations(orgId, () => {
 *     refetchConversations();
 *   });
 */

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "./supabase/client";
import type { Message, Conversation } from "./types";

/**
 * Subscribe to new inbound messages for a single conversation.
 * Calls `onMessage` whenever a new row is inserted into `messages`
 * that matches `conversation_id`.
 */
export function useRealtimeMessages(
  conversationId: string | null,
  onMessage: (msg: Message) => void,
) {
  useEffect(() => {
    if (!conversationId) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => onMessage(payload.new as Message),
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [conversationId, onMessage]);
}

/**
 * Subscribe to conversation list changes for an org.
 * Calls `onChange` on any INSERT/UPDATE so the sidebar refreshes
 * when a new conversation arrives or a conversation is resolved.
 */
export function useRealtimeConversations(
  orgId: string | null,
  onChange: (conv: Conversation) => void,
) {
  useEffect(() => {
    if (!orgId) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`conversations:${orgId}`)
      .on(
        "postgres_changes",
        {
          event:  "*",
          schema: "public",
          table:  "conversations",
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          if (payload.new) onChange(payload.new as Conversation);
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [orgId, onChange]);
}

/**
 * Subscribe to typing indicators.
 * Uses Supabase presence to broadcast which agents are typing in a conversation.
 */
export function useTypingIndicator(
  conversationId: string | null,
  userId: string | null,
) {
  useEffect(() => {
    if (!conversationId || !userId) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase.channel(`typing:${conversationId}`, {
      config: { presence: { key: userId } },
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ user_id: userId, typing: false });
      }
    });

    return () => { void supabase.removeChannel(channel); };
  }, [conversationId, userId]);
}
