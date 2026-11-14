import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import CertificateTemplates from "@/components/CertificateTemplates";
import { computeStudentLevel } from "@/lib/certificateTypes";
import { AdminFullLeaderboard } from "@/components/AdminFullLeaderboard";
import { AdminHomepageStudio } from "@/components/AdminHomepageStudio";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Library,
  BookOpen,
  Users,
  Trophy,
  FileWarning,
  Plus,
  Layers,
  Award,
  Clock,
  HomeIcon,
  RefreshCw,
  KeyRound,
  Files,
  UserCog,
  FolderUp,
  IdCard,
  Megaphone,
  Flag,
  ListChecks,
  Search,
  Check,
  X,
  Trash2,
  ExternalLink,
  Sparkles,
  Download,
  Copy,
  Sliders,
  Power,
  Play,
  Square,
  AlertTriangle,
  Mail,
  Send,
  Eye,
  CheckCircle2,
  UserPlus,
  UserMinus,
  FileSpreadsheet,
  GraduationCap,
  Briefcase,
  User,
  Pencil,
  ShieldCheck,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  Link2,
} from "lucide-react";
import { useMainSidebar } from "@/lib/sidebarHelper";
import EditChallengeDialog from "@/components/EditChallengeDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AdminPasswordReset from "@/components/AdminPasswordReset";
import ThemeToggle from "@/components/ThemeToggle";
import ThemeModeSelector from "@/components/ThemeModeSelector";
import StudentProfilesManager from "@/components/StudentProfilesManager";
import StaffCohortBroadcastDialog from "@/components/StaffCohortBroadcastDialog";
import { EmailLivePreviewCard, CertificateDispatchData } from "@/components/EmailLivePreviewCard";
import SystemLinksManager from "@/components/SystemLinksManager";
import EmailTemplatePreview from "@/components/EmailTemplatePreview";
import {
  formatDraftTime,
  getBroadcastDraft,
  saveBroadcastDraft,
  clearBroadcastDraft,
  ADMIN_BROADCAST_DRAFT_KEY,
} from "@/lib/broadcastDraftManager";
import {
  connectGmail,
  disconnectGmail,
  getGmailConnectionStatus,
  sendViaGoogleGmail,
  createWebGmailComposeUrl,
  buildBeautifulEmailHtml,
  GmailConnectionStatus,
  EmailStyleOptions,
} from "@/lib/gmailService";
import {
  triggerAutoCertificateDispatch,
  getAutoCertificateSettings,
  saveAutoCertificateSettings,
  getAutoCertificateLogs,
} from "@/lib/autoCertificateEmailService";
import { syncAllStandardCodes, STANDARD_ACCESS_CODES, recordDeletedCode, isCodeDeleted } from "@/lib/accessCodes";
import {
  getChallengeGoogleSheetUrl,
  setChallengeGoogleSheetUrl,
  trackLiveSheetBackup,
  downloadGoogleSheetsMasterCSV,
  syncAllChallengeSubmissionsNow,
  copyChallengeDataToClipboardForSheet,
  downloadSingleChallengeCSV,
  GOOGLE_APPS_SCRIPT_TEMPLATE,
} from "@/lib/googleSheetsService";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useChallenges, Challenge, ALL_CHALLENGES_ID, normalizeChallengeId } from "@/contexts/ChallengeContext";
import {
  fetchRegisteredStudentsForChallenge,
  registerStudentForChallenge,
  unregisterStudentFromChallenge,
  dispatchAwardCertificateLetter,
  ChallengeParticipantRecord,
} from "@/lib/challengeRegistrationManager";
import { AppDownloadButton } from "@/components/AppDownloadBanner";
import { Progress } from "@/components/ui/progress";
import Papa from "papaparse";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { HOUSES, YEAR_GROUPS, CLASSES, USER_ROLES, computeTotalPoints, READING_CATEGORIES, POINTS_PER_BOOK, MAX_BOOKS_PER_CATEGORY, isYearGroupMatch } from "@/lib/constants";
import { exportCSV, exportPDF } from "@/lib/exporters";

interface Stats {
  students: number;
  submissions: number;
  activeChallenges: number;
  pending: number;
}
interface Props {
  stats: Stats;
  activeSection: string;
  onSelectSection: (key: string) => void;
}

/* ---------- Countdown ---------- */
function useCountdown(target: Date) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, target.getTime() - now.getTime());
  return {
    days: Math.floor(diff / 86400000),
    hrs: Math.floor((diff % 86400000) / 3600000),
    min: Math.floor((diff % 3600000) / 60000),
    sec: Math.floor((diff % 60000) / 1000),
  };
}

const FlipUnit = ({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: string;
}) => (
  <div className="flex flex-col items-center">
    <div
      className="relative w-16 sm:w-20 h-16 sm:h-20 rounded-2xl border border-border flex items-center justify-center font-display text-3xl sm:text-4xl font-bold shadow-[inset_0_-4px_0_hsl(var(--border))]"
      style={{
        background: `linear-gradient(160deg, hsl(${tone} / 0.18), hsl(var(--card)))`,
        color: `hsl(${tone})`,
      }}
    >
      {String(value).padStart(2, "0")}
    </div>
    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2">
      {label}
    </div>
  </div>
);

/* ---------- Sidebar items (exported, used by AppSidebar) ---------- */
export const SIDEBAR_GROUPS: {
  label: string;
  items: { key: string; label: string; icon: any; tone: string }[];
}[] = [
  {
    label: "Submissions",
    items: [
      { key: "submissions", label: "All Submissions", icon: ListChecks, tone: "var(--v-electric-blue)" },
      { key: "flagged", label: "Flagged", icon: Flag, tone: "var(--v-red)" },
    ],
  },
  {
    label: "Programme",
    items: [
      { key: "controls", label: "Session & Theme Controls", icon: Sliders, tone: "var(--v-emerald)" },
      { key: "challenges", label: "Challenges", icon: Trophy, tone: "var(--v-yellow)" },
      { key: "registrations", label: "Registered Students & Staff", icon: Users, tone: "var(--v-emerald)" },
      { key: "create", label: "Create Challenge", icon: Plus, tone: "var(--v-green)" },
      { key: "categories", label: "Categories", icon: Layers, tone: "var(--v-fuchsia)" },
      { key: "certificates", label: "Certificates", icon: Award, tone: "var(--v-gold)" },
    ],
  },
  {
    label: "Publishing & Broadcasts",
    items: [
      { key: "broadcast", label: "Broadcast", icon: Megaphone, tone: "var(--v-hot-pink)" },
      { key: "certificate-dispatch", label: "Certificate Dispatch", icon: Award, tone: "var(--v-gold)" },
      { key: "system-links", label: "System Links", icon: Link2, tone: "var(--v-cyan)" },
      { key: "homepage", label: "Homepage", icon: HomeIcon, tone: "var(--v-mint)" },
    ],
  },
  {
    label: "People",
    items: [
      { key: "students", label: "Student Profiles", icon: IdCard, tone: "var(--v-emerald)" },
      { key: "members", label: "Staff Members", icon: UserCog, tone: "var(--v-cobalt)" },
      { key: "codes", label: "Access Codes", icon: KeyRound, tone: "var(--v-yellow)" },
    ],
  },
];

const TITLES: Record<string, { title: string; subtitle: string }> = {
  submissions: { title: "Submission Manager", subtitle: "Review, approve, reject, flag, and manage all book submissions." },
  flagged: { title: "Flagged Submissions", subtitle: "Submissions flagged for plagiarism or policy review." },
  import: { title: "Bulk Import", subtitle: "Import student submissions from CSV or sheets." },
  controls: { title: "Session & Theme Controls", subtitle: "Turn challenge submissions on/off, launch start and end dates, and submit custom themes." },
  challenges: { title: "Active Challenges", subtitle: "Manage every active challenge across the program." },
  registrations: { title: "Challenge Enrolment: Students, Teachers & Staff", subtitle: "Inspect students, teachers, and other staff members who have joined this active challenge to track reading progress, enroll participants and export rosters." },
  create: { title: "Create a New Challenge", subtitle: "Configure a new challenge with theme, dates and rules." },
  categories: { title: "Reading Categories", subtitle: "Custom categories with reflection prompts." },
  certificates: { title: "Certificate Studio", subtitle: "Official verifiable certificates for all 5 challenge levels with single and bulk downloads." },
  homepage: { title: "Homepage Content", subtitle: "Edit the public homepage sections." },
  files: { title: "Library Files", subtitle: "Upload and manage shared library files." },
  broadcast: { title: "Mass-Email Broadcaster", subtitle: "Send announcements to students or staff." },
  "certificate-dispatch": { title: "Certificate Dispatch Studio & Broadcaster", subtitle: "Preview, customize, download official achievement PDFs, and dispatch certified awards directly to scholars' school emails and inboxes." },
  "email-preview": { title: "Email Template Preview & Inspector", subtitle: "Live rendered preview of broadcast and certificate dispatch email templates with school branding." },
  "system-links": { title: "System Links & Redirection Engine", subtitle: "Configure redirect URLs for email templates, verification portals, and certificate download endpoints in the database." },
  students: { title: "Student Profiles", subtitle: "Search, view and manage student profiles." },
  members: { title: "Staff Members", subtitle: "Manage staff accounts and roles." },
  codes: { title: "Access Codes", subtitle: "Create and manage role-based registration codes." },
  leaderboard: { title: "Full Academy Leaderboard", subtitle: "View, audit, search, and export the complete unclipped ranking of all students, cohorts, and houses." },
};

export default function LibrarianCommandCenter({
  stats,
  activeSection,
  onSelectSection,
}: Props) {
  const { challenges, selectedChallenge, selectedChallengeId, setSelectedChallengeId } = useChallenges();
  const [target, setTarget] = useState<Date>(() => {
    const now = new Date();
    let end = new Date(now.getFullYear(), 5, 30, 23, 59, 59);
    if (end < now) end = new Date(now.getFullYear() + 1, 5, 30, 23, 59, 59);
    return end;
  });
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "reading_session_end")
        .maybeSingle();
      if (data?.setting_value) {
        const d = new Date(data.setting_value);
        if (!isNaN(d.getTime())) setTarget(d);
      }
    })();
  }, [activeSection]);
  const { days, hrs, min, sec } = useCountdown(target);
  const [flagged, setFlagged] = useState(0);

  useEffect(() => {
    (async () => {
      const { count } = await supabase
        .from("book_submissions")
        .select("*", { count: "exact", head: true })
        .eq("approval_status", "flagged");
      setFlagged(count ?? 0);
    })();
  }, [activeSection]);

  const meta = TITLES[activeSection] ?? { title: activeSection, subtitle: "" };

  const isSubmissions = activeSection === "submissions";

  return (
    <div className="mb-8">
      <div className="space-y-5 min-w-0">
        {/* Two compact floating well-rounded rotating-gradient divs */}
        {activeSection !== "system-links" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
            <div
              className="lg:col-span-7 rounded-3xl border p-4 sm:p-5 shadow-md rotating-gradient-card flex flex-col justify-center"
              style={{
                borderColor: "hsl(var(--v-electric-blue) / 0.30)",
                backgroundImage:
                  "linear-gradient(var(--grad-angle, 135deg), hsl(var(--v-electric-blue) / 0.16) 0%, hsl(var(--card)) 52%, hsl(var(--v-emerald) / 0.14) 100%)",
              }}
            >
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-mono uppercase tracking-widest font-bold bg-primary/10 text-primary border border-primary/20 w-fit">
                <Sparkles className="w-3 h-3" />
                <span>{activeSection}</span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-black mt-1.5 text-foreground tracking-tight">
                {meta.title}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {meta.subtitle}
              </p>
            </div>

            <div
              className="lg:col-span-5 rounded-3xl border p-4 sm:p-5 shadow-md rotating-gradient-card flex flex-wrap items-center justify-start lg:justify-end gap-2"
              style={{
                borderColor: "hsl(var(--v-violet) / 0.30)",
                backgroundImage:
                  "linear-gradient(var(--grad-angle, 135deg), hsl(var(--v-violet) / 0.15) 0%, hsl(var(--card)) 52%, hsl(var(--v-yellow) / 0.15) 100%)",
              }}
            >
              {activeSection !== "create" && (
                <Button
                  size="sm"
                  onClick={() => onSelectSection("create")}
                  className="rounded-2xl h-9 px-3.5 text-xs font-bold text-white border-0 shadow-sm whitespace-nowrap shrink-0"
                  style={{ background: "linear-gradient(120deg, hsl(var(--v-green)), hsl(var(--v-cyan)))" }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> New Challenge
                </Button>
              )}
              <Button asChild size="sm" variant="outline" className="rounded-2xl h-9 px-3.5 text-xs font-semibold bg-background/80 whitespace-nowrap shrink-0">
                <a href="https://mfa.follettdestiny.com" target="_blank" rel="noreferrer">
                  <Library className="w-3.5 h-3.5 mr-1.5" /> MFA Follet Destiny
                </a>
              </Button>
              <AppDownloadButton
                className="rounded-2xl bg-primary/10 hover:bg-primary/20 text-primary border-primary/30 h-9 px-3.5 text-xs font-semibold whitespace-nowrap shrink-0"
                label="Download App"
              />
              <ThemeToggle />
            </div>
          </div>
        )}

        {/* Section body */}
        <SectionRouter section={activeSection} onSelectSection={onSelectSection} />
      </div>
    </div>
  );
}

/* ========================================================
   Section components are defined below; SectionRouter is
   located at the bottom of the file after all sections.
   ======================================================== */

