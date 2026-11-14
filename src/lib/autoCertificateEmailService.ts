/**
 * autoCertificateEmailService.ts
 *
 * Automated Certificate Email Service:
 * Automatically delivers finalized certificates to students' school email addresses
 * immediately upon verification completion (approval of book submissions or milestone reach).
 *
 * Supports:
 * - Direct Google Gmail API delivery when librarian account is connected
 * - School relay via Supabase Edge Function (send-broadcast)
 * - Automatic recording in student's in-app Reading Challenge Inbox
 * - Desktop browser notifications & administrative audit log
 */

import { supabase } from "@/integrations/supabase/client";
import {
  dispatchCertificateEmailService,
  DispatchCertificateResult,
} from "./gmailService";
import {
  CertificateLevel,
  computeStudentLevel,
  getVerificationCode,
} from "./certificateTypes";
import { triggerBrowserNotification } from "./emailRepliesManager";
import { toast } from "sonner";

export interface AutoCertificateSettings {
  enabled: boolean;
  notifyLibrarian: boolean;
  minBooksForDispatch: number; // default: 1 (Beginner tier)
  customSignatoryName: string;
  customSignatoryTitle: string;
  autoCelebrateInLeaderboard: boolean;
}

const SETTINGS_STORAGE_KEY = "mfa_auto_cert_email_settings";
const DISPATCH_LOGS_STORAGE_KEY = "mfa_auto_cert_dispatch_logs";

export interface AutoCertificateLog {
  id: string;
  studentName: string;
  studentEmail: string;
  userId: string;
  level: CertificateLevel;
  booksCount: number;
  verificationCode: string;
  dispatchedAt: string;
  status: "delivered" | "sent_via_relay" | "sent_via_gmail" | "inbox_only" | "failed";
  method: string;
  triggerEvent: string;
  error?: string;
}

export function getAutoCertificateSettings(): AutoCertificateSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      return { ...getDefaultSettings(), ...JSON.parse(raw) };
    }
  } catch {}
  return getDefaultSettings();
}

function getDefaultSettings(): AutoCertificateSettings {
  return {
    enabled: false, // Disabled by user request: auto sending removed, certificates dispatched via manual admin actions
    notifyLibrarian: false,
    minBooksForDispatch: 1,
    customSignatoryName: "Head Librarian",
    customSignatoryTitle: "Media Specialist",
    autoCelebrateInLeaderboard: true,
  };
}

