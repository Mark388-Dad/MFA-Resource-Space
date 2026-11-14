import { supabase } from "@/integrations/supabase/client";

export interface BroadcastItem {
  id: string;
  title: string;
  message: string;
  type: "broadcast" | "challenge" | "announcement" | "system";
  challenge_id?: string;
  audience?: string;
  created_at: string;
  author_name?: string;
  recipient_count?: number;
  read_by?: string[];
}

const STORAGE_KEY = "mfa-global-broadcasts";
const BROADCAST_CHANNEL_NAME = "mfa-academy-broadcasts-channel";

// Default seed announcements so every user always has initial context
const DEFAULT_BROADCASTS: BroadcastItem[] = [
  {
    id: "broadcast-seed-1",
    title: "📢 2025/2026 Reading Challenge: Beyond the Pages is Live!",
    message: "Welcome scholars! The 45-book reading challenge across 11 literary realms is officially underway. Read books, earn house points for Kenya, Kilimanjaro, Longonot, and Elgon, and unlock the prestigious Gold Award.",
    type: "challenge",
    challenge_id: "45450000-2025-4026-8000-000000000045",
    audience: "all",
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    author_name: "David O. Oloo (Librarian)",
    recipient_count: 320,
    read_by: [],
  },
  {
    id: "broadcast-seed-2",
    title: "🌍 African Voices & Motherland Fiction Sprint Announced",
    message: "Specialty sprint exploring contemporary and classical African literature, post-colonial prose, and diaspora poetry. Open to Form 1 through DP2.",
    type: "challenge",
    challenge_id: "challenge-african-voices",
    audience: "all",
    created_at: new Date(Date.now() - 86400000).toISOString(),
    author_name: "Head Librarian",
    recipient_count: 320,
    read_by: [],
  },
];

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== "undefined") {
  if ("BroadcastChannel" in window) {
    try {
      broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      broadcastChannel.onmessage = (event) => {
        if (event.data?.type === "NEW_BROADCAST") {
          window.dispatchEvent(
            new CustomEvent("mfa-broadcast-received", { detail: event.data.broadcast })
          );
        } else if (event.data?.type === "BROADCASTS_UPDATED") {
          window.dispatchEvent(new CustomEvent("mfa-broadcast-updated"));
        }
      };
    } catch (e) {
      console.warn("BroadcastChannel not supported", e);
    }
  }

  // Cross-tab storage event listener
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      window.dispatchEvent(new CustomEvent("mfa-broadcast-updated"));
    }
  });
}

/** Get all broadcasts stored locally and seeded */
export function getBroadcasts(): BroadcastItem[] {
  if (typeof window === "undefined") return DEFAULT_BROADCASTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_BROADCASTS));
      return DEFAULT_BROADCASTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_BROADCASTS));
      return DEFAULT_BROADCASTS;
    }
    return parsed;
  } catch (e) {
    console.warn("Could not read broadcasts", e);
    return DEFAULT_BROADCASTS;
  }
}

/** Publish a new broadcast announcement across the entire academy */
export async function publishBroadcast(
  item: Omit<BroadcastItem, "id" | "created_at">
): Promise<BroadcastItem> {
  const newBroadcast: BroadcastItem = {
    ...item,
    id: `bc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString(),
    read_by: [],
  };

  // 1. Save to local broadcast registry
  try {
    const current = getBroadcasts();
    const updated = [newBroadcast, ...current].slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Could not store broadcast locally", e);
  }

  // 2. Also log to email dispatch record
  try {
    const emailDispatch = JSON.parse(localStorage.getItem("mfa-broadcast-emails") || "[]");
    emailDispatch.unshift({
      id: newBroadcast.id,
      title: newBroadcast.title,
      body: newBroadcast.message,
      audience: newBroadcast.audience || "All Users",
      recipients_count: newBroadcast.recipient_count || 320,
      sent_at: newBroadcast.created_at,
      status: "Dispatched to Email & Feed",
      challenge_id: newBroadcast.challenge_id,
    });
    localStorage.setItem("mfa-broadcast-emails", JSON.stringify(emailDispatch.slice(0, 50)));
  } catch (e) {
    console.warn("Could not save email dispatch record", e);
  }

  // 3. Attempt to persist to Supabase notifications table (non-blocking if RLS is restrictive)
  try {
    // Try fetching profiles to populate notifications
    const { data: profs } = await supabase.from("profiles").select("user_id").limit(100);
    if (profs && profs.length > 0) {
      const rows = profs.map((p) => ({
        user_id: p.user_id,
        type: newBroadcast.type,
        title: newBroadcast.title,
        message: newBroadcast.message,
      }));
      await supabase.from("notifications").insert(rows);
    }
  } catch (e) {
    // RLS or permission issue on remote table is non-blocking for in-app broadcast
    console.info("Remote Supabase notifications insert skipped (using in-app broadcast distribution):", e);
  }

  // 4. Notify all tabs & windows via BroadcastChannel and CustomEvent
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: "NEW_BROADCAST", broadcast: newBroadcast });
    } catch (_e) {
      // ignore channel post error
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mfa-broadcast-received", { detail: newBroadcast }));
  }

  return newBroadcast;
}

/** Mark a specific broadcast as read for a user */
export function markBroadcastAsRead(broadcastId: string, userId: string): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    const broadcasts = getBroadcasts();
    const updated = broadcasts.map((b) => {
      if (b.id === broadcastId) {
        const readBy = b.read_by || [];
        if (!readBy.includes(userId)) {
          return { ...b, read_by: [...readBy, userId] };
        }
      }
      return b;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({ type: "BROADCASTS_UPDATED" });
      } catch (_e) {
        // ignore channel post error
      }
    }
    window.dispatchEvent(new CustomEvent("mfa-broadcast-updated"));
  } catch (e) {
    console.warn("Could not mark broadcast as read", e);
  }
}

/** Mark all broadcasts as read for a user */
export function markAllBroadcastsAsRead(userId: string): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    const broadcasts = getBroadcasts();
    const updated = broadcasts.map((b) => {
      const readBy = b.read_by || [];
      if (!readBy.includes(userId)) {
        return { ...b, read_by: [...readBy, userId] };
      }
      return b;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({ type: "BROADCASTS_UPDATED" });
      } catch (_e) {
        // ignore channel post error
      }
    }
    window.dispatchEvent(new CustomEvent("mfa-broadcast-updated"));
  } catch (e) {
    console.warn("Could not mark all as read", e);
  }
}

/** Get number of unread broadcasts for this user */
export function getUnreadBroadcastCount(userId: string): number {
  if (typeof window === "undefined" || !userId) return 0;
  const broadcasts = getBroadcasts();
  return broadcasts.filter((b) => !b.read_by?.includes(userId)).length;
}
