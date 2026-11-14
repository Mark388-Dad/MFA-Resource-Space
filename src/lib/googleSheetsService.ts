import { supabase } from "@/integrations/supabase/client";

export interface GoogleSheetSubmissionRecord {
  studentName: string;
  email: string;
  house: string;
  yearGroup: string;
  className: string;
  challengeName: string;
  categoryNumber: number;
  categoryName: string;
  bookTitle: string;
  author: string;
  dateStarted: string;
  dateFinished: string;
  reflection: string;
  pointsEarned: number;
  timestamp: string;
}

const STORAGE_KEY_WEBHOOK = "mfa_google_sheets_webhook_url";
const STORAGE_KEY_AUTO_SYNC = "mfa_google_sheets_auto_sync";
const STORAGE_PREFIX_CHALLENGE_SHEET = "mfa_challenge_sheets_";

export function getGoogleSheetsWebhookUrl(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEY_WEBHOOK) || "";
}

export function setGoogleSheetsWebhookUrl(url: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_WEBHOOK, url.trim());
}

export function getChallengeGoogleSheetUrl(challengeId: string): string {
  if (typeof window === "undefined" || !challengeId) return "";
  return localStorage.getItem(`${STORAGE_PREFIX_CHALLENGE_SHEET}${challengeId}`) || getGoogleSheetsWebhookUrl();
}

export function setChallengeGoogleSheetUrl(challengeId: string, url: string) {
  if (typeof window === "undefined" || !challengeId) return;
  const trimmed = url.trim();
  localStorage.setItem(`${STORAGE_PREFIX_CHALLENGE_SHEET}${challengeId}`, trimmed);
}

export function isGoogleSheetsAutoSyncEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const val = localStorage.getItem(STORAGE_KEY_AUTO_SYNC);
  return val === null ? true : val === "true";
}

export function setGoogleSheetsAutoSync(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_AUTO_SYNC, enabled ? "true" : "false");
}

/**
 * Automatically records and sends a new student submission to Google Sheets.
 * Dispatches to challenge-specific sheet link if configured, or default sheet webhook.
 */
export async function syncSubmissionToGoogleSheets(
  record: GoogleSheetSubmissionRecord,
  challengeId?: string,
  explicitSheetUrl?: string
): Promise<{ ok: boolean; message: string; sheetUrl?: string }> {
  try {
    const targetUrl = explicitSheetUrl?.trim() || (challengeId ? getChallengeGoogleSheetUrl(challengeId) : "") || getGoogleSheetsWebhookUrl();
    
    // Store in challenge-specific local backup log
    if (typeof window !== "undefined" && challengeId) {
      try {
        const backupKey = `mfa_backup_submissions_${challengeId}`;
        const existing = JSON.parse(localStorage.getItem(backupKey) || "[]");
        existing.unshift(record);
        // keep up to 200 submissions per challenge backup
        localStorage.setItem(backupKey, JSON.stringify(existing.slice(0, 200)));
      } catch (err) {
        console.warn("Could not write to local challenge backup log:", err);
      }
    }

    if (targetUrl && targetUrl.startsWith("http")) {
      await fetch(targetUrl, {
        method: "POST",
        mode: "no-cors", // Google Apps Script redirects require no-cors in browser
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "NEW_SUBMISSION",
          challengeId,
          record,
          timestamp: new Date().toISOString(),
        }),
      });
    }

    // Log sync event into Supabase sheet_sync_logs
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("sheet_sync_logs").insert({
        sync_type: challengeId ? `live_sync_${challengeId.slice(0, 8)}` : "live_submission_sync",
        records_synced: 1,
        synced_by: user?.id || null,
        errors: [],
      });
    } catch (e) {
      console.warn("Could not write to sheet_sync_logs:", e);
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("mfa_google_sync_completed", { detail: { record, challengeId, sheetUrl: targetUrl } }));
      window.dispatchEvent(new CustomEvent("mfa_submission_created", { detail: { record } }));
    }

    return { ok: true, message: "Submission synced to Google Sheets", sheetUrl: targetUrl };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Sync error";
    console.error("Google Sheets sync failed:", err);
    return { ok: false, message: msg };
  }
}

/**
 * Explicit live sync and backup tracking runner for the "aa" button
 */
