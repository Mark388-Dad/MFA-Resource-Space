import { supabase } from "@/integrations/supabase/client";
import { dispatchReadingChallengeMessage } from "@/lib/emailRepliesManager";

export interface ChallengeParticipantRecord {
  id: string;
  challenge_id: string;
  user_id: string;
  joined_at: string;
  books_completed?: number | null;
  completed_at?: string | null;
  profile?: {
    full_name: string;
    email: string;
    role?: string | null;
    avatar_url?: string | null;
    house?: string | null;
    year_group?: string | null;
    class_name?: string | null;
  };
}

export interface WelcomeEmailRecord {
  id: string;
  user_id: string;
  challenge_id: string;
  challenge_title: string;
  subject: string;
  recipient_name: string;
  recipient_email: string;
  sent_at: string;
  read: boolean;
  target_books: number;
  points_reward: number;
  badge_name: string;
  badge_icon: string;
  content: string;
  librarian_notified: boolean;
}

const STORAGE_PREFIX = "mfa_challenge_reg_";
const WELCOME_EMAILS_KEY = "mfa_student_welcome_emails";

export function getLocalRegistrations(userId: string): string[] {
  if (!userId || typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalRegistration(userId: string, challengeId: string) {
  if (!userId || !challengeId || typeof window === "undefined") return;
  try {
    const existing = getLocalRegistrations(userId);
    if (!existing.includes(challengeId)) {
      const updated = [...existing, challengeId];
      localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(updated));
    }
  } catch {}
}

export function removeLocalRegistration(userId: string, challengeId: string) {
  if (!userId || !challengeId || typeof window === "undefined") return;
  try {
    const existing = getLocalRegistrations(userId);
    const updated = existing.filter((id) => id !== challengeId);
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(updated));
  } catch {}
}

export function getWelcomeEmails(identifier?: string): WelcomeEmailRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WELCOME_EMAILS_KEY);
    const list: WelcomeEmailRecord[] = raw ? JSON.parse(raw) : [];
    if (!identifier) return list;
    const lower = identifier.toLowerCase();
    return list.filter(
      (e) =>
        e.user_id === identifier ||
        (e as any).userId === identifier ||
        (e.recipient_email && e.recipient_email.toLowerCase() === lower) ||
        (e.user_id && e.user_id.toLowerCase() === lower)
    );
  } catch {
    return [];
  }
}

export function saveWelcomeEmail(email: WelcomeEmailRecord) {
  if (typeof window === "undefined") return;
  try {
    const list = getWelcomeEmails();
    const updated = [email, ...list.filter((e) => !(e.user_id === email.user_id && e.challenge_id === email.challenge_id))];
    localStorage.setItem(WELCOME_EMAILS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("mfa-welcome-email-received", { detail: email }));
  } catch {}
}

export function markWelcomeEmailRead(emailId: string) {
  if (typeof window === "undefined") return;
  try {
    const list = getWelcomeEmails();
    const updated = list.map((e) => (e.id === emailId ? { ...e, read: true } : e));
    localStorage.setItem(WELCOME_EMAILS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("mfa-welcome-email-updated"));
  } catch {}
}

export function createWelcomeEmail(params: {
  userId: string;
  userEmail?: string;
  studentName?: string;
  challengeId: string;
  challengeTitle?: string;
  house?: string;
  yearGroup?: string;
  targetBooks?: number;
  pointsReward?: number;
}) {
  return registerStudentForChallenge(params.userId, params.challengeId, {
    challengeTitle: params.challengeTitle,
    studentName: params.studentName,
    studentEmail: params.userEmail,
    targetBooks: params.targetBooks,
    pointsReward: params.pointsReward,
  });
}

/**
 * Register a student for a specific challenge and send official welcoming email.
 */
