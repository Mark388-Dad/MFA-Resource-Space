import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useChallenges, Challenge } from "@/contexts/ChallengeContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Trophy,
  BookOpen,
  Calendar,
  Sparkles,
  Target,
  PlusCircle,
  Megaphone,
  CheckCircle2,
  Clock,
  Users,
  Share2,
  ArrowRight,
  Flame,
  Award,
  Lock,
  Mail,
  ShieldCheck,
  UserCheck,
  Pencil,
  Eye,
  Info,
  KeyRound,
  School,
  Layers,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import SEO from "@/components/SEO";
import { AppDownloadButton } from "@/components/AppDownloadBanner";
import EditChallengeDialog from "@/components/EditChallengeDialog";
import WelcomeEmailDialog from "@/components/WelcomeEmailDialog";
import ChallengeAccessCodeDialog from "@/components/ChallengeAccessCodeDialog";
import {
  getWelcomeEmails,
  WelcomeEmailRecord,
} from "@/lib/challengeRegistrationManager";
import { cn } from "@/lib/utils";
import { READING_CATEGORIES } from "@/lib/constants";
import { safeStorage } from "@/lib/safeStorage";
import { SessionCountdownBanner } from "@/components/SessionCountdownBanner";
import { LockedChallengeNotice } from "@/components/LockedChallengeNotice";

interface ChallengeSubmissionItem {
  id: string;
  user_id: string;
  title: string;
  author: string;
  category_name?: string;
  category_number?: number;
  reflection: string;
  points_earned?: number;
  date_finished?: string;
  created_at?: string;
}