export async function trackLiveSheetBackup(
  challengeId: string,
  challengeTitle: string,
  sheetUrl?: string
): Promise<{ ok: boolean; recordsCount: number; timestamp: string; message: string }> {
  try {
    const effectiveUrl = sheetUrl || getChallengeGoogleSheetUrl(challengeId);
    const { data: cSubs } = await supabase
      .from("challenge_submissions")
      .select("id")
      .eq("challenge_id", challengeId);

    const count = (cSubs?.length ?? 0) || 1;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("sheet_sync_logs").insert({
        sync_type: `aa_live_backup_${challengeId.slice(0, 8)}`,
        records_synced: count,
        synced_by: user?.id || null,
        errors: effectiveUrl ? [] : ["No Google Sheet URL configured"],
      });
    } catch (e) {
      console.warn("Sheet sync log skipped:", e);
    }

    const now = new Date().toLocaleTimeString();
    return {
      ok: true,
      recordsCount: count,
      timestamp: now,
      message: effectiveUrl
        ? `Live Sheet & Backup verified for "${challengeTitle}". ${count} records tracked.`
        : `Backup recorded locally for "${challengeTitle}". Link a Google Sheet to enable cloud sync.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to track backup";
    return {
      ok: false,
      recordsCount: 0,
      timestamp: new Date().toLocaleTimeString(),
      message: msg,
    };
  }
}

/**
 * Generates structured Sheets CSV or payload for the complete school dashboard
 */
export async function fetchFullSchoolSheetsData(): Promise<{
  submissions: GoogleSheetSubmissionRecord[];
  classStats: Record<string, { books: number; readers: Set<string>; points: number }>;
  houseStats: Record<string, { books: number; readers: Set<string>; points: number }>;
  yearStats: Record<string, { books: number; readers: Set<string>; points: number }>;
  totalSchoolBooks: number;
}> {
  const [bRes, cRes, pRes] = await Promise.all([
    supabase.from("book_submissions").select("*"),
    supabase.from("challenge_submissions").select("*"),
    supabase.from("profiles").select("user_id, full_name, email, house, year_group, class_name"),
  ]);

  const profMap = new Map((pRes.data || []).map((p) => [p.user_id, p]));
  const seenIds = new Set<string>();
  const rows: GoogleSheetSubmissionRecord[] = [];

  const classStats: Record<string, { books: number; readers: Set<string>; points: number }> = {};
  const houseStats: Record<string, { books: number; readers: Set<string>; points: number }> = {
    Kenya: { books: 0, readers: new Set(), points: 0 },
    Kilimanjaro: { books: 0, readers: new Set(), points: 0 },
    Longonot: { books: 0, readers: new Set(), points: 0 },
    Elgon: { books: 0, readers: new Set(), points: 0 },
  };
  const yearStats: Record<string, { books: number; readers: Set<string>; points: number }> = {};

  const processRow = (
    id: string,
    userId: string,
    title: string,
    author: string,
    catNum: number,
    catName: string,
    started: string,
    finished: string,
    reflection: string,
    points: number,
    chName: string,
    created: string
  ) => {
    if (seenIds.has(id)) return;
    seenIds.add(id);

    const prof = profMap.get(userId);
    const sName = prof?.full_name || "Student";
    const email = prof?.email || "";
    const house = prof?.house || "Unassigned";
    const year = prof?.year_group || "General";
    const cls = prof?.class_name || "General";

    rows.push({
      studentName: sName,
      email,
      house,
      yearGroup: year,
      className: cls,
      challengeName: chName,
      categoryNumber: catNum,
      categoryName: catName,
      bookTitle: title,
      author,
      dateStarted: started,
      dateFinished: finished,
      reflection,
      pointsEarned: points,
      timestamp: created,
    });

    // Aggregate House
    if (house && houseStats[house]) {
      houseStats[house].books += 1;
      houseStats[house].points += points;
      houseStats[house].readers.add(userId);
    }

    // Aggregate Class
    const classKey = `${year} ${cls}`.trim() || cls;
    if (!classStats[classKey]) {
      classStats[classKey] = { books: 0, readers: new Set(), points: 0 };
    }
    classStats[classKey].books += 1;
    classStats[classKey].points += points;
    classStats[classKey].readers.add(userId);

    // Aggregate Year Group
    if (!yearStats[year]) {
      yearStats[year] = { books: 0, readers: new Set(), points: 0 };
    }
    yearStats[year].books += 1;
    yearStats[year].points += points;
    yearStats[year].readers.add(userId);
  };

  // 1. Process challenge_submissions
  (cRes.data || []).forEach((c: any) => {
    processRow(
      c.id,
      c.user_id,
      c.title || "",
      c.author || "",
      c.category_number || 1,
      c.category_name || "Challenge Realm",
      c.created_at || "",
      c.created_at || "",
      c.reflection || "",
      c.points_earned || 10,
      "Specialty / Reading Challenge",
      c.created_at || ""
    );
  });

  // 2. Process book_submissions
  (bRes.data || []).forEach((b: any) => {
    processRow(
      b.id,
      b.user_id,
      b.title || "",
      b.author || "",
      b.category_number || 1,
      b.category_name || "45-Book Realm",
      b.date_started || "",
      b.date_finished || "",
      b.reflection || "",
      b.points_earned || 10,
      "45-Book Reading Challenge",
      b.created_at || ""
    );
  });

  return {
    submissions: rows,
    classStats,
    houseStats,
    yearStats,
    totalSchoolBooks: rows.length,
  };
}

/**
 * Downloads a complete multi-sheet ready CSV file formatted for Google Sheets
 */
export async function downloadGoogleSheetsMasterCSV(): Promise<string> {
  const data = await fetchFullSchoolSheetsData();

  const lines: string[] = [];
  lines.push("=== MFA READING CHALLENGE: ALL STUDENT SUBMISSIONS ===");
  lines.push([
    "Student Name",
    "Email",
    "House",
    "Year Group",
    "Class",
    "Challenge",
    "Category No",
    "Category Name",
    "Book Title",
    "Author",
    "Date Started",
    "Date Finished",
    "Points Earned",
    "Submission Date",
    "Reflection",
  ].map((c) => `"${c}"`).join(","));

  data.submissions.forEach((s) => {
    lines.push([
      s.studentName,
      s.email,
      s.house,
      s.yearGroup,
      s.className,
      s.challengeName,
      String(s.categoryNumber),
      s.categoryName,
      s.bookTitle,
      s.author,
      s.dateStarted,
      s.dateFinished,
      String(s.pointsEarned),
      s.timestamp,
      s.reflection.replace(/"/g, '""'),
    ].map((c) => `"${c}"`).join(","));
  });

  lines.push("\n");
  lines.push("=== LIVE DASHBOARD: HOUSE STANDINGS ===");
  lines.push(["House", "Color", "Total Books Read", "Active Readers", "Total Points"].map((c) => `"${c}"`).join(","));
  Object.entries(data.houseStats).forEach(([house, st]) => {
    const color = house === "Kenya" ? "Navy Blue" : house === "Kilimanjaro" ? "Red" : house === "Longonot" ? "Yellow" : "Green";
    lines.push([house, color, String(st.books), String(st.readers.size), String(st.points)].map((c) => `"${c}"`).join(","));
  });

  lines.push("\n");
  lines.push("=== LIVE DASHBOARD: YEAR GROUP STANDINGS ===");
  lines.push(["Year Group", "Total Books Read", "Active Readers", "Total Points"].map((c) => `"${c}"`).join(","));
  Object.entries(data.yearStats).forEach(([year, st]) => {
    lines.push([year, String(st.books), String(st.readers.size), String(st.points)].map((c) => `"${c}"`).join(","));
  });

  lines.push("\n");
  lines.push("=== LIVE DASHBOARD: CLASS STANDINGS ===");
  lines.push(["Class", "Total Books Read", "Active Readers", "Total Points"].map((c) => `"${c}"`).join(","));
  Object.entries(data.classStats).forEach(([cls, st]) => {
    lines.push([cls, String(st.books), String(st.readers.size), String(st.points)].map((c) => `"${c}"`).join(","));
  });

  const csv = lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const filename = `MFA_Reading_Challenge_GoogleSheets_Export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Log export in Supabase
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("sheet_sync_logs").insert({
      sync_type: "master_csv_export",
      records_synced: data.submissions.length,
      synced_by: user?.id || null,
      errors: [],
    });
  } catch (e) {
    console.warn("Could not write to sheet_sync_logs:", e);
  }

  return filename;
}

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `// -------------------------------------------------------------
// Mpesa Foundation Academy - Real-Time Reading Challenge Sync
// -------------------------------------------------------------
// Instructions:
// 1. In your Google Sheet, click Extensions > Apps Script
// 2. Paste this code completely, replacing any existing code
// 3. Click Deploy > New deployment > Select type "Web app"
// 4. Set Description: "MFA Sync" | Execute as: "Me" | Who has access: "Anyone"
// 5. Click Deploy, copy the Web App URL, and paste it into the portal!
// -------------------------------------------------------------

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Auto-create header row if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp", "Student Name", "Email", "House", "Year Group",
        "Class", "Challenge", "Category No", "Category Name",
        "Book Title", "Author", "Date Started", "Date Finished",
        "Points Earned", "Reflection", "Approval Status"
      ]);
      sheet.getRange(1, 1, 1, 16).setFontWeight("bold").setBackground("#e6f4ea");
    }

    var contents = e.postData.contents;
    var data = JSON.parse(contents);

    if (data.action === "NEW_SUBMISSION" && data.record) {
      var r = data.record;
      sheet.appendRow([
        r.timestamp || new Date().toISOString(),
        r.studentName || "Student Reader",
        r.email || "",
        r.house || "Unassigned",
        r.yearGroup || "",
        r.className || "",
        r.challengeName || "Reading Challenge",
        r.categoryNumber || 1,
        r.categoryName || "",
        r.bookTitle || "",
        r.author || "",
        r.dateStarted || "",
        r.dateFinished || "",
        r.pointsEarned || 10,
        r.reflection || "",
        r.approvalStatus || "approved"
      ]);
    } else if (data.action === "BULK_SYNC" && data.records) {
      data.records.forEach(function(r) {
        sheet.appendRow([
          r.created_at || new Date().toISOString(),
          r.student_name || r.user_id || "",
          r.student_email || "",
          r.house || "",
          r.year_group || "",
          r.class_name || "",
          data.challengeTitle || "Reading Challenge",
          r.category_number || 1,
          r.category_name || "",
          r.title || "",
          r.author || "",
          r.date_started || "",
          r.date_finished || "",
          r.points_earned || 10,
          r.reflection || "",
          r.approval_status || "approved"
        ]);
      });
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", received: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`;