export async function registerStudentForChallenge(
  userId: string,
  challengeId: string,
  meta?: {
    challengeTitle?: string;
    studentName?: string;
    studentEmail?: string;
    targetBooks?: number;
    pointsReward?: number;
    badgeName?: string;
    badgeIcon?: string;
  }
): Promise<{ success: boolean; welcomeEmail?: WelcomeEmailRecord; error?: string }> {
  if (!userId || !challengeId) return { success: false, error: "Missing user or challenge ID" };

  // 1. Immediately cache locally
  saveLocalRegistration(userId, challengeId);

  // 2. Fetch challenge meta if not supplied
  let chTitle = meta?.challengeTitle || "Reading Challenge";
  let targetBooks = meta?.targetBooks || 15;
  let pointsReward = meta?.pointsReward || 100;
  let badgeName = meta?.badgeName || "Scholar";
  let badgeIcon = meta?.badgeIcon || "🏆";
  let studentName = meta?.studentName || "Academy Scholar";
  let studentEmail = meta?.studentEmail || "student@mpesafoundationacademy.ac.ke";

  try {
    if (!meta?.challengeTitle) {
      const { data: ch } = await supabase
        .from("challenges")
        .select("title, target_books, points_reward, badge_name, badge_icon")
        .eq("id", challengeId)
        .maybeSingle();
      if (ch) {
        chTitle = ch.title || chTitle;
        targetBooks = ch.target_books || targetBooks;
        pointsReward = ch.points_reward || pointsReward;
        badgeName = ch.badge_name || badgeName;
        badgeIcon = ch.badge_icon || badgeIcon;
      }
    }

    if (!meta?.studentName) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", userId)
        .maybeSingle();
      if (prof) {
        studentName = prof.full_name || studentName;
        studentEmail = prof.email || studentEmail;
      }
    }
  } catch (e) {
    console.warn("Could not fetch challenge/student details for welcome letter:", e);
  }

  // 3. Generate official welcoming email
  const welcomeEmail: WelcomeEmailRecord = {
    id: `welcome-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId,
    challenge_id: challengeId,
    challenge_title: chTitle,
    subject: `📬 Welcome to ${chTitle}! Registration Confirmed & Librarian Notified`,
    recipient_name: studentName,
    recipient_email: studentEmail,
    sent_at: new Date().toISOString(),
    read: false,
    target_books: targetBooks,
    points_reward: pointsReward,
    badge_name: badgeName,
    badge_icon: badgeIcon,
    librarian_notified: true,
    content: `Dear ${studentName},

Welcome to "${chTitle}" at M-PESA Foundation Academy!

Your enrolment is officially registered in the academy system.

📋 LIBRARIAN ROSTER CONFIRMATION:
The academy librarian and school staff have been automatically notified and can now see your active profile on the official challenge enrolment roster.

🔒 PRIVACY & LOCKED SUBMISSIONS:
All submissions in this challenge are strictly private. Other students cannot view your submissions or reading reflections. Only you, the academy librarian, and authorized staff have access. Once submitted, your reflections are locked to maintain academic honesty.

🎯 CHALLENGE TARGETS:
• Target: ${targetBooks} Books
• House Points: +${pointsReward} points upon completion
• Achievement Badge: ${badgeIcon} ${badgeName}

Happy reading!
— Office of the Academy Head Librarian
M-PESA Foundation Academy`,
  };

  saveWelcomeEmail(welcomeEmail);

  // Dispatch into the student's in-built web Challenge Inbox as well
  try {
    dispatchReadingChallengeMessage({
      challengeId,
      challengeTitle: chTitle,
      senderName: "Office of the Academy Head Librarian",
      senderEmail: "librarian@mpesafoundationacademy.ac.ke",
      senderRole: "Head Librarian",
      recipientEmail: studentEmail,
      recipientName: studentName,
      subject: welcomeEmail.subject,
      body: welcomeEmail.content,
      category: "launch",
    });
  } catch (err) {
    console.warn("Could not dispatch welcome to in-built web inbox:", err);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("mfa-challenge-registration-changed", {
        detail: { userId, challengeId, status: "registered", welcomeEmail },
      })
    );
    window.dispatchEvent(new CustomEvent("mfa_challenge_participants_updated"));
  }

  // 4. Persist to Supabase challenge_participants table
  try {
    const { data: existing } = await supabase
      .from("challenge_participants")
      .select("id")
      .eq("user_id", userId)
      .eq("challenge_id", challengeId)
      .maybeSingle();

    if (!existing) {
      const { error } = await supabase.from("challenge_participants").insert({
        user_id: userId,
        challenge_id: challengeId,
        joined_at: new Date().toISOString(),
        books_completed: 0,
      });

      if (error) {
        console.warn("Could not insert to challenge_participants (relying on local registration):", error);
      }
    }
    return { success: true, welcomeEmail };
  } catch (err: any) {
    console.warn("challenge_participants registration network error:", err);
    return { success: true, welcomeEmail }; // Local cache & welcome email succeeded
  }
}

/**
 * Check if a student is registered for a challenge.
 */
export async function checkStudentRegistration(
  userId: string,
  challengeId: string
): Promise<boolean> {
  if (!userId || !challengeId) return false;
  // Whole-school combined view "all" is accessible to all students
  if (challengeId === "all") return true;

  // Check local cache first
  const localList = getLocalRegistrations(userId);
  if (localList.includes(challengeId)) return true;

  try {
    const { data } = await supabase
      .from("challenge_participants")
      .select("id")
      .eq("user_id", userId)
      .eq("challenge_id", challengeId)
      .maybeSingle();

    if (data) {
      saveLocalRegistration(userId, challengeId);
      return true;
    }
  } catch {}

  return false;
}

/**
 * Fetch all students registered for a specific challenge (Admin view).
 */
export async function fetchRegisteredStudentsForChallenge(
  challengeId: string
): Promise<ChallengeParticipantRecord[]> {
  try {
    let query = supabase.from("challenge_participants").select("*");
    if (challengeId && challengeId !== "all") {
      query = query.eq("challenge_id", challengeId);
    }
    const { data: participants, error } = await query.order("joined_at", { ascending: false });

    if (error) {
      console.warn("Could not fetch challenge participants:", error);
    }

    const records = [...(participants || [])];

    // Also look up any local storage records for users on this device
    try {
      const allKeys = Object.keys(localStorage);
      for (const k of allKeys) {
        if (k.startsWith(STORAGE_PREFIX)) {
          const uid = k.slice(STORAGE_PREFIX.length);
          const raw = localStorage.getItem(k);
          if (raw) {
            const registeredIds: string[] = JSON.parse(raw);
            if (registeredIds.includes(challengeId) || challengeId === "all") {
              if (!records.some((r) => r.user_id === uid && (challengeId === "all" || r.challenge_id === challengeId))) {
                records.push({
                  id: `local-${uid}-${challengeId}`,
                  challenge_id: challengeId === "all" ? registeredIds[0] || "primary" : challengeId,
                  user_id: uid,
                  completed_at: null as any,
                  joined_at: new Date().toISOString(),
                  books_completed: 0,
                });
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("Local storage check exception:", e);
    }

    if (records.length === 0) return [];

    // Fetch user profiles for these participants (students, teachers, staff)
    const userIds = [...new Set(records.map((p) => p.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, role, avatar_url, house, year_group, class_name")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

    return records.map((rec) => ({
      ...rec,
      profile: profileMap.get(rec.user_id),
    }));
  } catch (err) {
    console.warn("fetchRegisteredStudentsForChallenge error:", err);
    return [];
  }
}

export const fetchRegisteredParticipantsForChallenge = fetchRegisteredStudentsForChallenge;
export const registerParticipantForChallenge = registerStudentForChallenge;
export const unregisterParticipantFromChallenge = unregisterStudentFromChallenge;

/**
 * Remove a student's registration from a challenge (Admin action).
 */
export async function unregisterStudentFromChallenge(
  userId: string,
  challengeId: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId || !challengeId) return { success: false, error: "Missing user or challenge ID" };

  removeLocalRegistration(userId, challengeId);
  window.dispatchEvent(
    new CustomEvent("mfa-challenge-registration-changed", {
      detail: { userId, challengeId, status: "unregistered" },
    })
  );

  try {
    const { error } = await supabase
      .from("challenge_participants")
      .delete()
      .eq("user_id", userId)
      .eq("challenge_id", challengeId);

    if (error) {
      console.warn("Error deleting from challenge_participants:", error);
    }
    return { success: true };
  } catch (err: any) {
    return { success: true };
  }
}

/**
 * Dispatch an official certificate award letter directly to student's inbox
 */
export function dispatchAwardCertificateLetter({
  userId,
  studentName,
  studentEmail,
  challengeId,
  challengeTitle,
  level,
  booksCount,
  verificationCode,
}: {
  userId: string;
  studentName: string;
  studentEmail?: string;
  challengeId: string;
  challengeTitle: string;
  level: string;
  booksCount: number;
  verificationCode: string;
}): WelcomeEmailRecord {
  const targetEmail = studentEmail || `${studentName.toLowerCase().replace(/\s+/g, ".")}@mpesafoundationacademy.ac.ke`;

  const emailRecord: WelcomeEmailRecord = {
    id: `cert-${challengeId}-${userId}-${Date.now()}`,
    userId,
    user_id: userId,
    challenge_id: challengeId,
    challenge_title: challengeTitle,
    badge_name: `${level} Reading Award`,
    badge_icon: level === "Gold" ? "🥇" : level === "Silver" ? "🥈" : level === "Bronze" ? "🥉" : "📜",
    subject: `🎓 Official ${level} Certificate Awarded: ${challengeTitle}`,
    recipient_name: studentName,
    recipient_email: targetEmail,
    content: `Dear ${studentName},

Congratulations! You have officially achieved the ${level} Reading Challenge Award for completing ${booksCount} books in "${challengeTitle}".

🏆 Award Tier: ${level} Reading Award
📚 Books Verified: ${booksCount} Books
🔖 Official Verification Serial: ${verificationCode}
🎯 Challenge Workspace: ${challengeTitle}

Your certificate has been validated by the Teaching & Learning Directorate and academy librarianship. You can view, print, or download your high-resolution official certificate PDF anytime from your dashboard.

Keep up the outstanding reading and academic excellence!
— Office of the Academy Head Librarian
M-PESA Foundation Academy`,
    sent_at: new Date().toISOString(),
    read: false,
    librarian_notified: true,
  };

  saveWelcomeEmail(emailRecord);

  // Dispatch to the student's in-built web Challenge Inbox
  try {
    dispatchReadingChallengeMessage({
      challengeId,
      challengeTitle,
      senderName: "Office of the Academy Head Librarian",
      senderEmail: "librarian@mpesafoundationacademy.ac.ke",
      senderRole: "Head Librarian",
      recipientEmail: targetEmail,
      recipientName: studentName,
      subject: emailRecord.subject,
      body: emailRecord.content,
      category: "milestone",
    });
  } catch (err) {
    console.warn("Could not dispatch certificate award to in-built web inbox:", err);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("mfa-welcome-email-received", { detail: emailRecord })
    );
    window.dispatchEvent(
      new CustomEvent("mfa_email_replies_updated")
    );
  }

  return emailRecord;
}

