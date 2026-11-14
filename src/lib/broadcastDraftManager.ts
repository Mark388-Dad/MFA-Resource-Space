import { EmailStyleOptions } from "./gmailService";

export interface BroadcastDraft {
  subject: string;
  body: string;
  audience?: string;
  picked?: { user_id: string; full_name: string; email: string }[];
  sendToEmail?: boolean;
  styleOptions?: EmailStyleOptions;
  updatedAt: number;
}

export const ADMIN_BROADCAST_DRAFT_KEY = "mfa_admin_broadcast_draft_v1";
export const COHORT_BROADCAST_DRAFT_KEY = "mfa_cohort_broadcast_draft_v1";

/**
 * Save broadcast draft to localStorage
 */
export function saveBroadcastDraft(
  key: string = ADMIN_BROADCAST_DRAFT_KEY,
  draft: Partial<BroadcastDraft>
): BroadcastDraft {
  const existing = getBroadcastDraft(key) || {
    subject: "",
    body: "",
    updatedAt: Date.now(),
  };

  const updated: BroadcastDraft = {
    ...existing,
    ...draft,
    updatedAt: Date.now(),
  };

  try {
    localStorage.setItem(key, JSON.stringify(updated));
    window.dispatchEvent(
      new CustomEvent("mfa-broadcast-draft-saved", {
        detail: { key, draft: updated },
      })
    );
  } catch (err) {
    console.warn("Could not save broadcast draft to localStorage:", err);
  }

  return updated;
}

/**
 * Retrieve broadcast draft from localStorage
 */
export function getBroadcastDraft(
  key: string = ADMIN_BROADCAST_DRAFT_KEY
): BroadcastDraft | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BroadcastDraft;
    // Check if draft contains meaningful content
    if (!parsed.subject?.trim() && !parsed.body?.trim()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Clear broadcast draft from localStorage
 */
export function clearBroadcastDraft(
  key: string = ADMIN_BROADCAST_DRAFT_KEY
): void {
  try {
    localStorage.removeItem(key);
    window.dispatchEvent(
      new CustomEvent("mfa-broadcast-draft-cleared", {
        detail: { key },
      })
    );
  } catch (err) {
    console.warn("Could not clear broadcast draft:", err);
  }
}

/**
 * Format timestamp into friendly string
 */
export function formatDraftTime(timestamp: number | Date | null | undefined): string {
  if (!timestamp) return "Just now";
  const date = typeof timestamp === "number" ? new Date(timestamp) : timestamp;
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return isToday ? `Today at ${timeStr}` : `${date.toLocaleDateString()} ${timeStr}`;
}