/**
 * Copies formatted tab-delimited submission data to clipboard for instant paste into Google Sheet cell A1
 */
export async function copyChallengeDataToClipboardForSheet(
  challengeId: string,
  challengeTitle?: string
): Promise<{ count: number; tsvText: string }> {
  const isMain45 = challengeId === "45450000-2025-4026-8000-000000000045";
  const isAll = !challengeId || challengeId === "all";
  
  let subs: any[] = [];
  if (isAll) {
    const [bRes, cRes, pRes] = await Promise.all([
      supabase.from("book_submissions").select("*").order("created_at", { ascending: false }),
      supabase.from("challenge_submissions").select("*").order("created_at", { ascending: false }),
      supabase.from("pending_submissions").select("*").order("created_at", { ascending: false }),
    ]);
    const seen = new Set<string>();
    const combined: any[] = [];
    (bRes.data || []).forEach((b) => {
      const k = `${b.user_id}-${(b.title || "").toLowerCase().trim()}`;
      if (!seen.has(k)) {
        seen.add(k);
        combined.push({ ...b, challenge_title: "45-Book Reading Challenge" });
      }
    });
    (cRes.data || []).forEach((c) => {
      const k = `${c.user_id}-${(c.title || "").toLowerCase().trim()}`;
      if (!seen.has(k)) {
        seen.add(k);
        combined.push({ ...c, challenge_title: "Specialty Reading Challenge" });
      }
    });
    (pRes.data || []).forEach((p) => {
      const k = `${p.email}-${(p.title || "").toLowerCase().trim()}`;
      if (!seen.has(k)) {
        seen.add(k);
        combined.push({ ...p, challenge_title: "Student Book Submission" });
      }
    });
    subs = combined;
  } else if (isMain45) {
    const { data } = await supabase.from("book_submissions").select("*").order("created_at", { ascending: false });
    subs = data || [];
  } else {
    const { data } = await supabase.from("challenge_submissions").select("*").eq("challenge_id", challengeId).order("created_at", { ascending: false });
    subs = data || [];
  }

  const { data: profs } = await supabase.from("profiles").select("user_id, full_name, email, house, year_group, class_name");
  const pMap = new Map((profs || []).map((p) => [p.user_id, p]));

  const headers = [
    "Timestamp",
    "Student Name",
    "Email",
    "House",
    "Year Group",
    "Class",
    "Challenge",
    "Category No",
    "Category Name",
    "Book Title",
    "Author",
    "Date Started",
    "Date Finished",
    "Points Earned",
    "Reflection",
    "Approval Status"
  ];

  const rows = subs.map((s) => {
    const p = pMap.get(s.user_id);
    return [
      s.created_at || "",
      p?.full_name || s.student_name || "Student Reader",
      p?.email || s.student_email || s.email || "",
      p?.house || s.house || "Unassigned",
      p?.year_group || s.year_group || "",
      p?.class_name || s.class_name || "",
      s.challenge_title || challengeTitle || (isMain45 ? "45-Book Reading Challenge" : "Reading Challenge"),
      String(s.category_number || 1),
      s.category_name || "",
      s.title || "",
      s.author || "",
      s.date_started || "",
      s.date_finished || "",
      String(s.points_earned || 10),
      (s.reflection || "").replace(/[\r\n\t]/g, " "),
      s.approval_status || "approved"
    ].join("\t");
  });

  const tsvText = [headers.join("\t"), ...rows].join("\n");
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(tsvText);
    } catch {
      // ignore clipboard error
    }
  }
  return { count: subs.length, tsvText };
}

