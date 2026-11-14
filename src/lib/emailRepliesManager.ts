/**
 * Email Replies & Inbound Correspondence Manager — Exclusively for Reading Challenge
 *
 * Handles inbox notifications, unread email count tracking, per-account inbox isolation,
 * and direct real-time email reply threads.
 *
 * STRICT REQUIREMENT: Only messages concerning Reading Challenges (book reviews, student reflections,
 * challenge access codes, literary realms, cohort reading milestones, and librarian reading dispatches)
 * are permitted and displayed in this inbox.
 */

import { supabase } from "@/integrations/supabase/client";
import { safeStorage } from "@/lib/safeStorage";

export type ReadingChallengeCategory =
  | "review"
  | "milestone"
  | "reflection"
  | "launch"
  | "announcement";

export interface EmailReply {
  id: string;
  sender_name: string;
  sender_email: string;
  sender_role: string;
  subject: string;
  body: string;
  sent_at: string;
  received_at?: string;
  read: boolean;
  category?: ReadingChallengeCategory;
  challenge_id?: string;
  recipient_email?: string;
  recipient_name?: string;
  recipient_user_id?: string;
  direction?: "inbound" | "outbound";
  replies?: Array<{
    id: string;
    sender_name: string;
    sender_email: string;
    body: string;
    sent_at: string;
  }>;
  responses?: Array<{
    id: string;
    sender_name: string;
    sender_email: string;
    body: string;
    sent_at: string;
  }>;
}

const BASE_KEY = "mfa_email_inbox_replies_v3_rc_only";

/**
 * Filter to strictly ensure messages in this inbox concern the Reading Challenge.
 * Any general system notifications, technical logs, or unrelated notices are excluded.
 */
export function isReadingChallengeMessage(msg: {
  subject?: string;
  body?: string;
  sender_role?: string;
  sender_name?: string;
  type?: string;
}): boolean {
  if (!msg) return false;
  const text = `${msg.subject || ""} ${msg.body || ""} ${msg.sender_role || ""} ${msg.sender_name || ""} ${msg.type || ""}`.toLowerCase();

  // Exclude non-reading technical noise or unrelated pipeline notices
  const exclusions = [
    "delivery pipeline active",
    "pipeline active",
    "test pipeline",
    "cron check",
    "system health ok",
    "database backup finished",
    "server ping",
  ];
  if (exclusions.some((ex) => text.includes(ex))) return false;

  // Must contain keywords directly tied to the Reading Challenge
  const readingKeywords = [
    "reading",
    "challenge",
    "45-book",
    "book",
    "books",
    "novel",
    "novels",
    "literature",
    "realm",
    "realms",
    "reflection",
    "reflections",
    "review",
    "reviews",
    "submission",
    "submissions",
    "author",
    "pages",
    "library",
    "librarian",
    "badge",
    "badges",
    "milestone",
    "milestones",
    "points",
    "certificate",
    "genre",
    "genres",
    "scholar",
    "scholars",
    "house points",
    "things fall apart",
    "achebe",
    "ngugi",
    "ib learner",
    "fiction",
    "access code",
    "stu-dp",
    "tut-dp",
    "head librarian",
    "tutor group",
    "homeroom tutor",
  ];

  return readingKeywords.some((kw) => text.includes(kw));
}

/**
 * Categorize a reading challenge message for clear UI badges & filters
 */
export function getReadingChallengeCategory(msg: {
  subject?: string;
  body?: string;
}): ReadingChallengeCategory {
  const text = `${msg.subject || ""} ${msg.body || ""}`.toLowerCase();
  if (text.includes("review") || text.includes("submitted my") || text.includes("verification") || text.includes("submission")) {
    return "review";
  }
  if (text.includes("reflection") || text.includes("theme") || text.includes("humanity")) {
    return "reflection";
  }
  if (text.includes("milestone") || text.includes("points") || text.includes("badge") || text.includes("crossed the")) {
    return "milestone";
  }
  if (text.includes("launch") || text.includes("access code") || text.includes("welcome") || text.includes("register")) {
    return "launch";
  }
  return "announcement";
}

export function getAccountStorageKey(accountKey?: string): string {
  if (!accountKey) return BASE_KEY;
  const clean = accountKey.toLowerCase().trim().replace(/[^a-z0-9_-]/g, "_");
  return `${BASE_KEY}_${clean}`;
}

