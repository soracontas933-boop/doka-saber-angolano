import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SupportNotification {
  id: string;
  content: string;
  conversation_id: string;
  created_at: string;
  sender_id: string;
}

export const useSupportNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<SupportNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const playedSoundsRef = useRef<Set<string>>(new Set());

  // Play notification sound using Web Audio API
  const playNotificationSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Create a pleasant notification sound
      oscillator.frequency.value = 800;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn("Could not play notification sound:", error);
    }
  }, []);

  // Fetch initial unread messages
  const fetchUnreadMessages = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Get all conversations for the user
      const { data: conversations } = await supabase
        .from("support_messages")
        .select("id")
        .eq("user_id", user.id);

      if (conversations && conversations.length > 0) {
        const conversationIds = conversations.map((c) => c.id);

        // Get unread messages from those conversations
        const { data: messages } = await supabase
          .from("chat_messages")
          .select("*")
          .in("conversation_id", conversationIds)
          .eq("is_read", false)
          .neq("sender_id", user.id)
          .order("created_at", { ascending: false });

        if (messages) {
          setNotifications(messages as SupportNotification[]);
          if (messages.length > 0) {
            playNotificationSound();
            // Mark all as played to avoid duplicate sounds
            messages.forEach((msg) => {
              playedSoundsRef.current.add(msg.id);
            });
          }
        }
      }
    } catch (error) {
      console.error("Error fetching unread messages:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, playNotificationSound]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.id) return;

    // Fetch initial messages
    fetchUnreadMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`user_support_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `sender_id=neq.${user.id}`,
        },
        async (payload) => {
          const newMessage = payload.new as SupportNotification;

          // Check if this message belongs to a conversation of the current user
          const { data: conversation } = await supabase
            .from("support_messages")
            .select("id")
            .eq("id", newMessage.conversation_id)
            .eq("user_id", user.id)
            .single();

          if (conversation) {
            // Only add if not already in notifications and not yet played
            if (!playedSoundsRef.current.has(newMessage.id)) {
              setNotifications((prev) => [newMessage, ...prev]);
              playNotificationSound();
              playedSoundsRef.current.add(newMessage.id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchUnreadMessages, playNotificationSound]);

  // Mark message as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await supabase
          .from("chat_messages")
          .update({ is_read: true })
          .eq("id", notificationId);

        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      } catch (error) {
        console.error("Error marking message as read:", error);
      }
    },
    []
  );

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const notificationIds = notifications.map((n) => n.id);
      if (notificationIds.length === 0) return;

      await supabase
        .from("chat_messages")
        .update({ is_read: true })
        .in("id", notificationIds);

      setNotifications([]);
    } catch (error) {
      console.error("Error marking all messages as read:", error);
    }
  }, [notifications]);

  return {
    notifications,
    isLoading,
    markAsRead,
    markAllAsRead,
    playNotificationSound,
  };
};
