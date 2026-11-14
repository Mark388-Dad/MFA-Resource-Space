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

export interface EmailThreadItem {
  id: string;
  sender_name: string;
  sender_email: string;
  body: string;
  sent_at: string;
}

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
  starred?: boolean;
  archived?: boolean;
  trashed?: boolean;
  is_draft?: boolean;
  cc_emails?: string[];
  forwarded_from?: string;
  category?: ReadingChallengeCategory;
  challenge_id?: string;
  recipient_email?: string;
  recipient_name?: string;
  recipient_user_id?: string;
  direction?: "inbound" | "outbound";
  replies?: EmailThreadItem[];
  responses?: EmailThreadItem[];
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
    "literary",
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
    "non-fiction",
    "biography",
    "poetry",
    "access code",
    "stu-dp",
    "tut-dp",
    "head librarian",
    "tutor group",
    "homeroom tutor",
    "follet",
    "follett",
  ];

  return readingKeywords.some((kw) => text.includes(kw));
}

/**
 * Strictly validates outgoing/composed emails & replies to ensure only
 * Reading Challenge communications are composed or sent.
 */
export function validateReadingChallengeEmail(
  subject: string,
  body: string
): { valid: boolean; reason?: string } {
  const cleanSubject = subject.trim();
  const cleanBody = body.trim();

  if (!cleanSubject) {
    return { valid: false, reason: "Please enter a Reading Challenge subject line." };
  }
  if (!cleanBody) {
    return { valid: false, reason: "Please write your Reading Challenge message before sending." };
  }

  const allowed = isReadingChallengeMessage({
    subject: cleanSubject,
    body: cleanBody,
  });

  if (!allowed) {
    return {
      valid: false,
      reason:
        "This Inbox is strictly for Reading Challenge emails. Reference a book, novel, author, reading challenge, reflection, review, literary realm, library update, or milestone.",
    };
  }

  return { valid: true };
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
  if (text.includes("milestone") || text.includes("points") || text.includes("badge") || text.includes("crossed the") || text.includes("certificate")) {
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
  } catch {
    // ignore storage read error
  }
  try {
    const rawCached = safeStorage.getItem("mfa_cached_profile");
    if (rawCached) {
      const p = JSON.parse(rawCached);
      if (p.email) return p.email;
      if (p.user_id) return p.user_id;
    }
  } catch {
    // ignore storage read error
  }
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

  window.dispatchEvent(
    new CustomEvent("mfa_browser_notification_triggered", {
      detail: { title, ...options },
    })
  );

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

function isUUID(val?: string): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

async function resolveProfileUserIdByEmail(email?: string): Promise<string | null> {
  const cleanEmail = (email || "").toLowerCase().trim();
  if (!cleanEmail || !cleanEmail.includes("@")) return null;
  try {
    const { data: rpcData } = await supabase.rpc("search_directory", { q: cleanEmail });
    if (Array.isArray(rpcData)) {
      const exact = rpcData.find(
        (r) => (r.email || "").toLowerCase().trim() === cleanEmail
      );
      if (exact?.user_id && !exact.user_id.startsWith("00000000-0000-4000-8000-")) {
        return exact.user_id;
      }
    }
  } catch {
    // ignore RPC fallback error
  }
  try {
    const { data } = await supabase
      .from("profiles")
      .select("user_id")
      .ilike("email", cleanEmail)
      .limit(1)
      .maybeSingle();
    if (data?.user_id && !data.user_id.startsWith("00000000-0000-4000-8000-")) {
      return data.user_id;
    }
  } catch {
    // ignore lookup fallback error
  }
  return null;
}

const INBOX_CHANNEL_NAME = "mfa_reading_inbox_realtime_v1";

function notifyRealtimeChannels(accountKey?: string): void {
  if (typeof window === "undefined") return;
  const cleanKey = (accountKey || "").toLowerCase().trim();
  window.dispatchEvent(
    new CustomEvent("mfa_email_replies_updated", { detail: { accountKey: cleanKey } })
  );
  if ("BroadcastChannel" in window) {
    try {
      const bc = new BroadcastChannel(INBOX_CHANNEL_NAME);
      bc.postMessage({ type: "inbox_updated", accountKey: cleanKey, ts: Date.now() });
      bc.close();
    } catch {
      // ignore BroadcastChannel unsupported errors
    }
  }
}

/**
 * Subscribe to real-time inbox updates across in-app events, cross-tab BroadcastChannel,
 * localStorage updates, and Supabase Realtime notifications.
 */
export function subscribeToInboxRealtime(
  accountKey: string | undefined,
  userId: string | undefined,
  onChange: (detail?: { fromRemote?: boolean; subject?: string }) => void
): () => void {
  if (typeof window === "undefined") return () => {};
  const cleanKey = (accountKey || "").toLowerCase().trim();

  const handleLocalEvent = (e: Event) => {
    const evKey = ((e as CustomEvent)?.detail?.accountKey || "").toLowerCase().trim();
    if (!evKey || !cleanKey || evKey === cleanKey) {
      onChange({ fromRemote: false });
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (
      !e.key ||
      e.key.startsWith(BASE_KEY) ||
      e.key === "mfa-broadcast-emails"
    ) {
      onChange({ fromRemote: false });
    }
  };

  window.addEventListener("mfa_email_replies_updated", handleLocalEvent);
  window.addEventListener("mfa_notification_created", handleLocalEvent);
  window.addEventListener("storage", handleStorageEvent);

  let bc: BroadcastChannel | null = null;
  if ("BroadcastChannel" in window) {
    try {
      bc = new BroadcastChannel(INBOX_CHANNEL_NAME);
      bc.onmessage = (ev) => {
        const msgKey = (ev?.data?.accountKey || "").toLowerCase().trim();
        if (!msgKey || !cleanKey || msgKey === cleanKey) {
          onChange({ fromRemote: true });
        }
      };
    } catch {
      bc = null;
    }
  }

  let channel: ReturnType<typeof supabase.channel> | null = null;
  if (userId && isUUID(userId) && !userId.startsWith("00000000-0000-4000-8000-")) {
    channel = supabase
      .channel(`realtime-inbox-sync-${userId}-${Math.random().toString(36).slice(2, 7)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const rec = (payload.new || {}) as { title?: string; message?: string; type?: string };
          if (
            isReadingChallengeMessage({
              subject: rec?.title,
              body: rec?.message,
              type: rec?.type,
            })
          ) {
            onChange({ fromRemote: true, subject: rec?.title });
          }
        }
      )
      .subscribe();
  }

  return () => {
    window.removeEventListener("mfa_email_replies_updated", handleLocalEvent);
    window.removeEventListener("mfa_notification_created", handleLocalEvent);
    window.removeEventListener("storage", handleStorageEvent);
    if (bc) {
      try {
        bc.close();
      } catch {
        // ignore close error
      }
    }
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
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

  // Also read from global broadcast/unlock store if not present (skip if user already dismissed/trashed/deleted)
  try {
    const dismissedIds = new Set<string>(
      safeStorage.getJSON<string[]>(`mfa_dismissed_bcast_${getAccountStorageKey(effectiveKey)}`, [])
    );
    const broadcasts = safeStorage.getJSON<Array<Record<string, string | undefined>>>("mfa-broadcast-emails", []);
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
      const pairedId = bm.direction === "outbound" ? `${bm.id}-sent` : `${bm.id}-inbox`;
      if (
        !existingIds.has(bm.id) &&
        !existingIds.has(pairedId) &&
        !dismissedIds.has(bm.id) &&
        !dismissedIds.has(pairedId) &&
        isReadingChallengeMessage(bm)
      ) {
        const recipClean = (bm.recipient_email?.includes("<") ? bm.recipient_email.match(/<([^>]+)>/)?.[1] : bm.recipient_email) || bm.recipient_email || "";
        const isRecip = recipClean.toLowerCase().trim() === effectiveKey.toLowerCase().trim();
        const isSender = bm.direction === "outbound";
        const isAdmin = (effectiveKey.toLowerCase().includes("librarian") || effectiveKey.toLowerCase().includes("admin")) && !effectiveKey.toLowerCase().includes("tonny");
        if (isRecip || isSender || (isAdmin && bm.category === "review")) {
          rawList.push(bm);
        }
      }
    }
  } catch {
    // ignore broadcast parse error
  }

  const filtered = purgeMockEmails(rawList)
    .filter((item) => item.is_draft || isReadingChallengeMessage(item))
    .map((item) => {
      const isSender = (item.sender_email || "").toLowerCase() === effectiveKey.toLowerCase();
      const resolvedDirection = item.direction || (isSender ? "outbound" : "inbound");
      return {
        ...item,
        read: item.is_draft ? true : item.read,
        direction: resolvedDirection,
        category: item.category || getReadingChallengeCategory(item),
      };
    });

  return filtered;
}

export function saveEmailReplies(replies: EmailReply[], accountKey?: string): void {
  const effectiveKey = accountKey || getActiveUserAccountKey();
  const key = getAccountStorageKey(effectiveKey);

  // Filter so non-challenge non-draft items and mocks are never persisted
  const rcOnly = purgeMockEmails(replies).filter((item) => item.is_draft || isReadingChallengeMessage(item));

  try {
    safeStorage.setItem(key, JSON.stringify(rcOnly));
    if (!accountKey && !effectiveKey) {
      safeStorage.setItem(BASE_KEY, JSON.stringify(rcOnly));
    }
    notifyRealtimeChannels(effectiveKey);
  } catch (e) {
    console.error("Failed to save email replies:", e);
  }
}

/**
 * Dispatch a message across both Email trigger and In-Built Web Inbox simultaneously.
 * Strictly enforces Reading Challenge scope, stores in sender & recipient inboxes,
 * and inserts a Supabase notification row for cross-session delivery.
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
  ccEmails?: string[];
  forwardedFrom?: string;
}): EmailReply {
  if (!isReadingChallengeMessage({ subject: msg.subject, body: msg.body, sender_role: msg.senderRole })) {
    throw new Error(
      "Only Reading Challenge emails can be sent from this Inbox. Mention a book, challenge, reflection, review, or literary milestone."
    );
  }

  const baseId = `rc-msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const resolvedCategory =
    msg.category || getReadingChallengeCategory({ subject: msg.subject, body: msg.body });

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
    read: true,
    category: resolvedCategory,
    challenge_id: msg.challengeId || "45450000-2025-4026-8000-000000000045",
    cc_emails: msg.ccEmails,
    forwarded_from: msg.forwardedFrom,
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
    category: resolvedCategory,
    challenge_id: msg.challengeId || "45450000-2025-4026-8000-000000000045",
    cc_emails: msg.ccEmails,
    forwarded_from: msg.forwardedFrom,
    replies: [],
    responses: [],
  };

  // Add outbound record to sender's Sent folder
  const senderKey = (msg.senderEmail || "").toLowerCase().trim();
  if (senderKey) {
    const senderList = getEmailReplies(senderKey);
    saveEmailReplies([outboundRecord, ...senderList.filter((r) => r.id !== outboundRecord.id)], senderKey);
  }

  // Add inbound record to recipient's Inbox folder
  const recipientKey = (msg.recipientEmail || "").toLowerCase().trim();
  if (recipientKey && recipientKey !== senderKey) {
    const recipientList = getEmailReplies(recipientKey);
    saveEmailReplies([inboundRecord, ...recipientList.filter((r) => r.id !== inboundRecord.id)], recipientKey);
  } else if (recipientKey && recipientKey === senderKey) {
    // Allow sending to self cleanly as a real Gmail self-note / copy
    const selfList = getEmailReplies(senderKey);
    saveEmailReplies([inboundRecord, ...selfList.filter((r) => r.id !== inboundRecord.id)], senderKey);
  }

  // Fallback recipientUserId local key
  if (msg.recipientUserId && msg.recipientUserId !== "guest" && msg.recipientUserId !== recipientKey) {
    try {
      const userList = getEmailReplies(msg.recipientUserId);
      saveEmailReplies([inboundRecord, ...userList.filter((r) => r.id !== inboundRecord.id)], msg.recipientUserId);
    } catch {
      // ignore fallback write error
    }
  }

  // Save into broadcast emails log
  try {
    const broadcasts = safeStorage.getJSON<Array<Record<string, unknown>>>("mfa-broadcast-emails", []);
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
      type: resolvedCategory === "review" ? "unlock_request" : "announcement",
      timestamp: now,
    });
    safeStorage.setJSON("mfa-broadcast-emails", broadcasts.slice(0, 50));

    if (recipientKey) {
      const welcomeEmails = safeStorage.getJSON<Array<Record<string, unknown>>>("mfa_student_welcome_emails", []);
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

  // Trigger Native Desktop Browser Notification
  try {
    triggerBrowserNotification(msg.subject, {
      body: `${msg.senderName}: ${msg.body.length > 130 ? msg.body.substring(0, 127) + "..." : msg.body}`,
      tag: baseId,
    });
  } catch (notifErr) {
    console.warn("Browser notification trigger notice:", notifErr);
  }

  // Cross-session delivery via Supabase notifications table (resolve profile user_id if needed)
  const insertRemoteNotification = async () => {
    let targetUserId = msg.recipientUserId;
    if (!targetUserId || !isUUID(targetUserId) || targetUserId.startsWith("00000000-0000-4000-8000-")) {
      const lookedUp = await resolveProfileUserIdByEmail(msg.recipientEmail);
      if (lookedUp) targetUserId = lookedUp;
    }
    if (targetUserId && isUUID(targetUserId) && !targetUserId.startsWith("00000000-0000-4000-8000-")) {
      await supabase.from("notifications").insert({
        user_id: targetUserId,
        title: msg.subject,
        message: `${msg.body}\n\n— Sent by ${msg.senderName} <${msg.senderEmail}>`,
        type: resolvedCategory === "milestone" ? "certificate" : "reading_challenge",
        read: false,
      });
    }
  };
  insertRemoteNotification().catch(() => {});

  if (typeof window !== "undefined") {
    notifyRealtimeChannels(senderKey);
    notifyRealtimeChannels(recipientKey);
    window.dispatchEvent(new CustomEvent("mfa_email_notifications_updated", { detail: { recipientEmail: recipientKey, subject: msg.subject } }));
    window.dispatchEvent(new CustomEvent("mfa-welcome-email-received"));
  }

  return outboundRecord;
}

/**
 * Returns unread count of strictly Reading Challenge emails (excluding trash, archive, drafts)
 */
export function getUnreadEmailCount(accountKey?: string): number {
  const effectiveKey = accountKey || getActiveUserAccountKey();
  const replies = getEmailReplies(effectiveKey);
  const cleanKey = effectiveKey.toLowerCase().trim();
  return replies.filter((r) => {
    if (r.trashed || r.archived || r.is_draft) return false;
    if (r.direction === "outbound") return false;
    const recipientClean = (r.recipient_email || "").toLowerCase().trim();
    const isSender = (r.sender_email || "").toLowerCase().trim() === cleanKey;
    if (isSender && recipientClean !== cleanKey) return false;
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

export function markEmailReplyAsUnread(id: string, accountKey?: string): void {
  const effectiveKey = accountKey || getActiveUserAccountKey();
  const replies = getEmailReplies(effectiveKey);
  const updated = replies.map((r) => (r.id === id ? { ...r, read: false } : r));
  saveEmailReplies(updated, effectiveKey);

  if (id.startsWith("notif-")) {
    const notifDbId = id.replace("notif-", "");
    supabase.from("notifications").update({ read: false }).eq("id", notifDbId).then();
  }
}

export function markAllEmailRepliesAsRead(accountKey?: string): void {
  const effectiveKey = accountKey || getActiveUserAccountKey();
  const replies = getEmailReplies(effectiveKey);
  const updated = replies.map((r) => ({ ...r, read: true }));
  saveEmailReplies(updated, effectiveKey);

  supabase.from("notifications").update({ read: true }).neq("id", "00000000-0000-0000-0000-000000000000").then();
}

export function toggleEmailStar(id: string, accountKey?: string): boolean {
  const effectiveKey = accountKey || getActiveUserAccountKey();
  const replies = getEmailReplies(effectiveKey);
  let nextState = false;
  const updated = replies.map((r) => {
    if (r.id === id) {
      nextState = !r.starred;
      return { ...r, starred: nextState };
    }
    return r;
  });
  saveEmailReplies(updated, effectiveKey);
  return nextState;
}

export function toggleEmailArchive(id: string, archived: boolean, accountKey?: string): void {
  const effectiveKey = accountKey || getActiveUserAccountKey();
  const replies = getEmailReplies(effectiveKey);
  const updated = replies.map((r) =>
    r.id === id ? { ...r, archived, trashed: archived ? false : r.trashed } : r
  );
  saveEmailReplies(updated, effectiveKey);
}

export function moveEmailToTrash(id: string, trashed: boolean, accountKey?: string): void {
  const effectiveKey = accountKey || getActiveUserAccountKey();
  const replies = getEmailReplies(effectiveKey);
  const updated = replies.map((r) =>
    r.id === id ? { ...r, trashed, archived: trashed ? false : r.archived } : r
  );
  saveEmailReplies(updated, effectiveKey);
}

export function deleteEmailPermanently(id: string, accountKey?: string): void {
  const effectiveKey = accountKey || getActiveUserAccountKey();
  const replies = getEmailReplies(effectiveKey);
  const updated = replies.filter((r) => r.id !== id);
  // Track dismissed broadcast ID so it doesn't re-import from global broadcast log
  try {
    const dismissKey = `mfa_dismissed_bcast_${getAccountStorageKey(effectiveKey)}`;
    const dismissed = safeStorage.getJSON<string[]>(dismissKey, []);
    const baseId = id.replace(/-(sent|inbox)$/, "");
    const nextDismissed = Array.from(new Set([...dismissed, id, baseId])).slice(-200);
    safeStorage.setJSON(dismissKey, nextDismissed);
  } catch {
    // ignore dismiss log error
  }
  saveEmailReplies(updated, effectiveKey);
}

export function saveEmailDraft(
  draft: {
    id?: string;
    senderName: string;
    senderEmail: string;
    senderRole?: string;
    recipientEmail: string;
    recipientName?: string;
    subject: string;
    body: string;
    challengeId?: string;
  },
  accountKey?: string
): EmailReply {
  const effectiveKey = accountKey || draft.senderEmail || getActiveUserAccountKey();
  const replies = getEmailReplies(effectiveKey);
  const now = new Date().toISOString();
  const draftId = draft.id || `rc-draft-${Date.now()}`;

  const draftRecord: EmailReply = {
    id: draftId,
    sender_name: draft.senderName,
    sender_email: draft.senderEmail,
    sender_role: draft.senderRole || "Reader",
    recipient_email: draft.recipientEmail,
    recipient_name: draft.recipientName,
    subject: draft.subject || "(No Reading Challenge Subject)",
    body: draft.body,
    sent_at: now,
    read: true,
    is_draft: true,
    direction: "outbound",
    category: getReadingChallengeCategory({ subject: draft.subject, body: draft.body }),
    challenge_id: draft.challengeId,
    replies: [],
    responses: [],
  };

  const filtered = replies.filter((r) => r.id !== draftId);
  saveEmailReplies([draftRecord, ...filtered], effectiveKey);
  return draftRecord;
}

export function deleteEmailDraft(draftId: string, accountKey?: string): void {
  const effectiveKey = accountKey || getActiveUserAccountKey();
  const replies = getEmailReplies(effectiveKey);
  saveEmailReplies(
    replies.filter((r) => r.id !== draftId),
    effectiveKey
  );
}

export function appendUserResponse(
  replyId: string,
  responderName: string,
  responderEmail: string,
  responseText: string,
  accountKey?: string
): void {
  const effectiveKey = accountKey || responderEmail || getActiveUserAccountKey();
  const replies = getEmailReplies(effectiveKey);
  const target = replies.find((r) => r.id === replyId);
  if (!target) return;

  const newReply: EmailThreadItem = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    sender_name: responderName,
    sender_email: responderEmail,
    body: responseText,
    sent_at: new Date().toISOString(),
  };

  // 1. Update responder's own thread
  const updated = replies.map((r) => {
    if (r.id === replyId) {
      const thread = r.replies || r.responses || [];
      return {
        ...r,
        read: true,
        sent_at: newReply.sent_at,
        replies: [...thread, newReply],
        responses: [...thread, newReply],
      };
    }
    return r;
  });
  saveEmailReplies(updated, effectiveKey);

  // 2. Deliver reply into the peer participant's inbox thread so receiving works in real time
  const responderClean = responderEmail.toLowerCase().trim();
  const peerEmailRaw =
    (target.sender_email || "").toLowerCase().trim() === responderClean
      ? target.recipient_email
      : target.sender_email;
  const peerClean = (peerEmailRaw || "").toLowerCase().trim();

  if (peerClean && peerClean !== responderClean) {
    const peerList = getEmailReplies(peerClean);
    const matchingBaseId = replyId.replace(/-(sent|inbox)$/, "");
    const peerThreadIdx = peerList.findIndex(
      (p) =>
        p.id === replyId ||
        p.id.replace(/-(sent|inbox)$/, "") === matchingBaseId ||
        (p.subject === target.subject &&
          ((p.sender_email || "").toLowerCase().trim() === responderClean ||
            (p.recipient_email || "").toLowerCase().trim() === responderClean))
    );

    if (peerThreadIdx >= 0) {
      const existingPeer = peerList[peerThreadIdx];
      const existingThread = existingPeer.replies || existingPeer.responses || [];
      const updatedPeerItem: EmailReply = {
        ...existingPeer,
        read: false,
        trashed: false,
        archived: false,
        sent_at: newReply.sent_at,
        replies: [...existingThread, newReply],
        responses: [...existingThread, newReply],
      };
      const nextPeerList = [
        updatedPeerItem,
        ...peerList.filter((_, i) => i !== peerThreadIdx),
      ];
      saveEmailReplies(nextPeerList, peerClean);
    } else {
      // Create fresh inbound reply entry in peer's inbox
      const replySubject = target.subject.startsWith("Re:")
        ? target.subject
        : `Re: ${target.subject}`;
      const inboundReplyRecord: EmailReply = {
        id: `rc-reply-${Date.now()}-${Math.random().toString(36).substring(2, 6)}-inbox`,
        sender_name: responderName,
        sender_email: responderEmail,
        sender_role: "Academy Reader",
        recipient_email: peerClean,
        recipient_name: target.recipient_name || target.sender_name,
        recipient_user_id: target.recipient_user_id,
        direction: "inbound",
        subject: replySubject,
        body: responseText,
        sent_at: newReply.sent_at,
        read: false,
        category: target.category || getReadingChallengeCategory({ subject: replySubject, body: responseText }),
        challenge_id: target.challenge_id,
        replies: [],
        responses: [],
      };
      saveEmailReplies([inboundReplyRecord, ...peerList], peerClean);
    }

    // Remote cross-session delivery via Supabase notifications
    const sendRemoteReplyNotification = async () => {
      const peerUserId =
        target.recipient_user_id &&
        isUUID(target.recipient_user_id) &&
        !target.recipient_user_id.startsWith("00000000-0000-4000-8000-")
          ? target.recipient_user_id
          : await resolveProfileUserIdByEmail(peerClean);

      if (peerUserId) {
        const replySubject = target.subject.startsWith("Re:")
          ? target.subject
          : `Re: ${target.subject}`;
        await supabase.from("notifications").insert({
          user_id: peerUserId,
          title: replySubject,
          message: `${responseText}\n\n— Reply from ${responderName} <${responderEmail}>`,
          type: "reading_challenge",
          read: false,
        });
      }
    };
    sendRemoteReplyNotification().catch(() => {});

    if (typeof window !== "undefined") {
      notifyRealtimeChannels(responderClean);
      notifyRealtimeChannels(peerClean);
    }
  }
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
  _userName: string
): Promise<EmailReply[]> {
  const accountKey = userEmail || userId;
  const current = getEmailReplies(accountKey);
  const existingIds = new Set(current.map((c) => c.id));
  const dismissedIds = new Set<string>(
    safeStorage.getJSON<string[]>(`mfa_dismissed_bcast_${getAccountStorageKey(accountKey)}`, [])
  );

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
        if (!existingIds.has(notifId) && !dismissedIds.has(notifId)) {
          hasNew = true;
          const rawMsg = notif.message || "";
          const senderMatch = rawMsg.match(/—\s*(?:Sent by|Reply from)\s+([^<\n]+)\s*<([^>\n]+)>/i);
          const parsedSenderName =
            senderMatch?.[1]?.trim() ||
            (notif.type === "broadcast" ? "Reading Challenge Broadcast" : "Academy Library Department");
          const parsedSenderEmail =
            senderMatch?.[2]?.trim() || "librarian@mpesafoundationacademy.ac.ke";
          const cleanedBody = senderMatch
            ? rawMsg.replace(senderMatch[0], "").trim()
            : rawMsg;

          remoteMapped.push({
            id: notifId,
            sender_name: parsedSenderName,
            sender_email: parsedSenderEmail,
            sender_role: notif.type === "broadcast" ? "Challenge Coordinator" : "Reading Challenge",
            subject: notif.title || "Reading Challenge Update",
            body: cleanedBody,
            sent_at: notif.created_at || new Date().toISOString(),
            read: Boolean(notif.read),
            direction: "inbound",
            category: getReadingChallengeCategory({ subject: notif.title, body: cleanedBody }),
            recipient_email: userEmail,
            recipient_user_id: userId,
            replies: [],
            responses: [],
          });
        }
      }

      if (hasNew) {
        const combined = [...remoteMapped, ...current].filter(
          (item) => item.is_draft || isReadingChallengeMessage(item)
        );
        saveEmailReplies(combined, accountKey);
        return combined;
      }
    }
  } catch (err) {
    console.warn("Could not sync remote notifications to inbox:", err);
  }

  return current;
}