export function getDefaultRepliesForAccount(_accountKey?: string): EmailReply[] {
  // STRICT: No mock/placeholder emails. Only real messages sent within reading challenges are permitted.
  return [];
}

export function getActiveUserAccountKey(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = safeStorage.getItem("mfa_active_profile");
    if (raw) {
      const p = JSON.parse(raw);
      if (p.email) return p.email;
      if (p.user_id) return p.user_id;
    }
  } catch {}
  try {
    const rawCached = safeStorage.getItem("mfa_cached_profile");
    if (rawCached) {
      const p = JSON.parse(rawCached);
      if (p.email) return p.email;
      if (p.user_id) return p.user_id;
    }
  } catch {}
  return "";
}

/**
 * Triggers a native browser notification if supported and permitted,
 * alongside window events for immediate UI badge updating.
 */
export async function triggerBrowserNotification(
  title: string,
  options?: { body?: string; icon?: string; tag?: string }
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // 1. Dispatch custom DOM event for all active listening components
  window.dispatchEvent(
    new CustomEvent("mfa_browser_notification_triggered", {
      detail: { title, ...options },
    })
  );

  // 2. Native HTML5 desktop Notification
  if ("Notification" in window) {
    try {
      let perm = Notification.permission;
      if (perm === "default") {
        perm = await Notification.requestPermission();
      }
      if (perm === "granted") {
        new Notification(title, {
          icon: options?.icon || "/favicon.ico",
          body: options?.body || "New Reading Challenge notification received.",
          tag: options?.tag || `rc-${Date.now()}`,
        });
        return true;
      }
    } catch (e) {
      console.warn("Browser notification permission/display issue:", e);
    }
  }
  return false;
}

/**
 * Filter out any mock/seeded messages that may have been saved previously.
 */
function purgeMockEmails(list: EmailReply[]): EmailReply[] {
  return list.filter((item) => {
    if (!item || !item.id) return false;
    const isMockId =
      item.id.startsWith("staff-rc-") ||
      item.id.startsWith("student-rc-") ||
      item.id.startsWith("mock-") ||
      item.id.startsWith("seed-") ||
      item.id.startsWith("placeholder-");
    return !isMockId;
  });
}

/**
 * Retrieve messages for account, strictly filtered to only real Reading Challenge messages
 */
export function getEmailReplies(accountKey?: string): EmailReply[] {
  const effectiveKey = accountKey || getActiveUserAccountKey();
  const key = getAccountStorageKey(effectiveKey);

  let rawList: EmailReply[] = [];
  try {
    const raw = safeStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        rawList = purgeMockEmails(parsed);
      }
    }
  } catch {
    rawList = [];
  }

  // Also read from global broadcast/unlock store if not present
  try {
    const broadcasts = safeStorage.getJSON<any[]>("mfa-broadcast-emails", []);
    const broadcastMapped: EmailReply[] = broadcasts.map((b) => {
      const rawSender = b.sender_email || b.sender || "";
      const senderEmailClean = (rawSender.includes("<") ? rawSender.match(/<([^>]+)>/)?.[1] : rawSender) || rawSender;
      const isSender =
        senderEmailClean.toLowerCase().trim() === effectiveKey.toLowerCase().trim() ||
        (effectiveKey.includes("@") && rawSender.toLowerCase().includes(effectiveKey.toLowerCase()));
      return {
        id: b.id || `bcast-${Date.now()}`,
        sender_name: b.sender?.split("<")[0]?.trim() || "Reading Challenge Admin",
        sender_email: senderEmailClean || "admin@mpesafoundationacademy.ac.ke",
        sender_role: b.type === "unlock_request" ? "Scholar" : "Challenge Admin",
        subject: b.subject || "Reading Challenge Notice",
        body: b.content || "",
        sent_at: b.timestamp || new Date().toISOString(),
        read: isSender ? true : false,
        direction: isSender ? "outbound" : "inbound",
        category: b.type === "unlock_request" ? "review" : "announcement",
        challenge_id: b.challenge_id,
        recipient_email: b.recipient_email,
        recipient_name: b.recipient_name,
        replies: [],
        responses: [],
      };
    });

    const existingIds = new Set(rawList.map((r) => r.id));
    for (const bm of broadcastMapped) {
      if (!existingIds.has(bm.id) && isReadingChallengeMessage(bm)) {
        // Only include if relevant to this account (sent by, received by, or staff/admin)
        const recipClean = (bm.recipient_email?.includes("<") ? bm.recipient_email.match(/<([^>]+)>/)?.[1] : bm.recipient_email) || bm.recipient_email || "";
        const isRecip = recipClean.toLowerCase().trim() === effectiveKey.toLowerCase().trim();
        const isSender = bm.direction === "outbound";
        const isAdmin = (effectiveKey.toLowerCase().includes("librarian") || effectiveKey.toLowerCase().includes("admin")) && !effectiveKey.toLowerCase().includes("tonny");
        if (isRecip || isSender || (isAdmin && bm.category === "review")) {
          rawList.push(bm);
        }
      }
    }
  } catch {}

  // Strictly filter for Reading Challenge relevance only!
  const filtered = purgeMockEmails(rawList)
    .filter(isReadingChallengeMessage)
    .map((item) => {
      const isSender = (item.sender_email || "").toLowerCase() === effectiveKey.toLowerCase();
      const resolvedDirection = item.direction || (isSender ? "outbound" : "inbound");
      return {
        ...item,
        read: isSender ? true : item.read,
        direction: resolvedDirection,
        category: item.category || getReadingChallengeCategory(item),
      };
    });

  return filtered;
}