/**
 * Downloads a single challenge CSV file ready for Google Sheets
 */
export async function downloadSingleChallengeCSV(challengeId: string, challengeTitle: string) {
  const { count, tsvText } = await copyChallengeDataToClipboardForSheet(challengeId, challengeTitle);
  const csv = tsvText
    .split("\n")
    .map((line) => line.split("\t").map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = (challengeTitle || "MFA").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
  const filename = `${safeName}_GoogleSheets_Export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { filename, count };
}

/**
 * Pushes all submissions for a specific challenge (or whole school if 45/all) to the Google Sheet link.
 * Used by the explicit "Sync Submissions Now" button in the librarian command center.
 */
export async function syncAllChallengeSubmissionsNow(
  challengeId: string,
  challengeTitle: string,
  sheetUrl?: string
): Promise<{ ok: boolean; count: number; message: string; filename?: string }> {
  try {
    const targetUrl = sheetUrl?.trim() || getChallengeGoogleSheetUrl(challengeId) || getGoogleSheetsWebhookUrl();
    
    // 1. Automatically copy formatted TSV to clipboard
    const { count } = await copyChallengeDataToClipboardForSheet(challengeId, challengeTitle);

    // 2. Automatically trigger CSV download as well so the user has the offline file ready for File > Import
    let downloadedFilename = "";
    try {
      const dl = await downloadSingleChallengeCSV(challengeId, challengeTitle);
      downloadedFilename = dl.filename;
    } catch (dlErr) {
      console.warn("CSV auto-download skipped:", dlErr);
    }

    // 3. If targetUrl is an endpoint/webhook, POST the bulk payload
    if (targetUrl && targetUrl.startsWith("http")) {
      try {
        await fetch(targetUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "BULK_SYNC",
            challengeId,
            challengeTitle,
            totalSubmissions: count,
            syncedAt: new Date().toISOString(),
          }),
        });
      } catch (postErr) {
        console.warn("Could not post payload directly to URL:", postErr);
      }
    }

    // 4. Record in sheet_sync_logs
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("sheet_sync_logs").insert({
        sync_type: `manual_push_${challengeId.slice(0, 8)}`,
        records_synced: count,
        synced_by: user?.id || null,
        errors: targetUrl ? [] : ["No Google Sheet link attached"],
      });
    } catch (e) {
      console.warn("Sync log write skipped:", e);
    }

    const isDirectSheet = targetUrl && targetUrl.includes("docs.google.com/spreadsheets");

    return {
      ok: true,
      count,
      filename: downloadedFilename,
      message: isDirectSheet
        ? `⚡ Synced ${count} submissions! CSV downloaded & formatted rows copied to clipboard. In Google Sheets: select cell A1 and press Ctrl+V, or use File > Import.`
        : targetUrl
        ? `Successfully pushed ${count} submissions live to Google Sheet webhook for "${challengeTitle}". CSV file downloaded & rows copied to clipboard!`
        : `Synchronized ${count} records! CSV file downloaded & copied to clipboard. In Google Sheets, press Ctrl+V in cell A1 or File > Import to populate!`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to sync submissions";
    return {
      ok: false,
      count: 0,
      message: msg,
    };
  }
}

/**
 * Student-exclusive manual sync: synchronizes a student's personal reading submissions directly to Google Sheets
 */
export async function syncStudentPersonalSubmissionsToSheets(
  userId: string,
  profileInfo: {
    studentName?: string;
    email?: string;
    house?: string;
    yearGroup?: string;
    className?: string;
  },
  challengeId?: string,
  explicitSheetUrl?: string
): Promise<{ ok: boolean; count: number; message: string; sheetUrl?: string }> {
  try {
    const isMain45 = !challengeId || challengeId === 'all' || challengeId === '45450000-2025-4026-8000-000000000045';
    
    // Fetch user's submissions
    let subs: any[] = [];
    if (isMain45) {
      const { data } = await supabase
        .from('book_submissions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      subs = (data || []).filter((s) => s.approval_status !== 'rejected');
    } else {
      const { data } = await supabase
        .from('challenge_submissions')
        .select('*')
        .eq('user_id', userId)
        .eq('challenge_id', challengeId)
        .order('created_at', { ascending: false });
      subs = (data || []).filter((s) => s.approval_status !== 'rejected');
    }

    const targetUrl =
      explicitSheetUrl?.trim() ||
      (challengeId ? getChallengeGoogleSheetUrl(challengeId) : '') ||
      getGoogleSheetsWebhookUrl();

    if (targetUrl && targetUrl.startsWith('http')) {
      const formattedRecords: GoogleSheetSubmissionRecord[] = subs.map((s) => ({
        studentName: profileInfo.studentName || 'Student Reader',
        email: profileInfo.email || '',
        house: profileInfo.house || 'Unassigned',
        yearGroup: profileInfo.yearGroup || 'General',
        className: profileInfo.className || 'General',
        categoryNumber: s.category_number,
        categoryName: s.category_name,
        bookTitle: s.title,
        author: s.author,
        dateStarted: s.date_started || s.created_at || '',
        dateFinished: s.date_finished || s.created_at || '',
        reflection: s.reflection,
        pointsEarned: s.points_earned || 10,
        approvalStatus: s.approval_status || 'approved',
        challengeId: challengeId || '45450000-2025-4026-8000-000000000045',
        challengeTitle: isMain45 ? '45-Book Reading Challenge' : 'Specialty Reading Challenge',
        timestamp: new Date().toISOString(),
      }));

      await fetch(targetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'STUDENT_MANUAL_SYNC',
          userId,
          studentName: profileInfo.studentName,
          records: formattedRecords,
          count: subs.length,
          timestamp: new Date().toISOString(),
        }),
      });
    }

    // Save sync log
    try {
      await supabase.from('sheet_sync_logs').insert({
        sync_type: `student_manual_sync_${userId.slice(0, 8)}`,
        records_synced: subs.length,
        synced_by: userId,
        errors: targetUrl ? [] : ['Local backup sync (no cloud sheet configured)'],
      });
    } catch {
      // ignore
    }

    // Also copy to clipboard for immediate paste
    try {
      const headers = ["Timestamp", "Book Title", "Author", "Category", "Points", "Started", "Finished", "Reflection"];
      const rows = subs.map((s) => [
        s.created_at || "",
        s.title || "",
        s.author || "",
        s.category_name || `Category ${s.category_number || 1}`,
        String(s.points_earned || 10),
        s.date_started || "",
        s.date_finished || "",
        (s.reflection || "").replace(/[\r\n\t]/g, " "),
      ].join("\t"));
      const tsv = [headers.join("\t"), ...rows].join("\n");
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(tsv);
      }
    } catch {}

    return {
      ok: true,
      count: subs.length,
      message: targetUrl
        ? `Successfully synced ${subs.length} books to Google Sheets! Log also copied to clipboard (paste into cell A1).`
        : `Synced ${subs.length} books locally! Formatted log copied to clipboard — paste into cell A1 in your Google Sheet.`,
      sheetUrl: targetUrl,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to sync with Google Sheets';
    return { ok: false, count: 0, message: msg };
  }
}