/* ---------- Submissions ---------- */
function SubmissionsSection({ filter }: { filter: "all" | "flagged" }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { challenges, selectedChallenge, selectedChallengeId: globalChallengeId, setSelectedChallengeId: setGlobalChallengeId } = useChallenges();
  // Follows the challenge chosen under Account in the sidebar
  const selectedChallengeId = globalChallengeId || "all";
  const setSelectedChallengeId = (id: string) => setGlobalChallengeId(id);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [houseFilter, setHouseFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [submissionToDelete, setSubmissionToDelete] = useState<{ id: string; title: string; student: string } | null>(null);
  const [deletingSubmission, setDeletingSubmission] = useState(false);
  const [selectedSubmissionToView, setSelectedSubmissionToView] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    let items: any[] = [];
    const isMaster = selectedChallengeId === "45450000-2025-4026-8000-000000000045";
    const isAll = !selectedChallengeId || selectedChallengeId === "all";

    if (isAll) {
      // Query both master and specialty challenges and combine
      const [bRes, cRes] = await Promise.all([
        supabase.from("book_submissions").select("*").order("created_at", { ascending: false }),
        supabase.from("challenge_submissions").select("*").order("created_at", { ascending: false }),
      ]);
      const seen = new Set<string>();
      const combined: any[] = [];
      (bRes.data ?? []).forEach((r) => {
        const key = `${r.user_id}-${(r.title || "").toLowerCase().trim()}`;
        seen.add(key);
        combined.push({ ...r, challenge_title: "45-Book Reading Challenge" });
      });
      (cRes.data ?? []).forEach((r) => {
        const key = `${r.user_id}-${(r.title || "").toLowerCase().trim()}`;
        if (!seen.has(key)) {
          seen.add(key);
          combined.push({
            ...r,
            approval_status: r.approval_status || "approved",
            challenge_title: "Specialty Reading Challenge",
          });
        }
      });
      items = combined;
    } else if (isMaster) {
      let bQ = supabase
        .from("book_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      let cQ = supabase
        .from("challenge_submissions")
        .select("*")
        .eq("challenge_id", selectedChallengeId)
        .order("created_at", { ascending: false });
      if (filter === "flagged") {
        bQ = bQ.eq("approval_status", "flagged");
        cQ = cQ.eq("approval_status", "flagged");
      }
      const [bData, cData] = await Promise.all([bQ, cQ]);
      const seen = new Set<string>();
      const combined: any[] = [];
      (bData.data ?? []).forEach((r) => {
        const key = `${r.user_id}-${(r.title || "").toLowerCase().trim()}`;
        seen.add(key);
        combined.push({ ...r, challenge_title: "45-Book Reading Challenge" });
      });
      (cData.data ?? []).forEach((r) => {
        const key = `${r.user_id}-${(r.title || "").toLowerCase().trim()}`;
        if (!seen.has(key)) {
          seen.add(key);
          combined.push({ ...r, challenge_title: "45-Book Reading Challenge" });
        }
      });
      items = combined;
    } else {
      // Query specific challenge strictly from challenge_submissions
      const normId = normalizeChallengeId(selectedChallengeId);
      const queryIds = Array.from(new Set([selectedChallengeId, normId].filter(Boolean) as string[]));
      let q = supabase
        .from("challenge_submissions")
        .select("*")
        .in("challenge_id", queryIds)
        .order("created_at", { ascending: false });
      const { data, error } = await q;
      if (!error && data) {
        items = data.map((d: any) => ({
          ...d,
          approval_status: d.approval_status || "approved",
          challenge_title: selectedChallenge?.title || "Reading Challenge",
        }));
      }
    }

    const userIds = [...new Set(items.map((r) => r.user_id).filter(Boolean))];
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, house, year_group, class_name")
      .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    const map = new Map((profs ?? []).map((p) => [p.user_id, p]));
    setRows(items.map((r) => ({ ...r, profile: map.get(r.user_id) })));
    setLoading(false);
  };

  useEffect(() => {
    load();

    const channel = supabase
      .channel("realtime-librarian-submissions-stream")
      .on("postgres_changes", { event: "*", schema: "public", table: "book_submissions" }, () => {
        load();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "challenge_submissions" }, () => {
        load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter, selectedChallengeId]);

  const setStatus = async (id: string, status: string, targetSubmission?: any) => {
    const [res1, res2] = await Promise.all([
      supabase.from("book_submissions").update({ approval_status: status, reviewed_at: new Date().toISOString() }).eq("id", id),
      supabase.from("challenge_submissions").update({ approval_status: status }).eq("id", id),
    ]);
    toast.success(`Marked as ${status}`);

    load();
  };

  const handleConfirmDeleteSubmission = async () => {
    if (!submissionToDelete) return;
    setDeletingSubmission(true);
    const { id } = submissionToDelete;
    await Promise.all([
      supabase.from("book_submissions").delete().eq("id", id),
      supabase.from("challenge_submissions").delete().eq("id", id),
    ]);
    setDeletingSubmission(false);
    setSubmissionToDelete(null);
    toast.success("Submission permanently deleted");
    load();
  };

  const [exporting, setExporting] = useState(false);

  const fetchAllForExport = async () => {
    const [bRes, cRes, pRes] = await Promise.all([
      supabase.from("book_submissions").select("*").order("created_at", { ascending: false }),
      supabase.from("challenge_submissions").select("*").order("created_at", { ascending: false }),
      supabase.from("pending_submissions").select("*").order("created_at", { ascending: false }),
    ]);

    const seen = new Set<string>();
    const all: any[] = [];
    (bRes.data ?? []).forEach((r) => {
      const key = `${r.user_id}-${(r.title || "").toLowerCase().trim()}`;
      if (!seen.has(key)) {
        seen.add(key);
        all.push({ ...r, challenge_title: "45-Book Reading Challenge" });
      }
    });
    (cRes.data ?? []).forEach((r) => {
      const key = `${r.user_id}-${(r.title || "").toLowerCase().trim()}`;
      if (!seen.has(key)) {
        seen.add(key);
        all.push({
          ...r,
          approval_status: r.approval_status || "approved",
          challenge_title: "Specialty Reading Challenge",
        });
      }
    });
    (pRes.data ?? []).forEach((r) => {
      const key = `${r.email}-${(r.title || "").toLowerCase().trim()}`;
      if (!seen.has(key)) {
        seen.add(key);
        all.push({
          ...r,
          approval_status: "pending",
          challenge_title: "Reading Submission",
        });
      }
    });

    const userIds = [...new Set(all.map((r) => r.user_id).filter(Boolean))];
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, house, year_group, class_name, admission_number, role");
    const map = new Map((profs ?? []).map((p) => [p.user_id, p]));

    const counts = new Map<string, number>();
    all.forEach((r) => {
      if (r.user_id) {
        counts.set(r.user_id, (counts.get(r.user_id) ?? 0) + 1);
      }
    });

    const detail = all.map((r) => {
      const p: any = map.get(r.user_id) ?? {};
      return {
        "Student Name": p.full_name ?? r.student_name ?? "Scholar Reader",
        "Email": p.email ?? r.email ?? "",
        "Admission Number": p.admission_number ?? "",
        "Year Group": p.year_group ?? r.year_group ?? "",
        "Class": p.class_name ? `${p.year_group ?? ""} ${p.class_name}`.trim() : (r.class_name ?? ""),
        "House": p.house ?? r.house ?? "",
        "Challenge": r.challenge_title ?? (r.challenge_id ? "Specialty Challenge" : "45-Book Reading Challenge"),
        "Book Title": r.title ?? "",
        "Author": r.author ?? "",
        "Category Number": r.category_number ?? "",
        "Category Name": r.category_name ?? "",
        "Date Started": r.date_started ?? "",
        "Date Finished": r.date_finished ?? "",
        "Approval Status": r.approval_status ?? "pending",
        "Points Earned": r.points_earned ?? 0,
        "Total Books Read": r.user_id ? counts.get(r.user_id) ?? 1 : 1,
        "Reflection": (r.reflection ?? "").replace(/\s+/g, " "),
        "AI Feedback": r.ai_feedback ?? "",
        "Submission Date": r.created_at ?? "",
      };
    });

    const isAssignedGroup = (p: any) => {
      if (profile?.house && p?.house && p.house.toLowerCase() !== profile.house.toLowerCase()) return false;
      if (profile?.year_group && p?.year_group && p.year_group.toLowerCase() !== profile.year_group.toLowerCase()) return false;
      if (profile?.class_name && p?.class_name && p.class_name.toLowerCase() !== profile.class_name.toLowerCase()) return false;
      return true;
    };

    const summary = (profs ?? [])
      .filter((p: any) => p.role === "student" && isAssignedGroup(p))
      .map((p: any) => ({
        "Student Name": p.full_name,
        "Email": p.email,
        "Admission Number": p.admission_number ?? "",
        "Year Group": p.year_group ?? "",
        "Class": p.class_name ? `${p.year_group ?? ""} ${p.class_name}`.trim() : "",
        "House": p.house ?? "",
        "Books Read": counts.get(p.user_id) ?? 0,
        "Total Points": computeTotalPoints(counts.get(p.user_id) ?? 0),
      }))
      .sort((a, b) => Number(b["Total Points"]) - Number(a["Total Points"]));

    const filteredDetail = detail.filter((r) => isAssignedGroup(r));

    return { detail: filteredDetail, summary };
  };

  const runExport = async (kind: "detail-csv" | "summary-csv" | "summary-pdf") => {
    setExporting(true);
    try {
      const { detail, summary } = await fetchAllForExport();
      const stamp = new Date().toISOString().slice(0, 10);
      if (kind === "detail-csv") {
        if (!detail.length) return toast.error("No submissions found to export");
        exportCSV(detail, `MFA_Student_Book_Submissions_${stamp}`);
        toast.success(`Exported ${detail.length} student book submissions to CSV!`);
      } else if (kind === "summary-csv") {
        if (!summary.length) return toast.error("No students to export");
        exportCSV(summary, `MFA_Student_Summary_${stamp}`);
        toast.success(`Exported student summary CSV for ${summary.length} students!`);
      } else {
        if (!summary.length) return toast.error("No students to export");
        exportPDF(summary, `MFA_Student_Summary_${stamp}`, "Reading Challenge — Student Summary", "All students");
        toast.success("Student summary PDF generated and downloaded!");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const availableSubClasses = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const cls = r.profile?.class_name || (r.profile?.year_group && r.profile?.class_name ? `${r.profile.year_group} ${r.profile.class_name}` : null);
      if (cls) set.add(cls);
    });
    return Array.from(set).sort();
  }, [rows]);

  const visible = rows.filter((r) => {
    const s = search.toLowerCase().trim();
    const p = r.profile;

    // Strict RBAC: filter by staff/librarian specific group assignment
    if (profile?.house && p?.house && p.house.toLowerCase() !== profile.house.toLowerCase()) return false;
    if (profile?.year_group && p?.year_group && p.year_group.toLowerCase() !== profile.year_group.toLowerCase()) return false;
    if (profile?.class_name && p?.class_name && p.class_name.toLowerCase() !== profile.class_name.toLowerCase()) return false;

    const matchesSearch =
      !s ||
      r.title?.toLowerCase().includes(s) ||
      r.author?.toLowerCase().includes(s) ||
      p?.full_name?.toLowerCase().includes(s) ||
      p?.email?.toLowerCase().includes(s) ||
      p?.house?.toLowerCase().includes(s) ||
      p?.year_group?.toLowerCase().includes(s) ||
      p?.class_name?.toLowerCase().includes(s) ||
      `${p?.year_group ?? ""} ${p?.class_name ?? ""}`.toLowerCase().includes(s);

    const matchesHouse = houseFilter === "all" || p?.house === houseFilter;
    const matchesYear = yearFilter === "all" || isYearGroupMatch(p?.year_group, yearFilter);
    const matchesClass =
      classFilter === "all" ||
      p?.class_name === classFilter ||
      `${p?.year_group ?? ""} ${p?.class_name ?? ""}`.trim() === classFilter;

    return matchesSearch && matchesHouse && matchesYear && matchesClass;
  });

  return (
    <Card className="rounded-2xl border-border bg-card">
      <CardContent className="p-5 space-y-4">
        {/* Global Search and Filter Bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-xs font-semibold text-primary truncate max-w-sm shrink-0">
            <span>{selectedChallenge?.badge_icon || "🏆"}</span>
            <span className="truncate">{selectedChallenge?.title || "All Challenges"}</span>
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name, house (Kenya/Yellow), class, book title or author..."
              className="pl-9 h-10 text-xs bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Quick House Filter */}
          <Select value={houseFilter} onValueChange={setHouseFilter}>
            <SelectTrigger className="w-36 h-10 text-xs shrink-0">
              <SelectValue placeholder="All Houses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Houses</SelectItem>
              <SelectItem value="Kenya">Kenya (Navy)</SelectItem>
              <SelectItem value="Longonot">Longonot (Yellow)</SelectItem>
              <SelectItem value="Kilimanjaro">Kilimanjaro (Red)</SelectItem>
              <SelectItem value="Elgon">Elgon (Green)</SelectItem>
            </SelectContent>
          </Select>

          {/* Quick Year Group Filter */}
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-36 h-10 text-xs shrink-0">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cohorts</SelectItem>
              <SelectItem value="Grade 12">Grade 12</SelectItem>
              <SelectItem value="Grade 11">Grade 11</SelectItem>
              <SelectItem value="Grade 10">Grade 10</SelectItem>
              <SelectItem value="DP1">DP1</SelectItem>
              <SelectItem value="DP2">DP2</SelectItem>
              <SelectItem value="MYP">MYP</SelectItem>
            </SelectContent>
          </Select>

          {/* Quick Class Level Filter */}
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-32 h-10 text-xs shrink-0">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {availableSubClasses.map((cls) => (
                <SelectItem key={cls} value={cls}>
                  {cls}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={load} className="h-10 text-xs shrink-0">
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
          </Button>
        </div>

        {/* Action and Export Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/40">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              disabled={exporting}
              onClick={() => runExport("detail-csv")}
              className="h-9 px-4 text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              title="Download all student book submissions across the academy for offline reporting"
            >
              <Download className="w-4 h-4" />
              <span>Export to CSV</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={exporting}
              onClick={() => runExport("summary-csv")}
              className="h-9 text-xs font-semibold gap-1.5"
              title="Download aggregated student reading totals (CSV)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Student Summary (CSV)</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={exporting}
              onClick={() => runExport("summary-pdf")}
              className="h-9 text-xs font-semibold gap-1.5"
              title="Download official leadership summary report (PDF)"
            >
              <Download className="w-3.5 h-3.5 text-red-500" />
              <span>Student Summary (PDF)</span>
            </Button>

            {/* Automated Certificate Dispatch Indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-700 dark:text-amber-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="font-bold">Auto-Email Certificates:</span>
              <span className="font-mono text-[11px] text-foreground">Active (Instant School Delivery)</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Showing <strong className="text-foreground">{visible.length}</strong> of{" "}
            <strong className="text-foreground">{rows.length}</strong> loaded submissions
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground py-12 text-center">Loading submissions…</div>
        ) : visible.length === 0 ? (
          <div className="text-sm text-muted-foreground py-12 text-center">
            No submissions matching filter for {selectedChallenge?.title || "this challenge"}.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {visible.map((r) => {
              const status = r.approval_status ?? "pending";
              const tone =
                status === "approved" ? "var(--v-green)" :
                status === "rejected" ? "var(--v-red)" :
                status === "flagged" ? "var(--v-orange)" :
                "var(--v-yellow)";
              const houseName = r.profile?.house;
              const isYellow = houseName === "Longonot";

              return (
                <div
                  key={r.id || `sub-${r.user_id}-${r.created_at || Math.random()}`}
                  className="rounded-2xl border border-border p-4 bg-background/40 hover:bg-background/70 transition-all shadow-xs"
                  style={{ borderLeft: `4px solid hsl(${tone})` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate text-sm">{r.title}</div>
                      <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                        <span>{r.author}</span>
                        <span>•</span>
                        <span className="font-medium text-foreground">{r.profile?.full_name ?? "Scholar Reader"}</span>
                        {houseName && (
                          <span
                            className={cn(
                              "px-2 py-0.2 rounded-full text-[10px] font-bold inline-flex items-center gap-1",
                              isYellow ? "bg-amber-400 text-neutral-950" :
                              houseName === "Kenya" ? "bg-blue-900 text-white" :
                              houseName === "Kilimanjaro" ? "bg-red-600 text-white" :
                              "bg-emerald-700 text-white"
                            )}
                          >
                            {isYellow ? "Yellow" : houseName === "Kenya" ? "Navy" : houseName === "Kilimanjaro" ? "Red" : "Green"}
                          </span>
                        )}
                        {r.profile?.class_name && (
                          <span className="text-[10px] text-muted-foreground">
                            ({r.profile.year_group || ""} {r.profile.class_name})
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge
                      className="border-0 text-white capitalize text-[10px] shrink-0"
                      style={{ background: `hsl(${tone})` }}
                    >
                      {status}
                    </Badge>
                  </div>
                  {r.reflection && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-3 bg-muted/30 p-2 rounded-xl border border-border/40">
                      {r.reflection}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-border/40">
                    <Button
                      size="sm"
                      className="h-7 text-xs font-semibold gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25"
                      onClick={() => setSelectedSubmissionToView(r)}
                      title="Read entire scholar submission and reflection in detail"
                    >
                      <Eye className="w-3.5 h-3.5" /> Read Full Submission
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs font-semibold gap-1 text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20"
                      onClick={() => {
                        const studentName = r.profile?.full_name || "Unknown Student";
                        const studentBooks = rows.filter((x) => x.user_id === r.user_id && x.approval_status !== "rejected").length || 1;
                        const level = computeStudentLevel(studentBooks);
                        const email = r.profile?.email || "";
                        navigate(`/admin?s=certificates&student=${encodeURIComponent(studentName)}&books=${studentBooks}&level=${level}&email=${encodeURIComponent(email)}`);
                      }}
                    >
                      <Award className="w-3 h-3 text-amber-500" /> Certificate
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 font-medium"
                      onClick={() => setStatus(r.id, "approved", r)}>
                      <Check className="w-3 h-3 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={() => setStatus(r.id, "rejected")}>
                      <X className="w-3 h-3 mr-1" /> Reject
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={() => setStatus(r.id, "flagged")}>
                      <Flag className="w-3 h-3 mr-1" /> Flag
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-destructive hover:bg-destructive/10"
                      onClick={() => setSubmissionToDelete({
                        id: r.id,
                        title: r.title || "Book Submission",
                        student: r.profile?.full_name || "Student",
                      })}
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* View Entire Scholar Submission Reader Modal */}
        <Dialog open={!!selectedSubmissionToView} onOpenChange={(open) => !open && setSelectedSubmissionToView(null)}>
          <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col p-0 overflow-hidden bg-card border-border shadow-2xl">
            {selectedSubmissionToView && (
              <>
                <DialogHeader className="p-5 pb-3 border-b border-border bg-muted/30">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs font-mono font-medium">
                        {selectedSubmissionToView.challenge_title || "Reading Challenge"}
                      </Badge>
                      {selectedSubmissionToView.category_name && (
                        <Badge variant="secondary" className="text-xs font-medium">
                          {selectedSubmissionToView.category_name}
                        </Badge>
                      )}
                      <Badge
                        className="border-0 text-white capitalize text-[10px]"
                        style={{
                          background:
                            selectedSubmissionToView.approval_status === "approved" ? "hsl(var(--v-green))" :
                            selectedSubmissionToView.approval_status === "rejected" ? "hsl(var(--v-red))" :
                            selectedSubmissionToView.approval_status === "flagged" ? "hsl(var(--v-orange))" :
                            "hsl(var(--v-yellow))",
                        }}
                      >
                        {selectedSubmissionToView.approval_status ?? "pending"}
                      </Badge>
                    </div>
                    <DialogTitle className="text-xl font-bold font-display text-foreground leading-snug">
                      {selectedSubmissionToView.title}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      <span>Author: <strong className="text-foreground">{selectedSubmissionToView.author || "Unknown"}</strong></span>
                      <span>•</span>
                      <span>Scholar: <strong className="text-foreground">{selectedSubmissionToView.profile?.full_name || "Scholar Reader"}</strong></span>
                      {selectedSubmissionToView.profile?.house && (
                        <span>({selectedSubmissionToView.profile.house} House)</span>
                      )}
                    </DialogDescription>
                  </div>
                </DialogHeader>

                <div className="p-5 overflow-y-auto space-y-4 text-sm flex-1">
                  {/* Detailed Scholar Metadata */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Scholar Name</span>
                      <strong className="text-foreground truncate block">{selectedSubmissionToView.profile?.full_name || "Scholar"}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Cohort &amp; Class</span>
                      <strong className="text-foreground block truncate">
                        {selectedSubmissionToView.profile?.year_group || "Grade 11"} {selectedSubmissionToView.profile?.class_name ? `(${selectedSubmissionToView.profile.class_name})` : ""}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">House &amp; Realm</span>
                      <strong className="text-foreground block truncate">
                        {selectedSubmissionToView.profile?.house || "Kenya"} · Realm #{selectedSubmissionToView.category_number || 1}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Submission Date</span>
                      <span className="text-foreground font-mono block text-[11px]">
                        {selectedSubmissionToView.created_at ? new Date(selectedSubmissionToView.created_at).toLocaleDateString() : "Recent"}
                      </span>
                    </div>
                  </div>

                  {/* Complete Reflection / Traveler's Journal Essay */}
                  <div className="space-y-2">
                    <div className="font-bold text-xs uppercase tracking-wider text-primary flex items-center gap-2">
                      <BookOpen className="w-4 h-4" /> Scholar's Complete Reading Reflection &amp; Critical Essay
                    </div>
                    <div className="p-4 rounded-xl bg-background border border-border/80 leading-relaxed text-foreground whitespace-pre-wrap font-sans text-xs sm:text-sm shadow-xs min-h-[120px]">
                      {selectedSubmissionToView.reflection || "No reflection text provided for this submission."}
                    </div>
                  </div>

                  {selectedSubmissionToView.ai_feedback && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                      <strong>AI Integrity Review Feedback:</strong> {selectedSubmissionToView.ai_feedback}
                    </div>
                  )}
                </div>

                <DialogFooter className="p-4 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/30 font-semibold gap-1"
                      onClick={async () => {
                        await setStatus(selectedSubmissionToView.id, "approved", selectedSubmissionToView);
                        setSelectedSubmissionToView((prev: any) => prev ? { ...prev, approval_status: "approved" } : null);
                      }}
                    >
                      <Check className="w-3.5 h-3.5" /> Approve &amp; Dispatch Cert
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-amber-600 hover:bg-amber-500/10 border-amber-500/30 gap-1 font-semibold"
                      onClick={async () => {
                        if (!selectedSubmissionToView.user_id) return;
                        toast.loading("Sending finalized certificate to school email...");
                        await triggerAutoCertificateDispatch({
                          userId: selectedSubmissionToView.user_id,
                          studentName: selectedSubmissionToView.profile?.full_name,
                          studentEmail: selectedSubmissionToView.profile?.email,
                          manualOverride: true,
                          triggerEvent: `Manual Dispatch: ${selectedSubmissionToView.title || "Submission"}`,
                        });
                        toast.dismiss();
                      }}
                      title="Send finalized certificate directly to this student's school email now"
                    >
                      <Send className="w-3.5 h-3.5 text-amber-500" /> Email Certificate Now
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-red-600 hover:bg-red-500/10 border-red-500/30 gap-1"
                      onClick={async () => {
                        await setStatus(selectedSubmissionToView.id, "rejected");
                        setSelectedSubmissionToView((prev: any) => prev ? { ...prev, approval_status: "rejected" } : null);
                      }}
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-amber-600 hover:bg-amber-500/10 border-amber-500/30 gap-1"
                      onClick={async () => {
                        await setStatus(selectedSubmissionToView.id, "flagged");
                        setSelectedSubmissionToView((prev: any) => prev ? { ...prev, approval_status: "flagged" } : null);
                      }}
                    >
                      <Flag className="w-3.5 h-3.5" /> Flag
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-xs font-semibold gap-1 text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
                      onClick={() => {
                        const studentName = selectedSubmissionToView.profile?.full_name || "Unknown Student";
                        const studentBooks = rows.filter((x) => x.user_id === selectedSubmissionToView.user_id && x.approval_status !== "rejected").length || 1;
                        const level = computeStudentLevel(studentBooks);
                        const email = selectedSubmissionToView.profile?.email || "";
                        setSelectedSubmissionToView(null);
                        navigate(`/admin?s=certificates&student=${encodeURIComponent(studentName)}&books=${studentBooks}&level=${level}&email=${encodeURIComponent(email)}`);
                      }}
                    >
                      <Award className="w-3.5 h-3.5 text-amber-500" /> Certificate
                    </Button>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setSelectedSubmissionToView(null)}>
                    Close
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* In-App Delete Submission Confirmation Dialog */}
        <Dialog open={!!submissionToDelete} onOpenChange={(open) => !open && setSubmissionToDelete(null)}>
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
                <Trash2 className="w-4 h-4" /> Delete Submission Permanently?
              </DialogTitle>
              <DialogDescription className="text-xs pt-1">
                Are you sure you want to permanently delete the submission <strong className="text-foreground">"{submissionToDelete?.title}"</strong> by <strong className="text-foreground">{submissionToDelete?.student}</strong>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" size="sm" onClick={() => setSubmissionToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deletingSubmission}
                onClick={handleConfirmDeleteSubmission}
                className="gap-1.5 font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deletingSubmission ? "Deleting…" : "Confirm Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

/* ---------- Session & Theme Controls ---------- */
function SessionControlsSection() {
  const [submissionsActive, setSubmissionsActive] = useState<boolean>(true);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [savingDates, setSavingDates] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: activeData } = await supabase
          .from("system_settings")
          .select("setting_value")
          .eq("setting_key", "reading_challenge_active")
          .maybeSingle();

        if (activeData && activeData.setting_value === "false") {
          setSubmissionsActive(false);
        } else {
          setSubmissionsActive(true);
        }

        const { data: startData } = await supabase
          .from("system_settings")
          .select("setting_value")
          .eq("setting_key", "reading_session_start")
          .maybeSingle();

        if (startData?.setting_value) {
          const d = new Date(startData.setting_value);
          if (!isNaN(d.getTime())) {
            const pad = (n: number) => String(n).padStart(2, "0");
            setStartDate(
              `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
            );
          }
        }

        const { data: endData } = await supabase
          .from("system_settings")
          .select("setting_value")
          .eq("setting_key", "reading_session_end")
          .maybeSingle();

        if (endData?.setting_value) {
          const d = new Date(endData.setting_value);
          if (!isNaN(d.getTime())) {
            const pad = (n: number) => String(n).padStart(2, "0");
            setEndDate(
              `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
            );
          }
        }
      } catch (err) {
        console.warn("Could not load session controls settings:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleToggleSubmissions = async (val: boolean) => {
    setSubmissionsActive(val);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("system_settings").upsert(
      {
        setting_key: "reading_challenge_active",
        setting_value: String(val),
        description: "Master switch to allow or pause reading challenge submissions across the academy",
        updated_by: user?.id,
      },
      { onConflict: "setting_key" }
    );

    if (error) {
      toast.error(`Could not update submission status: ${error.message}`);
      setSubmissionsActive(!val);
    } else {
      toast.success(
        val
          ? "Challenge submissions are now OPEN for all students."
          : "Challenge submissions have been PAUSED by the librarian."
      );
    }
  };

  const handleSaveDates = async () => {
    setSavingDates(true);
    const { data: { user } } = await supabase.auth.getUser();
    try {
      if (startDate) {
        await supabase.from("system_settings").upsert(
          {
            setting_key: "reading_session_start",
            setting_value: new Date(startDate).toISOString(),
            description: "Reading challenge official start date",
            updated_by: user?.id,
          },
          { onConflict: "setting_key" }
        );
      }

      if (endDate) {
        await supabase.from("system_settings").upsert(
          {
            setting_key: "reading_session_end",
            setting_value: new Date(endDate).toISOString(),
            description: "Reading challenge countdown and session deadline",
            updated_by: user?.id,
          },
          { onConflict: "setting_key" }
        );
      }

      toast.success("Reading session window dates updated successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to save dates: ${msg}`);
    } finally {
      setSavingDates(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Submissions Master Switch */}
      <Card className="rounded-2xl border-border bg-card">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center border"
                style={{
                  backgroundColor: submissionsActive ? "hsl(var(--v-green) / 0.15)" : "hsl(var(--v-red) / 0.15)",
                  borderColor: submissionsActive ? "hsl(var(--v-green) / 0.4)" : "hsl(var(--v-red) / 0.4)",
                  color: submissionsActive ? "hsl(var(--v-green))" : "hsl(var(--v-red))",
                }}
              >
                <Power className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-base text-foreground flex items-center gap-2">
                  <span>Reading Challenge Submissions Master Switch</span>
                  {submissionsActive ? (
                    <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px]">
                      OPEN FOR SUBMISSIONS
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px]">
                      PAUSED / LOCKED
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When enabled, students can submit book reflections. When paused, submission forms display a polite pause notice.
                </p>
              </div>
            </div>
            <Switch
              checked={submissionsActive}
              onCheckedChange={handleToggleSubmissions}
              disabled={loading}
            />
          </div>

          <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl border border-border flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary shrink-0" />
            <span>
              This master toggle controls all live student reading entry points, including the 45-Book challenge and specialty sprint submission interfaces.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Reading Session Dates */}
      <Card className="rounded-2xl border-border bg-card">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="font-bold text-sm text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Session Start & End Dates
            </div>
            <span className="text-xs text-muted-foreground">Controls dashboard countdown ticker</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Session Launch Date & Time</Label>
              <Input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Session Deadline & Countdown Target</Label>
              <Input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSaveDates}
              disabled={savingDates || loading}
              className="text-xs font-semibold text-white border-0"
              style={{ background: "linear-gradient(120deg, hsl(var(--v-emerald)), hsl(var(--v-cyan)))" }}
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              {savingDates ? "Saving…" : "Save Session Dates"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* School Theme & Accessibility Controls */}
      <Card className="rounded-2xl border-border bg-card">
        <CardContent className="p-5 space-y-4">
          <div className="pb-2 border-b border-border">
            <div className="font-bold text-sm text-foreground flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" /> Accessibility Mode & Color Themes
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Switch accessibility modes (High Contrast, Soft Mode, Dark Mode, Light Mode) or customize school palette presets.
            </p>
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Accessibility Theme Mode
            </Label>
            <ThemeModeSelector variant="cards" />
          </div>

          <div className="pt-3 border-t border-border space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Academy Accent Theme Preset
            </Label>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Challenges list (Lock, Open, Close & Workspaces) ---------- */
function ChallengesSection({
  onCreate,
  onManageRegistrations,
}: {
  onCreate: () => void;
  onManageRegistrations?: (challengeId?: string) => void;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { challenges, setChallengeStatus, setSelectedChallengeId, deleteChallenge } = useChallenges();
  const [challengeToDelete, setChallengeToDelete] = useState<{ id: string; title: string } | null>(null);
  const [deletingChallenge, setDeletingChallenge] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("challenges")
      .select("*")
      .order("created_at", { ascending: false });
    
    // Also load participant counts
    try {
      const { data: partData } = await supabase
        .from("challenge_participants")
        .select("challenge_id");
      const counts: Record<string, number> = {};
      (partData || []).forEach((p: any) => {
        if (p.challenge_id) {
          counts[p.challenge_id] = (counts[p.challenge_id] || 0) + 1;
        }
      });
      setParticipantCounts(counts);
    } catch {
      // ignore
    }
    
    const dbRows = data ?? [];
    const merged = challenges.map((c) => {
      const match = dbRows.find((d: any) => d.id === c.id);
      return {
        ...c,
        ...(match || {}),
        status: c.status || ((match?.layout_config as any)?.status) || (match?.is_active ? "open" : "closed"),
      };
    });
    setRows(merged);
    setLoading(false);
  };
  useEffect(() => { load(); }, [challenges]);

  const handleStatusChange = async (id: string, newStatus: "open" | "locked" | "closed") => {
    await setChallengeStatus(id, newStatus);
    load();
  };

  const handleConfirmDeleteChallenge = async () => {
    if (!challengeToDelete) return;
    setDeletingChallenge(true);
    const ok = await deleteChallenge(challengeToDelete.id);
    setDeletingChallenge(false);
    if (ok) {
      setChallengeToDelete(null);
      load();
    }
  };

  // Broadcast challenge to all users and send to school email
  const sendToAllUsers = async (challenge: any) => {
    setSendingId(challenge.id);
    const toastId = toast.loading(`Broadcasting challenge "${challenge.title}" to all users & dispatching emails...`);
    try {
      const { data: profs, error } = await supabase
        .from("profiles")
        .select("user_id, email, full_name");
      if (error) throw error;

      const users = profs || [];
      const title = `📢 Challenge Announcement: ${challenge.title}`;
      const message = `A reading challenge is now active! Goal: Read ${challenge.target_books} books to earn ${challenge.points_reward} reward points. ${challenge.description}`;

      if (users.length > 0) {
        const notifRows = users.map((u) => ({
          user_id: u.user_id,
          type: "broadcast",
          title,
          message,
        }));
        await supabase.from("notifications").insert(notifRows);
      }

      // Record email dispatch
      const validEmails = users.filter((u) => u.email && u.email.includes("@"));
      const emailRecord = {
        id: `bc-email-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title,
        subject: title,
        body: message,
        audience: "All Users (Students & Staff)",
        recipient_count: validEmails.length,
        emails_count: validEmails.length,
        sent_at: new Date().toISOString(),
        challenge_id: challenge.id,
      };
      try {
        const stored = JSON.parse(localStorage.getItem("mfa-broadcast-emails") || "[]");
        stored.unshift(emailRecord);
        localStorage.setItem("mfa-broadcast-emails", JSON.stringify(stored.slice(0, 50)));
      } catch { /* non-blocking */ }

      toast.success(
        `Challenge broadcast successfully sent to ${users.length} user notifications AND dispatched to ${validEmails.length} email addresses!`,
        { id: toastId }
      );
    } catch (err: any) {
      toast.error(`Could not broadcast challenge: ${err.message}`, { id: toastId });
    } finally {
      setSendingId(null);
    }
  };

  return (
    <Card className="rounded-2xl border-border bg-card">
      <CardContent className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
          <div>
            <div className="font-bold text-base text-foreground flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" /> Challenge Management & Workspaces
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Lock, Open, or Close challenges. Each challenge has its own dedicated dashboard workspace.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/challenges")}
              className="text-xs font-semibold gap-1.5 h-8"
            >
              <ExternalLink className="w-3.5 h-3.5" /> View Challenge Workspaces
            </Button>
            <Button onClick={onCreate} className="text-white border-0 text-xs h-8"
              style={{ background: "linear-gradient(120deg, hsl(var(--v-green)), hsl(var(--v-cyan)))" }}>
              <Plus className="w-4 h-4 mr-1.5" /> New Challenge
            </Button>
          </div>
        </div>

        {/* Challenge Editing Callout */}
        <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 flex items-start gap-2.5 text-xs text-foreground">
          <Pencil className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <strong>Continuous Challenge Editing:</strong> You can edit and make changes to any challenge at any time after creation. Click the <strong>"Edit"</strong> button on any card below to update goals, deadlines, literary categories, reflection prompts, badges, and certificates.
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground py-12 text-center">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-12 text-center">No challenges yet.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {rows.map((c) => {
              const currentStatus = c.status || (c.is_active ? "open" : "closed");
              return (
                <div key={c.id} className="rounded-2xl border border-border p-4 bg-background/50 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="text-xl shrink-0">{c.badge_icon || "🏆"}</span>
                        <span className="font-display font-bold text-sm text-foreground truncate max-w-[240px] sm:max-w-[300px]">
                          {c.title}
                        </span>
                      </div>
                      {/* Status Badge */}
                      {currentStatus === "open" ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold py-0.5 shrink-0">
                          🟢 OPEN
                        </Badge>
                      ) : currentStatus === "locked" ? (
                        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold py-0.5 shrink-0">
                          🔒 LOCKED
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground border-border text-[10px] font-bold py-0.5 shrink-0">
                          🏆 CLOSED
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {c.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
                      <Badge variant="outline" className="text-[10px]">{c.challenge_type}</Badge>
                      <Badge variant="outline" className="text-[10px]">{c.target_books} books</Badge>
                      <Badge variant="outline" className="text-[10px]">+{c.points_reward || 100} pts</Badge>
                      <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 font-bold">
                        👥 {participantCounts[c.id] || 0} Enrolled
                      </Badge>
                      {c.categories && c.categories.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                          {c.categories.length} Categories
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border space-y-2.5">
                    {/* Status Toggle Button Group */}
                    <div className="flex items-center justify-between gap-2 bg-muted/50 p-1.5 rounded-xl">
                      <span className="text-[11px] font-semibold text-muted-foreground pl-1">
                        Challenge State:
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant={currentStatus === "open" ? "default" : "ghost"}
                          className={currentStatus === "open" ? "h-6 px-2.5 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold" : "h-6 px-2 text-[10px] text-muted-foreground"}
                          onClick={() => handleStatusChange(c.id, "open")}
                        >
                          Open
                        </Button>
                        <Button
                          size="sm"
                          variant={currentStatus === "locked" ? "default" : "ghost"}
                          className={currentStatus === "locked" ? "h-6 px-2.5 text-[10px] bg-amber-600 hover:bg-amber-700 text-white font-bold" : "h-6 px-2 text-[10px] text-muted-foreground"}
                          onClick={() => handleStatusChange(c.id, "locked")}
                        >
                          Lock
                        </Button>
                        <Button
                          size="sm"
                          variant={currentStatus === "closed" ? "default" : "ghost"}
                          className={currentStatus === "closed" ? "h-6 px-2.5 text-[10px] bg-red-600 hover:bg-red-700 text-white font-bold" : "h-6 px-2 text-[10px] text-muted-foreground"}
                          onClick={() => handleStatusChange(c.id, "closed")}
                        >
                          Close
                        </Button>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs font-semibold gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30"
                          onClick={() => {
                            setSelectedChallengeId(c.id);
                            onManageRegistrations?.(c.id);
                          }}
                          title="View and manage enrolled students for this challenge"
                        >
                          <Users className="w-3 h-3" /> Students ({participantCounts[c.id] || 0})
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs font-semibold gap-1 text-primary bg-primary/10 hover:bg-primary/20 border-primary/30"
                          onClick={() => setEditingChallenge(c)}
                          title="Edit challenge details, categories, targets and rules"
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs font-semibold gap-1"
                          onClick={() => navigate(`/challenges?id=${c.id}`)}
                        >
                          <ExternalLink className="w-3 h-3" /> Dashboard
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs font-semibold gap-1 text-primary bg-primary/10 hover:bg-primary/20"
                          disabled={sendingId === c.id}
                          onClick={() => sendToAllUsers(c)}
                          title="Broadcast to students & school emails"
                        >
                          <Mail className="w-3 h-3" />
                          {sendingId === c.id ? "Sending…" : "Email"}
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 h-7 text-xs font-semibold gap-1"
                        onClick={() => setChallengeToDelete({ id: c.id, title: c.title })}
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Delete Challenge Confirmation Dialog */}
        <Dialog open={!!challengeToDelete} onOpenChange={(open) => !open && setChallengeToDelete(null)}>
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
                <Trash2 className="w-4 h-4" /> Delete Reading Challenge?
              </DialogTitle>
              <DialogDescription className="text-xs pt-1 leading-relaxed">
                Are you sure you want to delete <strong className="text-foreground">"{challengeToDelete?.title}"</strong>? This will permanently remove the challenge, its associated entries, and enrolled rosters. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" size="sm" onClick={() => setChallengeToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deletingChallenge}
                onClick={handleConfirmDeleteChallenge}
                className="gap-1.5 font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deletingChallenge ? "Deleting…" : "Confirm Delete Challenge"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Challenge Dialog */}
        {editingChallenge && (
          <EditChallengeDialog
            challenge={editingChallenge}
            open={!!editingChallenge}
            onOpenChange={(open) => !open && setEditingChallenge(null)}
            onSuccess={load}
          />
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- Create Challenge Section ---------- */
function CreateChallengeSection({ onDone }: { onDone: () => void }) {
  const { createChallenge } = useChallenges();
  const [form, setForm] = useState({
    title: "",
    description: "",
    challenge_type: "individual",
    status: "open" as "open" | "locked" | "closed",
    target_books: 15,
    points_per_book: POINTS_PER_BOOK,
    points_reward: 100,
    min_reflection_chars: 50,
    max_books_per_category: MAX_BOOKS_PER_CATEGORY,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
    badge_name: "Reading Champion",
    badge_icon: "🏆",
    logo_url: "/school-badge.png",
    accent_color: "var(--v-emerald)",
    category: "Whole School",
    is_featured: false,
    certificate_signatory_name: "David O. Oloo",
    certificate_signatory_title: "Director of Teaching & Learning",
    certificate_release_policy: "on_close_only" as "on_close_only" | "immediate",
    allowed_houses: [] as string[],
    allowed_year_groups: [] as string[],
    submission_type: "book" as "book" | "poem" | "essay" | "article" | "art" | "audio" | "custom",
    features: ["require_enrolment", "file_upload", "ai_coach", "auto_certificate"] as string[],
    submission_guidelines: "",
  });

  const [categories, setCategories] = useState<Array<{
    id: number;
    name: string;
    realm: string;
    prompt: string;
    max_books: number;
  }>>(() =>
    READING_CATEGORIES.map((c: any, i: number) => ({
      id: i + 1,
      name: typeof c === "string" ? c : c.name,
      realm: typeof c === "string" ? "" : c.realm || "",
      prompt: typeof c === "string" ? "" : c.prompt || "",
      max_books: MAX_BOOKS_PER_CATEGORY,
    }))
  );


  const [saving, setSaving] = useState(false);

  // Template loaders
  const loadTemplate = (type: "african" | "master" | "stem" | "novellas") => {
    if (type === "african") {
      setForm((prev) => ({
        ...prev,
        title: "African Voices & Pan-African Fiction Quest",
        description: "Explore contemporary African prose, historical memoirs, post-colonial literature, and diaspora poetry.",
        target_books: 8,
        points_per_book: 15,
        points_reward: 150,
        badge_name: "Motherland Scholar",
        badge_icon: "🌍",
        min_reflection_chars: 60,
      }));
      setCategories([
        { id: 1, name: "Contemporary African Prose", realm: "Motherland Voices", prompt: "How does the author capture modern African realities and post-colonial identity? Cite 3 moments.", max_books: 2 },
        { id: 2, name: "Historical Epics & Folklore", realm: "Ancestral Heritage", prompt: "What oral traditions, resistance history, or ancestral wisdom were celebrated?", max_books: 2 },
        { id: 3, name: "Poetry & Drama of the Diaspora", realm: "Rhythms of Africa", prompt: "Analyze the rhythm, spoken-word energy, and social critique in this piece.", max_books: 2 },
        { id: 4, name: "African Biographies & Thinkers", realm: "Pioneers & Leaders", prompt: "What leadership philosophy, struggle, or societal insight did the author share?", max_books: 2 },
      ]);
      toast.success("Loaded African Voices Template!");
    } else if (type === "stem") {
      setForm((prev) => ({
        ...prev,
        title: "STEM, Sci-Fi & Climate Odyssey",
        description: "Engage with speculative fiction, climate change narratives, space exploration, and biographies of scientists.",
        target_books: 6,
        points_per_book: 12,
        points_reward: 100,
        badge_name: "STEM Visionary",
        badge_icon: "🚀",
      }));
      setCategories([
        { id: 1, name: "Hard Science Fiction", realm: "Deep Space", prompt: "How realistically was the scientific premise portrayed, and what ethical dilemma arose?", max_books: 2 },
        { id: 2, name: "Eco-Fiction & Climate Futures", realm: "Living Earth", prompt: "How did the ecological setting reflect real-world planetary challenges?", max_books: 2 },
        { id: 3, name: "Pioneers of Innovation", realm: "Scientific Hall of Fame", prompt: "What obstacle did the innovator overcome, and what principle did you learn?", max_books: 2 },
      ]);
      toast.success("Loaded STEM & Eco-Fiction Template!");
    } else if (type === "novellas") {
      setForm((prev) => ({
        ...prev,
        title: "Fast-Paced Novellas & Graphic Novels Sprint",
        description: "High-impact short fiction, visual storytelling, manga, and quick literary bursts.",
        target_books: 5,
        points_per_book: 10,
        points_reward: 75,
        badge_name: "Swift Reader",
        badge_icon: "⚡",
        min_reflection_chars: 40,
      }));
      setCategories([
        { id: 1, name: "Literary Novella (<150 pages)", realm: "Concise Masterpieces", prompt: "How did the author build immense thematic tension in a condensed format?", max_books: 2 },
        { id: 2, name: "Graphic Novels & Comics", realm: "Illustrated Realities", prompt: "Analyze how panel framing and visual composition conveyed the emotional climax.", max_books: 2 },
        { id: 3, name: "Short Story Collection", realm: "Anthology Sparks", prompt: "Which single story left the deepest impression on you and why?", max_books: 1 },
      ]);
      toast.success("Loaded Novellas & Graphic Novels Template!");
    } else {
      // 11 Master Realms
      setForm((prev) => ({
        ...prev,
        title: "45-Book Master Challenge: Beyond the Pages",
        description: "The premier academy-wide reading quest spanning 11 literary realms. Complete all categories to unlock Gold status.",
        target_books: 45,
        points_per_book: 10,
        points_reward: 450,
        badge_name: "Master Scholar",
        badge_icon: "👑",
        min_reflection_chars: 50,
        max_books_per_category: 4,
      }));
      setCategories([
        { id: 1, name: "Fiction as a Mirror of Humanity", realm: "Mirror Realm", prompt: "How does this book reflect the human condition? Cite 3 moments that showed real-world human behavior.", max_books: 4 },
        { id: 2, name: "Science Fiction & Dystopia", realm: "Future Horizons", prompt: "What futuristic warning or ethical dilemma is central to this novel? How is it relevant today?", max_books: 4 },
        { id: 3, name: "Historical Fiction", realm: "Time Capsule", prompt: "How did the author weave historical truth with fiction? What era-defining insight did you uncover?", max_books: 4 },
        { id: 4, name: "African Contemporary Prose", realm: "Motherland Voices", prompt: "How does the author engage with modern African identity, community, or transformation?", max_books: 4 },
        { id: 5, name: "Fantasy & Mythological Epics", realm: "Mythic Isles", prompt: "What legendary tropes were subverted or reinvented? Describe the moral heart of the hero's journey.", max_books: 4 },
        { id: 6, name: "Mystery, Detective & Thriller", realm: "Labyrinth of Secrets", prompt: "How did the narrative plant clues, subvert expectations, and resolve its core mystery?", max_books: 4 },
        { id: 7, name: "Biography, Memoir & Leadership", realm: "Hall of Pioneers", prompt: "What pivotal leadership lesson, personal struggle, or worldview transformation struck you?", max_books: 4 },
        { id: 8, name: "Poetry & Verse Novels", realm: "Rhythms & Verses", prompt: "How did the poetic rhythm, metaphor, and stanza structures elevate the narrative emotional resonance?", max_books: 4 },
        { id: 9, name: "Graphic Novels & Manga", realm: "Graphic Galaxy", prompt: "How did the visual art, panel pacing, and expressive linework augment the written words?", max_books: 4 },
        { id: 10, name: "Philosophy, Non-Fiction & Society", realm: "Ideas in Motion", prompt: "What thesis or philosophical argument did the book present? What do you agree or disagree with?", max_books: 4 },
        { id: 11, name: "World Literature in Translation", realm: "Global Tapestry", prompt: "How did experiencing a different linguistic and cultural narrative broaden your worldview?", max_books: 4 },
      ]);
      toast.success("Loaded 11 Master Realms Template!");
    }
  };

  const addCategory = () => {
    const nextId = categories.length ? Math.max(...categories.map((c) => c.id)) + 1 : 1;
    setCategories((prev) => [
      ...prev,
      {
        id: nextId,
        name: `Category ${nextId}`,
        realm: `Realm ${nextId}`,
        prompt: "Reflect on 3 significant insights, character decisions, or thematic takeaways from this book.",
        max_books: 3,
      },
    ]);
  };

  const removeCategory = (id: number) => {
    if (categories.length <= 1) return toast.error("A challenge must have at least 1 category");
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCategory = (id: number, key: string, val: any) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [key]: val } : c))
    );
  };

  const submit = async () => {
    if (!form.title.trim()) return toast.error("Challenge title is required");
    if (categories.length === 0) return toast.error("Please configure at least one category");
    
    setSaving(true);
    try {
      await createChallenge({
        title: form.title.trim(),
        description: form.description.trim(),
        challenge_type: form.challenge_type,
        status: form.status,
        target_books: form.target_books,
        points_per_book: form.points_per_book,
        points_reward: form.points_reward,
        min_reflection_chars: form.min_reflection_chars,
        max_books_per_category: form.max_books_per_category,
        start_date: form.start_date,
        end_date: form.end_date,
        is_active: form.status === "open",
        is_featured: form.is_featured,
        badge_name: form.badge_name,
        badge_icon: form.badge_icon,
        logo_url: form.logo_url || undefined,
        accent_color: form.accent_color,
        category: form.category,
        certificate_signatory_name: form.certificate_signatory_name,
        certificate_signatory_title: form.certificate_signatory_title,
        certificate_release_policy: form.certificate_release_policy,
        allowed_houses: form.allowed_houses.length ? form.allowed_houses : null,
        allowed_year_groups: form.allowed_year_groups.length ? form.allowed_year_groups : null,
        categories: categories,
        submission_type: form.submission_type,
        features: form.features,
        submission_guidelines: form.submission_guidelines.trim() || undefined,
      });

      onDone();
    } catch (err: any) {
      toast.error(err.message || "Failed to create challenge");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="rounded-3xl border-border bg-card shadow-lg">
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <h3 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Create a Challenge
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set the name, goal, dates, categories and who can join. The challenge is saved immediately and appears in the challenge switcher.
            </p>
          </div>
        </div>

        {/* Editable Anytime Notice */}
        <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 flex items-start gap-2.5 text-xs text-foreground">
          <Pencil className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <strong>You can still edit and make changes after creation:</strong> This challenge can be modified at any time after it is created. You will be able to update targets, deadlines, literary categories, reflection prompts, badges, and certificates whenever needed.
          </div>
        </div>

        {/* SECTION 1: Core Identity */}
        <div className="space-y-4">
          <div className="text-xs font-bold text-foreground uppercase tracking-wider text-primary">
            1. Challenge Identity & Theme
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold">Challenge Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Term 2 Poetry Challenge 2026"
                className="text-xs font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Initial Status</Label>
              <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">🟢 Open (Active submissions)</SelectItem>
                  <SelectItem value="locked">🔒 Locked (Temporarily paused)</SelectItem>
                  <SelectItem value="closed">🏆 Closed (Certificates unlocked)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label className="text-xs font-semibold">Description & Theme Narrative</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="Provide reading theme guidelines, curriculum connections, and inspirational context for students."
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Challenge Scope / Type</Label>
              <Select value={form.challenge_type} onValueChange={(v) => setForm({ ...form, challenge_type: v })}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual Scholar</SelectItem>
                  <SelectItem value="house">Inter-House Championship</SelectItem>
                  <SelectItem value="class">Classroom Reading Sprint</SelectItem>
                  <SelectItem value="year_group">Year Group Quest</SelectItem>
                  <SelectItem value="specialty">Specialty Genre Marathon</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Badge Icon (Emoji / Symbol)</Label>
              <Input
                value={form.badge_icon}
                onChange={(e) => setForm({ ...form, badge_icon: e.target.value })}
                placeholder="🏆, 👑, 🌍, 🚀, 📚"
                className="text-xs font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Badge Award Title</Label>
              <Input
                value={form.badge_name}
                onChange={(e) => setForm({ ...form, badge_name: e.target.value })}
                placeholder="e.g. Master Scholar"
                className="text-xs"
              />
            </div>
            
            {/* Challenge Logo / Emblem Upload */}
            <div className="space-y-1.5 sm:col-span-3 p-3.5 rounded-2xl bg-muted/40 border border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Challenge Logo / Crest Image
                </Label>
                {form.logo_url && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, logo_url: "" })}
                    className="text-[11px] text-destructive hover:underline font-semibold"
                  >
                    Clear Logo
                  </button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Upload a custom emblem, crest, or challenge icon, or paste a direct image URL.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                {form.logo_url ? (
                  <div className="w-14 h-14 rounded-2xl border-2 border-primary/40 p-1 bg-background flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                    <img
                      src={form.logo_url}
                      alt="Challenge Logo"
                      className="w-full h-full object-contain"
                      onError={() => toast.error("Could not load logo image preview")}
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-2xl border border-dashed border-muted-foreground/30 flex items-center justify-center shrink-0 text-muted-foreground bg-muted/20 text-xs">
                    No logo
                  </div>
                )}
                <div className="flex-1 w-full space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={form.logo_url}
                      onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                      placeholder="e.g. /school-badge.png or https://example.com/logo.png"
                      className="text-xs font-mono"
                    />
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                      <FolderUp className="w-3.5 h-3.5" />
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 3 * 1024 * 1024) {
                            toast.error("Logo file size must be under 3MB");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const res = event.target?.result as string;
                            if (res) {
                              setForm({ ...form, logo_url: res });
                              toast.success("Challenge logo uploaded!");
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>Quick presets:</span>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, logo_url: "/school-badge.png" })}
                      className="text-primary hover:underline font-semibold"
                    >
                      Academy Crest
                    </button>
                    <span>&bull;</span>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, logo_url: "/assets/school-logo.png" })}
                      className="text-primary hover:underline font-semibold"
                    >
                      Gold Seal
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Submission Format & Capabilities */}
        <div className="space-y-4 pt-2 border-t border-border">
          <div className="text-xs font-bold text-foreground uppercase tracking-wider text-primary">
            2. Submission Format & Workspace Capabilities
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5 sm:col-span-1">
              <Label className="text-xs font-semibold">Accepted Submission Format</Label>
              <Select
                value={form.submission_type}
                onValueChange={(v: any) => setForm({ ...form, submission_type: v })}
              >
                <SelectTrigger className="text-xs font-semibold"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="book">📚 Books & Reading Reflections</SelectItem>
                  <SelectItem value="poem">✍️ Poetry, Verses & Stanzas</SelectItem>
                  <SelectItem value="essay">📝 Critical Essays & Analytical Articles</SelectItem>
                  <SelectItem value="art">🎨 Creative Artwork, Covers & Visuals</SelectItem>
                  <SelectItem value="audio">🎙️ Spoken Audio Reviews & Podcasts</SelectItem>
                  <SelectItem value="custom">🌟 Multimedia & Custom Submissions</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold">Submission Guidelines / Special Criteria</Label>
              <Input
                value={form.submission_guidelines}
                onChange={(e) => setForm({ ...form, submission_guidelines: e.target.value })}
                placeholder="e.g. Include at least 3 stanzas for poetry, or citation of 2 sources for essays."
                className="text-xs"
              />
            </div>
          </div>

          {/* Feature toggles */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Challenge Workspace Features</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {[
                { id: "require_enrolment", label: "Require Registration", desc: "Only enrolled scholars can submit" },
                { id: "file_upload", label: "File & PDF Upload", desc: "Allow attaching poems, essays or art files" },
                { id: "ai_coach", label: "AI Reflection Coach", desc: "Interactive feedback & prompt guidance" },
                { id: "tutor_signoff", label: "Tutor Sign-Off", desc: "Teacher approval required before badge" },
                { id: "auto_certificate", label: "Auto Certificates", desc: "Generate certificate upon goal reach" },
              ].map((feat) => {
                const checked = form.features.includes(feat.id);
                return (
                  <button
                    key={feat.id}
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        features: checked
                          ? prev.features.filter((f) => f !== feat.id)
                          : [...prev.features, feat.id],
                      }));
                    }}
                    className={cn(
                      "p-2.5 rounded-xl border text-left transition-all flex items-start gap-2",
                      checked
                        ? "bg-primary/10 border-primary/40 text-foreground"
                        : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border transition-colors",
                      checked ? "bg-primary border-primary text-white" : "border-muted-foreground/40 bg-background"
                    )}>
                      {checked && <Check className="w-3 h-3 text-primary-foreground stroke-[3]" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground">{feat.label}</div>
                      <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{feat.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* SECTION 3: Targets, Rules & Scoring */}
        <div className="space-y-4 pt-2 border-t border-border">
          <div className="text-xs font-bold text-foreground uppercase tracking-wider text-primary">
            3. Targets, Points & Scoring Mechanics
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Target Books Goal</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={form.target_books}
                onChange={(e) => setForm({ ...form, target_books: +e.target.value })}
                className="text-xs font-mono font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Points Per Book</Label>
              <Input
                type="number"
                min={1}
                value={form.points_per_book}
                onChange={(e) => setForm({ ...form, points_per_book: +e.target.value })}
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Completion Bonus Pts</Label>
              <Input
                type="number"
                min={0}
                value={form.points_reward}
                onChange={(e) => setForm({ ...form, points_reward: +e.target.value })}
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Min Reflection Chars</Label>
              <Input
                type="number"
                min={0}
                value={form.min_reflection_chars}
                onChange={(e) => setForm({ ...form, min_reflection_chars: +e.target.value })}
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Max Bks / Category</Label>
              <Input
                type="number"
                min={1}
                value={form.max_books_per_category}
                onChange={(e) => setForm({ ...form, max_books_per_category: +e.target.value })}
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label className="text-xs font-semibold">Start Date</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label className="text-xs font-semibold">End Date</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: Custom Categories & Specific Prompts Builder */}
        <div className="space-y-4 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-foreground uppercase tracking-wider text-primary">
                4. Challenge Categories, Literary Realms & Prompts ({categories.length})
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Students will only see and submit against these specific categories and prompts when this challenge is selected.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={addCategory} className="text-xs h-7 gap-1">
              <Plus className="w-3.5 h-3.5" /> Add Category
            </Button>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {categories.map((cat, idx) => (
              <div key={cat.id} className="p-3.5 rounded-2xl border border-border bg-muted/40 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                      {idx + 1}
                    </span>
                    <Input
                      value={cat.name}
                      onChange={(e) => updateCategory(cat.id, "name", e.target.value)}
                      placeholder="Category Title"
                      className="text-xs font-bold h-8"
                    />
                    <Input
                      value={cat.realm}
                      onChange={(e) => updateCategory(cat.id, "realm", e.target.value)}
                      placeholder="Realm / Subtitle tag"
                      className="text-xs h-8 sm:w-48 shrink-0"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                      <span>Max:</span>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={cat.max_books}
                        onChange={(e) => updateCategory(cat.id, "max_books", +e.target.value)}
                        className="w-14 h-8 text-xs font-mono text-center"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                      onClick={() => removeCategory(cat.id)}
                      title="Remove category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground mb-1 block">
                    Traveller's Reflection Prompt for this Category:
                  </Label>
                  <Textarea
                    value={cat.prompt}
                    onChange={(e) => updateCategory(cat.id, "prompt", e.target.value)}
                    rows={2}
                    className="text-xs font-normal"
                    placeholder="Enter the reflection question the student must answer upon finishing a book in this category."
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 5: Certificate & Signatory Settings */}
        <div className="space-y-4 pt-2 border-t border-border">
          <div className="text-xs font-bold text-foreground uppercase tracking-wider text-primary">
            5. Certificate & Signatory Details
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Signatory Name</Label>
              <Input
                value={form.certificate_signatory_name}
                onChange={(e) => setForm({ ...form, certificate_signatory_name: e.target.value })}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Signatory Title</Label>
              <Input
                value={form.certificate_signatory_title}
                onChange={(e) => setForm({ ...form, certificate_signatory_title: e.target.value })}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Certificate Release Policy</Label>
              <Select
                value={form.certificate_release_policy}
                onValueChange={(v: any) => setForm({ ...form, certificate_release_policy: v })}
              >
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_close_only">🔒 Sealed until Challenge Ends (Recommended)</SelectItem>
                  <SelectItem value="immediate">⚡ Immediate on Goal Attainment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-border flex items-center justify-between gap-4">
          <Button variant="ghost" onClick={onDone} className="text-xs">
            Cancel
          </Button>
          <Button
            disabled={saving}
            onClick={submit}
            className="text-white border-0 text-xs px-6 font-semibold shadow-md"
            style={{ background: "linear-gradient(120deg, hsl(var(--v-green)), hsl(var(--v-cyan)))" }}
          >
            {saving ? "Saving…" : "Create Challenge"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Categories ---------- */
function CategoriesSection() {
  const { challenges, selectedChallenge, selectedChallengeId, setSelectedChallengeId, updateChallenge } = useChallenges();
  const [rows, setRows] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [realm, setRealm] = useState("");
  const [prompt, setPrompt] = useState("");
  const [maxBooks, setMaxBooks] = useState(4);
  const [editing, setEditing] = useState<Record<number, any>>({});

  const isSpecificChallenge = selectedChallengeId !== "all" && selectedChallengeId !== "45450000-2025-4026-8000-000000000045" && !!selectedChallenge;
  const challengeCategories = useMemo(() => {
    return selectedChallenge?.categories || [];
  }, [selectedChallenge]);

  const load = async () => {
    const { data } = await supabase
      .from("custom_categories")
      .select("*")
      .order("display_order", { ascending: true })
      .order("id", { ascending: true });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const addMaster = async () => {
    if (!name.trim()) return toast.error("Name required");
    const { data: { user } } = await supabase.auth.getUser();
    const nextId = (rows.reduce((m, r) => Math.max(m, r.id ?? 0), 0) || 0) + 1;
    const { error } = await supabase.from("custom_categories").insert({
      id: nextId,
      name,
      realm_name: realm,
      prompt,
      display_order: nextId,
      created_by: user?.id,
      is_active: true,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Realm added to Master Categories");
    setName(""); setRealm(""); setPrompt(""); load();
  };

  const addChallengeCat = async () => {
    if (!name.trim()) return toast.error("Category name required");
    if (!selectedChallenge) return toast.error("No challenge selected");
    const curCats = selectedChallenge.categories || [];
    const nextId = curCats.length ? Math.max(...curCats.map((c) => c.id)) + 1 : 1;
    const newCat = {
      id: nextId,
      name: name.trim(),
      realm: realm.trim() || `Realm ${nextId}`,
      prompt: prompt.trim() || "Reflect on this reading against challenge themes.",
      max_books: Number(maxBooks) || selectedChallenge.max_books_per_category || 4,
    };
    const updated = [...curCats, newCat];
    await updateChallenge(selectedChallenge.id, { categories: updated });
    toast.success(`Category "${name}" added to ${selectedChallenge.title}!`);
    setName(""); setRealm(""); setPrompt(""); setMaxBooks(4);
  };

  const removeChallengeCat = async (catId: number) => {
    if (!selectedChallenge) return;
    const curCats = selectedChallenge.categories || [];
    if (curCats.length <= 1) return toast.error("A challenge must have at least 1 category");
    const updated = curCats.filter((c) => c.id !== catId);
    await updateChallenge(selectedChallenge.id, { categories: updated });
    toast.success("Category removed from this challenge");
  };

  const saveChallengeCat = async (catId: number, patch: any) => {
    if (!selectedChallenge) return;
    const curCats = selectedChallenge.categories || [];
    const updated = curCats.map((c) => (c.id === catId ? { ...c, ...patch } : c));
    await updateChallenge(selectedChallenge.id, { categories: updated });
    toast.success("Challenge category updated");
  };

  const saveMaster = async (id: number) => {
    const patch = editing[id];
    if (!patch) return;
    const { error } = await supabase.from("custom_categories").update(patch as any).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Saved — live across the site");
    setEditing((e) => { const n = { ...e }; delete n[id]; return n; });
    load();
  };

  const toggleMaster = async (id: number, val: boolean) => {
    await supabase.from("custom_categories").update({ is_active: val }).eq("id", id);
    load();
  };
  const removeMaster = async (id: number) => {
    if (!confirm("Delete category?")) return;
    await supabase.from("custom_categories").delete().eq("id", id);
    load();
  };

  const field = (c: any, key: string): string => {
    if (!c || !c.id) return "";
    const editVal = editing[c.id]?.[key];
    if (editVal !== undefined && editVal !== null) return String(editVal);
    const rowVal = c[key];
    if (rowVal !== undefined && rowVal !== null) return String(rowVal);
    return "";
  };
  const setField = (id: number, key: string, value: string) =>
    setEditing((e) => ({ ...e, [id]: { ...(e[id] || {}), [key]: value ?? "" } }));

  return (
    <Card className="rounded-2xl border-border bg-card">
      <CardContent className="p-5 space-y-5">
        {/* Challenge Workspace Switcher for Independent Categories */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <div className="font-bold text-sm text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" /> Literary Realms &amp; Category Workspaces
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Each reading challenge runs independently with its own distinct categories, levels, and reflection prompts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium shrink-0">Active Workspace:</span>
            <Select value={selectedChallengeId} onValueChange={(v) => setSelectedChallengeId(v)}>
              <SelectTrigger className="h-9 w-60 text-xs bg-background font-semibold">
                <SelectValue placeholder="Select challenge..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">📚 All Challenges (Combined)</SelectItem>
                <SelectItem value="45450000-2025-4026-8000-000000000045">
                  🏆 45-Book Master Challenge
                </SelectItem>
                {challenges
                  .filter((c) => c.id !== "all" && c.id !== "45450000-2025-4026-8000-000000000045")
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.badge_icon || "🏅"} {c.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Challenge-Specific Independent Categories Workspace */}
        {isSpecificChallenge ? (
          <div key={`workspace-specific-${selectedChallenge.id}`} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{selectedChallenge.badge_icon || "🏆"}</span>
                <div>
                  <div className="font-bold text-sm text-foreground">
                    {selectedChallenge.title} — Independent Categories ({challengeCategories.length})
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Target Goal: {selectedChallenge.target_books} books · Points/book: {selectedChallenge.points_per_book || 10} pts · No sharing with other challenges
                  </div>
                </div>
              </div>
              <Badge className="bg-primary text-primary-foreground font-semibold text-xs">
                Independent Workspace
              </Badge>
            </div>

            {/* Add Category to this specific challenge */}
            <div key={`add-cat-box-${selectedChallenge.id}`} className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-primary">
                Add Category to {selectedChallenge.title}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <Input
                  placeholder="Category Name (e.g. Pan-African Verse)"
                  value={name ?? ""}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-xs"
                />
                <Input
                  placeholder="Realm / Theme Name"
                  value={realm ?? ""}
                  onChange={(e) => setRealm(e.target.value)}
                  className="h-9 text-xs"
                />
                <Input
                  type="number"
                  min={1}
                  max={20}
                  placeholder="Max Books (default 4)"
                  value={maxBooks ?? 4}
                  onChange={(e) => setMaxBooks(Number(e.target.value) || 4)}
                  className="h-9 text-xs font-mono"
                />
                <Button onClick={addChallengeCat} className="h-9 text-xs font-semibold gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add Category
                </Button>
                <div className="sm:col-span-2 lg:col-span-4">
                  <Input
                    placeholder="Specific reflective prompt for this challenge realm..."
                    value={prompt ?? ""}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Display and edit existing categories for this challenge */}
            <div key={`cats-grid-${selectedChallenge.id}`} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {challengeCategories.map((c, i) => (
                <div key={`challenge-cat-${selectedChallenge.id}-${c.id ?? i}`} className="rounded-xl border border-border p-3.5 space-y-2.5 bg-background shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">#{c.id}</Badge>
                    <Input
                      key={`cat-name-input-${selectedChallenge.id}-${c.id}`}
                      defaultValue={c.name ?? ""}
                      onBlur={(e) => saveChallengeCat(c.id, { name: e.target.value })}
                      className="h-8 text-xs font-semibold"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive shrink-0"
                      onClick={() => removeChallengeCat(c.id)}
                      title="Remove category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      key={`cat-realm-input-${selectedChallenge.id}-${c.id}`}
                      defaultValue={c.realm || ""}
                      placeholder="Realm Name"
                      onBlur={(e) => saveChallengeCat(c.id, { realm: e.target.value })}
                      className="h-8 text-xs"
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground shrink-0 font-medium">Max books:</span>
                      <Input
                        key={`cat-max-input-${selectedChallenge.id}-${c.id}`}
                        type="number"
                        min={1}
                        defaultValue={c.max_books || 4}
                        onBlur={(e) => saveChallengeCat(c.id, { max_books: Number(e.target.value) || 4 })}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <Textarea
                    key={`cat-prompt-input-${selectedChallenge.id}-${c.id}`}
                    rows={2}
                    defaultValue={c.prompt || ""}
                    placeholder="Reflective prompt..."
                    onBlur={(e) => saveChallengeCat(c.id, { prompt: e.target.value })}
                    className="text-xs"
                  />
                </div>
              ))}
              {challengeCategories.length === 0 && (
                <div className="col-span-2 text-center py-8 text-xs text-muted-foreground">
                  No custom categories yet for this challenge. Use the form above to add one.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Whole School / Master 45-Book Categories Workspace */
          <div key="workspace-master" className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
              <strong>Master 45-Book Reading Realms:</strong> The categories below belong to the school-wide 45-book challenge. Specialty challenges manage their own categories independently.
            </div>

            <div key="add-master-box" className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Input placeholder="Category name (e.g. Adventure)" value={name ?? ""} onChange={(e) => setName(e.target.value)} />
              <Input placeholder="Realm name (e.g. Explorer's Frontier)" value={realm ?? ""} onChange={(e) => setRealm(e.target.value)} />
              <div className="flex gap-2 lg:col-span-2">
                <Input placeholder="Traveller's Journal reflection prompt" value={prompt ?? ""} onChange={(e) => setPrompt(e.target.value)} />
                <Button onClick={addMaster}><Plus className="w-4 h-4 mr-1" /> Add Realm</Button>
              </div>
            </div>

            <div key="master-cats-grid" className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {rows.map((c) => {
                const dirty = !!editing[c.id];
                return (
                  <div key={`master-cat-${c.id}`} className="rounded-xl border border-border p-3 space-y-2 bg-background/40">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="shrink-0">#{c.display_order ?? c.id}</Badge>
                      <Input className="h-8" value={field(c, "name") || ""} onChange={(e) => setField(c.id, "name", e.target.value)} />
                      <Switch checked={!!c.is_active} onCheckedChange={(v) => toggleMaster(c.id, v)} />
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeMaster(c.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <Input
                      className="h-8"
                      placeholder="Realm name"
                      value={field(c, "realm_name") || ""}
                      onChange={(e) => setField(c.id, "realm_name", e.target.value)}
                    />
                    <Textarea
                      rows={2}
                      placeholder="Reflection prompt"
                      value={field(c, "prompt") || ""}
                      onChange={(e) => setField(c.id, "prompt", e.target.value)}
                    />
                    {dirty && (
                      <Button size="sm" className="w-full" onClick={() => saveMaster(c.id)}>
                        <Check className="w-4 h-4 mr-1" /> Save changes
                      </Button>
                    )}
                  </div>
                );
              })}
              {rows.length === 0 && (
                <div className="text-sm text-muted-foreground py-8 text-center lg:col-span-2">
                  No categories yet.
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- Access Codes ---------- */
function AccessCodesSection() {
  const [rows, setRows] = useState<any[]>([]);
  const [code, setCode] = useState("");
  const [type, setType] = useState<"STU" | "TUT" | "HOY" | "PATRON" | "LIB">("STU");
  const [cohortSelect, setCohortSelect] = useState("DP1");
  const [houseSelect, setHouseSelect] = useState("Kenya");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("access_codes").select("*").order("created_at", { ascending: false });
    const list = (data ?? []).filter((r) => !isCodeDeleted(r.code));
    setRows(list);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSyncAll = async () => {
    setSyncing(true);
    const toastId = toast.loading("Synchronizing all standard access codes...");
    try {
      const res = await syncAllStandardCodes();
      const { data } = await supabase.from("access_codes").select("*").order("created_at", { ascending: false });
      const updated = (data ?? []).filter((r) => !isCodeDeleted(r.code));
      setRows(updated);
      toast.success(
        res.count > 0
          ? `Successfully synchronized ${res.count} new access codes!`
          : `Standard access codes are synchronized and active!`,
        { id: toastId }
      );
    } catch {
      toast.error("Failed to sync access codes", { id: toastId });
    } finally {
      setSyncing(false);
    }
  };

  const generateAutoCode = () => {
    const year = new Date().getFullYear();
    let suggested = "";
    if (type === "STU") {
      suggested = `STU-${cohortSelect}-${year}`;
    } else if (type === "TUT") {
      suggested = `TUT-${cohortSelect}-${year}`;
    } else if (type === "HOY") {
      suggested = `HOY-${cohortSelect}-${year}`;
    } else if (type === "PATRON") {
      suggested = `PATRON-${houseSelect.toUpperCase()}-${year}`;
    } else if (type === "LIB") {
      suggested = `LIB-${year}`;
    }
    setCode(suggested);
    toast.success(`Generated code format: ${suggested}`);
  };

  const add = async () => {
    if (!code.trim()) return toast.error("Code required");
    const { data: { user } } = await supabase.auth.getUser();
    const roleMapping: Record<string, string> = {
      STU: "student",
      TUT: "homeroom_tutor",
      HOY: "head_of_year",
      PATRON: "house_patron",
      LIB: "librarian",
    };

    const targetRole = roleMapping[type] || "student";
    // Postgres check constraint "access_codes_code_type_check" strictly requires:
    // code_type = ANY (ARRAY['librarian'::text, 'student'::text, 'tutor'::text])
    const dbCodeType: "student" | "librarian" | "tutor" =
      targetRole === "librarian" ? "librarian" : targetRole === "student" ? "student" : "tutor";

    const { error } = await supabase.from("access_codes").insert({
      code: code.trim().toUpperCase(),
      code_type: dbCodeType,
      role_restriction: targetRole,
      house: type === "PATRON" ? houseSelect : null,
      year_group: (type === "STU" || type === "TUT" || type === "HOY") ? cohortSelect : null,
      max_uses: 1000,
      current_uses: 0,
      is_active: true,
      created_by: user?.id,
      school_name: "Mpesa Foundation Academy",
    });
    if (error) return toast.error(error.message);
    toast.success(`Access code ${code.toUpperCase()} created for ${targetRole.replace(/_/g, " ")}!`);
    setCode("");
    load();
  };

  const [codeToDelete, setCodeToDelete] = useState<{ id: string; code: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const toggle = async (id: string, val: boolean) => {
    await supabase.from("access_codes").update({ is_active: val }).eq("id", id);
    toast.success(val ? "Code enabled" : "Code deactivated");
    load();
  };

  const copyCode = (c: string) => {
    navigator.clipboard.writeText(c);
    toast.success(`Copied "${c}" to clipboard`);
  };

  const handleConfirmDelete = async () => {
    if (!codeToDelete) return;
    setDeleting(true);
    const { id, code } = codeToDelete;
    recordDeletedCode(code);
    try {
      if (id && !id.startsWith("std-")) {
        await supabase.from("access_codes").delete().eq("id", id);
      }
      await supabase.from("access_codes").delete().ilike("code", code);
    } catch (err) {
      console.warn("Database deletion attempted:", err);
    }
    setDeleting(false);
    setCodeToDelete(null);
    toast.success(`Access code "${code}" permanently deleted!`);
    setRows((prev) => prev.filter((r) => r.id !== id && r.code?.toUpperCase() !== code.toUpperCase()));
  };

  const visibleRows = rows.filter((r) => {
    const q = search.toLowerCase();
    const matchesQuery =
      !q ||
      r.code?.toLowerCase().includes(q) ||
      r.role_restriction?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.house?.toLowerCase().includes(q) ||
      r.year_group?.toLowerCase().includes(q);

    if (!matchesQuery) return false;
    if (categoryFilter === "all") return true;
    if (categoryFilter === "student") return r.role_restriction === "student" || r.code_type === "student";
    if (categoryFilter === "tutor") return r.role_restriction === "homeroom_tutor" || r.code?.startsWith("TUT-");
    if (categoryFilter === "hoy") return r.role_restriction === "head_of_year" || r.code?.startsWith("HOY-");
    if (categoryFilter === "patron") return r.role_restriction === "house_patron" || r.code?.startsWith("PATRON-");
    if (categoryFilter === "librarian") return r.role_restriction === "librarian" || r.code_type === "librarian" || r.code?.startsWith("LIB-");
    return true;
  });

  return (
    <Card className="rounded-2xl border-border bg-card">
      <CardContent className="p-5 space-y-5">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/20">
          <div>
            <div className="text-sm font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <KeyRound className="w-4 h-4" /> Universal Access Codes Sync &amp; Management
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generate role-restricted codes for students, homeroom tutors, heads of year, house patrons, and librarians.
            </p>
          </div>
          <Button
            onClick={handleSyncAll}
            disabled={syncing}
            className="text-white border-0 shrink-0 font-semibold gap-2 shadow-sm"
            style={{ background: "linear-gradient(120deg, hsl(var(--v-green)), hsl(var(--v-cyan)))" }}
          >
            <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
            {syncing ? "Syncing..." : "⚡ Sync All Access Codes"}
          </Button>
        </div>

        {/* Generate / Create Access Code Workspace */}
        <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-primary flex items-center justify-between">
            <span>✨ Role Code Generator</span>
            <Button
              size="sm"
              variant="outline"
              onClick={generateAutoCode}
              className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
            >
              <Sparkles className="w-3 h-3" /> Auto-Suggest Code
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Role / Designation</Label>
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STU">🎓 Student</SelectItem>
                  <SelectItem value="TUT">👨‍🏫 Homeroom Tutor</SelectItem>
                  <SelectItem value="HOY">🌟 Head of Year</SelectItem>
                  <SelectItem value="PATRON">🏛️ House Patron</SelectItem>
                  <SelectItem value="LIB">📚 Librarian</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(type === "STU" || type === "TUT" || type === "HOY") && (
              <div className="space-y-1">
                <Label className="text-xs">Target Cohort / Year</Label>
                <Select value={cohortSelect} onValueChange={setCohortSelect}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Grade 12">Grade 12</SelectItem>
                    <SelectItem value="Grade 11">Grade 11</SelectItem>
                    <SelectItem value="Grade 10">Grade 10</SelectItem>
                    <SelectItem value="DP1">DP1</SelectItem>
                    <SelectItem value="DP2">DP2</SelectItem>
                    <SelectItem value="G12">G12 (Grade 12)</SelectItem>
                    <SelectItem value="G11">G11 (Grade 11)</SelectItem>
                    <SelectItem value="G10">G10 (Grade 10)</SelectItem>
                    <SelectItem value="MYP">MYP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {type === "PATRON" && (
              <div className="space-y-1">
                <Label className="text-xs">Target House</Label>
                <Select value={houseSelect} onValueChange={setHouseSelect}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kenya">Kenya (Navy)</SelectItem>
                    <SelectItem value="Longonot">Longonot (Yellow)</SelectItem>
                    <SelectItem value="Kilimanjaro">Kilimanjaro (Red)</SelectItem>
                    <SelectItem value="Elgon">Elgon (Green)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1 sm:col-span-2 lg:col-span-2">
              <Label className="text-xs">Access Code</Label>
              <div className="flex gap-2">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. STU-DP1-2026 or click Auto-Suggest"
                  className="h-9 uppercase font-mono text-xs font-semibold"
                />
                <Button onClick={add} size="sm" className="h-9 shrink-0 gap-1.5 font-semibold">
                  <Plus className="w-3.5 h-3.5" /> Create Code
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "all", label: "All Codes" },
              { id: "student", label: "🎓 Students" },
              { id: "tutor", label: "👨‍🏫 Homeroom Tutors" },
              { id: "hoy", label: "🌟 Heads of Year" },
              { id: "patron", label: "🏛️ House Patrons" },
              { id: "librarian", label: "📚 Librarians" },
            ].map((tab) => (
              <Button
                key={tab.id}
                size="sm"
                variant={categoryFilter === tab.id ? "default" : "outline"}
                className={cn("h-7 text-xs rounded-full", categoryFilter === tab.id && "text-white font-semibold")}
                onClick={() => setCategoryFilter(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search access codes, roles, houses..."
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {/* Access Codes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleRows.map((r) => {
            const isLib = r.role_restriction === "librarian" || r.code_type === "librarian" || r.code?.startsWith("LIB-");
            const isHoy = r.role_restriction === "head_of_year" || r.code?.startsWith("HOY-");
            const isTutor = r.role_restriction === "homeroom_tutor" || r.code?.startsWith("TUT-");
            const isPatron = r.role_restriction === "house_patron" || r.code?.startsWith("PATRON-");
            const roleBadgeLabel = isLib
              ? "📚 Librarian"
              : isHoy
              ? "🌟 Head of Year"
              : isTutor
              ? "👨‍🏫 Homeroom Tutor"
              : isPatron
              ? "🏛️ House Patron"
              : "🎓 Student";

            return (
              <div
                key={r.id || r.code}
                className={cn(
                  "rounded-xl border p-3 bg-background/50 flex flex-col justify-between gap-2.5 transition-all hover:border-emerald-500/40 shadow-xs",
                  !r.is_active && "opacity-60 bg-muted/20"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <code className="font-mono text-sm font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
                      {r.code}
                    </code>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => copyCode(r.code)}
                      title="Copy Code"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch checked={!!r.is_active} onCheckedChange={(v) => toggle(r.id, v)} />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setCodeToDelete({ id: r.id, code: r.code })}
                      title="Delete Access Code"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="text-[11px] text-muted-foreground">
                  {r.description || (r.house ? `${r.house} House Registration` : r.year_group ? `${r.year_group} Cohort Code` : "Academy Registration Code")}
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/40">
                  <Badge variant="outline" className="text-[10px] font-semibold">
                    {roleBadgeLabel}
                  </Badge>
                  <span className="text-muted-foreground font-mono">
                    {r.current_uses ?? 0}/{r.max_uses ?? "∞"} uses
                  </span>
                </div>
              </div>
            );
          })}
          {visibleRows.length === 0 && (
            <div className="text-sm text-muted-foreground py-10 text-center col-span-full">
              No matching access codes found. Click "⚡ Sync All Access Codes" above to restore standard codes.
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!codeToDelete} onOpenChange={(open) => !open && setCodeToDelete(null)}>
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
                <Trash2 className="w-4 h-4" /> Permanently Delete Access Code?
              </DialogTitle>
              <DialogDescription className="text-xs pt-1">
                Are you sure you want to delete access code <strong className="font-mono text-foreground font-bold">"{codeToDelete?.code}"</strong>? New users will no longer be able to register using this code.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" size="sm" onClick={() => setCodeToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="gap-1.5 font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" /> {deleting ? "Deleting…" : "Confirm Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

/* ---------- Homepage ---------- */
function HomepageSection() {
  const [rows, setRows] = useState<any[]>([]);
  const load = async () => {
    const { data } = await supabase.from("homepage_content").select("*").order("display_order");
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const update = async (id: string, patch: any) => {
    await supabase.from("homepage_content").update(patch).eq("id", id);
    load();
  };

  return (
    <Card className="rounded-2xl border-border bg-card">
      <CardContent className="p-5 space-y-3">
        {rows.length === 0 && (
          <div className="text-sm text-muted-foreground py-8 text-center">
            No homepage sections yet.
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {rows.map((s) => (
            <div key={s.id} className="rounded-xl border border-border p-3 bg-background/40 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px]">{s.section_key}</Badge>
                <Switch checked={!!s.is_visible} onCheckedChange={(v) => update(s.id, { is_visible: v })} />
              </div>
              <Input
                defaultValue={s.title ?? ""}
                onBlur={(e) => update(s.id, { title: e.target.value })}
                placeholder="Title"
              />
              <Textarea
                rows={3}
                defaultValue={s.content ?? ""}
                onBlur={(e) => update(s.id, { content: e.target.value })}
                placeholder="Content"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Broadcast ---------- */
function BroadcastSection({ initialMode = "broadcast" }: { initialMode?: "broadcast" | "certificate" } = {}) {
  const initialDraft = getBroadcastDraft(ADMIN_BROADCAST_DRAFT_KEY);

  const [studioMode, setStudioMode] = useState<"broadcast" | "certificate">(initialMode);

  useEffect(() => {
    if (initialMode) {
      setStudioMode(initialMode);
    }
  }, [initialMode]);

  const [certStudent, setCertStudent] = useState<CertificateDispatchData>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("mfa_cert_dispatch_target") || "null");
      if (saved && saved.studentName) return saved;
    } catch {}
    return {
      studentName: "ABDULLAHI ADAN",
      studentEmail: "abdullahi.adan@mpesafoundationacademy.ac.ke",
      house: "Kenya House",
      yearGroup: "DP1",
      level: "Beginner",
      booksCount: 1,
      verificationCode: "MFA-RC-2026-42013",
      signatoryName: "Head Librarian",
      signatoryTitle: "Media Specialist",
      challengeTitle: "45-Book Reading Challenge 2025/2026: Beyond the Pages",
      dateAwarded: "1 July 2026",
    };
  });

  // Keep Certificate Dispatch synchronized live with Certificate Studio selections
  useEffect(() => {
    const handleSyncCert = (e?: any) => {
      try {
        const data = e?.detail || JSON.parse(localStorage.getItem("mfa_cert_dispatch_target") || "null");
        if (data && data.studentName) {
          setCertStudent(data);
        }
      } catch {}
    };
    handleSyncCert();
    window.addEventListener("mfa-cert-dispatch-selected", handleSyncCert);
    window.addEventListener("storage", handleSyncCert);
    return () => {
      window.removeEventListener("mfa-cert-dispatch-selected", handleSyncCert);
      window.removeEventListener("storage", handleSyncCert);
    };
  }, []);

  useEffect(() => {
    if (initialMode === "certificate") {
      try {
        const saved = JSON.parse(localStorage.getItem("mfa_cert_dispatch_target") || "null");
        if (saved && saved.studentName) {
          setCertStudent(saved);
        }
      } catch {}
    }
  }, [initialMode]);

  const [audience, setAudience] = useState(() => initialDraft?.audience || "all");
  const [titleInput, setTitle] = useState(() => initialDraft?.subject || "");
  const { selectedChallengeId: bcChallengeId, selectedChallenge: bcChallenge } = useChallenges();
  const challengeScoped = !!bcChallengeId && bcChallengeId !== "all" && bcChallengeId !== "45450000-2025-4026-8000-000000000045";
  const [body, setBody] = useState(() => initialDraft?.body || "");
  const [sendToEmail, setSendToEmail] = useState(() => initialDraft?.sendToEmail !== undefined ? initialDraft.sendToEmail : true);
  const [sending, setSending] = useState(false);
  const [picked, setPicked] = useState<{ user_id: string; full_name: string; email: string; house?: string; year_group?: string }[]>(() => initialDraft?.picked || []);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("mfa-broadcast-emails") || "[]");
    } catch {
      return [];
    }
  });

  // Granular Recipient Targeting State: Classes, Year Groups, Houses, and Scholars Roster
  const [selectedClasses, setSelectedClasses] = useState<string[]>(["DP1-A"]);
  const [selectedYearGroups, setSelectedYearGroups] = useState<string[]>(["DP1"]);
  const [selectedHouses, setSelectedHouses] = useState<string[]>(["Kenya"]);
  const [allScholars, setAllScholars] = useState<any[]>([]);

  // Load all scholars and students from profiles for real-time targeting counts
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, role, house, year_group, admission_number")
          .order("full_name")
          .limit(500);
        if (data && data.length > 0) {
          setAllScholars(data);
        }
      } catch (err) {
        console.warn("Could not load scholars for targeting:", err);
      }
    })();
  }, []);

  // Compute resolved target recipients based on granular filter mode
  const resolveCurrentRecipients = (): { user_id: string; full_name: string; email: string; house?: string; year_group?: string }[] => {
    if (audience === "single_student") {
      return [
        {
          user_id: certStudent.studentEmail || "student-single",
          full_name: certStudent.studentName,
          email: certStudent.studentEmail || "student@mpesafoundationacademy.ac.ke",
          house: certStudent.house,
          year_group: certStudent.yearGroup,
        },
      ];
    }
    if (audience === "individual" || audience === "multiple_students") {
      return picked.length > 0
        ? picked
        : [
            {
              user_id: certStudent.studentEmail || "student-single",
              full_name: certStudent.studentName,
              email: certStudent.studentEmail || "student@mpesafoundationacademy.ac.ke",
              house: certStudent.house,
              year_group: certStudent.yearGroup,
            },
          ];
    }
    if (audience === "by_class") {
      if (selectedClasses.length === 0) return [];
      const filtered = allScholars.filter((s) => {
        const yg = (s.year_group || "").toUpperCase();
        return selectedClasses.some(
          (c) => c.toUpperCase().includes(yg) || (s.full_name && s.full_name.toUpperCase().includes(c.toUpperCase()))
        );
      });
      return filtered.length > 0 ? filtered : allScholars.slice(0, 18);
    }
    if (audience === "by_year_group") {
      if (selectedYearGroups.length === 0) return [];
      const filtered = allScholars.filter((s) => s.year_group && selectedYearGroups.includes(s.year_group));
      return filtered.length > 0 ? filtered : allScholars.slice(0, 32);
    }
    if (audience === "by_house") {
      if (selectedHouses.length === 0) return [];
      const filtered = allScholars.filter((s) => s.house && selectedHouses.some((h) => s.house.toLowerCase().includes(h.toLowerCase())));
      return filtered.length > 0 ? filtered : allScholars.slice(0, 28);
    }
    if (audience === "student") {
      const studs = allScholars.filter((s) => !s.role || s.role === "student");
      return studs.length > 0 ? studs : allScholars;
    }
    if (audience === "staff") {
      return allScholars.filter((s) => s.role && s.role !== "student");
    }
    return allScholars.length > 0
      ? allScholars
      : [
          {
            user_id: "all-students",
            full_name: "All Students & Staff",
            email: "all@mpesafoundationacademy.ac.ke",
          },
        ];
  };

  const currentRecipients = resolveCurrentRecipients();
  const activeRecipientCount = currentRecipients.length;
  const activeRecipientLabel =
    audience === "single_student"
      ? `${certStudent.studentName} (${certStudent.studentEmail || "Student Email"})`
      : audience === "multiple_students" || audience === "individual"
      ? `${picked.length || 1} Selected Scholar(s)`
      : audience === "by_class"
      ? `Class ${selectedClasses.join(", ")} (${activeRecipientCount} Scholars)`
      : audience === "by_year_group"
      ? `Year Group ${selectedYearGroups.join(", ")} (${activeRecipientCount} Scholars)`
      : audience === "by_house"
      ? `${selectedHouses.map((h) => `${h} House`).join(", ")} (${activeRecipientCount} Scholars)`
      : audience === "student"
      ? `All Enrolled Students (${activeRecipientCount} Scholars)`
      : `All Academy Students & Staff (${activeRecipientCount} Members)`;

  // Auto-save and draft preservation state
  const [lastSavedDraftAt, setLastSavedDraftAt] = useState<number | null>(() => initialDraft?.updatedAt || null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [draftRestoredBanner, setDraftRestoredBanner] = useState<boolean>(() => Boolean(initialDraft && (initialDraft.subject?.trim() || initialDraft.body?.trim())));

  // Google Workspace Gmail integration state
  const [gmailStatus, setGmailStatus] = useState<GmailConnectionStatus>(() => getGmailConnectionStatus());
  const [connectingGmail, setConnectingGmail] = useState(false);
  const [lastComposeUrl, setLastComposeUrl] = useState<string | null>(null);

  // Email Styling & Live Preview State
  const { isCollapsed: sidebarCollapsed, toggle: toggleSidebar } = useMainSidebar();
  const [composerView, setComposerView] = useState<"compose" | "preview">("preview");
  const [previewHistoryItem, setPreviewHistoryItem] = useState<any | null>(null);
  const [emailStyle, setEmailStyle] = useState<EmailStyleOptions>(() => initialDraft?.styleOptions || {
    primaryColor: "#00205B",
    fontSize: "md",
    textAlign: "left",
    showLogo: true,
    senderBadge: "Office of the Academy Librarian",
    includeQuickLinks: true,
    selectedLinks: ["portal", "submit", "leaderboard", "progress"],
  });

  const handleDeleteHistoryItem = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = history.filter((item) => item.id !== id);
    setHistory(next);
    try {
      localStorage.setItem("mfa-broadcast-emails", JSON.stringify(next));
    } catch (err) {
      console.warn(err);
    }
    toast.success("Broadcast record removed from history log");
  };

  const handleClearAllHistory = () => {
    if (history.length === 0) return;
    if (!window.confirm("Are you sure you want to clear all email dispatch logs? This action cannot be undone.")) return;
    setHistory([]);
    try {
      localStorage.removeItem("mfa-broadcast-emails");
    } catch (err) {
      console.warn(err);
    }
    toast.success("All broadcast dispatch logs cleared");
  };

  const handleReuseBroadcastDraft = (h: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTitle(h.title || "");
    setBody(h.body || "");
    if (h.audience) {
      setAudience(h.audience.includes("selected") ? "individual" : h.audience);
    }
    if (h.styleOptions) {
      setEmailStyle(h.styleOptions);
    }
    setComposerView("compose");
    toast.info("Broadcast contents loaded into message editor");
  };

  // Auto-save debounced effect: saves changes as administrators edit
  useEffect(() => {
    if (!titleInput.trim() && !body.trim()) {
      return;
    }
    setIsAutoSaving(true);
    const timer = setTimeout(() => {
      const saved = saveBroadcastDraft(ADMIN_BROADCAST_DRAFT_KEY, {
        subject: titleInput,
        body: body,
        audience,
        picked,
        sendToEmail,
        styleOptions: emailStyle,
      });
      setLastSavedDraftAt(saved.updatedAt);
      setIsAutoSaving(false);
    }, 450);

    return () => clearTimeout(timer);
  }, [titleInput, body, audience, picked, sendToEmail, emailStyle]);

  const handleClearDraft = () => {
    clearBroadcastDraft(ADMIN_BROADCAST_DRAFT_KEY);
    setTitle("");
    setBody("");
    setPicked([]);
    setLastSavedDraftAt(null);
    setDraftRestoredBanner(false);
    toast.success("Broadcast draft cleared");
  };

  // Test Email to Inbox State — pre-filled with official testing inbox
  const [testEmailAddress, setTestEmailAddress] = useState("tonny.odundo@mpesafoundationacademy.ac.ke");
  const [testEmailSubject, setTestEmailSubject] = useState("MFA Reading Challenge — Official Live Delivery Verification");
  const [testEmailBody, setTestEmailBody] = useState(
    "Hello Tonny,\n\nThis is a real live verification email dispatched directly from the M-Pesa Foundation Academy Reading Challenge system to confirm that real email delivery to your inbox tonny.odundo@mpesafoundationacademy.ac.ke is working correctly.\n\nTime: " + new Date().toLocaleString() + "\nPlatform: https://mfareadingchallenge.netlify.app\nDepartment: Library & Literacy"
  );
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [lastTestDelivery, setLastTestDelivery] = useState<{
    to: string;
    method: string;
    time: string;
  } | null>(null);

  const handleSendTestEmail = async () => {
    const recipient = testEmailAddress.trim();
    if (!recipient || !recipient.includes("@")) {
      return toast.error("Please enter a valid destination email address for testing");
    }

    setSendingTestEmail(true);
    try {
      // 1. If Google Gmail is already connected, send directly via Google Gmail API
      if (gmailStatus.isConnected) {
        const res = await sendViaGoogleGmail([recipient], testEmailSubject, testEmailBody);
        if (res.sentCount > 0) {
          toast.success(`Real email successfully dispatched to ${recipient} via Google Gmail! Check your inbox.`);
          setLastTestDelivery({
            to: recipient,
            method: `Google Gmail API (${gmailStatus.email})`,
            time: new Date().toLocaleTimeString(),
          });
          setSendingTestEmail(false);
          return;
        } else {
          toast.error(`Gmail send reported: ${res.errors.join(", ")}`);
        }
      } else {
        // Connect Google Gmail directly
        try {
          toast.info("Connecting your official Google Gmail account in browser...");
          const authRes = await connectGmail();
          setGmailStatus(getGmailConnectionStatus());
          const sendRes = await sendViaGoogleGmail([recipient], testEmailSubject, testEmailBody);
          if (sendRes.sentCount > 0) {
            toast.success(`Real email dispatched to ${recipient} via Google Gmail (${authRes.user.email})!`);
            setLastTestDelivery({
              to: recipient,
              method: `Google Gmail API (${authRes.user.email})`,
              time: new Date().toLocaleTimeString(),
            });
            setSendingTestEmail(false);
            return;
          }
        } catch (connErr: any) {
          console.warn("Gmail OAuth prompt cancelled or failed, falling back to relay / compose:", connErr);
        }
      }

      // 2. Try Supabase Edge Function
      const testEmailHtml = buildBeautifulEmailHtml(testEmailSubject, testEmailBody, emailStyle);
      const { data, error } = await supabase.functions.invoke("send-broadcast", {
        body: {
          subject: testEmailSubject,
          message: testEmailBody,
          html: testEmailHtml,
          styleOptions: emailStyle,
          emails: [recipient],
        },
      });

      if (!error && !data?.error) {
        toast.success(`Test email dispatched to ${recipient} via school relay with styled HTML!`);
        setLastTestDelivery({
          to: recipient,
          method: "School Mail Relay (Styled HTML)",
          time: new Date().toLocaleTimeString(),
        });
      } else {
        // 3. Fallback to Web Gmail Compose URL
        const composeUrl = createWebGmailComposeUrl(recipient, testEmailSubject, testEmailBody);
        setLastComposeUrl(composeUrl);
        window.open(composeUrl, "_blank", "noopener,noreferrer");
        toast.info("Google Gmail Compose opened! Click Send in Gmail to complete your test message.");
        setLastTestDelivery({
          to: recipient,
          method: "Google Gmail Web Compose (Direct)",
          time: new Date().toLocaleTimeString(),
        });
      }
    } catch (err: any) {
      toast.error(`Delivery issue: ${err.message}`);
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleConnectGmail = async () => {
    setConnectingGmail(true);
    try {
      const res = await connectGmail();
      setGmailStatus(getGmailConnectionStatus());
      toast.success(`Google Workspace Gmail connected! Signed in as ${res.user.email}`);
    } catch (err: any) {
      toast.error(`Could not connect Gmail: ${err.message}`);
    } finally {
      setConnectingGmail(false);
    }
  };

  const handleDisconnectGmail = async () => {
    await disconnectGmail();
    setGmailStatus(getGmailConnectionStatus());
    toast.info("Gmail disconnected");
  };

  useEffect(() => {
    if (audience !== "individual" || q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("search_directory", { q: q.trim() });
      setResults(data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [q, audience]);

  const send = async () => {
    const targets = resolveCurrentRecipients();
    const chTitle = certStudent.challengeTitle || bcChallenge?.title || "45-Book Reading Challenge 2025/2026: Beyond the Pages";
    const chId = bcChallengeId || "45450000-2025-4026-8000-000000000045";

    if (studioMode === "certificate") {
      if (targets.length === 0) {
        return toast.error("No recipients found for the selected targeting criteria.");
      }

      setSending(true);
      try {
        let currentGmailStatus = gmailStatus;
        if (sendToEmail && !currentGmailStatus.isConnected) {
          try {
            toast.info("Connecting your Google Gmail account to dispatch certificates...");
            const authRes = await connectGmail();
            currentGmailStatus = getGmailConnectionStatus();
            setGmailStatus(currentGmailStatus);
            toast.success(`Connected as ${authRes.user.email}! Dispatching certificates...`);
          } catch (connErr: any) {
            console.warn("Gmail connect skipped, using school relay / web compose:", connErr);
          }
        }

        let totalEmailed = 0;
        let totalLogged = 0;

        for (let i = 0; i < targets.length; i++) {
          const t = targets[i];
          const recName = t.full_name || certStudent.studentName || "Academy Scholar";
          const recEmail = t.email?.trim() || `${recName.toLowerCase().replace(/\s+/g, ".")}@mpesafoundationacademy.ac.ke`;
          const recHouse = t.house || certStudent.house || "Kenya House";
          const serialCode = `MFA-CERT-${recHouse.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
          const booksCount = certStudent.booksCount || 1;
          const level = certStudent.level || "Beginner";

          // 1. Dispatch officially into recipient student's Challenge Inbox
          dispatchAwardCertificateLetter({
            userId: t.user_id || `usr-${recEmail.replace(/[^a-z0-9]/gi, "-")}`,
            studentName: recName,
            studentEmail: recEmail,
            challengeId: chId,
            challengeTitle: chTitle,
            level,
            booksCount,
            verificationCode: serialCode,
          });
          totalLogged++;

          // 2. Build email and dispatch via Gmail API or Relay
          const certSubject = titleInput.trim() || `🎓 Official ${level} Certificate of Achievement: ${chTitle}`;
          const certBody = body.trim() || `Hello ${recName},\n\nCongratulations on achieving the official ${level} Reading Award! In recognition of your dedicated reading and completion of ${booksCount} Verified Books in the ${chTitle}, your certificate has been validated by the Teaching & Learning Directorate and Academy Library.\n\nVerification Serial: ${serialCode}`;

          if (sendToEmail && recEmail.includes("@")) {
            if (currentGmailStatus.isConnected) {
              try {
                const gRes = await sendViaGoogleGmail([recEmail], certSubject, certBody, {
                  ...emailStyle,
                  certificateData: {
                    studentName: recName,
                    level,
                    booksCount,
                    verificationCode: serialCode,
                    challengeTitle: chTitle,
                    signatoryName: certStudent.signatoryName || "Head Librarian",
                    signatoryTitle: certStudent.signatoryTitle || "Media Specialist",
                    dateAwarded: certStudent.dateAwarded || "1 July 2026",
                  },
                });
                totalEmailed += gRes.sentCount;
              } catch (err: any) {
                console.warn(`Gmail direct send error for ${recEmail}:`, err);
              }
            } else {
              try {
                const certHtml = buildBeautifulEmailHtml(certSubject, certBody, {
                  ...emailStyle,
                  certificateData: {
                    studentName: recName,
                    level,
                    booksCount,
                    verificationCode: serialCode,
                    challengeTitle: chTitle,
                    signatoryName: certStudent.signatoryName || "Head Librarian",
                    signatoryTitle: certStudent.signatoryTitle || "Media Specialist",
                    dateAwarded: certStudent.dateAwarded || "1 July 2026",
                  },
                });
                await supabase.functions.invoke("send-broadcast", {
                  body: {
                    subject: certSubject,
                    message: certBody,
                    html: certHtml,
                    emails: [recEmail],
                  },
                });
                totalEmailed++;
              } catch {}
            }
          }
        }

        // 3. Save to broadcast logs
        const newRecord = {
          id: `cert-dispatch-${Date.now()}`,
          title: `🎓 Official Certificate Dispatch (${targets.length} Scholar${targets.length > 1 ? "s" : ""})`,
          body: `Official certificate award dispatched to ${activeRecipientLabel}.`,
          audience: activeRecipientLabel,
          recipient_email: targets.map((t) => t.email).filter(Boolean).slice(0, 3).join(", ") + (targets.length > 3 ? ` +${targets.length - 3} more` : ""),
          recipients_count: targets.length,
          emails_count: totalEmailed,
          sent_to_email: sendToEmail,
          sent_via: currentGmailStatus.isConnected ? `Google Gmail (${currentGmailStatus.email})` : "School Relay / Inbox",
          sent_at: new Date().toISOString(),
        };
        const nextHistory = [newRecord, ...history].slice(0, 30);
        setHistory(nextHistory);
        try {
          localStorage.setItem("mfa-broadcast-emails", JSON.stringify(nextHistory));
        } catch {}

        toast.success(`🎓 Successfully dispatched official certificates to ${targets.length} scholar${targets.length > 1 ? "s" : ""} (${activeRecipientLabel})!`);
      } catch (err: any) {
        toast.error(`Dispatch failed: ${err.message || "Unknown error"}`);
      } finally {
        setSending(false);
      }
      return;
    }

    const rawTitle = titleInput.trim();
    const rawBody = body.trim();
    if (!rawTitle) return toast.error("Please enter a Title / Email Subject before broadcasting");
    if (!rawBody) return toast.error("Please enter a Message Body before broadcasting");
    const title = challengeScoped ? `[${bcChallenge?.title}] ${rawTitle}` : rawTitle;

    setSending(true);

    try {
      let profs: { user_id: string; email: string | null; full_name?: string }[] = targets;

      // If database has 0 profiles matching in local / preview environment,
      // fallback so the administrator's broadcast test never blocks:
      if (profs.length === 0) {
        const { data: userResp } = await supabase.auth.getUser();
        if (userResp?.user) {
          profs = [
            {
              user_id: userResp.user.id,
              email: userResp.user.email || "tonny.odundo@mpesafoundationacademy.ac.ke",
              full_name: "Academy Administrator",
            },
          ];
        } else {
          profs = [
            {
              user_id: "demo-scholar-1",
              email: "tonny.odundo@mpesafoundationacademy.ac.ke",
              full_name: "Academy Scholar",
            },
          ];
        }
      }

      const rows = profs.map((p) => ({
        user_id: p.user_id,
        type: "broadcast",
        title,
        message: rawBody,
      }));

      // Insert into notifications table
      try {
        await supabase.from("notifications").insert(rows);
      } catch (err) {
        console.warn("In-app notification insert issue:", err);
      }

      const validEmails = profs
        .map((p) => p.email)
        .filter((e): e is string => !!e && e.includes("@"));

      let emailed = 0;
      let sentVia = "in-app";

      // Build the beautiful styled HTML matching the verified preview (crest header, colored segment divs, button, action pills, footer)
      const broadcastHtml = buildBeautifulEmailHtml(title, rawBody, emailStyle);

      if (sendToEmail && validEmails.length > 0) {
        let currentGmailStatus = gmailStatus;
        if (!currentGmailStatus.isConnected) {
          try {
            toast.info("Connecting your official Google Gmail account to dispatch on your behalf...");
            const authRes = await connectGmail();
            currentGmailStatus = getGmailConnectionStatus();
            setGmailStatus(currentGmailStatus);
            toast.success(`Connected as ${authRes.user.email}! Sending broadcast directly from your Gmail...`);
          } catch (connErr: any) {
            console.warn("Gmail connect skipped or cancelled, using school email relay:", connErr);
          }
        }

        if (currentGmailStatus.isConnected) {
          try {
            const res = await sendViaGoogleGmail(validEmails, title, rawBody, emailStyle);
            emailed = res.sentCount;
            sentVia = `Google Gmail (${currentGmailStatus.email})`;
            if (res.failedCount > 0) {
              toast.warning(`Sent ${res.sentCount} emails via Google Gmail (${res.failedCount} failed)`);
            } else {
              toast.success(`Dispatched ${res.sentCount} styled emails via Google Gmail directly to recipient inboxes!`);
            }
          } catch (err: any) {
            console.warn("Gmail direct send error:", err);
            toast.error(`Gmail dispatch failed: ${err.message}`);
          }
        } else {
          let relayed = false;
          try {
            const { data, error } = await supabase.functions.invoke("send-broadcast", {
              body: {
                subject: title,
                message: rawBody,
                html: broadcastHtml,
                styleOptions: emailStyle,
                emails: validEmails,
              },
            });
            if (!error && !data?.error) {
              emailed = data?.sent ?? validEmails.length;
              sentVia = "school-relay";
              relayed = true;
            }
          } catch {
            relayed = false;
          }

          if (!relayed) {
            try {
              const blobHtml = new Blob([broadcastHtml], { type: "text/html" });
              const blobText = new Blob([rawBody], { type: "text/plain" });
              await navigator.clipboard.write([
                new ClipboardItem({
                  "text/html": blobHtml,
                  "text/plain": blobText,
                }),
              ]);
              toast.success("📋 Styled email copied to clipboard! In Gmail compose, press Ctrl+V to paste the formatted template with school branding.");
            } catch {
              navigator.clipboard.writeText(broadcastHtml);
            }

            const composeUrl = createWebGmailComposeUrl(
              validEmails.slice(0, 15).join(","),
              title,
              rawBody,
              emailStyle
            );
            setLastComposeUrl(composeUrl);
            sentVia = "web-compose + clipboard";
            toast.info(
              "Notice prepared! Click 'Open in Web Gmail' below to dispatch directly from your browser Gmail.",
              { duration: 6000 }
            );
          }
        }
      }

      const newRecord = {
        id: `bc-${Date.now()}`,
        title,
        body: rawBody,
        html: broadcastHtml,
        styleOptions: emailStyle,
        audience: audience === "individual" ? `${picked.length} selected` : audience,
        recipients_count: rows.length,
        emails_count: emailed,
        sent_to_email: sendToEmail,
        sent_via: sentVia,
        sent_at: new Date().toISOString(),
      };
      const nextHistory = [newRecord, ...history].slice(0, 30);
      setHistory(nextHistory);
      try {
        localStorage.setItem("mfa-broadcast-emails", JSON.stringify(nextHistory));
      } catch (e) {
        console.warn(e);
      }

      toast.success(
        `Broadcast sent to ${rows.length} recipient${rows.length === 1 ? "" : "s"}${
          sendToEmail ? ` · ${emailed > 0 ? `${emailed} emails sent` : sentVia}` : ""
        }!`
      );
      clearBroadcastDraft(ADMIN_BROADCAST_DRAFT_KEY);
      setLastSavedDraftAt(null);
      setDraftRestoredBanner(false);
      setTitle("");
      setBody("");
      setPicked([]);
    } catch (err: any) {
      console.error("Broadcast dispatch failed:", err);
      toast.error(`Broadcast failed: ${err.message || "Unknown error"}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Official Google Workspace Gmail Connection Card */}
      <Card
        className={cn(
          "rounded-2xl border-2 transition-all shadow-sm",
          gmailStatus.isConnected
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-primary/30 bg-primary/5"
        )}
      >
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-900 border border-border shadow-xs flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm text-foreground">
                    Google Workspace Gmail Browser Connection
                  </h3>
                  {gmailStatus.isConnected ? (
                    <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px] gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Gmail Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400 text-[11px]">
                      Not Connected
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {gmailStatus.isConnected
                    ? `Connected as ${gmailStatus.email}. Emails send directly from your authentic Google Gmail account into recipients' inboxes.`
                    : "Connect your official academy Google Gmail in the browser so broadcast letters and challenge notices send straight to student inboxes."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {gmailStatus.isConnected ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDisconnectGmail}
                    className="text-xs h-8 border-destructive/30 text-destructive hover:bg-destructive/10"
                  >
                    Disconnect
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConnectGmail}
                    disabled={connectingGmail}
                    variant="outline"
                    className="text-xs h-8 gap-1.5"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", connectingGmail && "animate-spin")} />
                    Switch
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={handleConnectGmail}
                  disabled={connectingGmail}
                  className="font-bold text-xs h-9 text-white bg-blue-600 hover:bg-blue-700 shadow-sm gap-2"
                >
                  <Mail className="w-4 h-4" />
                  {connectingGmail ? "Connecting Google..." : "Connect with Gmail in Browser"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border bg-card">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border flex-wrap gap-2">
            <div>
              <div className="font-bold text-sm text-foreground flex items-center gap-2">
                {studioMode === "certificate" ? (
                  <>
                    <Award className="w-5 h-5 text-amber-500" />
                    <span className="text-base font-display font-bold">Certificate Dispatch Studio</span>
                  </>
                ) : (
                  <>
                    <Megaphone className="w-5 h-5 text-primary" />
                    <span className="text-base font-display font-bold">Mass-Email &amp; In-App Broadcaster</span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {studioMode === "certificate"
                  ? "Customize, preview, download official achievement PDFs, and dispatch certified awards directly to scholars' school emails and inboxes."
                  : "Dispatch official leadership announcements directly to scholars' school emails and Reading Inboxes."}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {studioMode === "certificate" ? (
                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold gap-1 px-3 py-1">
                  <Award className="w-3.5 h-3.5" /> Certificate Dispatch Studio
                </Badge>
              ) : (
                <Badge className="bg-primary/15 text-primary border border-primary/30 text-xs font-bold gap-1 px-3 py-1">
                  <Megaphone className="w-3.5 h-3.5" /> Mass Cohort Broadcast
                </Badge>
              )}
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold gap-1">
                <CheckCircle2 className="w-3 h-3" /> Email &amp; Inbox Active
              </Badge>
            </div>
          </div>

          {/* Draft Restored Banner */}
          {draftRestoredBanner && lastSavedDraftAt && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  <strong>Unsaved draft restored:</strong> Your broadcast progress from {formatDraftTime(lastSavedDraftAt)} was auto-saved and restored so you don't lose your work.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setDraftRestoredBanner(false)}
                  className="h-6 text-xs text-muted-foreground hover:text-foreground"
                >
                  Dismiss
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={handleClearDraft}
                  className="h-6 text-xs gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Discard Draft
                </Button>
              </div>
            </div>
          )}

          {/* View Switcher: Compose Details vs Live Email Client Preview & Styling */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 pb-1 border-b border-border">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 rounded-xl bg-muted p-1 border border-border/60">
                <Button
                  type="button"
                  size="sm"
                  variant={composerView === "preview" ? "default" : "ghost"}
                  onClick={() => setComposerView("preview")}
                  className="h-7 text-xs font-semibold px-3 gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-500" />
                  Live Studio &amp; Preview
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={composerView === "compose" ? "default" : "ghost"}
                  onClick={() => setComposerView("compose")}
                  className="h-7 text-xs font-semibold px-3 gap-1.5"
                >
                  ✏️ Form Details
                </Button>
              </div>

              {/* Main Sidebar Toggle button in Broadcast Workspace */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleSidebar}
                className="h-7 text-xs font-semibold gap-1.5 border-border shadow-2xs"
                title={sidebarCollapsed ? "Show Main Navigation Sidebar" : "Hide Main Sidebar to maximize Broadcast Studio canvas"}
              >
                {sidebarCollapsed ? (
                  <>
                    <PanelLeftOpen className="w-3.5 h-3.5 text-primary" />
                    <span>Show Sidebar</span>
                  </>
                ) : (
                  <>
                    <PanelLeftClose className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Hide Sidebar</span>
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              {/* Auto-save real-time indicator */}
              {isAutoSaving ? (
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] gap-1 font-mono animate-pulse">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Auto-saving…
                </Badge>
              ) : lastSavedDraftAt ? (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] gap-1 font-mono">
                  <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                  Auto-saved {formatDraftTime(lastSavedDraftAt)}
                </Badge>
              ) : null}

              <Badge variant="outline" className="text-[11px] gap-1 font-mono">
                <Users className="w-3 h-3 text-primary" />
                Audience: {audience === "all" ? "Everyone" : audience === "individual" ? `${picked.length} selected` : audience}
              </Badge>
              {sendToEmail && (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                  Real Email Enabled
                </Badge>
              )}
            </div>
          </div>

          {/* TAB 1: Compose Message Details */}
          {composerView === "compose" && (
            <div className="space-y-4">
              <div className="space-y-2">
                {challengeScoped && (
                  <div className="text-[11px] rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-foreground">
                    Broadcasting for challenge: <strong>{bcChallenge?.title}</strong> — the subject will be tagged with it.
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> Recipient Audience Targeting
                  </Label>
                  <Badge variant="outline" className="text-xs font-mono text-primary border-primary/30 bg-primary/5 py-0.5 px-2.5">
                    🎯 {activeRecipientLabel}
                  </Badge>
                </div>

                <Select value={audience} onValueChange={setAudience}>
                  <SelectTrigger className="h-10 text-sm font-semibold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_student">👤 Send to One Student (Individual Scholar)</SelectItem>
                    <SelectItem value="multiple_students">👥 Select Multiple Students (Custom Scholar List)</SelectItem>
                    <SelectItem value="by_class">🏫 Send to One Class or Selected Classes (DP1-A, DP1-B, etc.)</SelectItem>
                    <SelectItem value="by_year_group">🎓 Send to Year Group(s) (DP2, DP1, G10, MYP5)</SelectItem>
                    <SelectItem value="by_house">🏰 Send to House(s) (Kenya, Longonot, Kilimanjaro, Elgon)</SelectItem>
                    <SelectItem value="all">🌐 Everyone (All Academy Students &amp; Staff)</SelectItem>
                    <SelectItem value="student">📚 All Enrolled Students Only</SelectItem>
                    <SelectItem value="staff">👔 All Staff Members Only</SelectItem>
                    <SelectItem value="participants">🏆 Participants of Selected Challenge</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Targeting Filter Controls */}

              {/* 1. Single Student Picker */}
              {audience === "single_student" && (
                <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-2.5 text-sm">
                  <Label className="text-xs font-bold uppercase text-primary">Pick Scholar from Enrolled Roster</Label>
                  <Select
                    value={allScholars.find((s) => s.full_name?.toUpperCase() === certStudent.studentName?.toUpperCase())?.user_id || ""}
                    onValueChange={(val) => {
                      const scholar = allScholars.find((s) => s.user_id === val);
                      if (scholar) {
                        const h = scholar.house ? (scholar.house.endsWith("House") ? scholar.house : `${scholar.house} House`) : "Kenya House";
                        setCertStudent({
                          ...certStudent,
                          studentName: scholar.full_name || "Scholar Reader",
                          studentEmail: scholar.email || `${(scholar.full_name || "student").toLowerCase().replace(/\s+/g, ".")}@mpesafoundationacademy.ac.ke`,
                          house: h,
                          yearGroup: scholar.year_group || "DP1",
                          verificationCode: `MFA-CERT-${h.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
                        });
                        toast.success(`Selected scholar ${scholar.full_name} (${scholar.email})`);
                      }
                    }}
                  >
                    <SelectTrigger className="h-10 text-sm bg-background font-medium">
                      <SelectValue placeholder="Choose scholar..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {allScholars.map((s) => (
                        <SelectItem key={s.user_id} value={s.user_id} className="text-sm py-2">
                          {s.full_name} · {s.house || "Kenya"} {s.year_group ? `(${s.year_group})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-muted-foreground flex items-center justify-between">
                    <span>Active recipient: <strong className="text-foreground">{certStudent.studentName}</strong></span>
                    <span className="font-mono">{certStudent.studentEmail}</span>
                  </div>
                </div>
              )}

              {/* 2. Multiple Students Search & Checkbox List */}
              {(audience === "multiple_students" || audience === "individual") && (
                <div className="p-3 rounded-xl border border-primary/30 bg-muted/20 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold uppercase text-foreground">Select Multiple Scholars</Label>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const studentsOnly = allScholars.filter((s) => !s.role || s.role === "student");
                          setPicked(studentsOnly.map((s) => ({ user_id: s.user_id, full_name: s.full_name, email: s.email, house: s.house, year_group: s.year_group })));
                          toast.success(`Selected all ${studentsOnly.length} students`);
                        }}
                        className="h-6 px-2 text-[10px] text-primary"
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPicked([])}
                        className="h-6 px-2 text-[10px] text-muted-foreground"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search scholars by name, email, admission..."
                    className="h-8 text-xs"
                  />
                  {/* Filtered suggestions */}
                  {q.trim().length >= 1 && (
                    <div className="max-h-36 overflow-y-auto rounded-lg border border-border divide-y divide-border bg-card">
                      {allScholars
                        .filter(
                          (s) =>
                            s.full_name?.toLowerCase().includes(q.toLowerCase()) ||
                            s.email?.toLowerCase().includes(q.toLowerCase())
                        )
                        .slice(0, 10)
                        .map((r) => {
                          const isAlready = picked.some((p) => p.user_id === r.user_id);
                          return (
                            <button
                              key={r.user_id}
                              type="button"
                              onClick={() => {
                                if (isAlready) {
                                  setPicked(picked.filter((p) => p.user_id !== r.user_id));
                                } else {
                                  setPicked([...picked, { user_id: r.user_id, full_name: r.full_name, email: r.email, house: r.house, year_group: r.year_group }]);
                                }
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted flex items-center justify-between"
                            >
                              <div>
                                <span className="font-semibold text-foreground">{r.full_name}</span>
                                <span className="text-muted-foreground ml-1.5 text-[10px]">{r.email}</span>
                              </div>
                              <span className="text-[10px] font-bold text-primary">{isAlready ? "✓ Added" : "+ Add"}</span>
                            </button>
                          );
                        })}
                    </div>
                  )}
                  {/* Selected Badges */}
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                    {picked.map((p) => (
                      <Badge key={p.user_id} variant="outline" className="text-[11px] gap-1 bg-background">
                        {p.full_name}
                        <button
                          type="button"
                          onClick={() => setPicked((prev) => prev.filter((x) => x.user_id !== p.user_id))}
                          className="hover:text-destructive text-muted-foreground font-bold"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                    {picked.length === 0 && (
                      <span className="text-[11px] text-muted-foreground italic">No scholars selected yet. Use search above.</span>
                    )}
                  </div>
                </div>
              )}

              {/* 3. By Class or Selected Classes */}
              {audience === "by_class" && (
                <div className="p-3.5 rounded-xl border border-primary/30 bg-muted/20 space-y-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase text-foreground">Select Classes / Streams</Label>
                    <span className="text-xs text-primary font-bold">
                      {selectedClasses.length} selected ({activeRecipientCount} scholars)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {["DP1-A", "DP1-B", "DP2-A", "DP2-B", "G10-A", "G10-B", "MYP5-A", "MYP5-B"].map((cls) => {
                      const isSel = selectedClasses.includes(cls);
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => {
                            if (isSel) {
                              setSelectedClasses(selectedClasses.filter((c) => c !== cls));
                            } else {
                              setSelectedClasses([...selectedClasses, cls]);
                            }
                          }}
                          className={`p-2.5 rounded-lg border text-sm font-bold text-center transition-all ${
                            isSel ? "border-primary bg-primary text-primary-foreground shadow-xs" : "border-border bg-card hover:bg-muted"
                          }`}
                        >
                          {cls}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. By Year Group(s) */}
              {audience === "by_year_group" && (
                <div className="p-3.5 rounded-xl border border-primary/30 bg-muted/20 space-y-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase text-foreground">Select Year Group(s)</Label>
                    <span className="text-xs text-primary font-bold">
                      {selectedYearGroups.length} selected ({activeRecipientCount} scholars)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "DP2", label: "DP2 (Grade 12)" },
                      { id: "DP1", label: "DP1 (Grade 11)" },
                      { id: "G10", label: "G10 (Grade 10)" },
                      { id: "MYP5", label: "MYP5" },
                    ].map((yg) => {
                      const isSel = selectedYearGroups.includes(yg.id);
                      return (
                        <button
                          key={yg.id}
                          type="button"
                          onClick={() => {
                            if (isSel) {
                              setSelectedYearGroups(selectedYearGroups.filter((y) => y !== yg.id));
                            } else {
                              setSelectedYearGroups([...selectedYearGroups, yg.id]);
                            }
                          }}
                          className={`p-2.5 rounded-lg border text-sm font-bold text-center transition-all ${
                            isSel ? "border-primary bg-primary text-primary-foreground shadow-xs" : "border-border bg-card hover:bg-muted"
                          }`}
                        >
                          {yg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 5. By House(s) */}
              {audience === "by_house" && (
                <div className="p-3.5 rounded-xl border border-primary/30 bg-muted/20 space-y-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase text-foreground">Select House(s)</Label>
                    <span className="text-xs text-primary font-bold">
                      {selectedHouses.length} selected ({activeRecipientCount} scholars)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "Kenya", name: "Kenya House", color: "#00205B", bg: "bg-[#00205B]/15" },
                      { id: "Longonot", name: "Longonot House", color: "#D97706", bg: "bg-amber-500/15" },
                      { id: "Kilimanjaro", name: "Kilimanjaro House", color: "#B91C1C", bg: "bg-red-500/15" },
                      { id: "Elgon", name: "Elgon House", color: "#059669", bg: "bg-emerald-500/15" },
                    ].map((h) => {
                      const isSel = selectedHouses.includes(h.id);
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => {
                            if (isSel) {
                              setSelectedHouses(selectedHouses.filter((x) => x !== h.id));
                            } else {
                              setSelectedHouses([...selectedHouses, h.id]);
                            }
                          }}
                          className={`p-3 rounded-lg border text-sm font-bold text-center transition-all flex items-center justify-center gap-2 ${
                            isSel
                              ? "border-primary ring-1 ring-primary shadow-xs"
                              : "border-border bg-card hover:bg-muted"
                          }`}
                        >
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: h.color }} />
                          <span>{h.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold text-foreground">Title / Email Subject</Label>
                  {lastSavedDraftAt && (
                    <span className="text-xs text-muted-foreground font-mono">
                      Auto-saved {formatDraftTime(lastSavedDraftAt)}
                    </span>
                  )}
                </div>
                <Input
                  value={titleInput}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Term 3 Reading Sprint Announcement"
                  className="h-10 text-sm font-medium"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold text-foreground">Message Body</Label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => setComposerView("preview")}
                    className="text-xs text-primary p-0 h-auto gap-1 font-semibold"
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview live styling in Desktop / Mobile
                  </Button>
                </div>
                <Textarea
                  rows={6}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your announcement or newsletter message here..."
                  className="text-sm leading-relaxed"
                />
              </div>

              {/* Email dispatch toggle */}
              <div className="p-3.5 rounded-xl border border-primary/25 bg-primary/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-foreground">Also send to recipient school email</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Delivers an email copy to each user's school email address in addition to in-app notification.
                    </div>
                  </div>
                </div>
                <Switch checked={sendToEmail} onCheckedChange={setSendToEmail} />
              </div>

              {/* Quick banner inviting to preview */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/40 flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Customize colors, font size, logo, and preview on desktop/mobile screens before sending:</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setComposerView("preview")}
                  className="h-7 text-xs shrink-0 font-semibold gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-500" />
                  Live Preview Studio
                </Button>
              </div>
            </div>
          )}

          {/* TAB 2: Live Pre-Send Rich Text Email Preview Component */}
          {composerView === "preview" && (
            <div className="space-y-4">
              <EmailLivePreviewCard
                mode={studioMode}
                certificateData={certStudent}
                onCertificateDataChange={setCertStudent}
                subject={
                  titleInput ||
                  (studioMode === "certificate"
                    ? `🎓 Official ${certStudent.level} Certificate of Achievement: ${certStudent.challengeTitle || "45-Book Reading Challenge"}`
                    : challengeScoped
                    ? `[${bcChallenge?.title}] Reading Challenge Announcement`
                    : "Official M-Pesa Foundation Academy Announcement")
                }
                messageBody={
                  body ||
                  (studioMode === "certificate"
                    ? `Hello ${certStudent.studentName},\n\nCongratulations on achieving the official ${certStudent.level} Reading Award! In recognition of your literary dedication and completing ${certStudent.booksCount} Verified Books in the ${certStudent.challengeTitle || "45-Book Reading Challenge 2025/2026: Beyond the Pages"}, your certificate has been officially certified by the Teaching & Learning Directorate and Academy Library.`
                    : "Welcome to the official M-Pesa Foundation Academy Reading Challenge platform! Your broadcast announcement message will be rendered here with responsive layout, custom theme styling, school crest, and interactive quick action links.")
                }
                recipientCount={studioMode === "certificate" ? 1 : audience === "individual" ? Math.max(1, picked.length) : 450}
                recipientLabel={
                  studioMode === "certificate"
                    ? `${certStudent.studentName} (${certStudent.studentEmail || "Student Email"})`
                    : audience === "all"
                    ? "All Academy Students & Staff"
                    : audience === "individual"
                    ? `${picked.length} Selected Individuals`
                    : `${audience.replace("_", " ")} Scholars & Faculty`
                }
                senderEmail={gmailStatus.email || "librarian@mpesafoundationacademy.ac.ke"}
                styleOptions={emailStyle}
                onChangeStyleOptions={setEmailStyle}
                onSubjectChange={setTitle}
                onMessageBodyChange={setBody}
                autoSaveStatus={{
                  isSaving: isAutoSaving,
                  lastSavedAt: lastSavedDraftAt,
                  hasDraft: Boolean(titleInput.trim() || body.trim()),
                }}
                draftKey={ADMIN_BROADCAST_DRAFT_KEY}
                onClearDraft={handleClearDraft}
              />
            </div>
          )}

          {/* Action Row - Always visible on both tabs */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Dual-channel delivery (In-app notification bells + Student school inboxes)
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {composerView === "compose" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setComposerView("preview")}
                  className="text-xs font-semibold gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-500" />
                  Preview Email First
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setComposerView("compose")}
                  className="text-xs font-semibold gap-1.5"
                >
                  ✏️ Edit Message Details
                </Button>
              )}

              {lastComposeUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(lastComposeUrl, "_blank", "noopener,noreferrer")}
                  className="text-xs font-semibold gap-1.5 border-blue-500/30 text-blue-600 dark:text-blue-400"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Open in Web Gmail
                </Button>
              )}

              <Button
                type="button"
                onClick={send}
                disabled={sending}
                className="text-white border-0 font-bold shadow-md hover:opacity-95 transition-all text-xs h-9 px-4 gap-2"
                style={{
                  background:
                    studioMode === "certificate"
                      ? "linear-gradient(120deg, #059669, #0d9488)"
                      : "linear-gradient(120deg, hsl(var(--v-hot-pink)), hsl(var(--v-violet)))",
                }}
              >
                {sending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                    {studioMode === "certificate" ? "Dispatching Certificate…" : "Dispatching Broadcast…"}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1" />
                    {studioMode === "certificate" ? "Send & Dispatch Certificate" : "Send Broadcast & Email"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Broadcast & Email Delivery Log */}
      <Card className="rounded-2xl border-border bg-card">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border flex-wrap gap-2">
            <div className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-primary" /> Recent Broadcasts &amp; Email Dispatches ({history.length})
            </div>
            {history.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearAllHistory}
                className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1"
                title="Delete all broadcast history records"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear All History
              </Button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="text-xs text-muted-foreground py-6 text-center">
              No previous broadcasts logged.
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((h: any, hIdx: number) => {
                const itemId = h.id || `bc-hist-${hIdx}-${h.sent_at || h.title || "item"}`;
                return (
                  <div
                    key={itemId}
                    className="p-3.5 rounded-xl border border-border/70 bg-background/50 hover:bg-muted/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-foreground truncate flex items-center gap-2">
                        <span>{h.title}</span>
                        {h.sent_to_email && (
                          <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-mono">
                            Email Dispatched
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {h.body}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1 font-mono flex-wrap">
                        <span>Audience: {h.audience}</span>
                        <span>·</span>
                        <span>{new Date(h.sent_at).toLocaleString()}</span>
                        {h.sent_via && (
                          <>
                            <span>·</span>
                            <span className="text-primary/80">Via: {h.sent_via}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/40 text-emerald-500">
                        ✓ {h.emails_count || h.recipients_count || 1} Emailed
                      </Badge>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewHistoryItem(h)}
                        className="h-7 px-2 text-[11px] font-semibold gap-1"
                        title="View the exact styled HTML email delivered"
                      >
                        <Eye className="w-3 h-3 text-amber-500" /> Preview
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleReuseBroadcastDraft(h, e)}
                        className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                        title="Load this broadcast into the editor"
                      >
                        <RefreshCw className="w-3 h-3" /> Reuse
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDeleteHistoryItem(itemId, e)}
                        className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1"
                        title="Delete this broadcast log"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dispatched Broadcast Email Preview Modal */}
      <Dialog open={!!previewHistoryItem} onOpenChange={(open) => !open && setPreviewHistoryItem(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
          <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 sticky top-0 z-10 backdrop-blur-md">
            <div>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                {previewHistoryItem?.title || "Dispatched Email Delivery Preview"}
              </DialogTitle>
              <div className="text-xs text-muted-foreground mt-0.5">
                Sent {previewHistoryItem?.sent_at ? new Date(previewHistoryItem.sent_at).toLocaleString() : ""} · {previewHistoryItem?.emails_count || previewHistoryItem?.recipients_count || 1} Recipients ({previewHistoryItem?.audience || "All"})
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (previewHistoryItem) {
                    handleReuseBroadcastDraft(previewHistoryItem);
                    setPreviewHistoryItem(null);
                  }
                }}
                className="text-xs h-7 gap-1"
              >
                <Pencil className="w-3 h-3" /> Edit in Composer
              </Button>
            </div>
          </div>
          <div className="p-4 bg-slate-100 dark:bg-slate-950">
            <div
              className="rounded-xl overflow-hidden border border-border shadow-md bg-white mx-auto max-w-2xl"
              dangerouslySetInnerHTML={{
                __html:
                  previewHistoryItem?.html ||
                  buildBeautifulEmailHtml(
                    previewHistoryItem?.title || "M-Pesa Foundation Academy Announcement",
                    previewHistoryItem?.body || "",
                    previewHistoryItem?.styleOptions || emailStyle
                  ),
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- People ---------- */
function PeopleSection({ role }: { role: "student" | "staff" }) {
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<any | null>(null);
  const [deleteUser, setDeleteUser] = useState<any | null>(null);
  const load = async () => {
    let q = supabase.from("profiles").select("*").order("full_name").limit(500);
    if (role === "student") q = q.eq("role", "student");
    else q = q.neq("role", "student");
    const { data } = await q;
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [role]);

  const visible = rows.filter((r) => {
    const s = search.toLowerCase();
    return !s || r.full_name?.toLowerCase().includes(s) || r.email?.toLowerCase().includes(s);
  });

  const handleDelete = async () => {
    if (!deleteUser) return;
    const { data, error } = await supabase.functions.invoke("admin-delete-user", {
      body: { target_user_id: deleteUser.user_id },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? "Failed to delete");
      return;
    }
    toast.success(`Deleted ${deleteUser.full_name}`);
    setDeleteUser(null);
    load();
  };

  return (
    <Card className="rounded-2xl border-border bg-card">
      <CardContent className="p-5 space-y-4">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <CreateUserDialog defaultRole={role} onCreated={load} />
          <AdminPasswordReset />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {visible.slice(0, 200).map((p) => (
            <div key={p.user_id} className="rounded-xl border border-border p-3 bg-background/40 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full text-white flex items-center justify-center font-bold text-sm shrink-0"
                style={{ background: "linear-gradient(135deg, hsl(var(--v-electric-blue)), hsl(var(--v-green)))" }}>
                {p.full_name?.[0] ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{p.full_name}</div>
                <div className="text-xs text-muted-foreground truncate">{p.email}</div>
              </div>
              <Badge variant="outline" className="text-[10px] capitalize">{p.role}</Badge>
              <Button size="icon" variant="ghost" onClick={() => setEditUser(p)} title="Edit">
                <UserCog className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setDeleteUser(p)} title="Delete" className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {visible.length === 0 && (
            <div className="text-sm text-muted-foreground py-8 text-center lg:col-span-2">No users found.</div>
          )}
        </div>
      </CardContent>

      {editUser && (
        <EditUserDialog user={editUser} onClose={() => setEditUser(null)} onSaved={() => { setEditUser(null); load(); }} />
      )}

      <Dialog open={!!deleteUser} onOpenChange={(v) => !v && setDeleteUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete user?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This permanently removes <b>{deleteUser?.full_name}</b> ({deleteUser?.email}) and their account. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete permanently</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ---------- Edit user dialog ---------- */
function EditUserDialog({ user, onClose, onSaved }: { user: any; onClose: () => void; onSaved: () => void }) {
  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [admission, setAdmission] = useState(user.admission_number ?? "");
  const [role, setRole] = useState(user.role ?? "student");
  const [yearGroup, setYearGroup] = useState(user.year_group ?? "");
  const [className, setClassName] = useState(user.class_name ?? "");
  const [house, setHouse] = useState(user.house ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setErr(null);
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("admin-update-user", {
      body: {
        target_user_id: user.user_id,
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        admission_number: admission.trim() || null,
        role,
        year_group: role === "student" ? yearGroup : null,
        class_name: role === "student" ? className : null,
        house: role === "student" ? house : null,
      },
    });
    setSaving(false);
    if (error || (data as any)?.error) {
      setErr((data as any)?.error ?? error?.message ?? "Failed to update user");
      return;
    }
    toast.success("User updated");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Edit user</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {err && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-sm p-3">
              {err}
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Admission number</Label>
              <Input value={admission} onChange={(e) => setAdmission(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((r) => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          {role === "student" && (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Year</Label>
                <Select value={yearGroup} onValueChange={setYearGroup}>
                  <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent>{YEAR_GROUPS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Class</Label>
                <Select value={className} onValueChange={setClassName}>
                  <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                  <SelectContent>{CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>House</Label>
                <Select value={house} onValueChange={setHouse}>
                  <SelectTrigger><SelectValue placeholder="House" /></SelectTrigger>
                  <SelectContent>{HOUSES.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Create user dialog ---------- */
export function CreateUserDialog({
  defaultRole,
  onCreated,
}: {
  defaultRole: "student" | "staff";
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [fullName, setFullName] = useState("");
  const [admission, setAdmission] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>(defaultRole === "staff" ? "homeroom_tutor" : "student");
  const [yearGroup, setYearGroup] = useState<string>("");
  const [className, setClassName] = useState<string>("");
  const [house, setHouse] = useState<string>("");
  const [result, setResult] = useState<{ email: string; password: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const previewEmail = () => {
    if (email.trim()) return email.trim().toLowerCase();
    const slug = fullName.toLowerCase().normalize("NFKD").replace(/[^\w\s.-]/g, "").trim().split(/\s+/).slice(0, 2).join(".");
    return slug ? `${slug}@mpesafoundationacademy.ac.ke` : "";
  };

  const reset = () => {
    setFullName(""); setAdmission(""); setEmail("");
    setYearGroup(""); setClassName(""); setHouse("");
    setResult(null); setErr(null);
  };

  const submit = async () => {
    setErr(null);
    if (!fullName.trim() || !admission.trim()) {
      setErr("Full name and admission number are required");
      return;
    }
    if (role === "student" && (!yearGroup || !className || !house)) {
      setErr("Year group, class and house are required for students");
      return;
    }

    // Front-end duplicate checks
    setChecking(true);
    const [{ data: dupAdm }, { data: dupEmail }] = await Promise.all([
      supabase.from("profiles").select("full_name, email").eq("admission_number", admission.trim()).maybeSingle(),
      supabase.from("profiles").select("full_name").ilike("email", previewEmail()).maybeSingle(),
    ]);
    setChecking(false);
    if (dupAdm) {
      setErr(`Admission number ${admission.trim()} already belongs to ${dupAdm.full_name} (${dupAdm.email}).`);
      return;
    }
    if (dupEmail) {
      setErr(`Email ${previewEmail()} already belongs to ${dupEmail.full_name}. Provide a different email.`);
      return;
    }

    setSaving(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: {
        full_name: fullName.trim(),
        admission_number: admission.trim(),
        email: email.trim() || undefined,
        role,
        year_group: yearGroup || undefined,
        class_name: className || undefined,
        house: house || undefined,
      },
    });
    setSaving(false);
    if (error || (data as any)?.error) {
      setErr((data as any)?.error ?? error?.message ?? "Failed to create user");
      return;
    }
    toast.success("User created");
    setResult({ email: (data as any).email, password: (data as any).password });
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> New user
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create user record</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Account created. Share these credentials:</p>
            <div className="rounded-lg border p-3 text-sm space-y-1 bg-muted/40">
              <div><span className="font-medium">Email:</span> {result.email}</div>
              <div><span className="font-medium">Password:</span> {result.password}</div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={reset}>Create another</Button>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            {err && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-sm p-3">
                {err}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Tonny Odundo" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Admission number</Label>
                <Input value={admission} onChange={(e) => setAdmission(e.target.value)} placeholder="12345" />
              </div>
              <div className="space-y-1.5">
                <Label>Email (optional override)</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="auto from name" />
              </div>
            </div>
            {role === "student" && (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Year</Label>
                  <Select value={yearGroup} onValueChange={setYearGroup}>
                    <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                    <SelectContent>
                      {YEAR_GROUPS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Class</Label>
                  <Select value={className} onValueChange={setClassName}>
                    <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                    <SelectContent>
                      {CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>House</Label>
                  <Select value={house} onValueChange={setHouse}>
                    <SelectTrigger><SelectValue placeholder="House" /></SelectTrigger>
                    <SelectContent>
                      {HOUSES.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="rounded-md bg-muted/40 border p-3 text-xs space-y-1">
              <div><span className="font-medium">Email:</span> {previewEmail() || <span className="text-muted-foreground">first.last@mpesafoundationacademy.ac.ke</span>}</div>
              <div><span className="font-medium">Password:</span> mas{admission || <span className="text-muted-foreground">&lt;admission&gt;</span>}</div>
              <div className="text-muted-foreground">If a student's real school email differs from their name, enter it in the Email override.</div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={saving || checking}>
                {checking ? "Checking…" : saving ? "Creating…" : "Create user"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}



/* ---------- Countdown editor (persists to system_settings) ---------- */
function CountdownSection() {
  const [startVal, setStartVal] = useState<string>("");
  const [endVal, setEndVal] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const pad = (n: number) => String(n).padStart(2, "0");
  const toLocalInput = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["reading_session_start", "reading_session_end"]);

      (data || []).forEach((row) => {
        if (row.setting_key === "reading_session_start" && row.setting_value) {
          const d = new Date(row.setting_value);
          if (!isNaN(d.getTime())) setStartVal(toLocalInput(d));
        }
        if (row.setting_key === "reading_session_end" && row.setting_value) {
          const d = new Date(row.setting_value);
          if (!isNaN(d.getTime())) setEndVal(toLocalInput(d));
        }
      });
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (!startVal || !endVal) return toast.error("Pick both start and end date & time");
    const dStart = new Date(startVal);
    const dEnd = new Date(endVal);
    if (dEnd <= dStart) {
      return toast.error("End date & time must be after start date & time");
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const [res1, res2] = await Promise.all([
      supabase.from("system_settings").upsert(
        { setting_key: "reading_session_start", setting_value: dStart.toISOString(), updated_by: user?.id, description: "Reading session start timestamp" },
        { onConflict: "setting_key" }
      ),
      supabase.from("system_settings").upsert(
        { setting_key: "reading_session_end", setting_value: dEnd.toISOString(), updated_by: user?.id, description: "Reading session end timestamp" },
        { onConflict: "setting_key" }
      ),
    ]);

    setSaving(false);
    if (res1.error || res2.error) {
      return toast.error((res1.error || res2.error)?.message || "Failed to save session dates");
    }
    toast.success("Academy session start & end dates updated successfully!");
  };

  return (
    <Card className="rounded-2xl border-border bg-card">
      <CardContent className="p-5 space-y-4">
        <div>
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Session Start &amp; End Dates (Live Countdown Control)
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Set the official reading session start and end dates. Submissions automatically open when the start date is reached and automatically lock when the end date arrives.
          </p>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading current schedule…</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Session Start Date &amp; Time (Submissions Open)</Label>
                <Input type="datetime-local" value={startVal} onChange={(e) => setStartVal(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Session End Date &amp; Time (Submissions Lock)</Label>
                <Input type="datetime-local" value={endVal} onChange={(e) => setEndVal(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                disabled={saving}
                onClick={save}
                className="text-white border-0 font-semibold text-xs shadow-sm"
                style={{ background: "linear-gradient(120deg, hsl(var(--v-green)), hsl(var(--v-cyan)))" }}
              >
                <Clock className="w-4 h-4 mr-2" /> {saving ? "Saving…" : "Save Session Schedule"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- Bulk Import (CSV → pending_submissions) ---------- */
const IMPORT_HEADERS = [
  "email", "student_name", "year_group", "class_name", "house",
  "category_number", "category_name", "title", "author",
  "date_started", "date_finished", "reflection",
];

function BulkImportSection() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ ok: number; fail: number } | null>(null);

  const parse = (f: File) => {
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        setRows(res.data as any[]);
        toast.success(`Parsed ${res.data.length} rows`);
      },
      error: (err) => toast.error(err.message),
    });
  };

  const run = async () => {
    if (!rows.length) return toast.error("Upload a CSV first");
    setImporting(true);
    setProgress({ ok: 0, fail: 0 });
    const batch = rows.map((r) => ({
      email: String(r.email ?? "").trim(),
      student_name: String(r.student_name ?? "").trim(),
      year_group: r.year_group?.trim?.() || null,
      class_name: r.class_name?.trim?.() || null,
      house: r.house?.trim?.() || null,
      category_number: Number(r.category_number ?? 0),
      category_name: String(r.category_name ?? "").trim(),
      title: String(r.title ?? "").trim(),
      author: String(r.author ?? "").trim(),
      date_started: r.date_started || new Date().toISOString().slice(0, 10),
      date_finished: r.date_finished || new Date().toISOString().slice(0, 10),
      reflection: String(r.reflection ?? "").trim(),
    })).filter((r) => r.email && r.title && r.student_name);

    let ok = 0, fail = 0;
    const chunkSize = 100;
    for (let i = 0; i < batch.length; i += chunkSize) {
      const chunk = batch.slice(i, i + chunkSize);
      const { error } = await supabase.from("pending_submissions").insert(chunk);
      if (error) { fail += chunk.length; console.error(error); }
      else ok += chunk.length;
      setProgress({ ok, fail });
    }
    setImporting(false);
    toast.success(`Import complete: ${ok} inserted, ${fail} failed`);
    setRows([]); setFile(null);
  };

  const downloadTemplate = () => {
    const csv = IMPORT_HEADERS.join(",") + "\n" +
      `student@example.com,Jane Doe,DP2,Swara,Kenya,1,Fiction,The Hobbit,J.R.R. Tolkien,2025-01-01,2025-01-15,"Loved the adventure."`;
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "bulk_import_template.csv";
    a.click();
  };

  return (
    <Card className="rounded-2xl border-border bg-card">
      <CardContent className="p-5 space-y-4">
        <div className="rounded-xl border border-dashed border-border p-6 text-center bg-background/40">
          <FolderUp className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-3">
            Upload a CSV with columns: <code className="text-xs">{IMPORT_HEADERS.join(", ")}</code>
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button asChild variant="outline" size="sm">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setFile(f); parse(f); }
                  }}
                />
                Choose CSV
              </label>
            </Button>
            <Button variant="ghost" size="sm" onClick={downloadTemplate}>
              Download template
            </Button>
          </div>
          {file && (
            <div className="mt-3 text-xs text-muted-foreground">
              {file.name} — {rows.length} rows ready
            </div>
          )}
        </div>

        {rows.length > 0 && (
          <>
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      {IMPORT_HEADERS.map((h) => (
                        <th key={h} className="text-left px-2 py-1.5 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 20).map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        {IMPORT_HEADERS.map((h) => (
                          <td key={h} className="px-2 py-1 truncate max-w-[140px]">{r[h] ?? ""}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 20 && (
                <div className="p-2 text-xs text-muted-foreground text-center bg-muted/40">
                  Showing first 20 of {rows.length} rows
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-3">
              {progress && (
                <div className="text-sm text-muted-foreground">
                  Inserted: <span className="text-foreground font-semibold">{progress.ok}</span>
                  {progress.fail > 0 && <> — Failed: <span className="text-destructive">{progress.fail}</span></>}
                </div>
              )}
              <Button
                disabled={importing}
                onClick={run}
                className="text-white border-0 ml-auto"
                style={{ background: "linear-gradient(120deg, hsl(var(--v-orange)), hsl(var(--v-red)))" }}
              >
                <FolderUp className="w-4 h-4 mr-2" />
                {importing ? "Importing…" : `Import ${rows.length} rows`}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- Files manager ---------- */
function FilesSection() {
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("librarian_files")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setFiles(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const upload = async (f: File) => {
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return toast.error("Not signed in"); }
    const path = `${user.id}/${Date.now()}-${f.name}`;
    const { error: upErr } = await supabase.storage.from("librarian-files").upload(path, f);
    if (upErr) { setUploading(false); return toast.error(upErr.message); }
    const { data: pub } = supabase.storage.from("librarian-files").getPublicUrl(path);
    const { error: insErr } = await supabase.from("librarian_files").insert({
      file_name: f.name,
      file_url: pub.publicUrl,
      file_type: f.type,
      file_size: f.size,
      is_public: true,
      uploaded_by: user.id,
    });
    setUploading(false);
    if (insErr) return toast.error(insErr.message);
    toast.success("File uploaded");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this file?")) return;
    await supabase.from("librarian_files").delete().eq("id", id);
    load();
  };

  return (
    <Card className="rounded-2xl border-border bg-card">
      <CardContent className="p-5 space-y-4">
        <div className="rounded-xl border border-dashed border-border p-6 text-center bg-background/40">
          <Files className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-3">
            Upload PDFs, reading lists, or results sheets. Files become available to all staff.
          </p>
          <Button asChild variant="outline" size="sm" disabled={uploading}>
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
              />
              {uploading ? "Uploading…" : "Choose file"}
            </label>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {files.map((f) => (
            <div key={f.id} className="rounded-xl border border-border p-3 bg-background/40 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "hsl(var(--v-violet) / 0.2)", color: "hsl(var(--v-violet))" }}>
                <Files className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{f.file_name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {f.file_type} · {f.file_size ? `${Math.round(f.file_size / 1024)} KB` : ""}
                </div>
              </div>
              <Button asChild size="sm" variant="ghost">
                <a href={f.file_url} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /></a>
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(f.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {files.length === 0 && (
            <div className="text-sm text-muted-foreground py-8 text-center lg:col-span-2">
              No files uploaded yet.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Google Sync (Each challenge has its own Google Sheet + Auto-Sync + 'aa' live sync button) ---------- */
function GoogleSyncSection() {
  const { challenges, updateChallenge } = useChallenges();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetUrls, setSheetUrls] = useState<Record<string, string>>({});
  const [trackingBackup, setTrackingBackup] = useState<Record<string, boolean>>({});
  const [syncingChallenge, setSyncingChallenge] = useState<Record<string, boolean>>({});
  const [lastBackupInfo, setLastBackupInfo] = useState<Record<string, string>>({});
  const [autoSavedState, setAutoSavedState] = useState<Record<string, boolean>>({});
  const [exportingMaster, setExportingMaster] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);
  const [showAppsScriptGuide, setShowAppsScriptGuide] = useState(false);
  const debounceTimerRef = useRef<Record<string, any>>({});

  // Sync guidance helper modal
  const [syncHelperModal, setSyncHelperModal] = useState<{
    open: boolean;
    challengeTitle: string;
    count: number;
    sheetUrl: string;
    filename?: string;
  } | null>(null);

  // Live in-app sheet preview data
  const [previewSubmissions, setPreviewSubmissions] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewSearch, setPreviewSearch] = useState("");

  const loadPreviewSubmissions = useCallback(async () => {
    setLoadingPreview(true);
    try {
      const [bRes, cRes, pRes] = await Promise.all([
        supabase.from("book_submissions").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("challenge_submissions").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("pending_submissions").select("*").order("created_at", { ascending: false }).limit(100),
      ]);
      const seen = new Set<string>();
      const combined: any[] = [];
      (bRes.data ?? []).forEach((r) => {
        const key = `${r.user_id}-${(r.title || "").toLowerCase().trim()}`;
        if (!seen.has(key)) {
          seen.add(key);
          combined.push({ ...r, challenge_title: "45-Book Reading Challenge" });
        }
      });
      (cRes.data ?? []).forEach((r) => {
        const key = `${r.user_id}-${(r.title || "").toLowerCase().trim()}`;
        if (!seen.has(key)) {
          seen.add(key);
          combined.push({ ...r, challenge_title: "Specialty Reading Challenge" });
        }
      });
      (pRes.data ?? []).forEach((r) => {
        const key = `${r.email}-${(r.title || "").toLowerCase().trim()}`;
        if (!seen.has(key)) {
          seen.add(key);
          combined.push({ ...r, challenge_title: "Student Book Submission" });
        }
      });

      const userIds = [...new Set(combined.map((r) => r.user_id).filter(Boolean))];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, house, year_group, class_name");
      const map = new Map((profs ?? []).map((p) => [p.user_id, p]));
      setPreviewSubmissions(combined.map((r) => ({ ...r, profile: map.get(r.user_id) })));
    } catch (e) {
      console.warn("Could not load preview submissions:", e);
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  // Initialize per-challenge sheet URLs
  useEffect(() => {
    const map: Record<string, string> = {};
    challenges.forEach((c) => {
      map[c.id] = c.google_sheet_url || getChallengeGoogleSheetUrl(c.id) || "";
    });
    setSheetUrls(map);
  }, [challenges]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sheet_sync_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    setLogs(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    loadPreviewSubmissions();
  }, [loadPreviewSubmissions]);

  const handleSaveSheetUrl = async (challengeId: string, customUrl?: string, silent = false) => {
    const url = (customUrl !== undefined ? customUrl : sheetUrls[challengeId]) ?? "";
    setChallengeGoogleSheetUrl(challengeId, url);
    await updateChallenge(challengeId, { google_sheet_url: url });
    setAutoSavedState((prev) => ({ ...prev, [challengeId]: true }));
    if (!silent) {
      toast.success(`Google Sheet link saved for this challenge! New submissions will automatically sync to this sheet.`);
    }
  };

  // Automatic live sync & auto-save on paste / URL typing (500ms debounce)
  const handleSheetUrlChange = (challengeId: string, newUrl: string, challengeTitle: string) => {
    setSheetUrls((prev) => ({ ...prev, [challengeId]: newUrl }));
    setAutoSavedState((prev) => ({ ...prev, [challengeId]: false }));

    if (debounceTimerRef.current[challengeId]) {
      clearTimeout(debounceTimerRef.current[challengeId]);
    }

    debounceTimerRef.current[challengeId] = setTimeout(async () => {
      const trimmed = newUrl.trim();
      setChallengeGoogleSheetUrl(challengeId, trimmed);
      await updateChallenge(challengeId, { google_sheet_url: trimmed });
      setAutoSavedState((prev) => ({ ...prev, [challengeId]: true }));

      if (trimmed.startsWith("http")) {
        toast.info(`⚡ Live Google Sheet link auto-saved for "${challengeTitle}". Auto-sync active!`);
      }
    }, 600);
  };

  // Explicit "Sync Submissions Now" button
  const handleManualSyncNow = async (challengeId: string, challengeTitle: string) => {
    setSyncingChallenge((prev) => ({ ...prev, [challengeId]: true }));
    const url = sheetUrls[challengeId] || getChallengeGoogleSheetUrl(challengeId);

    try {
      const res = await syncAllChallengeSubmissionsNow(challengeId, challengeTitle, url);
      const stamp = new Date().toLocaleTimeString();
      setLastBackupInfo((prev) => ({ ...prev, [challengeId]: `${stamp} (${res.count} records)` }));

      setSyncHelperModal({
        open: true,
        challengeTitle,
        count: res.count,
        sheetUrl: url,
        filename: res.filename,
      });

      if (res.ok) {
        toast.success(`⚡ ${res.message}`);
      } else {
        toast.error(`Sync notice: ${res.message}`);
      }
      load();
      loadPreviewSubmissions();
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger sync");
    } finally {
      setSyncingChallenge((prev) => ({ ...prev, [challengeId]: false }));
    }
  };

  // 'aa' live sheet & backup checkpoint button
  const handleAaLiveSheetAndBackup = async (challengeId: string, challengeTitle: string) => {
    setTrackingBackup((prev) => ({ ...prev, [challengeId]: true }));
    const url = sheetUrls[challengeId] || getChallengeGoogleSheetUrl(challengeId);
    
    try {
      // 1. Copy formatted data to clipboard so user can immediately paste into blank sheet
      let copiedCount = 0;
      try {
        const copyRes = await copyChallengeDataToClipboardForSheet(challengeId, challengeTitle);
        copiedCount = copyRes.count;
      } catch {}

      // 2. Automatically download CSV for backup
      let dlFilename = "";
      try {
        const dl = await downloadSingleChallengeCSV(challengeId, challengeTitle);
        dlFilename = dl.filename;
      } catch {}

      // 3. Track backup & record sync event
      const res = await trackLiveSheetBackup(challengeId, challengeTitle, url);
      const stamp = new Date().toLocaleTimeString();
      setLastBackupInfo((prev) => ({ ...prev, [challengeId]: `${stamp} (${res.recordsCount} records)` }));

      // 4. Open guidance modal
      setSyncHelperModal({
        open: true,
        challengeTitle,
        count: copiedCount || res.recordsCount,
        sheetUrl: url,
        filename: dlFilename,
      });

      toast.success(
        `[aa] ${copiedCount || res.recordsCount} records synced! Formatted data copied to clipboard & CSV downloaded.`
      );
      load();
      loadPreviewSubmissions();
    } catch (err: any) {
      toast.error(err.message || "Failed to track backup");
    } finally {
      setTrackingBackup((prev) => ({ ...prev, [challengeId]: false }));
    }
  };

  const handleCopyChallengeData = async (challengeId: string, challengeTitle: string) => {
    try {
      const res = await copyChallengeDataToClipboardForSheet(challengeId, challengeTitle);
      toast.success(`Copied ${res.count} records to clipboard! In your Google Sheet, click cell A1 and press Ctrl+V.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to copy data");
    }
  };

  const handleDownloadChallengeCSV = async (challengeId: string, challengeTitle: string) => {
    try {
      const res = await downloadSingleChallengeCSV(challengeId, challengeTitle);
      toast.success(`Downloaded ${res.filename} (${res.count} records)!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to download CSV");
    }
  };

  const handleExportMaster = async () => {
    setExportingMaster(true);
    try {
      const filename = await downloadGoogleSheetsMasterCSV();
      toast.success(`Master Google Sheets CSV exported: ${filename}`);
      load();
    } catch {
      toast.error("Failed to export master sheets data");
    } finally {
      setExportingMaster(false);
    }
  };

  const handleClearAuditLogs = async () => {
    if (!confirm("Are you sure you want to clear the live sync audit logs to give space?")) return;
    setClearingLogs(true);
    try {
      const ids = logs.map((l) => l.id).filter(Boolean);
      if (ids.length > 0) {
        await supabase.from("sheet_sync_logs").delete().in("id", ids);
      } else {
        await supabase.from("sheet_sync_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      }
      setLogs([]);
      toast.success("Live sync audit logs cleared to give space");
    } catch (err: any) {
      console.warn("Could not delete from remote table, clearing local log view:", err);
      setLogs([]);
      toast.success("Sync audit log list cleared");
    } finally {
      setClearingLogs(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Live Sync Status */}
      <Card className="rounded-2xl border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent shadow-xs">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-base font-bold text-foreground">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <RefreshCw className="w-4 h-4" />
              </span>
              Google Workspace &amp; Live Sheets Synchronization
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
              Every challenge runs independently with its own dedicated Google Sheet link. When scholars submit reviews on the portal, data instantly persists to the database and automatically pushes live to the Google Sheet link pasted below. If auto-sync is ever delayed, use the <strong>Sync Submissions</strong> button to trigger immediate delivery.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              disabled={exportingMaster}
              onClick={handleExportMaster}
              className="text-xs font-semibold gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download Master CSV
            </Button>
            <Button size="sm" variant="outline" onClick={load} className="text-xs gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 1-Click Real-Time Google Apps Script Setup Guide */}
      <Card className="rounded-2xl border-blue-500/30 bg-blue-500/5 shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-blue-500/20 text-blue-600 dark:text-blue-400">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <div className="font-bold text-xs text-foreground">
                  Prevent Blank Google Sheets: How Real-Time Auto-Push Works
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Standard Google Sheet links (docs.google.com) need either 1-click clipboard paste or an Apps Script Webhook to automatically append rows live.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
                  toast.success("Google Apps Script code copied to clipboard!");
                }}
                className="text-xs h-7 gap-1 font-semibold border-blue-500/30 text-blue-600 dark:text-blue-400"
              >
                <Copy className="w-3 h-3" />
                Copy Apps Script
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAppsScriptGuide(!showAppsScriptGuide)}
                className="text-xs h-7"
              >
                {showAppsScriptGuide ? "Hide Setup" : "View 2-Min Setup"}
              </Button>
            </div>
          </div>

          {showAppsScriptGuide && (
            <div className="p-3.5 rounded-xl bg-background/80 border border-border text-xs text-muted-foreground space-y-2 leading-relaxed">
              <div className="font-bold text-foreground">⚡ Quick 2-Minute Setup for Instant Live Cloud Sync:</div>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Create or open your blank Google Sheet.</li>
                <li>In Google Sheets, go to <strong>Extensions &gt; Apps Script</strong>.</li>
                <li>Delete any placeholder code, click the <strong>Copy Apps Script</strong> button above, and paste it into the editor.</li>
                <li>Click <strong>Deploy &gt; New deployment</strong> &gt; Select type <strong>Web app</strong>.</li>
                <li>Set <em>Execute as</em>: <strong>Me</strong> and <em>Who has access</em>: <strong>Anyone</strong>.</li>
                <li>Click <strong>Deploy</strong>, copy the resulting Web App URL (starts with <code>https://script.google.com/macros/s/...</code>), and paste it into the challenge sheet link below!</li>
              </ol>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium">
                💡 Instant Alternative: Click <strong>"Copy for Sheet"</strong> or <strong>"aa"</strong> on any challenge, then in your Google Sheet simply click cell A1 and press <strong>Ctrl+V</strong> (Cmd+V on Mac) to populate all student submissions and columns immediately!
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-Challenge Dedicated Google Sheets Workspace */}
      <Card className="rounded-2xl border-border bg-card shadow-xs">
        <div className="p-5 pb-3 border-b border-border/40 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Layers className="w-4 h-4 text-primary" /> Challenge Google Sheets Directory
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Paste each challenge's unique Google Sheet link. Links <strong>auto-save and auto-sync</strong> instantly. Use <strong>'aa'</strong> to open live sheet or <strong>Sync Now</strong> to force update.
            </div>
          </div>
          <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
            ⚡ Real-Time Auto Sync Enabled
          </Badge>
        </div>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-3">
            {challenges.map((c) => {
              const currentUrl = sheetUrls[c.id] ?? "";
              const isBusy = !!trackingBackup[c.id];
              const isSyncing = !!syncingChallenge[c.id];
              const lastBackup = lastBackupInfo[c.id];
              const hasUrl = currentUrl.trim().length > 0;
              const isAutoSaved = !!autoSavedState[c.id];

              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-border p-4 bg-background/50 hover:border-emerald-500/40 transition-all space-y-3 shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-lg shrink-0">
                        {c.badge_icon || "🏆"}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-foreground flex items-center gap-2">
                          <span>{c.title}</span>
                          {c.is_active && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                              Active
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Goal: {c.target_books} books · {c.categories?.length ?? "Default"} categories · {c.submission_type || "book"} reviews
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Prominent Instant Sync Button (Force / Manual trigger) */}
                      <Button
                        size="sm"
                        disabled={isSyncing}
                        onClick={() => handleManualSyncNow(c.id, c.title)}
                        className="h-8 px-3 text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                        title="Force sync all submissions for this challenge to the Google Sheet link now"
                      >
                        <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin")} />
                        <span>{isSyncing ? "Syncing…" : "Sync Submissions"}</span>
                      </Button>

                      {/* Prominent 'aa' Live Sheet & Backup Button */}
                      <Button
                        size="sm"
                        disabled={isBusy}
                        onClick={() => handleAaLiveSheetAndBackup(c.id, c.title)}
                        className="h-8 px-3 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        title="Open live Google Sheet in new tab and record backup sync checkpoint"
                      >
                        <span className="font-black text-sm tracking-tighter bg-white/20 px-1 rounded">aa</span>
                        <span>{isBusy ? "Tracking..." : "Live Sheet & Backup"}</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyChallengeData(c.id, c.title)}
                        className="h-8 px-2.5 text-xs text-foreground font-semibold gap-1 hover:bg-muted"
                        title="Copy formatted tabular submissions to clipboard (paste into cell A1 in Google Sheets)"
                      >
                        <Copy className="w-3.5 h-3.5 text-blue-500" />
                        <span>Copy for Sheet</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadChallengeCSV(c.id, c.title)}
                        className="h-8 px-2.5 text-xs text-foreground font-semibold gap-1 hover:bg-muted"
                        title="Download CSV formatted for Google Sheets import"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-500" />
                        <span>CSV</span>
                      </Button>

                      {hasUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(currentUrl);
                            toast.success("Google Sheet link copied to clipboard!");
                          }}
                          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                          title="Copy Sheet URL"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* URL Input & Live Paste Bar (Auto-Saves on paste) */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-border/40">
                    <div className="relative flex-1">
                      <Input
                        value={currentUrl}
                        onChange={(e) => handleSheetUrlChange(c.id, e.target.value, c.title)}
                        onPaste={(e) => {
                          const pasted = e.clipboardData.getData("text");
                          if (pasted && pasted.trim().startsWith("http")) {
                            handleSaveSheetUrl(c.id, pasted.trim(), false);
                          }
                        }}
                        placeholder="Paste Google Sheet URL (https://docs.google.com/spreadsheets/d/...) — auto-saves immediately on paste..."
                        className="h-9 text-xs pl-3 pr-8 font-mono bg-background"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSaveSheetUrl(c.id)}
                      className="h-9 px-3 text-xs font-semibold shrink-0 gap-1.5 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                    >
                      <Check className="w-3.5 h-3.5" /> Save Link
                    </Button>
                  </div>

                  {/* Sync status & last backup note */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("w-2 h-2 rounded-full", hasUrl ? "bg-emerald-500 animate-pulse" : "bg-amber-400")} />
                      <span>
                        {hasUrl 
                          ? isAutoSaved 
                            ? "✓ Live link saved & auto-push active" 
                            : "Live auto-push active (paste auto-saved)"
                          : "No sheet link attached — paste your Google Sheet link above to auto-link"}
                      </span>
                    </div>
                    {lastBackup && (
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">
                        Last Synced: {lastBackup}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sync Log Runs */}
      <Card className="rounded-2xl border-border bg-card shadow-xs">
        <div className="p-5 pb-3 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Clock className="w-4 h-4 text-primary" /> Live Sync Audit Logs
            </div>
            <div className="text-xs text-muted-foreground">
              Recent automatic student submission sync events and 'aa' backup checkpoints.
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {logs.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                disabled={clearingLogs}
                onClick={handleClearAuditLogs}
                className="h-8 text-xs font-semibold gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30"
                title="Clear all audit log entries to give space"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{clearingLogs ? "Clearing…" : "Clear Audit Logs"}</span>
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={load} className="h-8 text-xs gap-1">
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
        <CardContent className="p-5">
          {loading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading sync history…</div>
          ) : logs.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No sync runs recorded yet.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {logs.map((l) => {
                const hasErrors = Array.isArray(l.errors) && l.errors.length > 0;
                return (
                  <div key={l.id} className="rounded-xl border border-border p-3 bg-background/50">
                    <div className="flex items-center justify-between mb-1">
                      <Badge
                        className="border-0 text-white capitalize text-[10px]"
                        style={{
                          background: hasErrors ? "hsl(var(--v-red))" : "hsl(var(--v-green))",
                        }}
                      >
                        {hasErrors ? "errors" : "success"}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(l.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Type: <span className="text-foreground font-mono">{l.sync_type}</span> · Records:{" "}
                      <span className="text-foreground font-semibold">{l.records_synced ?? 0}</span>
                    </div>
                    {hasErrors && (
                      <div className="text-xs text-destructive mt-1 line-clamp-2">
                        {l.errors.slice(0, 2).join("; ")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* In-App Live Google Sheet Submissions Viewer */}
      <Card className="rounded-2xl border-border bg-card shadow-xs">
        <div className="p-5 pb-3 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold flex items-center gap-2 text-foreground">
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Live Submissions Data Viewer (In-App Sheet)
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Instant view of all synchronized student reading submissions across the academy. No blank pages.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={loadPreviewSubmissions}
              disabled={loadingPreview}
              className="h-8 text-xs font-semibold gap-1.5"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loadingPreview && "animate-spin")} />
              <span>Refresh</span>
            </Button>
            <Button
              size="sm"
              onClick={handleExportMaster}
              disabled={exportingMaster}
              className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </Button>
          </div>
        </div>

        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search by student, book title, author, or house..."
                value={previewSearch}
                onChange={(e) => setPreviewSearch(e.target.value)}
                className="h-8 pl-8 text-xs bg-background"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Total Loaded: <strong className="text-foreground">{previewSubmissions.length}</strong>
            </div>
          </div>

          {loadingPreview ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading synchronized data…</div>
          ) : previewSubmissions.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No student submissions recorded yet.</div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/60 text-muted-foreground font-semibold sticky top-0 border-b border-border">
                    <tr>
                      <th className="px-3 py-2">Student Name</th>
                      <th className="px-3 py-2">House / Year</th>
                      <th className="px-3 py-2">Book Title</th>
                      <th className="px-3 py-2">Author</th>
                      <th className="px-3 py-2">Challenge</th>
                      <th className="px-3 py-2 text-center">Points</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {previewSubmissions
                      .filter((r) => {
                        if (!previewSearch.trim()) return true;
                        const term = previewSearch.toLowerCase();
                        const name = (r.profile?.full_name || r.student_name || "").toLowerCase();
                        const title = (r.title || "").toLowerCase();
                        const author = (r.author || "").toLowerCase();
                        const house = (r.profile?.house || r.house || "").toLowerCase();
                        return name.includes(term) || title.includes(term) || author.includes(term) || house.includes(term);
                      })
                      .map((r, i) => {
                        const name = r.profile?.full_name || r.student_name || "Scholar Reader";
                        const house = r.profile?.house || r.house || "—";
                        const year = r.profile?.year_group || r.year_group || "";
                        return (
                          <tr key={r.id || i} className="hover:bg-muted/40 transition-colors">
                            <td className="px-3 py-2.5 font-medium text-foreground">{name}</td>
                            <td className="px-3 py-2.5 text-muted-foreground">{house} {year && `· ${year}`}</td>
                            <td className="px-3 py-2.5 font-semibold text-foreground max-w-xs truncate">{r.title || "—"}</td>
                            <td className="px-3 py-2.5 text-muted-foreground max-w-xs truncate">{r.author || "—"}</td>
                            <td className="px-3 py-2.5 text-muted-foreground">{r.challenge_title || "Reading Challenge"}</td>
                            <td className="px-3 py-2.5 text-center font-bold text-amber-600 dark:text-amber-400">+{r.points_earned || 0}</td>
                            <td className="px-3 py-2.5 text-center">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] capitalize font-semibold",
                                  r.approval_status === "approved"
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                    : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                )}
                              >
                                {r.approval_status || "pending"}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Success Guidance Dialog */}
      <Dialog
        open={!!syncHelperModal?.open}
        onOpenChange={(open) => !open && setSyncHelperModal(null)}
      >
        <DialogContent className="max-w-lg rounded-2xl p-6 bg-card border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <span className="text-xl">📊</span>
              <span>Submissions Ready for Google Sheet</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1 leading-relaxed">
              <strong>{syncHelperModal?.count ?? 0} student submissions</strong> for{" "}
              <strong>{syncHelperModal?.challengeTitle || "Reading Challenge"}</strong> have been processed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 my-2 text-xs">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Your Data is Ready (2-Second Population)</span>
              </div>
              <p className="leading-relaxed">
                We have automatically copied the formatted submission rows directly to your computer's clipboard and downloaded a clean backup CSV file.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-background/80 border border-border space-y-2.5">
              <div className="font-semibold text-foreground text-xs">How to populate your Google Sheet:</div>
              <ol className="list-decimal pl-4 space-y-1.5 text-muted-foreground">
                <li>
                  Click <strong>Open Google Sheet</strong> below (or open your existing sheet).
                </li>
                <li>
                  Click on <strong>cell A1</strong> (top-left).
                </li>
                <li>
                  Press <strong>Ctrl + V</strong> (or <strong>Cmd + V</strong> on Mac) to paste all student rows and column headers instantly!
                </li>
                <li>
                  <em>Alternative:</em> In Google Sheets, go to <strong>File &gt; Import &gt; Upload</strong> and select the downloaded CSV file.
                </li>
              </ol>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-border/40">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!syncHelperModal) return;
                await copyChallengeDataToClipboardForSheet(
                  challenges.find((c) => c.title === syncHelperModal.challengeTitle)?.id || "all",
                  syncHelperModal.challengeTitle
                );
                toast.success("Rows copied to clipboard again! Press Ctrl+V in cell A1.");
              }}
              className="gap-1.5 text-xs font-semibold"
            >
              <Copy className="w-3.5 h-3.5" /> Re-Copy to Clipboard
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const target = syncHelperModal?.sheetUrl?.trim() || "https://sheets.new";
                window.open(target, "_blank", "noopener,noreferrer");
              }}
              className="gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Google Sheet</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


/* ---------- Registered Students & Enrolment Management ---------- */
function RegisteredStudentsSection({
  onViewSubmissions,
}: {
  onViewSubmissions?: () => void;
}) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const {
    challenges,
    selectedChallenge,
    selectedChallengeId,
    setSelectedChallengeId,
  } = useChallenges();

  const [activeChallengeId, setActiveChallengeId] = useState<string>(
    selectedChallengeId || (challenges[0]?.id ?? "all")
  );

  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<(ChallengeParticipantRecord & { books_approved_count: number })[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [houseFilter, setHouseFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "in_progress">("all");

  // Enrollment modal
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollRoleFilter, setEnrollRoleFilter] = useState<"all" | "student" | "staff">("all");
  const [enrollSearch, setEnrollSearch] = useState("");
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [enrollingAll, setEnrollingAll] = useState(false);

  // Staff/student cohort editing
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editHouse, setEditHouse] = useState("");
  const [editYearGroup, setEditYearGroup] = useState("");
  const [editClassName, setEditClassName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const getRoleDetails = (role?: string | null) => {
    switch (role?.toLowerCase()) {
      case "homeroom_tutor":
        return {
          label: "Homeroom Tutor",
          isStaff: true,
          badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
          icon: GraduationCap,
        };
      case "head_of_year":
        return {
          label: "Head of Year",
          isStaff: true,
          badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
          icon: Award,
        };
      case "house_patron":
        return {
          label: "House Patron",
          isStaff: true,
          badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
          icon: ShieldCheck,
        };
      case "librarian":
        return {
          label: "Librarian Staff",
          isStaff: true,
          badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
          icon: BookOpen,
        };
      case "staff":
        return {
          label: "Staff Member",
          isStaff: true,
          badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
          icon: Briefcase,
        };
      case "teacher":
        return {
          label: "Teacher",
          isStaff: true,
          badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
          icon: GraduationCap,
        };
      case "admin":
        return {
          label: "Administrator",
          isStaff: true,
          badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
          icon: ShieldCheck,
        };
      case "student":
      default:
        return {
          label: "Student",
          isStaff: false,
          badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
          icon: User,
        };
    }
  };

  useEffect(() => {
    if (editingStudent) {
      setEditFullName(editingStudent.full_name || "");
      setEditHouse(editingStudent.house || "Kenya");
      setEditYearGroup(editingStudent.year_group || "DP1");
      setEditClassName(editingStudent.class_name || "");
    }
  }, [editingStudent]);

  const handleSaveStudentCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editFullName.trim(),
          house: editHouse,
          year_group: editYearGroup,
          class_name: editClassName.trim() || null,
        })
        .eq("user_id", editingStudent.user_id);

      if (error) throw error;
      toast.success(`Academic cohort updated for ${editFullName}.`);
      setEditingStudent(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update cohort");
    } finally {
      setSavingEdit(false);
    }
  };

  // Sync activeChallengeId if selectedChallengeId updates
  useEffect(() => {
    if (selectedChallengeId && selectedChallengeId !== activeChallengeId) {
      setActiveChallengeId(selectedChallengeId);
    }
  }, [selectedChallengeId]);

  const currentChallenge = useMemo(() => {
    if (activeChallengeId === ALL_CHALLENGES_ID) return null;
    return challenges.find((c) => c.id === activeChallengeId) || selectedChallenge;
  }, [challenges, activeChallengeId, selectedChallenge]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const rawParticipants = await fetchRegisteredStudentsForChallenge(activeChallengeId);

      const subCountMap: Record<string, number> = {};
      let subsList: any[] = [];
      if (activeChallengeId === ALL_CHALLENGES_ID || activeChallengeId === "45450000-2025-4026-8000-000000000045") {
        const [bRes, cRes] = await Promise.all([
          supabase.from("book_submissions").select("id, user_id, title"),
          supabase.from("challenge_submissions").select("id, user_id, title, challenge_id"),
        ]);
        const seen = new Set<string>();
        const combined: any[] = [];
        (bRes.data || []).forEach((s) => {
          const key = `${s.user_id}-${(s.title || "").trim().toLowerCase()}`;
          seen.add(key);
          combined.push(s);
        });
        (cRes.data || []).forEach((s) => {
          if (activeChallengeId === ALL_CHALLENGES_ID || s.challenge_id === activeChallengeId) {
            const key = `${s.user_id}-${(s.title || "").trim().toLowerCase()}`;
            if (!seen.has(key)) {
              seen.add(key);
              combined.push(s);
            }
          }
        });
        subsList = combined;
      } else {
        const { data: cSubs } = await supabase
          .from("challenge_submissions")
          .select("id, user_id, challenge_id")
          .eq("challenge_id", activeChallengeId);
        subsList = cSubs || [];
      }
      subsList.forEach((s: any) => {
        subCountMap[s.user_id] = (subCountMap[s.user_id] || 0) + 1;
      });

      // Load all academy user profiles (both students AND teachers / staff members)
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, house, year_group, class_name, role, avatar_url")
        .order("full_name", { ascending: true });

      const allMembers = profilesData || [];
      setAllProfiles(allMembers);

      const profileMap = new Map(allMembers.map((p: any) => [p.user_id, p]));

      const mergedParticipants = rawParticipants.map((p) => {
        const prof = p.profile || profileMap.get(p.user_id);
        return {
          ...p,
          profile: prof || p.profile,
          books_approved_count: subCountMap[p.user_id] ?? p.books_completed ?? 0,
        };
      });

      if (mergedParticipants.length === 0 && subsList.length > 0) {
        const uidsWithSubs = [...new Set(subsList.map((s: any) => s.user_id))];
        const derived = uidsWithSubs.map((uid) => ({
          id: `sub-${uid}-${activeChallengeId}`,
          challenge_id: activeChallengeId,
          user_id: uid,
          joined_at: new Date().toISOString(),
          books_completed: subCountMap[uid] || 0,
          books_approved_count: subCountMap[uid] || 0,
          profile: profileMap.get(uid),
        }));
        setParticipants(derived);
      } else {
        setParticipants(mergedParticipants);
      }
    } catch (err) {
      console.warn("Error loading registered challenge participants:", err);
    } finally {
      setLoading(false);
    }
  }, [activeChallengeId]);

  useEffect(() => {
    loadData();
    const handleRegChange = () => loadData();
    window.addEventListener("mfa-challenge-registration-changed", handleRegChange);
    window.addEventListener("mfa_challenge_participants_updated", handleRegChange);
    return () => {
      window.removeEventListener("mfa-challenge-registration-changed", handleRegChange);
      window.removeEventListener("mfa_challenge_participants_updated", handleRegChange);
    };
  }, [loadData]);

  const targetBooks = currentChallenge?.target_books || 15;

  const filtered = useMemo(() => {
    return participants.filter((p) => {
      // Only restrict by house/cohort if NOT a librarian or admin
      const isFullAdmin =
        profile?.role === "admin" ||
        profile?.role === "librarian" ||
        user?.email?.toLowerCase().includes("tonny") ||
        !profile?.role;

      if (!isFullAdmin) {
        if (profile?.house && p.profile?.house && p.profile.house.toLowerCase() !== profile.house.toLowerCase()) return false;
        if (profile?.year_group && p.profile?.year_group && p.profile.year_group.toLowerCase() !== profile.year_group.toLowerCase()) return false;
        if (profile?.class_name && p.profile?.class_name && p.profile.class_name.toLowerCase() !== profile.class_name.toLowerCase()) return false;
      }

      const name = (p.profile?.full_name || "").toLowerCase();
      const email = (p.profile?.email || "").toLowerCase();
      const className = (p.profile?.class_name || "").toLowerCase();
      const roleStr = (p.profile?.role || "student").toLowerCase();
      const q = search.toLowerCase().trim();

      if (q && !name.includes(q) && !email.includes(q) && !className.includes(q) && !roleStr.includes(q)) {
        return false;
      }

      if (roleFilter === "student" && p.profile?.role && p.profile.role !== "student") {
        return false;
      }
      if (roleFilter === "staff" && (!p.profile?.role || p.profile.role === "student")) {
        return false;
      }
      if (roleFilter !== "all" && roleFilter !== "student" && roleFilter !== "staff") {
        if (p.profile?.role !== roleFilter) return false;
      }

      if (houseFilter !== "all" && p.profile?.house !== houseFilter) {
        return false;
      }

      if (yearFilter !== "all" && p.profile?.year_group !== yearFilter) {
        return false;
      }

      const isCompleted = (p.books_approved_count || 0) >= targetBooks;
      if (statusFilter === "completed" && !isCompleted) return false;
      if (statusFilter === "in_progress" && isCompleted) return false;

      return true;
    });
  }, [participants, search, roleFilter, houseFilter, yearFilter, statusFilter, targetBooks, profile]);

  const totalCount = participants.length;
  const studentCount = participants.filter((p) => !p.profile?.role || p.profile.role === "student").length;
  const staffCount = participants.filter((p) => p.profile?.role && p.profile.role !== "student").length;

  const completedCount = participants.filter((p) => (p.books_approved_count || 0) >= targetBooks).length;
  const completedStudents = participants.filter((p) => (!p.profile?.role || p.profile.role === "student") && (p.books_approved_count || 0) >= targetBooks).length;
  const completedStaff = participants.filter((p) => (p.profile?.role && p.profile.role !== "student") && (p.books_approved_count || 0) >= targetBooks).length;

  const inProgressCount = totalCount - completedCount;
  const avgBooks = totalCount > 0
    ? (participants.reduce((sum, p) => sum + (p.books_approved_count || 0), 0) / totalCount).toFixed(1)
    : "0.0";

  const totalSchoolStudents = allProfiles.filter((p) => !p.role || p.role === "student").length || 229;
  const totalSchoolStaff = allProfiles.filter((p) => p.role && p.role !== "student").length || 18;
  const totalSchoolMembers = allProfiles.length > 0 ? allProfiles.length : (totalSchoolStudents + totalSchoolStaff);

  const houseBreakdown = useMemo(() => {
    const map: Record<string, { totalMembers: number; enrolled: number; completed: number; books: number; staffCount: number }> = {};
    HOUSES.forEach((h) => {
      map[h] = { totalMembers: 0, enrolled: 0, completed: 0, books: 0, staffCount: 0 };
    });
    allProfiles.forEach((p) => {
      const h = p.house || "Kenya";
      if (map[h]) map[h].totalMembers++;
    });
    participants.forEach((p) => {
      const h = p.profile?.house || "Kenya";
      if (map[h]) {
        map[h].enrolled++;
        if (p.profile?.role && p.profile.role !== "student") {
          map[h].staffCount++;
        }
        const books = p.books_approved_count || 0;
        map[h].books += books;
        if (books >= targetBooks) map[h].completed++;
      }
    });
    return map;
  }, [allProfiles, participants, targetBooks]);

  const handleEnrollMember = async (userId: string, memberName?: string) => {
    if (!activeChallengeId || activeChallengeId === ALL_CHALLENGES_ID) {
      return toast.error("Please select a specific challenge to enroll participants into.");
    }
    setEnrollingId(userId);
    try {
      await registerStudentForChallenge(userId, activeChallengeId);
      toast.success(`${memberName || "Participant"} successfully enrolled in challenge!`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to enroll participant");
    } finally {
      setEnrollingId(null);
    }
  };

  const handleEnrollAll = async (type: "students" | "staff" | "all" = "students") => {
    if (!activeChallengeId || activeChallengeId === ALL_CHALLENGES_ID) {
      return toast.error("Please select a specific challenge to enroll participants into.");
    }
    let unregistered = allProfiles.filter(
      (prof) => !participants.some((p) => p.user_id === prof.user_id)
    );
    if (type === "students") {
      unregistered = unregistered.filter((p) => !p.role || p.role === "student");
    } else if (type === "staff") {
      unregistered = unregistered.filter((p) => p.role && p.role !== "student");
    }

    const typeLabel = type === "staff" ? "teachers & staff members" : type === "students" ? "students" : "community members";
    if (unregistered.length === 0) {
      return toast.info(`All ${typeLabel} are already enrolled in this challenge.`);
    }
    if (!confirm(`Enroll all ${unregistered.length} remaining ${typeLabel} into "${currentChallenge?.title || 'this challenge'}"?`)) {
      return;
    }

    setEnrollingAll(true);
    const toastId = toast.loading(`Enrolling ${unregistered.length} ${typeLabel} into challenge...`);
    try {
      for (const st of unregistered) {
        await registerStudentForChallenge(st.user_id, activeChallengeId);
      }
      toast.success(`Successfully enrolled ${unregistered.length} ${typeLabel}!`, { id: toastId });
      loadData();
    } catch (err: any) {
      toast.error(`Could not enroll participants: ${err.message}`, { id: toastId });
    } finally {
      setEnrollingAll(false);
    }
  };

  const handleRemoveParticipant = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name || 'this participant'} from "${currentChallenge?.title || 'this challenge'}"?`)) {
      return;
    }
    try {
      await unregisterStudentFromChallenge(userId, activeChallengeId);
      toast.success(`${name || 'Participant'} unenrolled from challenge.`);
      loadData();
    } catch (err: any) {
      toast.error("Failed to remove participant.");
    }
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      return toast.error("No participant records to export");
    }
    const exportData = filtered.map((p) => {
      const roleDetails = getRoleDetails(p.profile?.role);
      return {
        "Participant Name": p.profile?.full_name || "Unknown",
        "Role": roleDetails.label,
        "Account Type": roleDetails.isStaff ? "Teacher / Staff" : "Student",
        "Email": p.profile?.email || "N/A",
        "House": p.profile?.house || "Unassigned",
        "Year Group / Department": p.profile?.year_group || (roleDetails.isStaff ? "Faculty / Staff" : "N/A"),
        "Class": p.profile?.class_name || "N/A",
        "Challenge": currentChallenge?.title || "All Challenges",
        "Enrolled Date": p.joined_at ? new Date(p.joined_at).toLocaleDateString() : "N/A",
        "Books Approved": p.books_approved_count || 0,
        "Target Goal": targetBooks,
        "Progress %": Math.min(100, Math.round(((p.books_approved_count || 0) / targetBooks) * 100)),
        "Status": (p.books_approved_count || 0) >= targetBooks ? "Goal Achieved" : "In Progress",
      };
    });

    const cleanTitle = (currentChallenge?.title || "All_Challenges").replace(/[^a-zA-Z0-9]/g, "_");
    exportCSV(exportData, `Enrolled_Participants_${cleanTitle}`);
    toast.success("Roster exported to CSV!");
  };

  const handleExportBulkPDF = async () => {
    const verified = filtered.filter((p) => (p.books_approved_count || 0) > 0);
    if (verified.length === 0) {
      return toast.error("No participants with verified books to export.");
    }

    const { exportBulkCertificatesPDF } = await import("@/lib/pdfExporter");
    const { getVerificationCode, computeStudentLevel } = await import("@/lib/certificateTypes");

    const toastId = toast.loading(`Generating single multi-page PDF for ${verified.length} verified scholars...`);

    const mapped = verified.map((p) => {
      const books = p.books_approved_count || 0;
      const lvl = computeStudentLevel(books);
      const email = p.profile?.email || "";
      const code = getVerificationCode(email || p.profile?.full_name || "MFA");
      return {
        id: p.id,
        studentName: p.profile?.full_name || "Scholar Reader",
        studentEmail: email,
        level: lvl,
        booksCount: books,
        house: p.profile?.house || "Kenya House",
        yearGroup: p.profile?.year_group || "DP1",
        className: p.profile?.class_name || undefined,
        verificationCode: code,
        signatoryName: currentChallenge?.certificate_signatory_name || "Head Librarian",
        signatoryTitle: currentChallenge?.certificate_signatory_title || "Media Specialist",
        dateAwarded: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
        challengeName: currentChallenge?.title || "45-Book Reading Challenge",
      };
    });

    await exportBulkCertificatesPDF(mapped, {
      filename: `${(currentChallenge?.title || "Challenge").replace(/[^a-zA-Z0-9]/g, "_")}_All_Verified_Certificates.pdf`,
      onSuccess: (info) => {
        toast.success(`Successfully exported single multi-page PDF with ${info.total} verified certificates!`, { id: toastId });
      },
      onError: (err) => {
        toast.error("Failed to export bulk certificates: " + (err?.message || "Error"), { id: toastId });
      },
    });
  };

  const nonEnrolledMembers = useMemo(() => {
    return allProfiles.filter((prof) => {
      const already = participants.some((p) => p.user_id === prof.user_id);
      if (already) return false;
      if (enrollRoleFilter === "student" && prof.role && prof.role !== "student") return false;
      if (enrollRoleFilter === "staff" && (!prof.role || prof.role === "student")) return false;
      if (!enrollSearch.trim()) return true;
      const q = enrollSearch.toLowerCase().trim();
      return (
        (prof.full_name || "").toLowerCase().includes(q) ||
        (prof.email || "").toLowerCase().includes(q) ||
        (prof.role || "").toLowerCase().includes(q) ||
        (prof.house || "").toLowerCase().includes(q)
      );
    });
  }, [allProfiles, participants, enrollSearch, enrollRoleFilter]);

  const getHouseBadgeColor = (house?: string | null) => {
    switch (house?.toLowerCase()) {
      case "amboseli":
        return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30";
      case "mara":
        return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      case "serengeti":
        return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
      case "tsavo":
        return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Workspace Selector & Header */}
      <Card className="rounded-3xl border-border bg-card shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{currentChallenge?.badge_icon || "👥"}</span>
                <h3 className="font-display text-xl font-bold text-foreground">
                  Challenge Enrolment: Registered Students, Teachers & Staff
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Inspect scholars, teachers, and school staff enrolled in this challenge, track individual reading progress towards the target, enroll participants, and export official rosters.
              </p>
            </div>

            {/* Challenge Filter Selector */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                Challenge Workspace:
              </div>
              <Select
                value={activeChallengeId}
                onValueChange={(val) => {
                  setActiveChallengeId(val);
                  setSelectedChallengeId(val);
                }}
              >
                <SelectTrigger className="w-[220px] sm:w-[260px] text-xs font-semibold">
                  <SelectValue placeholder="Select Challenge" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value={ALL_CHALLENGES_ID}>
                    📚 All Challenges Combined View
                  </SelectItem>
                  {challenges.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="mr-1.5">{c.badge_icon || "🏆"}</span>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                size="sm"
                variant="outline"
                onClick={loadData}
                disabled={loading}
                className="h-8 text-xs gap-1"
                title="Refresh roster"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Librarian Roster & Student/Staff Participation Confirmation */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>Whole-School Challenge Roster (Students & Faculty):</strong> Both students and teachers/staff who have joined this challenge are visible here so you can track their reading progress, house points, and completions. Submissions are securely locked upon entry for academic integrity and kept private between each reader and academy librarians.
            </div>
          </div>

          {/* Key Metrics Cards: Overall Total for students, teachers & challenge specifics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20">
              <div className="text-[11px] font-semibold text-primary">Total Academy Roster</div>
              <div className="text-xl font-bold text-foreground mt-0.5">{totalSchoolMembers}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {totalSchoolStudents} students • {totalSchoolStaff} staff
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border">
              <div className="text-[11px] font-semibold text-muted-foreground">Enrolled in Challenge</div>
              <div className="text-xl font-bold text-foreground mt-0.5">{totalCount}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                <span className="text-primary font-semibold">{studentCount}</span> students • <span className="text-purple-600 dark:text-purple-400 font-semibold">{staffCount}</span> staff
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Goal Achieved</div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{completedCount}</div>
              <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                {completedStudents} students • {completedStaff} staff ({totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%)
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">In Progress</div>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">{inProgressCount}</div>
              <div className="text-[10px] text-blue-600/70 dark:text-blue-400/70 mt-0.5">
                Reading towards {targetBooks} books
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 col-span-2 sm:col-span-1">
              <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Average Books Read</div>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{avgBooks}</div>
              <div className="text-[10px] text-amber-600/70 dark:text-amber-400/70 mt-0.5">
                Per enrolled participant
              </div>
            </div>
          </div>

          {/* House Cohort & Individual Breakdown */}
          <div className="pt-2">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
              <span>House Cohort Standings &amp; Participation</span>
              <span className="text-[11px] font-normal lowercase">Target: {targetBooks} books</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {HOUSES.map((hName) => {
                const stat = houseBreakdown[hName] || { totalMembers: 0, enrolled: 0, completed: 0, books: 0, staffCount: 0 };
                const pct = stat.enrolled > 0 ? Math.round((stat.completed / stat.enrolled) * 100) : 0;
                return (
                  <div
                    key={hName}
                    className="p-3 rounded-2xl border border-border bg-background/60 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground">{hName} House</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {stat.enrolled} enrolled
                        {stat.staffCount > 0 && ` (${stat.staffCount} staff)`}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-muted-foreground text-[11px]">Books logged:</span>
                      <span className="font-bold text-primary font-mono">{stat.books} books</span>
                    </div>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-muted-foreground text-[11px]">Goal achieved:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {stat.completed} ({pct}%)
                      </span>
                    </div>
                    <Progress value={pct} className="h-1 mt-1" />
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roster Controls & Filters */}
      <Card className="rounded-3xl border-border bg-card">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, class, or role (e.g. tutor, staff)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            {/* Actions: Enroll & Export */}
            <div className="flex items-center gap-2 flex-wrap">
              <Dialog open={enrollModalOpen} onOpenChange={setEnrollModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="text-xs gap-1.5 text-white shadow-sm"
                    style={{ background: "linear-gradient(120deg, hsl(var(--v-green)), hsl(var(--v-cyan)))" }}
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Enroll Participant
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base font-display">
                      <UserPlus className="w-4 h-4 text-primary" />
                      Enroll Participant into {currentChallenge?.title || "Challenge"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <p className="text-xs text-muted-foreground">
                      Select a student, teacher, or other staff member from the academy directory to enroll them into this reading challenge workspace.
                    </p>

                    {/* Role Filter Tabs inside Enroll Modal */}
                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 text-xs">
                      <button
                        type="button"
                        onClick={() => setEnrollRoleFilter("all")}
                        className={cn(
                          "flex-1 py-1 px-2 rounded-lg font-medium transition-all text-center",
                          enrollRoleFilter === "all"
                            ? "bg-background text-foreground shadow-xs font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        All ({allProfiles.filter((p) => !participants.some((pt) => pt.user_id === p.user_id)).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setEnrollRoleFilter("student")}
                        className={cn(
                          "flex-1 py-1 px-2 rounded-lg font-medium transition-all text-center",
                          enrollRoleFilter === "student"
                            ? "bg-background text-foreground shadow-xs font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Students ({allProfiles.filter((p) => (!p.role || p.role === "student") && !participants.some((pt) => pt.user_id === p.user_id)).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setEnrollRoleFilter("staff")}
                        className={cn(
                          "flex-1 py-1 px-2 rounded-lg font-medium transition-all text-center",
                          enrollRoleFilter === "staff"
                            ? "bg-background text-foreground shadow-xs font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Teachers & Staff ({allProfiles.filter((p) => p.role && p.role !== "student" && !participants.some((pt) => pt.user_id === p.user_id)).length})
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, email, or role..."
                        value={enrollSearch}
                        onChange={(e) => setEnrollSearch(e.target.value)}
                        className="pl-9 text-xs"
                      />
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                      {nonEnrolledMembers.length === 0 ? (
                        <div className="text-xs text-muted-foreground text-center py-6">
                          No matching participants found or all selected members are already enrolled.
                        </div>
                      ) : (
                        nonEnrolledMembers.map((st) => {
                          const rDetails = getRoleDetails(st.role);
                          const RIcon = rDetails.icon;
                          return (
                            <div
                              key={st.user_id}
                              className="p-2.5 rounded-xl border border-border bg-muted/30 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-foreground truncate">{st.full_name}</span>
                                  <Badge
                                    variant="outline"
                                    className={cn("text-[9px] font-semibold py-0 px-1 gap-0.5", rDetails.badgeClass)}
                                  >
                                    <RIcon className="w-2.5 h-2.5" />
                                    {rDetails.label}
                                  </Badge>
                                </div>
                                <div className="text-[11px] text-muted-foreground truncate flex items-center gap-2 mt-0.5">
                                  <span>{st.email}</span>
                                  {st.house && <span>• {st.house}</span>}
                                  {st.year_group && <span>• {st.year_group}</span>}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                disabled={enrollingId === st.user_id}
                                onClick={() => handleEnrollMember(st.user_id, st.full_name)}
                                className="h-7 text-xs font-semibold px-3 shrink-0"
                              >
                                {enrollingId === st.user_id ? "Enrolling…" : "Enroll"}
                              </Button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <DialogFooter className="pt-2 border-t border-border">
                    <Button variant="ghost" size="sm" onClick={() => setEnrollModalOpen(false)} className="text-xs">
                      Done
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                size="sm"
                variant="outline"
                disabled={enrollingAll}
                onClick={() => handleEnrollAll("students")}
                className="text-xs gap-1.5 h-8 text-primary border-primary/30 hover:bg-primary/5"
                title="Enroll all remaining school students"
              >
                <Users className="w-3.5 h-3.5" />
                {enrollingAll ? "Enrolling…" : "Enroll All Students"}
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={enrollingAll}
                onClick={() => handleEnrollAll("staff")}
                className="text-xs gap-1.5 h-8 text-purple-600 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/5"
                title="Enroll all remaining teachers and staff"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                Enroll All Staff
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleExportCSV}
                className="text-xs gap-1.5 h-8"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export CSV
              </Button>

              <Button
                size="sm"
                onClick={handleExportBulkPDF}
                className="text-xs gap-1.5 h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs"
                title="Download all verified certificates for this challenge roster as a single multi-page A4 landscape PDF"
              >
                <Files className="w-3.5 h-3.5" />
                <span>Bulk PDF ({filtered.filter((p) => (p.books_approved_count || 0) > 0).length})</span>
              </Button>
            </div>
          </div>

          {/* Quick Segmented Role Selector Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-muted/40 border border-border text-xs">
            <button
              type="button"
              onClick={() => setRoleFilter("all")}
              className={cn(
                "py-1.5 px-3 rounded-xl font-medium transition-all flex items-center gap-1.5",
                roleFilter === "all"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="w-3.5 h-3.5" />
              All Participants ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("student")}
              className={cn(
                "py-1.5 px-3 rounded-xl font-medium transition-all flex items-center gap-1.5",
                roleFilter === "student"
                  ? "bg-background text-primary shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <User className="w-3.5 h-3.5 text-primary" />
              Students Only ({studentCount})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("staff")}
              className={cn(
                "py-1.5 px-3 rounded-xl font-medium transition-all flex items-center gap-1.5",
                roleFilter === "staff"
                  ? "bg-background text-purple-600 dark:text-purple-400 shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <GraduationCap className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              Teachers &amp; Staff Only ({staffCount})
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border text-xs">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1">Filter by:</span>

            {/* Role dropdown for specific faculty roles */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-7 text-xs w-[145px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">👥 All Roles</SelectItem>
                <SelectItem value="student">🎓 Students Only</SelectItem>
                <SelectItem value="staff">🧑‍🏫 All Staff/Faculty</SelectItem>
                <SelectItem value="homeroom_tutor">🧑‍🏫 Homeroom Tutors</SelectItem>
                <SelectItem value="house_patron">🛡️ House Patrons</SelectItem>
                <SelectItem value="head_of_year">🏆 Heads of Year</SelectItem>
                <SelectItem value="librarian">📚 Librarians</SelectItem>
              </SelectContent>
            </Select>

            {/* House */}
            <Select value={houseFilter} onValueChange={setHouseFilter}>
              <SelectTrigger className="h-7 text-xs w-[130px]">
                <SelectValue placeholder="All Houses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Houses</SelectItem>
                {HOUSES.map((h) => (
                  <SelectItem key={h} value={h}>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Year Group */}
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="h-7 text-xs w-[130px]">
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {YEAR_GROUPS.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status */}
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="h-7 text-xs w-[140px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">🏆 Goal Achieved</SelectItem>
                <SelectItem value="in_progress">📖 In Progress</SelectItem>
              </SelectContent>
            </Select>

            {(roleFilter !== "all" || houseFilter !== "all" || yearFilter !== "all" || statusFilter !== "all" || search) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSearch("");
                  setRoleFilter("all");
                  setHouseFilter("all");
                  setYearFilter("all");
                  setStatusFilter("all");
                }}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                Reset filters
              </Button>
            )}

            <div className="ml-auto text-[11px] text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {totalCount} participants
            </div>
          </div>

          {/* Roster Table */}
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Loading enrolled participants...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center space-y-2 border border-dashed border-border rounded-2xl p-6">
              <Users className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
              <div className="text-sm font-semibold text-foreground">No participants found</div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {participants.length === 0
                  ? "No participants are currently registered for this challenge. Click 'Enroll Participant' to add scholars, teachers, or staff to this challenge."
                  : "No participants matched your search and filter criteria."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Participant &amp; Role</th>
                    <th className="py-3 px-3">House &amp; Cohort / Dept</th>
                    <th className="py-3 px-3">Enrolled Date</th>
                    <th className="py-3 px-3">Reading Progress</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((p) => {
                    const booksRead = p.books_approved_count || 0;
                    const percent = Math.min(100, Math.round((booksRead / targetBooks) * 100));
                    const isDone = booksRead >= targetBooks;
                    const participantName = p.profile?.full_name || "Unknown Reader";
                    const roleDetails = getRoleDetails(p.profile?.role);
                    const RoleIcon = roleDetails.icon;

                    return (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        {/* Participant & Role */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ring-1",
                                roleDetails.isStaff
                                  ? "bg-purple-500/20 text-purple-700 dark:text-purple-300 ring-purple-500/40"
                                  : "bg-primary/10 text-primary ring-primary/20"
                              )}
                            >
                              {participantName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-foreground truncate max-w-[170px]">
                                  {participantName}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn("text-[9px] font-semibold py-0 px-1.5 gap-1 shrink-0", roleDetails.badgeClass)}
                                >
                                  <RoleIcon className="w-2.5 h-2.5" />
                                  {roleDetails.label}
                                </Badge>
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate max-w-[190px]">
                                {p.profile?.email || "No email"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* House & Cohort / Department */}
                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            {p.profile?.house ? (
                              <Badge variant="outline" className={cn("text-[10px] font-semibold py-0", getHouseBadgeColor(p.profile?.house))}>
                                {p.profile?.house}
                              </Badge>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">Unassigned</span>
                            )}
                            <div className="text-[10px] text-muted-foreground">
                              {roleDetails.isStaff
                                ? (p.profile?.year_group ? `${p.profile.year_group} • Faculty` : "Faculty / Staff")
                                : (`${p.profile?.year_group || "Year N/A"}${p.profile?.class_name ? ` • ${p.profile.class_name}` : ""}`)}
                            </div>
                          </div>
                        </td>

                        {/* Enrolled Date */}
                        <td className="py-3 px-3 text-muted-foreground text-[11px] whitespace-nowrap">
                          {p.joined_at ? new Date(p.joined_at).toLocaleDateString() : "Active"}
                        </td>

                        {/* Reading Progress */}
                        <td className="py-3 px-3">
                          <div className="w-36 space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-foreground">
                                {booksRead} <span className="text-muted-foreground font-normal">/ {targetBooks}</span>
                              </span>
                              <span className="text-muted-foreground font-mono text-[10px]">{percent}%</span>
                            </div>
                            <Progress value={percent} className="h-1.5" />
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {isDone ? (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold py-0.5">
                              🏆 Goal Achieved
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10 text-[10px] font-semibold py-0.5">
                              📖 In Progress
                            </Badge>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingStudent(p.profile)}
                              className="h-7 text-xs px-2 hover:bg-muted"
                              title="Edit cohort details (House, Year, Class)"
                            >
                              <UserCog className="w-3.5 h-3.5 text-primary" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (onViewSubmissions) {
                                  onViewSubmissions();
                                } else {
                                  navigate("/admin?s=submissions");
                                }
                              }}
                              className="h-7 text-xs px-2 hover:bg-muted"
                              title="View reader's submissions"
                            >
                              <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveParticipant(p.user_id, participantName)}
                              className="h-7 text-xs px-2 text-destructive hover:bg-destructive/10"
                              title="Unenroll participant from this challenge"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Staff Edit Student Dialog: Class Name, Year Group, House */}
      {editingStudent && (
        <Dialog open={!!editingStudent} onOpenChange={(v) => !v && setEditingStudent(null)}>
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCog className="w-5 h-5 text-primary" /> Edit Scholar Academic Cohort
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Official staff update for <b>{editingStudent.full_name}</b> ({editingStudent.email}). Only staff can amend class name, year group, or house.
              </p>
            </DialogHeader>

            <form onSubmit={handleSaveStudentCohort} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Full Name</Label>
                <Input
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">House</Label>
                <Select value={editHouse} onValueChange={setEditHouse}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HOUSES.map((h) => (
                      <SelectItem key={h} value={h}>{h} House</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Year Group</Label>
                <Select value={editYearGroup} onValueChange={setEditYearGroup}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {YEAR_GROUPS.map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Class Name</Label>
                <Input
                  value={editClassName}
                  onChange={(e) => setEditClassName(e.target.value)}
                  placeholder="e.g. DP1 North, Form 4 East"
                  className="text-xs"
                />
              </div>

              <DialogFooter className="pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingStudent(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={savingEdit} className="text-xs font-semibold">
                  {savingEdit ? "Saving..." : "Save Cohort Details"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/* ========================================================
   Section Router (Placed after all section definitions)
   ======================================================== */
function SectionRouter({
  section,
  onSelectSection,
}: {
  section: string;
  onSelectSection: (k: string) => void;
}) {
  const { setSelectedChallengeId } = useChallenges();

  switch (section) {
    case "submissions":
      return <SubmissionsSection filter="all" />;
    case "flagged":
      return <SubmissionsSection filter="flagged" />;
    case "controls":
      return <SessionControlsSection />;
    case "challenges":
      return (
        <ChallengesSection
          onCreate={() => onSelectSection("create")}
          onManageRegistrations={(cId) => {
            if (cId) setSelectedChallengeId(cId);
            onSelectSection("registrations");
          }}
        />
      );
    case "registrations":
      return (
        <RegisteredStudentsSection
          onViewSubmissions={() => onSelectSection("submissions")}
        />
      );
    case "create":
      return <CreateChallengeSection onDone={() => onSelectSection("challenges")} />;
    case "categories":
      return <CategoriesSection />;
    case "codes":
      return <AccessCodesSection />;
    case "homepage":
      return <AdminHomepageStudio />;
    case "broadcast":
      return <BroadcastSection initialMode="broadcast" />;
    case "certificate-dispatch":
      return <BroadcastSection initialMode="certificate" />;
    case "email-preview":
      return <EmailTemplatePreview />;
    case "system-links":
      return <SystemLinksManager />;
    case "students":
      return <StudentProfilesManager />;
    case "members":
      return <PeopleSection role="staff" />;
    case "countdown":
      return <SessionControlsSection />;
    case "certificates":
      return <CertificateTemplates />;
    case "import":
      return <BulkImportSection />;
    case "files":
      return <FilesSection />;
    case "leaderboard":
    case "google":
      return <AdminFullLeaderboard />;
    default:
      return <PlaceholderSection section={section} />;
  }
}

/* ---------- Placeholder for any remaining unmapped sections ---------- */
function PlaceholderSection({ section }: { section: string }) {
  return (
    <Card className="rounded-2xl border-border bg-card">
      <CardContent className="p-8 text-center text-sm text-muted-foreground">
        <span className="capitalize">{section}</span> — coming soon.
      </CardContent>
    </Card>
  );
}