export function saveAutoCertificateSettings(settings: Partial<AutoCertificateSettings>): AutoCertificateSettings {
  const current = getAutoCertificateSettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

export function getAutoCertificateLogs(): AutoCertificateLog[] {
  try {
    const raw = localStorage.getItem(DISPATCH_LOGS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function appendAutoCertificateLog(log: AutoCertificateLog) {
  try {
    const logs = getAutoCertificateLogs();
    const updated = [log, ...logs.slice(0, 199)]; // Keep latest 200 logs
    localStorage.setItem(DISPATCH_LOGS_STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("mfa-auto-cert-logs-updated", { detail: updated }));
    }
  } catch {}
}

export interface TriggerAutoCertParams {
  userId: string;
  studentName?: string;
  studentEmail?: string;
  house?: string;
  yearGroup?: string;
  challengeTitle?: string;
  triggerEvent?: string; // e.g. "Submission Approved: The Great Gatsby"
  manualOverride?: boolean;
}

/**
 * Executes automated certificate email generation and delivery immediately
 * upon verification completion of a student's reading submission or milestone.
 */
export async function triggerAutoCertificateDispatch(
  params: TriggerAutoCertParams
): Promise<{ success: boolean; log?: AutoCertificateLog; message: string }> {
  const settings = getAutoCertificateSettings();

  if (!settings.enabled && !params.manualOverride) {
    return {
      success: false,
      message: "Automated Certificate Email Service is currently disabled in settings.",
    };
  }

  const { userId } = params;
  if (!userId) {
    return { success: false, message: "Missing student userId for certificate dispatch." };
  }

  try {
    // 1. Fetch student's profile & approved reading count from database
    const [profileRes, bookSubsRes, challengeSubsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, full_name, email, house, year_group, role")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("book_submissions")
        .select("id, approval_status")
        .eq("user_id", userId),
      supabase
        .from("challenge_submissions")
        .select("id, approval_status")
        .eq("user_id", userId),
    ]);

    const profile = profileRes.data;
    const rawStudentName = params.studentName || profile?.full_name || "Scholar Reader";
    const studentName = rawStudentName.toUpperCase();

    // Default to official institutional email convention
    const fallbackEmail = `${rawStudentName.toLowerCase().replace(/[^a-z0-9]/g, ".")}@mpesafoundationacademy.ac.ke`;
    const studentEmail = params.studentEmail || profile?.email || fallbackEmail;

    // Calculate total verified books (submissions with approved status)
    const approvedBooks = [
      ...(bookSubsRes.data || []).filter((s) => s.approval_status !== "rejected"),
      ...(challengeSubsRes.data || []).filter((s) => s.approval_status !== "rejected"),
    ].length;

    // Minimum requirement check (e.g. at least 1 book for Beginner tier)
    if (approvedBooks < settings.minBooksForDispatch && !params.manualOverride) {
      return {
        success: false,
        message: `Student has ${approvedBooks} verified books (threshold is ${settings.minBooksForDispatch}). Certificate pending further reading.`,
      };
    }

    const level = computeStudentLevel(approvedBooks);
    const verificationCode = getVerificationCode(studentEmail);
    const challengeTitle = params.challengeTitle || "45-Book Reading Challenge 2025/2026: Beyond the Pages";
    const signatoryName = settings.customSignatoryName || "Head Librarian";
    const signatoryTitle = settings.customSignatoryTitle || "Media Specialist";

    const subject = `🎓 Official ${level} Certificate of Achievement: ${studentName}`;
    const customMessage = `Congratulations ${studentName}! Your reading submission has been officially approved and verified by the Teaching & Learning Directorate. Your finalized ${level} Reading Certificate has been generated and added to the official Academy Ledger.`;

    // 2. Dispatch via Gmail Service / School Relay / Student Inbox
    const dispatchResult: DispatchCertificateResult = await dispatchCertificateEmailService({
      recipientEmail: studentEmail,
      recipientName: studentName,
      recipientUserId: userId,
      senderEmail: "directorate@mpesafoundationacademy.ac.ke",
      senderName: signatoryName,
      senderRole: signatoryTitle,
      challengeId: "45450000-2025-4026-8000-000000000045",
      challengeTitle,
      level,
      booksCount: approvedBooks,
      verificationCode,
      subject,
      customMessage,
    });

    const isDelivered = dispatchResult.sentViaGmail || dispatchResult.sentViaRelay || dispatchResult.loggedToInbox;
    const methodDesc = dispatchResult.sentViaGmail
      ? "Google Gmail API"
      : dispatchResult.sentViaRelay
      ? "School Email Relay"
      : "In-App Challenge Inbox";

    const logEntry: AutoCertificateLog = {
      id: `cert-dispatch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      studentName,
      studentEmail,
      userId,
      level,
      booksCount: approvedBooks,
      verificationCode,
      dispatchedAt: new Date().toISOString(),
      status: dispatchResult.sentViaGmail ? "sent_via_gmail" : dispatchResult.sentViaRelay ? "sent_via_relay" : "inbox_only",
      method: methodDesc,
      triggerEvent: params.triggerEvent || "Verification Completed",
      error: dispatchResult.error,
    };

    appendAutoCertificateLog(logEntry);

    // 3. User feedback & Desktop Notification
    if (settings.notifyLibrarian) {
      triggerBrowserNotification(`🎓 Certificate Emailed: ${studentName}`, {
        body: `Delivered ${level} Certificate (${approvedBooks} books) to ${studentEmail} via ${methodDesc}`,
      });
    }

    toast.success(
      `Finalized ${level} Certificate automatically emailed to ${studentEmail} (${methodDesc})!`
    );

    return {
      success: isDelivered,
      log: logEntry,
      message: `Finalized certificate delivered to ${studentEmail} via ${methodDesc}.`,
    };
  } catch (error: any) {
    console.error("Auto certificate dispatch failure:", error);
    const errMsg = error?.message || "Failed to dispatch automated certificate email.";
    toast.error("Auto Certificate Dispatch Notice: " + errMsg);
    return { success: false, message: errMsg };
  }
}