export default function ChallengesPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const {
    challenges,
    activeChallenges,
    userVisibleChallenges,
    selectedChallengeId,
    selectedChallenge,
    setSelectedChallengeId,
    refreshChallenges,
    toggleChallengeActive,
    setChallengeStatus,
    deleteChallenge,
    broadcastChallengeToAll,
    isRegistered,
    registerForChallenge,
  } = useChallenges();

  const displayChallenges = userVisibleChallenges && userVisibleChallenges.length > 0 ? userVisibleChallenges : challenges;

  const [activeTab, setActiveTab] = useState<"workspace" | "submissions" | "leaderboard" | "categories" | "info">("workspace");
  const [submissions, setSubmissions] = useState<ChallengeSubmissionItem[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [challengeToDelete, setChallengeToDelete] = useState<{ id: string; title: string } | null>(null);
  const [deletingChallenge, setDeletingChallenge] = useState(false);
  const [welcomeEmail, setWelcomeEmail] = useState<WelcomeEmailRecord | null>(null);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [authorProfiles, setAuthorProfiles] = useState<Map<string, { full_name: string; house?: string; year_group?: string }>>(new Map());

  const isLibrarian = profile?.role === "librarian" || profile?.role === "admin";
  const isStaff = isLibrarian || Boolean(profile?.role && profile.role !== "student");

  const handleConfirmDelete = async () => {
    if (!challengeToDelete) return;
    setDeletingChallenge(true);
    const ok = await deleteChallenge(challengeToDelete.id);
    setDeletingChallenge(false);
    if (ok) {
      setChallengeToDelete(null);
      refreshChallenges();
    }
  };

  // URL sync if ?id=xyz is passed
  useEffect(() => {
    const id = params.get("id");
    if (id && challenges.some((c) => c.id === id)) {
      setSelectedChallengeId(id);
    }
  }, [params, challenges, setSelectedChallengeId]);

  // Load submissions for this challenge strictly — ground truth aligned with Dashboard
  const loadSubmissions = useCallback(async () => {
    if (!selectedChallenge) return;
    setLoadingSubs(true);
    try {
      const isAll = selectedChallenge.id === "all";
      const normId = normalizeChallengeId(selectedChallenge.id);
      const is45Master = !isAll && (selectedChallenge.id === MAIN_CHALLENGE_ID || normId === MAIN_CHALLENGE_ID);

      let raw: any[] = [];

      if (isAll) {
        // Combined whole-school view: queries both tables across all challenges
        let cQuery = supabase.from("challenge_submissions").select("*").order("created_at", { ascending: false });
        let bQuery = supabase.from("book_submissions").select("*").order("created_at", { ascending: false });
        if (!isStaff && user?.id) {
          cQuery = cQuery.eq("user_id", user.id);
          bQuery = bQuery.eq("user_id", user.id);
        } else {
          cQuery = cQuery.limit(300);
          bQuery = bQuery.limit(300);
        }
        const [cRes, bRes] = await Promise.all([cQuery, bQuery]);
        raw = [...(cRes.data || []), ...(bRes.data || [])];
      } else if (is45Master) {
        // Independent 45-Book Master Challenge: strictly 45-book records
        let cQuery = supabase
          .from("challenge_submissions")
          .select("*")
          .eq("challenge_id", MAIN_CHALLENGE_ID)
          .order("created_at", { ascending: false });
        let bQuery = supabase.from("book_submissions").select("*").order("created_at", { ascending: false });
        if (!isStaff && user?.id) {
          cQuery = cQuery.eq("user_id", user.id);
          bQuery = bQuery.eq("user_id", user.id);
        } else {
          cQuery = cQuery.limit(300);
          bQuery = bQuery.limit(300);
        }
        const [cRes, bRes] = await Promise.all([cQuery, bQuery]);
        raw = [...(cRes.data || []), ...(bRes.data || [])];
      } else {
        // Specialty or custom challenge: strictly submissions matching this challenge's IDs
        const targetIds = Array.from(new Set([selectedChallenge.id, normId].filter(Boolean) as string[]));
        let cQuery = supabase
          .from("challenge_submissions")
          .select("*")
          .in("challenge_id", targetIds)
          .order("created_at", { ascending: false });
        if (!isStaff && user?.id) {
          cQuery = cQuery.eq("user_id", user.id);
        } else {
          cQuery = cQuery.limit(300);
        }
        const { data } = await cQuery;
        raw = data || [];
      }

      // Merge resilient local backups and audits to guarantee instant updates
      const localAudit = safeStorage.getJSON<any[]>("mfa_submissions_audit", []);
      const localBackup = safeStorage.getJSON<any[]>(`mfa_backup_submissions_${selectedChallenge.id}`, []);
      const localNormBackup = normId ? safeStorage.getJSON<any[]>(`mfa_backup_submissions_${normId}`, []) : [];
      
      const relevantLocal = [
        ...localBackup,
        ...localNormBackup,
        ...localAudit.filter((s) => {
          if (isAll) return true;
          if (is45Master) return !s.challenge_id || s.challenge_id === MAIN_CHALLENGE_ID;
          return s.challenge_id === selectedChallenge.id || s.challenge_id === normId;
        })
      ].map((loc) => ({
        id: loc.id || `loc-${Math.random()}`,
        user_id: loc.user_id || user?.id || "student-local",
        title: loc.title || loc.bookTitle || "",
        author: loc.author || "",
        category_name: loc.categoryName || loc.category_name || "",
        category_number: loc.categoryNumber || loc.category_number || 1,
        reflection: loc.reflection || "",
        points_earned: loc.pointsEarned || loc.points_earned || 10,
        date_finished: loc.dateFinished || loc.date_finished || "",
        created_at: loc.created_at || loc.timestamp || new Date().toISOString(),
      }));

      raw = [...relevantLocal, ...raw];

      // Deduplicate by ID and (title + author)
      const seenIds = new Set<string>();
      const seenKeys = new Set<string>();
      const combined = raw.filter((s: any) => {
        if (s.id && seenIds.has(s.id)) return false;
        if (s.id) seenIds.add(s.id);
        const k = `${(s.title || "").trim().toLowerCase()}:::${(s.author || "").trim().toLowerCase()}`;
        if (k !== ":::" && seenKeys.has(k)) return false;
        if (k !== ":::") seenKeys.add(k);
        return true;
      });

      setSubmissions(combined as ChallengeSubmissionItem[]);
    } catch (err) {
      console.warn("Could not query challenge submissions:", err);
    } finally {
      setLoadingSubs(false);
    }
  }, [selectedChallenge, isStaff, user?.id]);

  useEffect(() => {
    loadSubmissions();

    const channel = supabase
      .channel("realtime-challenges-subs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "challenge_submissions" },
        () => {
          loadSubmissions();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "book_submissions" },
        () => {
          loadSubmissions();
        }
      )
      .subscribe();

    const handleSubmissionCreated = () => loadSubmissions();
    window.addEventListener("mfa_submission_created", handleSubmissionCreated);
    window.addEventListener("storage", handleSubmissionCreated);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("mfa_submission_created", handleSubmissionCreated);
      window.removeEventListener("storage", handleSubmissionCreated);
    };
  }, [loadSubmissions]);

  // Load student author profiles for staff overview
  useEffect(() => {
    if (!isStaff || submissions.length === 0) return;
    const uids = [...new Set(submissions.map((s) => s.user_id))];
    supabase
      .from("profiles")
      .select("user_id, full_name, house, year_group")
      .in("user_id", uids)
      .then(({ data }) => {
        if (data) {
          const m = new Map();
          data.forEach((p: any) => m.set(p.user_id, p));
          setAuthorProfiles(m);
        }
      });
  }, [submissions, isStaff]);

  // Student specific submissions in this challenge
  const mySubmissions = useMemo(() => {
    if (!user) return [];
    return submissions.filter((s) => s.user_id === user.id);
  }, [submissions, user]);

  // Submissions visible based on role:
  // Students ONLY see their own submissions! Other students cannot see them!
  // Staff/Librarians see all submissions for this challenge.
  const displayedSubmissions = useMemo(() => {
    if (isStaff) return submissions;
    return mySubmissions;
  }, [isStaff, submissions, mySubmissions]);

  const booksReadCount = mySubmissions.length;
  const targetBooks = selectedChallenge?.target_books || 10;
  const percentCompleted = Math.min(100, Math.round((booksReadCount / targetBooks) * 100));

  // Handler for admin broadcast
  const handleBroadcast = async () => {
    if (!selectedChallenge) return;
    setBroadcasting(true);
    await broadcastChallengeToAll(selectedChallenge.id);
    setBroadcasting(false);
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("Challenge link copied to clipboard! Share with classmates.");
  };

  const handleRegister = async () => {
    if (!selectedChallenge) return;
    setRegistering(true);
    const success = await registerForChallenge(selectedChallenge.id);
    setRegistering(false);
    if (success && user?.id) {
      const emails = getWelcomeEmails(user.id);
      const matched = emails.find((e) => e.challenge_id === selectedChallenge.id);
      if (matched) {
        setWelcomeEmail(matched);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={selectedChallenge?.title ? `${selectedChallenge.title} — Challenges` : "Reading Challenges"}
        description="Explore active reading quests, term themes, reading logs, and enrol in the M-PESA Foundation Academy 45-Book Challenge."
        keywords="Reading Challenges, MFA Quests, Book Goals, IB Reading, Student Enrolment"
      />

      <Navbar />

      <main className="w-full max-w-none px-3 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-2">
              <Trophy className="w-3.5 h-3.5" /> ACADEMY READING CHALLENGES
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              Reading Challenges
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Explore available reading challenges, view target requirements, submit books, and track standings.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <AppDownloadButton label="Download App" className="gap-1.5 text-xs h-9" />
            <Button variant="outline" size="sm" onClick={handleShare} className="gap-1.5 text-xs h-9">
              <Share2 className="w-3.5 h-3.5" /> Share Challenge
            </Button>
            {isLibrarian && selectedChallenge && selectedChallenge.id !== "all" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingChallenge(selectedChallenge)}
                  className="gap-1.5 text-xs h-9 font-semibold text-primary border-primary/40 bg-primary/5 hover:bg-primary/10"
                  title="Edit challenge details, categories, prompts, dates, and requirements"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit Challenge
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setChallengeToDelete({ id: selectedChallenge.id, title: selectedChallenge.title })}
                  className="gap-1.5 text-xs h-9 font-semibold text-destructive border-destructive/40 bg-destructive/5 hover:bg-destructive/10"
                  title="Delete this reading challenge"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </Button>
              </>
            )}
            {!isStaff && selectedChallenge && isRegistered(selectedChallenge.id) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (user?.id) {
                    const emails = getWelcomeEmails(user.id);
                    const matched = emails.find((e) => e.challenge_id === selectedChallenge.id) || emails[0];
                    if (matched) {
                      setWelcomeEmail(matched);
                    } else {
                      toast.info("Enrolment confirmed on librarian roster.");
                    }
                  }
                }}
                className="gap-1.5 text-xs h-9 font-semibold text-primary border-primary/40 bg-primary/5 hover:bg-primary/10"
              >
                <Mail className="w-3.5 h-3.5" /> View Welcoming Letter
              </Button>
            )}
            {selectedChallenge?.is_active ? (
              !isStaff ? (
                <Button
                  size="sm"
                  onClick={() => navigate(`/submit?challenge=${selectedChallenge.id}`)}
                  className="gap-1.5 text-xs h-9 font-semibold text-white border-0"
                  style={{
                    background: "linear-gradient(120deg, hsl(var(--v-green)), hsl(var(--v-cyan)))",
                  }}
                >
                  <PlusCircle className="w-4 h-4" /> Submit to this Challenge
                </Button>
              ) : (
                <Badge variant="outline" className="text-xs py-1.5 px-3 border-primary/40 text-primary bg-primary/5">
                  Staff View (All Students)
                </Badge>
              )
            ) : (
              <Button size="sm" variant="outline" disabled className="gap-1.5 text-xs h-9 text-muted-foreground">
                <Lock className="w-3.5 h-3.5" /> Submissions Closed
              </Button>
            )}
          </div>
        </div>

        {/* Academy Reading Session Window Banner */}
        <SessionCountdownBanner isLibrarian={isStaff} />

        {/* Challenge Selection Cards Grid (Filtered by user role) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Available Reading Challenge Workspaces ({displayChallenges.length})
            </span>
            <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">
              {isLibrarian ? "Head Librarian Oversight: All Academy Challenges" : isStaff ? "Staff View: Assigned Cohort Challenges" : "Student View: Enrolled & Eligible Challenges"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {displayChallenges.map((c) => {
              const isSelected = selectedChallenge?.id === c.id;
              const isLocked = c.status === "locked";
              const isClosed = c.status === "closed" || c.is_active === false;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedChallengeId(c.id)}
                  className={cn(
                    "p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between group shadow-sm",
                    isSelected
                      ? "ring-2 ring-primary/50 shadow-md"
                      : "hover:border-primary/40 cursor-pointer"
                  )}
                  style={{
                    background: isSelected
                      ? "linear-gradient(145deg, hsl(var(--primary) / 0.20) 0%, hsl(var(--card)) 100%)"
                      : "linear-gradient(145deg, hsl(var(--card)) 0%, hsl(222 35% 12% / 0.9) 100%)",
                    borderColor: isSelected
                      ? "hsl(var(--primary) / 0.5)"
                      : "hsl(var(--border) / 0.7)",
                  }}
                >
                  <div className="space-y-2 w-full">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-base">
                        {c.badge_icon || "🏆"}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] py-0 px-2 font-bold",
                          isClosed
                            ? "border-slate-400 text-muted-foreground"
                            : isLocked
                            ? "border-amber-500 text-amber-500"
                            : "border-emerald-500 text-emerald-500"
                        )}
                      >
                        {isClosed ? "Concluded" : isLocked ? "Locked" : "Active"}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {c.title}
                      </h3>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                        {c.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 mt-2 border-t border-border/50 flex items-center justify-between text-[11px] w-full">
                    <span className="font-semibold text-foreground">{c.target_books} Books</span>
                    <span className="font-mono text-amber-500 font-bold">+{c.points_reward} pts</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Staff Notice: Live Editing Enabled (Librarians & Admins only) */}
        {isLibrarian && selectedChallenge && (
          <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Pencil className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="font-bold text-foreground">Challenge Live Editing:</span>{" "}
                <span className="text-muted-foreground">
                  You can edit and make changes to this challenge at any time after creation (targets, literary categories, dates, prompts, badges, and certificates).
                </span>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setEditingChallenge(selectedChallenge)}
              className="text-xs font-semibold shrink-0 gap-1.5"
            >
              <Pencil className="w-3 h-3" /> Edit This Challenge
            </Button>
          </div>
        )}

        {/* Registration Banner if not enrolled yet (for students & staff; librarians do not need code) */}
        {!isLibrarian && selectedChallenge && selectedChallenge.id !== "all" && !isRegistered(selectedChallenge.id) && (
          <div className="p-4 rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-foreground flex items-center gap-2">
                  Access Code Verification &amp; Registration Required
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Enter your official academy access code to activate <strong>{selectedChallenge.title}</strong>, receive your welcoming letter, and be added to the librarian roster. All registered students and faculty must verify access.
                </div>
              </div>
            </div>
            <Button
              onClick={() => setCodeDialogOpen(true)}
              className="font-bold text-xs bg-amber-500 hover:bg-amber-600 text-black border-0 shrink-0 gap-1.5 shadow-md"
            >
              <KeyRound className="w-4 h-4" />
              Verify Code &amp; Enter Challenge
            </Button>
          </div>
        )}

        {/* Enrolled Confirmation Notice for Registered Members */}
        {selectedChallenge && selectedChallenge.id !== "all" && isRegistered(selectedChallenge.id) && (
          <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-foreground">You are officially registered for this challenge.</span>{" "}
                <span className="text-muted-foreground">
                  The academy librarian can see your profile on the active challenge roster. A welcoming dispatch was delivered directly to your Reading Challenge Inbox.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                asChild
                className="text-xs font-semibold gap-1 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                title="Open Reading Challenge Inbox"
              >
                <Link to="/inbox">
                  <Mail className="w-3.5 h-3.5 text-amber-500" /> Open Challenge Inbox
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (user?.id) {
                    const emails = getWelcomeEmails(user.id);
                    const matched = emails.find((e) => e.challenge_id === selectedChallenge.id) || emails[0];
                    if (matched) setWelcomeEmail(matched);
                  }
                }}
                className="text-xs font-semibold gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
              >
                <Mail className="w-3 h-3" /> View Welcoming Letter
              </Button>
            </div>
          </div>
        )}

        {/* Selected Challenge Hero Card */}
        {selectedChallenge && (
          <Card className="overflow-hidden border-border bg-card/90 shadow-md">
            <div
              className="p-6 text-white relative"
              style={{
                background: selectedChallenge.is_active
                  ? "linear-gradient(135deg, hsl(212 90% 45%) 0%, hsl(140 80% 35%) 100%)"
                  : "linear-gradient(135deg, hsl(220 20% 25%) 0%, hsl(220 20% 15%) 100%)",
              }}
            >
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-3xl">{selectedChallenge.badge_icon || "🏆"}</span>
                    {(selectedChallenge.status === "open" || (selectedChallenge.is_active && !selectedChallenge.status)) ? (
                      <Badge className="bg-emerald-400 text-emerald-950 font-bold border-0">
                        🟢 OPEN FOR SUBMISSIONS
                      </Badge>
                    ) : selectedChallenge.status === "locked" ? (
                      <Badge className="bg-amber-400 text-amber-950 font-bold border-0">
                        🔒 LOCKED (PAUSED)
                      </Badge>
                    ) : (
                      <Badge className="bg-red-400 text-red-950 font-bold border-0">
                        🏆 CONCLUDED & CERTS UNLOCKED
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-white border-white/40">
                      {selectedChallenge.category || "General"}
                    </Badge>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-white">
                    {selectedChallenge.title}
                  </h2>
                  <p className="text-white/85 text-sm leading-relaxed">
                    {selectedChallenge.description}
                  </p>
                </div>

                {/* Challenge KPI Box */}
                <div className="bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-white/15 space-y-3 min-w-[240px]">
                  <div className="flex items-center justify-between text-xs text-white/80">
                    <span>Target Books:</span>
                    <span className="font-bold text-white text-sm">{selectedChallenge.target_books} Books</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/80">
                    <span>Reward Points:</span>
                    <span className="font-bold text-amber-300 text-sm">+{selectedChallenge.points_reward} Pts</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/80">
                    <span>End Date:</span>
                    <span className="font-mono text-white text-xs">
                      {new Date(selectedChallenge.end_date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {isLibrarian && (
                    <div className="pt-2 border-t border-white/10 space-y-2">
                      <div className="text-[11px] font-semibold text-white/80">
                        Admin Challenge State:
                      </div>
                      <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded-xl">
                        <Button
                          size="sm"
                          variant={selectedChallenge.status === "open" || (!selectedChallenge.status && selectedChallenge.is_active) ? "default" : "ghost"}
                          onClick={() => setChallengeStatus(selectedChallenge.id, "open")}
                          className={selectedChallenge.status === "open" || (!selectedChallenge.status && selectedChallenge.is_active) ? "h-6 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold" : "h-6 text-[10px] text-white/70 hover:text-white"}
                        >
                          🟢 Open
                        </Button>
                        <Button
                          size="sm"
                          variant={selectedChallenge.status === "locked" ? "default" : "ghost"}
                          onClick={() => setChallengeStatus(selectedChallenge.id, "locked")}
                          className={selectedChallenge.status === "locked" ? "h-6 text-[10px] bg-amber-500 hover:bg-amber-600 text-black font-bold" : "h-6 text-[10px] text-white/70 hover:text-white"}
                        >
                          🔒 Lock
                        </Button>
                        <Button
                          size="sm"
                          variant={selectedChallenge.status === "closed" ? "default" : "ghost"}
                          onClick={() => setChallengeStatus(selectedChallenge.id, "closed")}
                          className={selectedChallenge.status === "closed" ? "h-6 text-[10px] bg-red-500 hover:bg-red-600 text-white font-bold" : "h-6 text-[10px] text-white/70 hover:text-white"}
                        >
                          🏆 Close
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleBroadcast}
                        disabled={broadcasting}
                        className="w-full text-xs font-bold gap-1.5 h-7 bg-amber-400 hover:bg-amber-300 text-black border-0 mt-1"
                      >
                        <Megaphone className="w-3.5 h-3.5" />
                        {broadcasting ? "Sending..." : "Send & Email to All Users"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Tabs for Workspace */}
            <div className="flex items-center gap-1 p-2 bg-muted/60 border-t border-border overflow-x-auto">
              <Button
                size="sm"
                variant={activeTab === "workspace" ? "default" : "ghost"}
                onClick={() => setActiveTab("workspace")}
                className="text-xs font-semibold gap-1.5 rounded-xl h-8"
              >
                <Target className="w-3.5 h-3.5" /> Challenge Details &amp; Progress
              </Button>
              <Button
                size="sm"
                variant={activeTab === "submissions" ? "default" : "ghost"}
                onClick={() => setActiveTab("submissions")}
                className="text-xs font-semibold gap-1.5 rounded-xl h-8"
              >
                <BookOpen className="w-3.5 h-3.5" /> Submissions ({submissions.length})
              </Button>
              <Button
                size="sm"
                variant={activeTab === "leaderboard" ? "default" : "ghost"}
                onClick={() => setActiveTab("leaderboard")}
                className="text-xs font-semibold gap-1.5 rounded-xl h-8"
              >
                <Trophy className="w-3.5 h-3.5" /> Challenge Standings
              </Button>
              <Button
                size="sm"
                variant={activeTab === "categories" ? "default" : "ghost"}
                onClick={() => setActiveTab("categories")}
                className="text-xs font-semibold gap-1.5 rounded-xl h-8"
              >
                <BookOpen className="w-3.5 h-3.5" /> Categories & Prompts ({selectedChallenge.categories?.length || 15})
              </Button>
              <Button
                size="sm"
                variant={activeTab === "info" ? "default" : "ghost"}
                onClick={() => setActiveTab("info")}
                className="text-xs font-semibold gap-1.5 rounded-xl h-8"
              >
                <Award className="w-3.5 h-3.5" /> Rules & Badges
              </Button>
            </div>
          </Card>
        )}

        {/* High-Contrast Locked Challenge Banner with Email Trigger */}
        {selectedChallenge && selectedChallenge.status === "locked" && (
          <LockedChallengeNotice challenge={selectedChallenge} className="mt-4 mb-2" />
        )}

        {/* TAB 1: WORKSPACE & PERSONAL PROGRESS */}
        {activeTab === "workspace" && selectedChallenge && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Role-Specific Workspace Card: Whole-school for librarians, cohort for staff, Personal for students */}
            {isLibrarian ? (
              /* LIBRARIAN VIEW: Whole-School Master Analytics & Student Inspection */
              <Card className="lg:col-span-2 border-border bg-card">
                <CardHeader className="py-4 px-5 border-b border-border bg-muted/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                        <School className="w-4 h-4 text-primary" /> Whole-School Challenge Master Analytics
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Head Librarian view: Tracking all student submissions, readers, and literary realms for {selectedChallenge.title}.
                      </CardDescription>
                    </div>
                    <Badge className="bg-primary text-primary-foreground font-mono text-xs self-start sm:self-auto">
                      All Students &amp; Cohorts
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl border border-border bg-muted/40">
                      <div className="text-[11px] uppercase font-bold text-muted-foreground">Total Books Logged</div>
                      <div className="text-2xl font-bold font-display text-primary mt-1">
                        {submissions.length}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Across entire school</div>
                    </div>
                    <div className="p-3.5 rounded-xl border border-border bg-muted/40">
                      <div className="text-[11px] uppercase font-bold text-muted-foreground">Active Readers</div>
                      <div className="text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400 mt-1">
                        {new Set(submissions.map((s) => s.user_id)).size}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Scholars submitting</div>
                    </div>
                    <div className="p-3.5 rounded-xl border border-border bg-muted/40">
                      <div className="text-[11px] uppercase font-bold text-muted-foreground">Target per Scholar</div>
                      <div className="text-2xl font-bold font-display text-foreground mt-1">
                        {targetBooks}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Books required</div>
                    </div>
                    <div className="p-3.5 rounded-xl border border-border bg-muted/40">
                      <div className="text-[11px] uppercase font-bold text-muted-foreground">Challenge Status</div>
                      <div className="text-sm font-bold text-emerald-500 mt-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        {selectedChallenge.is_active ? "Active & Syncing" : "Closed"}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-sm text-foreground">
                        Inspect Individual Books &amp; Student Submissions
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Search and review student reflections, per-house logs, and schoolwide reading statistics in the Staff Dashboard.
                      </div>
                    </div>
                    <Button
                      onClick={() => navigate("/dashboard")}
                      className="text-xs font-semibold gap-1.5 shrink-0 bg-primary text-primary-foreground"
                    >
                      <Layers className="w-3.5 h-3.5" /> Schoolwide Submissions Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : isStaff ? (
              /* STAFF VIEW: Cohort-Only Oversight */
              <Card className="lg:col-span-2 border-border bg-card">
                <CardHeader className="py-4 px-5 border-b border-border bg-muted/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                        <Users className="w-4 h-4 text-primary" />
                        Assigned Cohort Oversight — {profile?.house || profile?.year_group || profile?.class_name || "Faculty"}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Viewing submissions and reading metrics exclusively for your assigned student cohort in {selectedChallenge.title}.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="border-primary/40 text-primary font-semibold text-xs">
                      {profile?.role?.replace(/_/g, " ").toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl border border-border bg-muted/40">
                      <div className="text-[11px] uppercase font-bold text-muted-foreground">Cohort Submissions</div>
                      <div className="text-2xl font-bold font-display text-primary mt-1">
                        {
                          submissions.filter((s) => {
                            const author = authorProfiles.get(s.user_id);
                            if (profile?.house && author?.house !== profile.house) return false;
                            if (profile?.year_group && author?.year_group !== profile.year_group) return false;
                            return true;
                          }).length
                        }
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">From your students</div>
                    </div>
                    <div className="p-3.5 rounded-xl border border-border bg-muted/40">
                      <div className="text-[11px] uppercase font-bold text-muted-foreground">Participating Readers</div>
                      <div className="text-2xl font-bold font-display text-foreground mt-1">
                        {
                          new Set(
                            submissions
                              .filter((s) => {
                                const author = authorProfiles.get(s.user_id);
                                if (profile?.house && author?.house !== profile.house) return false;
                                if (profile?.year_group && author?.year_group !== profile.year_group) return false;
                                return true;
                              })
                              .map((s) => s.user_id)
                          ).size
                        }
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Students logging books</div>
                    </div>
                    <div className="p-3.5 rounded-xl border border-border bg-muted/40">
                      <div className="text-[11px] uppercase font-bold text-muted-foreground">Assigned Group</div>
                      <div className="text-sm font-bold text-foreground mt-2 truncate">
                        {profile?.house ? `${profile.house} House` : profile?.year_group ? `${profile.year_group} Cohort` : "Your Group"}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-border bg-muted/30 text-xs text-muted-foreground leading-relaxed">
                    💡 As a staff leadership member, your dashboard is focused on your assigned students. Book logging is reserved for students.
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* STUDENT VIEW: Personal Reading Progress (Students ONLY) */
              <Card className="lg:col-span-2 border-border bg-card">
                <CardHeader className="py-4 px-5 border-b border-border">
                  <CardTitle className="text-base font-bold flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" /> My Progress in this Challenge
                    </span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {booksReadCount} / {targetBooks} Books
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Your recorded reading submissions counting towards the {selectedChallenge.title}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-6">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground font-medium">Challenge Completion</span>
                      <span className="font-bold font-mono text-foreground">{percentCompleted}%</span>
                    </div>
                    <Progress value={percentCompleted} className="h-3" />
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2">
                      <span>0 Books</span>
                      <span>Goal: {targetBooks} Books</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl border border-border bg-muted/40">
                      <div className="text-xs text-muted-foreground">Books Read</div>
                      <div className="text-2xl font-bold font-display text-primary mt-1">
                        {booksReadCount}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl border border-border bg-muted/40">
                      <div className="text-xs text-muted-foreground">Books Remaining</div>
                      <div className="text-2xl font-bold font-display text-foreground mt-1">
                        {Math.max(0, targetBooks - booksReadCount)}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl border border-border bg-muted/40">
                      <div className="text-xs text-muted-foreground">Badge Unlocked</div>
                      <div className="text-sm font-bold text-foreground mt-1 flex items-center gap-1.5">
                        <span>{selectedChallenge.badge_icon || "🏅"}</span>
                        <span className="truncate">{selectedChallenge.badge_name || "Scholar"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Student Submission CTA */}
                  {selectedChallenge.status === "locked" ? (
                    <div
                      className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(239, 68, 68, 0.10) 100%)",
                        borderColor: "rgba(245, 158, 11, 0.45)",
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
                          <Lock className="w-4 h-4 animate-pulse" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-foreground flex items-center gap-2">
                            <span>Submissions Temporarily Locked</span>
                            <Badge className="bg-amber-500 text-black text-[10px] font-bold py-0 px-2 border-0">
                              Locked by Admin
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            The academy administrator has locked submissions for this challenge. Review previous books or contact the librarian to request reopening.
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          disabled
                          className="text-xs font-bold shrink-0 bg-amber-500/20 text-amber-300 border border-amber-500/40 gap-1.5 cursor-not-allowed h-9 rounded-xl"
                        >
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          Submissions Locked
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-sm text-foreground">
                          Ready to log a book for {selectedChallenge.title}?
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {selectedChallenge.is_active
                            ? "Submissions are open. Submit your title and reflection to earn points."
                            : "Submissions for this challenge are currently closed."}
                        </div>
                      </div>
                      {selectedChallenge.is_active ? (
                        isRegistered(selectedChallenge.id) ? (
                          <Button
                            onClick={() => navigate(`/submit?challenge=${selectedChallenge.id}`)}
                            className="text-xs font-bold shrink-0 text-white border-0"
                            style={{ background: "linear-gradient(120deg, hsl(var(--v-green)), hsl(var(--v-cyan)))" }}
                          >
                            <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Submit Entry Now
                          </Button>
                        ) : (
                          <Button
                            onClick={async () => {
                              setRegistering(true);
                              await registerForChallenge(selectedChallenge.id);
                              setRegistering(false);
                            }}
                            disabled={registering}
                            className="text-xs font-bold shrink-0 bg-amber-500 hover:bg-amber-600 text-black border-0 gap-1.5"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            {registering ? "Registering..." : "Register to Submit"}
                          </Button>
                        )
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground text-xs py-1">
                          Concluded
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Challenge Fast Facts (1 col) */}
            <Card className="border-border bg-card space-y-4 p-5">
              <div>
                <h3 className="font-bold text-sm font-display flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" /> Challenge Working Space
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Each challenge has its own dedicated workspace, rules, and participant directory.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-semibold capitalize">{selectedChallenge.challenge_type}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Total Submissions:</span>
                  <span className="font-mono font-bold">{submissions.length}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Badge Reward:</span>
                  <span className="font-semibold">{selectedChallenge.badge_name}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Submission Status:</span>
                  <span className={selectedChallenge.is_active ? "text-emerald-500 font-bold" : "text-muted-foreground"}>
                    {selectedChallenge.is_active ? "Active & Accepting Entries" : "Closed"}
                  </span>
                </div>
              </div>

              {isStaff && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Admin Notice & Broadcast
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    You can announce this challenge to all students and staff. Clicking below dispatches an in-app notification feed item AND an email announcement to every student's inbox!
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBroadcast}
                    disabled={broadcasting}
                    className="w-full text-xs font-bold border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                  >
                    <Mail className="w-3.5 h-3.5 mr-1" /> Broadcast to All (Notification + Email)
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* TAB 2: SUBMISSIONS */}
        {activeTab === "submissions" && (
          <Card className="border-border">
            <CardHeader className="py-4 px-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    {isStaff ? (
                      <>
                        <BookOpen className="w-4 h-4 text-primary" /> All Student Submissions for {selectedChallenge?.title} ({submissions.length})
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-primary" /> My Submissions for {selectedChallenge?.title} ({displayedSubmissions.length})
                      </>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {isStaff
                      ? `Staff Oversight: Showing all student reflections and readings recorded for this challenge workspace.`
                      : `Your private reading submissions counting toward ${selectedChallenge?.title}. Submissions are locked and visible only to you and library staff.`}
                  </CardDescription>
                </div>
                {selectedChallenge?.is_active && (!isStaff ? (
                  <Button
                    size="sm"
                    onClick={() => navigate(`/submit?challenge=${selectedChallenge.id}`)}
                    className="gap-1.5 text-xs font-semibold"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Add Submission
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingChallenge(selectedChallenge)}
                      className="gap-1.5 text-xs font-semibold"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit Challenge
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate("/admin?s=submissions")}
                      className="gap-1.5 text-xs font-semibold"
                    >
                      Manage in Admin
                    </Button>
                  </div>
                ))}
              </div>
            </CardHeader>

            {/* Role-Specific Privacy & Integrity Notice Banner */}
            {!isStaff ? (
              <div className="mx-6 mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs">
                <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-foreground">
                    🔒 Student Privacy & Academic Lock Policy
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Other students cannot see your submissions or reading reflections. Only you, the academy librarian, and authorized staff have access. To maintain academic honesty, all submitted entries are locked and cannot be edited.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mx-6 mt-4 p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-start gap-3 text-xs">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-foreground">
                    🛡️ Staff & Librarian Oversight Mode
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Only librarians and staff can view all student submissions. Students can only see their own locked submissions and cannot view their peers' work.
                  </p>
                </div>
              </div>
            )}

            <CardContent className="p-0 mt-4">
              {loadingSubs ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Loading submissions...</div>
              ) : displayedSubmissions.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <BookOpen className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    {isStaff
                      ? "No submissions recorded yet for this challenge."
                      : "You have not submitted any books to this challenge yet."}
                  </p>
                  {selectedChallenge?.is_active && !isStaff && (
                    <Button
                      size="sm"
                      onClick={() => navigate(`/submit?challenge=${selectedChallenge.id}`)}
                      className="mt-2 text-xs"
                    >
                      Be the first to submit a book
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {isStaff && <TableHead>Student Scholar</TableHead>}
                        <TableHead>Book Title & Author</TableHead>
                        <TableHead>Category / Realm</TableHead>
                        <TableHead>Points Earned</TableHead>
                        <TableHead>Date Finished</TableHead>
                        <TableHead>Reflection</TableHead>
                        <TableHead>Status & Access</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedSubmissions.map((s) => {
                        const prof = authorProfiles.get(s.user_id);
                        return (
                          <TableRow key={s.id}>
                            {isStaff && (
                              <TableCell>
                                <div className="font-semibold text-foreground text-xs">
                                  {prof?.full_name || "Student"}
                                </div>
                                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                                    {prof?.house || "Academy"}
                                  </Badge>
                                  {prof?.year_group && (
                                    <span className="font-mono text-[10px]">{prof.year_group}</span>
                                  )}
                                </div>
                              </TableCell>
                            )}
                            <TableCell>
                              <div className="font-semibold text-foreground text-sm">{s.title}</div>
                              <div className="text-xs text-muted-foreground">by {s.author}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {s.category_name || `Category ${s.category_number || 1}`}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono font-bold text-amber-500">
                                +{s.points_earned || 10} pts
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono">
                              {s.date_finished || s.created_at?.slice(0, 10) || "Recorded"}
                            </TableCell>
                            <TableCell className="max-w-xs truncate text-xs text-muted-foreground" title={s.reflection}>
                              {s.reflection}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[11px] bg-muted/80 text-muted-foreground gap-1 border-border whitespace-nowrap">
                                <Lock className="w-3 h-3 text-amber-500" />
                                {isStaff ? "Verified & Locked" : "Submitted & Locked"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* TAB 3: STANDINGS & LEADERBOARD */}
        {activeTab === "leaderboard" && (
          <Card className="border-border">
            <CardHeader className="py-4 px-6 border-b border-border">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" /> Challenge Standings & Leaderboard
              </CardTitle>
              <CardDescription className="text-xs">
                Current house and individual rankings for {selectedChallenge?.title}.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { house: "Kenya", points: 1420, books: 142, color: "#00205B" },
                  { house: "Longonot", points: 1280, books: 128, color: "#EAB308" },
                  { house: "Kilimanjaro", points: 1190, books: 119, color: "#D32F2F" },
                  { house: "Elgon", points: 1050, books: 105, color: "#2E7D32" },
                ].map((h, i) => (
                  <div key={h.house} className="p-4 rounded-2xl border border-border bg-card relative overflow-hidden">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-muted-foreground">#{i + 1} House</span>
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: h.color }} />
                    </div>
                    <div className="font-display font-bold text-lg text-foreground">{h.house}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      <span className="font-bold text-foreground">{h.points}</span> pts · {h.books} books
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 4: CATEGORIES & PROMPTS */}
        {activeTab === "categories" && selectedChallenge && (
          <Card className="border-border p-6 space-y-4">
            <div>
              <h3 className="font-bold text-base font-display flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" /> Literary Realms & Reading Prompts
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Categories and reflection prompts specifically configured by the librarian for {selectedChallenge.title}.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {((selectedChallenge.categories && selectedChallenge.categories.length > 0)
                ? selectedChallenge.categories
                : READING_CATEGORIES.map((c) => ({
                    id: c.id,
                    name: c.name,
                    realm: c.realm,
                    prompt: c.prompt,
                    max_books: selectedChallenge.max_books_per_category || 4,
                  }))
              ).map((cat) => (
                <div key={cat.id} className="p-4 rounded-2xl border border-border bg-card/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <span>#{cat.id}</span>
                      <span>{cat.realm || "Literary Realm"}</span>
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      Max {cat.max_books || selectedChallenge.max_books_per_category || 4} books
                    </Badge>
                  </div>
                  <h4 className="font-bold text-sm text-foreground">{cat.name}</h4>
                  <div className="p-3 rounded-xl bg-muted/50 border border-border text-xs italic text-muted-foreground">
                    "{cat.prompt}"
                  </div>
                </div>
              ))}
            </div>

            {selectedChallenge.is_active && !isStaff && (
              <div className="pt-4 flex justify-end">
                {selectedChallenge.status === "locked" ? (
                  <Button
                    disabled
                    className="text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-not-allowed rounded-xl"
                  >
                    <Lock className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                    Submissions Locked by Administrator
                  </Button>
                ) : (
                  <Button
                    onClick={() => navigate(`/submit?challenge=${selectedChallenge.id}`)}
                    className="text-xs font-bold text-white border-0 rounded-xl"
                    style={{ background: "linear-gradient(120deg, hsl(var(--v-green)), hsl(var(--v-cyan)))" }}
                  >
                    <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Submit Book Against These Categories
                  </Button>
                )}
              </div>
            )}
          </Card>
        )}

        {/* TAB 5: RULES & BADGES */}
        {activeTab === "info" && selectedChallenge && (
          <Card className="border-border p-6 space-y-4">
            <h3 className="font-bold text-base font-display">Challenge Guidelines & Certification</h3>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                <strong>Challenge Overview:</strong> {selectedChallenge.description}
              </p>
              <p>
                <strong>Participation Criteria:</strong> Open to all academy students. You must read books from approved literary realms or genres matching this challenge theme.
              </p>
              <p>
                <strong>Reflection Requirement:</strong> Each book entry must be accompanied by an insightful personal reflection of at least 50 characters discussing narrative themes, character growth, or world-building.
              </p>
              <p>
                <strong>Reward & Certificate:</strong> Reaching the target goal of {selectedChallenge.target_books} books qualifies you for the {selectedChallenge.badge_name} badge and certificate verifiable in the MFA Certificate Studio.
              </p>
            </div>
          </Card>
        )}
      </main>

      {/* Edit Challenge Dialog */}
      {editingChallenge && (
        <EditChallengeDialog
          challenge={editingChallenge}
          open={!!editingChallenge}
          onOpenChange={(open) => !open && setEditingChallenge(null)}
          onSuccess={() => {
            refreshChallenges();
            loadSubmissions();
          }}
        />
      )}

      {/* Delete Challenge Dialog */}
      <Dialog open={!!challengeToDelete} onOpenChange={(open) => !open && setChallengeToDelete(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" /> Delete Reading Challenge?
            </DialogTitle>
            <DialogDescription className="text-xs pt-1 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-foreground">"{challengeToDelete?.title}"</strong>? This will remove the challenge, associated submissions, and registration rosters. This action cannot be undone.
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
              onClick={handleConfirmDelete}
              className="gap-1.5 font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deletingChallenge ? "Deleting…" : "Confirm Delete Challenge"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Welcome Email Letter Dialog */}
      {welcomeEmail && (
        <WelcomeEmailDialog
          email={welcomeEmail}
          open={!!welcomeEmail}
          onOpenChange={(open) => !open && setWelcomeEmail(null)}
          onExplore={() => {
            setActiveTab("categories");
          }}
        />
      )}

      {/* Challenge Access Code Verification & Registration Dialog */}
      {selectedChallenge && (
        <ChallengeAccessCodeDialog
          open={codeDialogOpen}
          onOpenChange={setCodeDialogOpen}
          challenge={selectedChallenge}
          onSuccess={() => {
            refreshChallenges();
            if (user?.id) {
              const emails = getWelcomeEmails(user.id);
              const matched = emails.find((e) => e.challenge_id === selectedChallenge.id);
              if (matched) {
                setWelcomeEmail(matched);
              }
            }
          }}
        />
      )}
    </div>
  );
}