export function saveEmailReplies(replies: EmailReply[], accountKey?: string): void {
  const effectiveKey = accountKey || getActiveUserAccountKey();
  const key = getAccountStorageKey(effectiveKey);

  // Filter so non-challenge items and mocks are never persisted
  const rcOnly = purgeMockEmails(replies).filter(isReadingChallengeMessage);

  try {
    safeStorage.setItem(key, JSON.stringify(rcOnly));
    if (!accountKey && !effectiveKey) {
      safeStorage.setItem(BASE_KEY, JSON.stringify(rcOnly));
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("mfa_email_replies_updated", { detail: { accountKey: effectiveKey } })
      );
    }
  } catch (e) {
    console.error("Failed to save email replies:", e);
  }
}

/**
 * Dispatch a message across both Email trigger and In-Built Web Inbox simultaneously.
 * Stores in sender and recipient inboxes and fires live events.
 */
export function dispatchReadingChallengeMessage(msg: {
  challengeId?: string;
  challengeTitle?: string;
  senderName: string;
  senderEmail: string;
  senderRole?: string;
  recipientEmail: string;
  recipientName?: string;
  recipientUserId?: string;
  subject: string;
  body: string;
  category?: ReadingChallengeCategory;
}): EmailReply {
  const baseId = `rc-msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  // 1. Record for Sender (Outbound Sent folder)
  const outboundRecord: EmailReply = {
    id: `${baseId}-sent`,
    sender_name: msg.senderName,
    sender_email: msg.senderEmail,
    sender_role: msg.senderRole || "Scholar",
    recipient_email: msg.recipientEmail,
    recipient_name: msg.recipientName,
    recipient_user_id: msg.recipientUserId,
    direction: "outbound",
    subject: msg.subject,
    body: msg.body,
    sent_at: now,
    read: true, // Sender has already seen what they sent
    category: msg.category || "review",
    challenge_id: msg.challengeId || "45450000-2025-4026-8000-000000000045",
    replies: [],
    responses: [],
  };

  // 2. Record for Recipient (Inbound Inbox folder)
  const inboundRecord: EmailReply = {
    id: `${baseId}-inbox`,
    sender_name: msg.senderName,
    sender_email: msg.senderEmail,
    sender_role: msg.senderRole || "Scholar",
    recipient_email: msg.recipientEmail,
    recipient_name: msg.recipientName,
    recipient_user_id: msg.recipientUserId,
    direction: "inbound",
    subject: msg.subject,
    body: msg.body,
    sent_at: now,
    read: false,
    category: msg.category || "review",
    challenge_id: msg.challengeId || "45450000-2025-4026-8000-000000000045",
    replies: [],
    responses: [],
  };

  // 1. Add outbound record to sender's sent folder
  const senderKey = (msg.senderEmail || "").toLowerCase().trim();
  if (senderKey) {
    const senderList = getEmailReplies(senderKey);
    saveEmailReplies([outboundRecord, ...senderList.filter((r) => r.id !== outboundRecord.id)], senderKey);
  }

  // 2. Add inbound record to recipient's inbox folder
  const recipientKey = (msg.recipientEmail || "").toLowerCase().trim();
  if (recipientKey && recipientKey !== senderKey) {
    const recipientList = getEmailReplies(recipientKey);
    saveEmailReplies([inboundRecord, ...recipientList.filter((r) => r.id !== inboundRecord.id)], recipientKey);
  }

  // Also if recipientUserId is provided and different, save to recipientUserId key for fallback lookup
  if (msg.recipientUserId && msg.recipientUserId !== "guest" && msg.recipientUserId !== recipientKey) {
    try {
      const userList = getEmailReplies(msg.recipientUserId);
      saveEmailReplies([inboundRecord, ...userList.filter((r) => r.id !== inboundRecord.id)], msg.recipientUserId);
    } catch {}
  }

  // 3. Save into broadcast emails and admin alert logs
  try {
    const broadcasts = safeStorage.getJSON<any[]>("mfa-broadcast-emails", []);
    broadcasts.unshift({
      id: baseId,
      subject: msg.subject,
      sender: `${msg.senderName} <${msg.senderEmail}>`,
      sender_email: msg.senderEmail,
      recipient_email: msg.recipientEmail,
      recipient_name: msg.recipientName,
      recipient_user_id: msg.recipientUserId,
      content: msg.body,
      challenge_title: msg.challengeTitle || "45-Book Reading Challenge",
      challenge_id: msg.challengeId || "45450000-2025-4026-8000-000000000045",
      type: msg.category === "review" ? "unlock_request" : "announcement",
      timestamp: now,
    });
    safeStorage.setJSON("mfa-broadcast-emails", broadcasts.slice(0, 50));

    // Also push to student welcome/dispatch store if recipient is a student
    if (recipientKey) {
      const welcomeEmails = safeStorage.getJSON<any[]>("mfa_student_welcome_emails", []);
      welcomeEmails.unshift({
        id: `welcome-${baseId}`,
        student_email: recipientKey,
        student_name: msg.recipientName || recipientKey.split("@")[0],
        challenge_id: msg.challengeId || "45450000-2025-4026-8000-000000000045",
        challenge_title: msg.challengeTitle || "45-Book Reading Challenge",
        subject: msg.subject,
        body: msg.body,
        sent_at: now,
        read: false,
      });
      safeStorage.setJSON("mfa_student_welcome_emails", welcomeEmails.slice(0, 100));
    }
  } catch (e) {
    console.warn("Storage sync error:", e);
  }

  // 4. Trigger Native Desktop Browser Notification
  try {
    triggerBrowserNotification(msg.subject, {
      body: `${msg.senderName}: ${msg.body.length > 130 ? msg.body.substring(0, 127) + "..." : msg.body}`,
      tag: baseId,
    });
  } catch (notifErr) {
    console.warn("Browser notification trigger notice:", notifErr);
  }

  // 5. Insert notification record into Supabase for the student recipient
  if (msg.recipientUserId && msg.recipientUserId !== "guest" && !msg.recipientUserId.startsWith("demo-")) {
    try {
      supabase.from("notifications").insert({
        user_id: msg.recipientUserId,
        title: msg.subject,
        message: msg.body,
        type: msg.category === "milestone" ? "certificate" : "reading_challenge",
        read: false,
      }).then();
    } catch {}
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mfa_email_replies_updated", { detail: { accountKey: recipientKey } }));
    window.dispatchEvent(new CustomEvent("mfa_email_notifications_updated", { detail: { recipientEmail: recipientKey, subject: msg.subject } }));
    window.dispatchEvent(new CustomEvent("mfa-welcome-email-received"));
  }

  return outboundRecord;
}

/**
 * Returns unread count of strictly Reading Challenge emails
 */
export function getUnreadEmailCount(accountKey?: string): number {
  const effectiveKey = accountKey || getActiveUserAccountKey();
  const replies = getEmailReplies(effectiveKey);
  const cleanKey = effectiveKey.toLowerCase().trim();
  return replies.filter((r) => {
    if (r.direction === "outbound") return false;
    const isSender = (r.sender_email || "").toLowerCase().trim() === cleanKey;
    if (isSender) return false;
    return !r.read;
  }).length;
}

export function markEmailReplyAsRead(id: string, accountKey?: string): void {
  const effectiveKey = accountKey || getActiveUserAccountKey();
  const replies = getEmailReplies(effectiveKey);
  const updated = replies.map((r) => (r.id === id ? { ...r, read: true } : r));
  saveEmailReplies(updated, effectiveKey);

  if (id.startsWith("notif-")) {
    const notifDbId = id.replace("notif-", "");
    supabase.from("notifications").update({ read: true }).eq("id", notifDbId).then();
  }
}

export function markAllEmailRepliesAsRead(accountKey?: string): void {
  const effectiveKey = accountKey || getActiveUserAccountKey();
  const replies = getEmailReplies(effectiveKey);
  const updated = replies.map((r) => ({ ...r, read: true }));
  saveEmailReplies(updated, effectiveKey);

  // Also update Supabase notifications if any
  supabase.from("notifications").update({ read: true }).neq("id", "00000000-0000-0000-0000-000000000000").then();
}

export function appendUserResponse(
  replyId: string,
  responderName: string,
  responderEmail: string,
  responseText: string,
  accountKey?: string
): void {
  const replies = getEmailReplies(accountKey);
  const updated = replies.map((r) => {
    if (r.id === replyId) {
      const thread = r.replies || r.responses || [];
      const newReply = {
        id: `msg-${Date.now()}`,
        sender_name: responderName,
        sender_email: responderEmail,
        body: responseText,
        sent_at: new Date().toISOString(),
      };
      return {
        ...r,
        read: true,
        replies: [...thread, newReply],
        responses: [...thread, newReply],
      };
    }
    return r;
  });
  saveEmailReplies(updated, accountKey);
}

export function addIncomingEmailReply(reply: Partial<EmailReply>, accountKey?: string): void {
  // Guard: ONLY accept messages concerning reading challenges
  if (
    !isReadingChallengeMessage({
      subject: reply.subject,
      body: reply.body,
      sender_role: reply.sender_role,
      sender_name: reply.sender_name,
    })
  ) {
    return;
  }

  const replies = getEmailReplies(accountKey);
  const newRecord: EmailReply = {
    id: reply.id || `reply-${Date.now()}`,
    sender_name: reply.sender_name || "Academy Scholar",
    sender_email: reply.sender_email || "scholar@mpesafoundationacademy.ac.ke",
    sender_role: reply.sender_role || "Reader",
    subject: reply.subject || "Re: Academy Reading Challenge",
    body: reply.body || "",
    sent_at: reply.sent_at || new Date().toISOString(),
    read: reply.read !== undefined ? reply.read : false,
    category: reply.category || getReadingChallengeCategory(reply),
    challenge_id: reply.challenge_id,
    recipient_email: reply.recipient_email,
    recipient_user_id: reply.recipient_user_id,
    replies: reply.replies || [],
    responses: reply.responses || [],
  };

  const filtered = replies.filter((r) => r.id !== newRecord.id);
  saveEmailReplies([newRecord, ...filtered], accountKey);
}

/**
 * Synchronize remote notifications from Supabase in real-time,
 * filtering strictly to ONLY messages concerning the Reading Challenge.
 */
export async function syncSupabaseNotificationsToInbox(
  userId: string,
  userEmail: string,
  userName: string
): Promise<EmailReply[]> {
  const accountKey = userEmail || userId;
  const current = getEmailReplies(accountKey);
  const existingIds = new Set(current.map((c) => c.id));

  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      let hasNew = false;
      const remoteMapped: EmailReply[] = [];

      for (const notif of data) {
        // STRICT CHECK: Disregard any notifications not related to reading challenges
        if (
          !isReadingChallengeMessage({
            subject: notif.title,
            body: notif.message,
            type: notif.type,
          })
        ) {
          continue;
        }

        const notifId = `notif-${notif.id}`;
        if (!existingIds.has(notifId)) {
          hasNew = true;
          remoteMapped.push({
            id: notifId,
            sender_name:
              notif.type === "broadcast"
                ? "Reading Challenge Broadcast"
                : "Academy Library Department",
            sender_email: "librarian@mpesafoundationacademy.ac.ke",
            sender_role: notif.type === "broadcast" ? "Challenge Coordinator" : "Head Librarian",
            subject: notif.title || "Reading Challenge Update",
            body: notif.message || "",
            sent_at: notif.created_at || new Date().toISOString(),
            read: Boolean(notif.read),
            category: getReadingChallengeCategory({ subject: notif.title, body: notif.message }),
            recipient_email: userEmail,
            recipient_user_id: userId,
            replies: [],
            responses: [],
          });
        }
      }

      if (hasNew) {
        const combined = [...remoteMapped, ...current].filter(isReadingChallengeMessage);
        saveEmailReplies(combined, accountKey);
        return combined;
      }
    }
  } catch (err) {
    console.warn("Could not sync remote notifications to inbox:", err);
  }

  return current;
}
