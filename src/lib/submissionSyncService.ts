import { supabase } from "@/integrations/supabase/client";
import { safeStorage } from "@/lib/safeStorage";
import { normalizeChallengeId } from "@/contexts/ChallengeContext";

export interface UnifiedSubmission {
  id: string;
  user_id: string;
  challenge_id?: string | null;
  category_number: number;
  category_name: string;
  title: string;
  author: string;
  date_started: string;
  date_finished: string;
  reflection: string;
  points_earned: number;
  approval_status: "approved" | "pending" | "rejected" | string;
  admin_feedback?: string | null;
  ai_feedback?: string | null;
  created_at: string;
}

export const MAIN_45_CHALLENGE_ID = "45450000-2025-4026-8000-000000000045";

/**
 * Fetch all unified submissions for a student with local resilient audit merge
 * and consistent challenge filtering and deduplication.
 */
export async function getUnifiedSubmissions(
  userId: string,
  selectedChallengeId?: string | null
): Promise<{
  allSubmissions: UnifiedSubmission[];
  approvedSubmissions: UnifiedSubmission[];
  pendingSubmissions: UnifiedSubmission[];
  rejectedSubmissions: UnifiedSubmission[];
  countedBooks: number;
  categoryCounts: Record<number, number>;
}> {
  if (!userId) {
    return {
      allSubmissions: [],
      approvedSubmissions: [],
      pendingSubmissions: [],
      rejectedSubmissions: [],
      countedBooks: 0,
      categoryCounts: {},
    };
  }

  const normId = normalizeChallengeId(selectedChallengeId);
  const isAllAcademy = selectedChallengeId === "all";
  const isMaster45 =
    !selectedChallengeId ||
    selectedChallengeId === "all" ||
    selectedChallengeId === "45-books" ||
    selectedChallengeId === MAIN_45_CHALLENGE_ID ||
    normId === MAIN_45_CHALLENGE_ID;

  // 1. Fetch remote submissions from both tables
  const [bRes, cRes] = await Promise.all([
    supabase
      .from("book_submissions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("challenge_submissions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  // 2. Fetch local audit cache
  const rawAudits = safeStorage.getJSON<any[]>("mfa_submissions_audit", []);
  const userAudits: UnifiedSubmission[] = rawAudits
    .filter((a) => !a.user_id || a.user_id === userId)
    .map((a) => ({
      id: a.id || `sub-audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: userId,
      challenge_id: a.challenge_id || normId || MAIN_45_CHALLENGE_ID,
      category_number: Number(a.category_number || a.categoryNumber || 1),
      category_name: a.category_name || a.categoryName || "Reading Realm",
      title: (a.title || "").trim(),
      author: (a.author || "").trim(),
      date_started: a.date_started || a.dateStarted || a.created_at || new Date().toISOString(),
      date_finished: a.date_finished || a.dateFinished || a.created_at || new Date().toISOString(),
      reflection: a.reflection || "",
      points_earned: Number(a.points_earned || a.pointsEarned || 10),
      approval_status: a.approval_status || (a.isAIFlagged ? "pending" : "approved"),
      admin_feedback: a.admin_feedback || null,
      ai_feedback: a.ai_feedback || null,
      created_at: a.created_at || new Date().toISOString(),
    }));

  // Map server book_submissions
  const mappedBookSubs: UnifiedSubmission[] = (bRes.data || []).map((r: any) => ({
    id: r.id,
    user_id: r.user_id,
    challenge_id: r.challenge_id || MAIN_45_CHALLENGE_ID,
    category_number: Number(r.category_number || 1),
    category_name: r.category_name || "Literary Realm",
    title: (r.title || "").trim(),
    author: (r.author || "").trim(),
    date_started: r.date_started || r.created_at,
    date_finished: r.date_finished || r.created_at,
    reflection: r.reflection || "",
    points_earned: Number(r.points_earned || 10),
    approval_status: r.approval_status || "approved",
    admin_feedback: r.admin_feedback || null,
    ai_feedback: r.ai_feedback || null,
    created_at: r.created_at,
  }));

  // Map server challenge_submissions
  const mappedChallengeSubs: UnifiedSubmission[] = (cRes.data || []).map((r: any) => ({
    id: r.id,
    user_id: r.user_id,
    challenge_id: r.challenge_id || normId || MAIN_45_CHALLENGE_ID,
    category_number: Number(r.category_number || 1),
    category_name: r.category_name || "Specialty Challenge",
    title: (r.title || "").trim(),
    author: (r.author || "").trim(),
    date_started: r.date_started || r.created_at,
    date_finished: r.date_finished || r.created_at,
    reflection: r.reflection || "",
    points_earned: Number(r.points_earned || 10),
    approval_status: r.approval_status || "approved",
    admin_feedback: r.admin_feedback || null,
    ai_feedback: r.ai_feedback || null,
    created_at: r.created_at,
  }));

  const allRaw = [...userAudits, ...mappedBookSubs, ...mappedChallengeSubs];

  // Challenge filtering
  let filtered: UnifiedSubmission[] = [];
  if (isAllAcademy) {
    filtered = allRaw;
  } else if (isMaster45) {
    filtered = allRaw.filter(
      (s) =>
        !s.challenge_id ||
        s.challenge_id === "45-books" ||
        s.challenge_id === MAIN_45_CHALLENGE_ID
    );
  } else {
    const queryIds = Array.from(new Set([selectedChallengeId, normId].filter(Boolean) as string[]));
    filtered = allRaw.filter((s) => s.challenge_id && queryIds.includes(s.challenge_id));
  }

  // Deduplicate entries by ID and canonical (title + author)
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const deduplicated: UnifiedSubmission[] = [];

  for (const s of filtered) {
    if (s.id && seenIds.has(s.id)) continue;
    if (s.id) seenIds.add(s.id);

    const k = `${s.title.toLowerCase()}:::${s.author.toLowerCase()}`;
    if (k !== ":::" && seenKeys.has(k)) continue;
    if (k !== ":::") seenKeys.add(k);

    deduplicated.push(s);
  }

  // Sort by created_at descending (latest first)
  deduplicated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const approvedSubmissions = deduplicated.filter(
    (s) => s.approval_status === "approved" || !s.approval_status
  );
  const pendingSubmissions = deduplicated.filter((s) => s.approval_status === "pending");
  const rejectedSubmissions = deduplicated.filter((s) => s.approval_status === "rejected");

  // Calculate counted books per category cap (default cap 4)
  const categoryCounts: Record<number, number> = {};
  approvedSubmissions.forEach((s) => {
    const cat = s.category_number || 1;
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const countedBooks = Object.values(categoryCounts).reduce((sum, n) => sum + Math.min(n, 4), 0);

  return {
    allSubmissions: deduplicated,
    approvedSubmissions,
    pendingSubmissions,
    rejectedSubmissions,
    countedBooks,
    categoryCounts,
  };
}
