import { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChallenges, normalizeChallengeId } from '@/contexts/ChallengeContext';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { safeStorage } from '@/lib/safeStorage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  BookOpen, Medal, Award, Crown, Target, CheckCircle2, Pencil, Trash2, 
  Download, Sparkles, FileText, ArrowRight, Lock, ShieldAlert, 
  RefreshCw, MessageSquare, AlertTriangle, Clock, Search, Eye, Filter 
} from 'lucide-react';
import { MAX_BOOKS_PER_CATEGORY, TOTAL_BOOK_GOAL, computeTotalPoints, MILESTONES } from '@/lib/constants';
import { useCategories } from '@/hooks/useCategories';
import { format } from 'date-fns';
import EditSubmissionDialog from '@/components/EditSubmissionDialog';
import DeleteSubmissionDialog from '@/components/DeleteSubmissionDialog';
import { Helmet } from 'react-helmet-async';
import { CertificateCanvas } from '@/components/CertificateCanvas';
import { computeStudentLevel, getVerificationCode, CertificateData } from '@/lib/certificateTypes';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AppDownloadButton } from '@/components/AppDownloadBanner';
import { getUnifiedSubmissions, UnifiedSubmission } from '@/lib/submissionSyncService';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { LockedChallengeNotice } from '@/components/LockedChallengeNotice';
import StudentBadgesShowcase from '@/components/StudentBadgesShowcase';

const MyProgress = () => {
  const { user, profile } = useAuth();
  const { selectedChallenge, selectedChallengeId } = useChallenges();
  const [allSubmissions, setAllSubmissions] = useState<UnifiedSubmission[]>([]);
  const [submissions, setSubmissions] = useState<UnifiedSubmission[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmissionForReflection, setSelectedSubmissionForReflection] = useState<UnifiedSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingSubmission, setEditingSubmission] = useState<UnifiedSubmission | null>(null);
  const [deletingSubmission, setDeletingSubmission] = useState<UnifiedSubmission | null>(null);
  const [showCertDialog, setShowCertDialog] = useState(false);
  const [isDownloadingCert, setIsDownloadingCert] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);
  const printCertRef = useRef<HTMLDivElement>(null);
  const { categories: defaultCategories } = useCategories();
  const categories = useMemo(() => {
    if (selectedChallenge?.categories && selectedChallenge.categories.length > 0) {
      return selectedChallenge.categories;
    }
    return defaultCategories;
  }, [selectedChallenge, defaultCategories]);

  const isStaff = profile?.role && profile.role !== "student";
  const isLibrarian = profile?.role === "librarian" || profile?.role === "admin";

  const targetBooks = selectedChallenge?.target_books || TOTAL_BOOK_GOAL;
  const maxPerCat = selectedChallenge?.max_books_per_category || 4;
  const normId = normalizeChallengeId(selectedChallengeId);
  const isMain45 =
    !selectedChallengeId ||
    selectedChallengeId === 'all' ||
    selectedChallengeId === '45450000-2025-4026-8000-000000000045' ||
    normId === '45450000-2025-4026-8000-000000000045' ||
    selectedChallenge?.target_books === 45;

  const [isLiveSyncing, setIsLiveSyncing] = useState(false);

  const fetchSubmissions = async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    else setIsLiveSyncing(true);

    try {
      const res = await getUnifiedSubmissions(user.id, selectedChallengeId);
      setAllSubmissions(res.allSubmissions);
      setSubmissions(res.approvedSubmissions);
    } catch (e) {
      console.warn('Submissions load error:', e);
    } finally {
      if (!silent) setLoading(false);
      else setIsLiveSyncing(false);
    }
  };

  useEffect(() => {
    fetchSubmissions(false);

    const channelName = `myprogress-${user?.id || 'anon'}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'book_submissions' }, () => {
        fetchSubmissions(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_submissions' }, () => {
        fetchSubmissions(true);
      })
      .subscribe();

    const onSubmissionCreated = () => fetchSubmissions(true);
    window.addEventListener('mfa_submission_created', onSubmissionCreated);
    window.addEventListener('mfa_submission_updated', onSubmissionCreated);
    window.addEventListener('storage', onSubmissionCreated);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('mfa_submission_created', onSubmissionCreated);
      window.removeEventListener('mfa_submission_updated', onSubmissionCreated);
      window.removeEventListener('storage', onSubmissionCreated);
    };
  }, [user?.id, selectedChallengeId]);

  const catCounts = useMemo(() => {
    const map: Record<number, number> = {};
    submissions.forEach((s) => {
      map[s.category_number] = (map[s.category_number] || 0) + 1;
    });
    return map;
  }, [submissions]);

  // Synchronized category-capped progress (matches SubmitBook.tsx)
  const countedBooks = useMemo(() => {
    if (!isMain45) return submissions.length;
    return Object.entries(catCounts).reduce((acc, [_, count]) => {
      return acc + Math.min(count, maxPerCat);
    }, 0);
  }, [submissions, catCounts, maxPerCat, isMain45]);

  const booksRead = Math.min(targetBooks, countedBooks);
  const totalPoints = submissions.reduce((acc, s) => acc + (s.points_earned || 10), 0);
  const completedCategories = new Set(submissions.map(s => s.category_number));

  const filteredHistory = useMemo(() => {
    let list = allSubmissions;
    if (statusFilter !== 'all') {
      if (statusFilter === 'rejected') {
        list = list.filter((s) => s.approval_status === 'rejected' || s.approval_status === 'needs_revision');
      } else {
        list = list.filter((s) => s.approval_status === statusFilter);
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.author.toLowerCase().includes(q) ||
          s.category_name.toLowerCase().includes(q) ||
          (s.admin_feedback && s.admin_feedback.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allSubmissions, statusFilter, searchQuery]);

  const approvedCount = useMemo(
    () => allSubmissions.filter((s) => s.approval_status === 'approved').length,
    [allSubmissions]
  );
  const pendingCount = useMemo(
    () => allSubmissions.filter((s) => s.approval_status === 'pending').length,
    [allSubmissions]
  );
  const rejectedCount = useMemo(
    () => allSubmissions.filter((s) => s.approval_status === 'rejected' || s.approval_status === 'needs_revision').length,
    [allSubmissions]
  );

  // Strict Role-Based Access Control: My Progress is exclusively for students
  if (isStaff) {
    return (
      <div className="min-h-screen bg-background">
        <Helmet>
          <title>Student Progress Only — MFA Reading Challenge</title>
        </Helmet>
        <main className="container mx-auto px-4 py-16 max-w-2xl">
          <Card className="rounded-3xl border-border bg-card p-8 text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center mx-auto text-3xl">
              🛡️
            </div>
            <div className="space-y-1.5">
              <Badge variant="outline" className="text-xs font-mono border-amber-500/40 text-amber-500">
                Staff &amp; Faculty RBAC Restricted
              </Badge>
              <h1 className="text-2xl font-bold font-display text-foreground">
                Personal Reading Progress is Student-Only
              </h1>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
              You are signed in as a staff member (<strong>{profile?.role?.replace(/_/g, ' ')}</strong>). Personal reading logs and reflection progress tracking are reserved exclusively for student accounts. Staff members oversee and review group reading progress in the Staff Dashboard.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild className="w-full sm:w-auto font-semibold">
                <Link to="/dashboard">Go to Staff Dashboard</Link>
              </Button>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link to="/challenges">View Challenges</Link>
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  const getAchievementLevel = () => {
    const bronze = Math.max(1, Math.round(targetBooks * 0.33));
    const silver = Math.max(2, Math.round(targetBooks * 0.66));
    const gold = targetBooks;

    if (booksRead >= gold) return { level: 'Gold', icon: Crown, color: 'text-gold bg-gold/10', next: null };
    if (booksRead >= silver) return { level: 'Silver', icon: Award, color: 'text-slate-400 bg-slate-400/10', next: { name: 'Gold', remaining: gold - booksRead } };
    if (booksRead >= bronze) return { level: 'Bronze', icon: Medal, color: 'text-amber-700 bg-amber-700/10', next: { name: 'Silver', remaining: silver - booksRead } };
    return { level: 'Getting Started', icon: Target, color: 'text-muted-foreground bg-muted', next: { name: 'Bronze', remaining: bronze - booksRead } };
  };

  const achievement = getAchievementLevel();
  const AchievementIcon = achievement.icon;

  const currentStudentName = profile?.full_name || user?.email?.split('@')[0] || 'Student';

  const handleDownloadPDF = async () => {
    setIsDownloadingCert(true);
    const toastId = toast.loading('Generating high-resolution certificate PDF...');
    try {
      const targetElement = printCertRef.current || certRef.current || (document.querySelector('.certificate-root') as HTMLElement);
      let imgData = '';

      if (targetElement) {
        if (typeof document !== 'undefined' && document.fonts) {
          try {
            await document.fonts.ready;
          } catch {
            // ignore font delay
          }
        }
        try {
          const canvas = await html2canvas(targetElement, {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            logging: false,
            backgroundColor: '#ffffff',
          });
          imgData = canvas.toDataURL('image/png');
        } catch (canvasErr) {
          console.warn('Canvas capture issue, using direct vector PDF:', canvasErr);
        }
      }

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: [842, 595],
      });

      if (imgData) {
        pdf.addImage(imgData, 'PNG', 0, 0, 842, 595);
      } else {
        // High-resolution vector parchment fallback
        const width = 842;
        const height = 595;
        pdf.setFillColor(11, 29, 58);
        pdf.rect(0, 0, width, height, 'F');
        pdf.setDrawColor(212, 175, 55);
        pdf.setLineWidth(5);
        pdf.rect(20, 20, width - 40, height - 40);
        pdf.setFillColor(255, 255, 255);
        pdf.rect(28, 28, width - 56, height - 56, 'F');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(22);
        pdf.setTextColor(11, 29, 58);
        pdf.text('M-PESA FOUNDATION ACADEMY', width / 2, 85, { align: 'center' });

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        pdf.setTextColor(212, 175, 55);
        pdf.text('OFFICIAL CERTIFICATE OF ACHIEVEMENT', width / 2, 108, { align: 'center' });

        pdf.setFontSize(12);
        pdf.setTextColor(100, 110, 130);
        pdf.text('This prestigious credential is proud to certify that', width / 2, 160, { align: 'center' });

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(28);
        pdf.setTextColor(11, 29, 58);
        pdf.text(currentStudentName.toUpperCase(), width / 2, 210, { align: 'center' });

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(13);
        pdf.setTextColor(80, 90, 110);
        pdf.text(`has successfully read and reviewed ${booksRead} literary books,`, width / 2, 255, { align: 'center' });
        pdf.text(`achieving the distinguished rank of ${computeStudentLevel(booksRead).toUpperCase()} READER`, width / 2, 278, { align: 'center' });
        pdf.text(`in the ${selectedChallenge?.title || '45-Book Reading Challenge'}.`, width / 2, 301, { align: 'center' });

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(11, 29, 58);
        pdf.text(selectedChallenge?.certificate_signatory_name || 'David O. Oloo', 160, 480, { align: 'center' });
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9.5);
        pdf.setTextColor(110, 120, 140);
        pdf.text(selectedChallenge?.certificate_signatory_title || 'Director of Teaching & Learning', 160, 498, { align: 'center' });

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(11, 29, 58);
        pdf.text(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), width - 160, 480, { align: 'center' });
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9.5);
        pdf.setTextColor(110, 120, 140);
        pdf.text('Date Awarded', width - 160, 498, { align: 'center' });
      }

      const studentClean = currentStudentName.replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`Certificate_${studentClean}_${booksRead}_Books.pdf`);
      toast.success('Certificate downloaded successfully!', { id: toastId });
    } catch (err: unknown) {
      console.error('PDF download error:', err);
      toast.error('Failed to generate PDF. Please try again.', { id: toastId });
    } finally {
      setIsDownloadingCert(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>My Progress — 45-Book Reading Challenge</title>
        <meta name="description" content="Track books read, points earned, and reflections for the 45-Book Reading Challenge." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <main className="w-full max-w-none px-3 sm:px-6 lg:px-8 py-6">
        {/* Hero banner */}
        <div
          className="relative overflow-hidden rounded-3xl p-6 sm:p-10 mb-8 border border-border"
          style={{
            background:
              "linear-gradient(120deg, hsl(var(--v-magenta) / 0.35) 0%, hsl(var(--v-electric-blue) / 0.35) 40%, hsl(var(--v-green) / 0.30) 75%, hsl(var(--v-yellow) / 0.30) 100%)",
          }}
        >
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl opacity-40"
               style={{ background: "radial-gradient(circle, hsl(var(--v-hot-pink)) 0%, transparent 70%)" }} />
          <div className="absolute -bottom-24 -left-16 w-80 h-80 rounded-full blur-3xl opacity-40"
               style={{ background: "radial-gradient(circle, hsl(var(--v-cyan)) 0%, transparent 70%)" }} />
          <div className="relative">
            <h1 className="font-display text-3xl md:text-5xl font-extrabold text-foreground mb-2">
              My Reading <span className="text-gradient-luminous">Progress</span> 📖
            </h1>
            <p className="text-foreground/80 max-w-2xl">
              Track your journey through {selectedChallenge?.title || 'the Reading Challenge'} with color and flair.
            </p>
          </div>
        </div>

        {/* Active Challenge Info */}
        <div className="mb-6 space-y-3">
          <div className="p-3.5 rounded-2xl border border-border bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <span>
                Viewing progress for <strong>{selectedChallenge?.title}</strong> ({targetBooks} books goal).
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <AppDownloadButton label="Download App" className="gap-1.5 h-8 text-xs shrink-0 font-medium" />
            </div>
          </div>
        </div>

        {/* High-Contrast Locked Challenge Notice when locked */}
        {selectedChallenge && selectedChallenge.status === "locked" && (
          <LockedChallengeNotice challenge={selectedChallenge} className="mb-6" />
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Progress Overview */}
          <Card
            className="lg:col-span-2 rounded-3xl border-0 overflow-hidden"
            style={{
              background:
                "linear-gradient(160deg, hsl(var(--v-electric-indigo) / 0.18) 0%, hsl(var(--v-cyan) / 0.10) 60%, hsl(var(--v-mint) / 0.15) 100%)",
              border: "1px solid hsl(var(--v-electric-blue) / 0.3)",
            }}
          >
            <CardHeader>
              <CardTitle className="text-gradient-luminous text-2xl">Progress Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Achievement Badge */}
              <div
                className="flex items-center gap-6 mb-8 p-6 rounded-2xl"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(var(--v-hot-pink) / 0.25), hsl(var(--v-orange) / 0.20), hsl(var(--v-yellow) / 0.20))",
                  border: "1px solid hsl(var(--v-hot-pink) / 0.35)",
                }}
              >
                <div
                  className="w-24 h-24 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(var(--v-magenta)) 0%, hsl(var(--v-orange)) 100%)",
                  }}
                >
                  <AchievementIcon className="w-12 h-12 text-white drop-shadow" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-display font-bold text-foreground mb-1">
                    {achievement.level} Reader
                  </h3>
                  {achievement.next ? (
                    <p className="text-foreground/80">
                      {achievement.next.remaining} more books to reach{" "}
                      <span className="font-bold" style={{ color: "hsl(var(--v-yellow))" }}>
                        {achievement.next.name}
                      </span>
                    </p>
                  ) : (
                    <p className="font-semibold" style={{ color: "hsl(var(--v-yellow))" }}>
                      🎉 Congratulations! You've completed the challenge!
                    </p>
                  )}
                  {booksRead >= 1 && (profile?.role === "librarian" || selectedChallenge?.status === "closed") && (
                    <div className="mt-3">
                      <Button
                        size="sm"
                        onClick={() => setShowCertDialog(true)}
                        className="gap-1.5 rounded-full text-xs font-semibold bg-background/90 hover:bg-background text-foreground border border-border shadow-sm"
                      >
                        <Award className="w-3.5 h-3.5 text-gold" /> View Official Certificate ({computeStudentLevel(booksRead)})
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bars */}
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Challenge Progress</span>
                    <span className="text-sm text-muted-foreground">{booksRead}/{targetBooks} books</span>
                  </div>
                  <div className="h-4 rounded-full overflow-hidden bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (booksRead / targetBooks) * 100)}%`,
                        background:
                          "linear-gradient(90deg, hsl(var(--v-red)), hsl(var(--v-orange)), hsl(var(--v-yellow)), hsl(var(--v-green)), hsl(var(--v-electric-blue)), hsl(var(--v-magenta)))",
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {[
                    { name: "Bronze", icon: Medal, target: targetBooks === 45 ? 15 : Math.max(1, Math.round(targetBooks * 0.33)), tone: "var(--v-orange)", tone2: "var(--v-red)" },
                    { name: "Silver", icon: Award, target: targetBooks === 45 ? 30 : Math.max(2, Math.round(targetBooks * 0.66)), tone: "var(--v-cyan)", tone2: "var(--v-electric-blue)" },
                    { name: "Gold", icon: Crown, target: targetBooks, tone: "var(--v-yellow)", tone2: "var(--v-orange)" },
                  ].map((tier) => {
                    const reached = booksRead >= tier.target;
                    const pct = Math.min((booksRead / tier.target) * 100, 100);
                    const Icon = tier.icon;
                    return (
                      <div
                        key={tier.name}
                        className="p-4 rounded-2xl transition-transform hover:scale-[1.02]"
                        style={{
                          background: `linear-gradient(135deg, hsl(${tier.tone} / ${reached ? 0.28 : 0.10}), hsl(${tier.tone2} / ${reached ? 0.20 : 0.05}))`,
                          border: `1px solid hsl(${tier.tone} / ${reached ? 0.6 : 0.25})`,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="w-5 h-5" style={{ color: `hsl(${tier.tone})` }} />
                          <span className="font-semibold">{tier.name}</span>
                        </div>
                        <div className="h-2 rounded-full bg-background/40 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: `linear-gradient(90deg, hsl(${tier.tone}), hsl(${tier.tone2}))`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {Math.min(booksRead, tier.target)}/{tier.target}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card className="rounded-3xl border-0 overflow-hidden" style={{
            background: "linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--v-violet) / 0.08) 100%)",
            border: "1px solid hsl(var(--v-violet) / 0.3)",
          }}>
            <CardHeader>
              <CardTitle className="text-gradient-luminous text-2xl">Your Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { value: totalPoints, label: "Total Points", tone: "var(--v-yellow)", tone2: "var(--v-orange)" },
                { value: booksRead, label: "Books Read", tone: "var(--v-green)", tone2: "var(--v-cyan)" },
                { value: completedCategories.size, label: "Realms Explored", tone: "var(--v-magenta)", tone2: "var(--v-hot-pink)" },
                { value: profile?.house || "—", label: "House", tone: "var(--v-electric-blue)", tone2: "var(--v-electric-indigo)" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="p-4 rounded-2xl transition-transform hover:scale-[1.02]"
                  style={{
                    background: `linear-gradient(135deg, hsl(${s.tone} / 0.28), hsl(${s.tone2} / 0.16))`,
                    border: `1px solid hsl(${s.tone} / 0.45)`,
                  }}
                >
                  <div className="text-3xl font-display font-bold text-white drop-shadow">
                    {s.value}
                  </div>
                  <div className="text-sm text-white/85">{s.label}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Milestone Badges & Honors Showcase */}
        <div className="mt-8">
          <StudentBadgesShowcase
            submissions={submissions}
            totalPoints={totalPoints}
            totalBooks={booksRead}
            profile={profile}
            variant="full"
          />
        </div>

        {/* Categories Checklist */}
        <Card className="mt-8 rounded-3xl border-0" style={{
          background: "linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--v-cyan) / 0.06) 100%)",
          border: "1px solid hsl(var(--v-cyan) / 0.25)",
        }}>
          <CardHeader>
            <CardTitle className="text-gradient-luminous text-2xl">Realms Journey</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-3">
              {categories.map((category, i) => {
                const isCompleted = completedCategories.has(category.id);
                const count = submissions.filter(s => s.category_number === category.id).length;
                const palette = [
                  "var(--v-red)", "var(--v-orange)", "var(--v-yellow)", "var(--v-lime)",
                  "var(--v-green)", "var(--v-mint)", "var(--v-cyan)", "var(--v-electric-blue)",
                  "var(--v-electric-indigo)", "var(--v-violet)", "var(--v-magenta)", "var(--v-hot-pink)",
                ];
                const tone = palette[i % palette.length];
                return (
                  <div
                    key={category.id}
                    className="flex items-center gap-3 p-3 rounded-2xl transition-transform hover:scale-[1.01]"
                    style={{
                      background: isCompleted
                        ? `linear-gradient(135deg, hsl(${tone} / 0.35), hsl(${tone} / 0.10))`
                        : `linear-gradient(135deg, hsl(${tone} / 0.10), hsl(${tone} / 0.03))`,
                      border: `1px solid hsl(${tone} / ${isCompleted ? 0.6 : 0.25})`,
                    }}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: `hsl(${tone})` }} />
                    ) : (
                      <div
                        className="w-5 h-5 rounded-full border-2 flex-shrink-0"
                        style={{ borderColor: `hsl(${tone} / 0.5)` }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${isCompleted ? "font-semibold text-foreground" : "text-foreground/70"}`}>
                        #{i + 1} {category.realm || category.name}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="flex-shrink-0 border-0 text-white"
                      style={{ background: `hsl(${tone} / ${count > 0 ? 1 : 0.35})` }}
                    >
                      {count}/{maxPerCat}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>


        {/* Submission History Table & Feedback */}
        <Card
          className="mt-8 rounded-3xl overflow-hidden shadow-xl"
          style={{
            background:
              "linear-gradient(170deg, hsl(var(--card)) 0%, hsl(var(--v-electric-blue) / 0.07) 50%, hsl(var(--v-magenta) / 0.04) 100%)",
            border: "1px solid hsl(var(--v-electric-blue) / 0.28)",
          }}
        >
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm">
                    <BookOpen className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <CardTitle className="text-xl sm:text-2xl font-display font-bold flex items-center gap-2 text-foreground">
                      Submission History &amp; Feedback
                      <Badge variant="secondary" className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                        {allSubmissions.length} Total
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Review all submitted books, current evaluation statuses, and librarian feedback comments.
                    </CardDescription>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fetchSubmissions(false)}
                  disabled={loading || isLiveSyncing}
                  className="h-8 px-3 text-xs rounded-xl bg-background/60 hover:bg-background border-border/60 text-foreground gap-1.5 shadow-2xs"
                  title="Refresh live submissions"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5 text-primary", (loading || isLiveSyncing) && "animate-spin")} />
                  <span>{isLiveSyncing ? "Syncing..." : "Live Refresh"}</span>
                </Button>
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 gap-1.5 border-emerald-500/30 font-medium px-3 py-1 rounded-full shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live Sync Active
                </Badge>
                <Badge variant="outline" className="text-xs bg-muted/80 text-foreground gap-1.5 border-border font-medium px-3 py-1 rounded-full">
                  <Lock className="w-3 h-3 text-amber-500" />
                  Locked &amp; Verified
                </Badge>
              </div>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mt-4 pt-3 border-t border-border/40">
              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  size="sm"
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('all')}
                  className={cn(
                    "h-8 px-3 text-xs font-semibold rounded-xl transition-all",
                    statusFilter === 'all'
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-background/60 hover:bg-background border-border/60 text-foreground"
                  )}
                >
                  All ({allSubmissions.length})
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'approved' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('approved')}
                  className={cn(
                    "h-8 px-3 text-xs font-semibold rounded-xl gap-1.5 transition-all",
                    statusFilter === 'approved'
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-background/60 hover:bg-background border-border/60 text-foreground"
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Approved ({approvedCount})
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'pending' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('pending')}
                  className={cn(
                    "h-8 px-3 text-xs font-semibold rounded-xl gap-1.5 transition-all",
                    statusFilter === 'pending'
                      ? "bg-amber-600 text-white shadow-sm"
                      : "bg-background/60 hover:bg-background border-border/60 text-foreground"
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Pending ({pendingCount})
                </Button>
                {rejectedCount > 0 && (
                  <Button
                    size="sm"
                    variant={statusFilter === 'rejected' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('rejected')}
                    className={cn(
                      "h-8 px-3 text-xs font-semibold rounded-xl gap-1.5 transition-all",
                      statusFilter === 'rejected'
                        ? "bg-rose-600 text-white shadow-sm"
                        : "bg-background/60 hover:bg-background border-border/60 text-foreground"
                    )}
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                    Needs Revision ({rejectedCount})
                  </Button>
                )}
              </div>

              {/* Search input */}
              <div className="relative w-full lg:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search title, author, category..."
                  className="pl-8.5 pr-8 h-8 text-xs rounded-xl bg-background/70 border-border/60 text-foreground placeholder:text-muted-foreground"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-1">
            {/* Student Privacy & Lock Banner */}
            <div
              className="p-3.5 rounded-2xl flex items-start gap-3 text-xs"
              style={{
                background:
                  "linear-gradient(135deg, hsl(var(--v-yellow) / 0.12) 0%, hsl(var(--v-orange) / 0.08) 100%)",
                border: "1px solid hsl(var(--v-yellow) / 0.35)",
              }}
            >
              <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-bold text-foreground">
                  🔒 Student Privacy &amp; Academic Integrity Lock
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Submissions are private to you and the academy librarian. Once recorded, entries are locked to preserve reading integrity. If you need corrections or additional guidance, review the feedback comments below or contact the librarian.
                </p>
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="text-center py-12 rounded-2xl bg-secondary/30 border border-border/40 p-8 space-y-2">
                <BookOpen className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
                <p className="text-sm font-semibold text-foreground">No submissions found</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {searchQuery || statusFilter !== 'all'
                    ? "Try adjusting your search query or status filter."
                    : "No books submitted yet. Start reading and submit your first book!"}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto rounded-2xl border border-border/50 bg-secondary/20 shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border/40 bg-secondary/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        <th className="py-3 px-4">Realm &amp; Book</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Finished</th>
                        <th className="py-3 px-3 text-center">Pts</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 min-w-[220px]">Librarian Comments &amp; Feedback</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30 text-xs">
                      {filteredHistory.map((sub, idx) => {
                        const isApproved = sub.approval_status === 'approved';
                        const isPending = sub.approval_status === 'pending';
                        const isNeedsRevision = sub.approval_status === 'rejected' || sub.approval_status === 'needs_revision';

                        return (
                          <tr
                            key={sub.id || idx}
                            className="hover:bg-secondary/40 transition-colors"
                          >
                            {/* Book Title & Author */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-start gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-[11px] font-bold text-primary shrink-0 mt-0.5">
                                  #{sub.category_number || idx + 1}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-foreground text-sm leading-snug line-clamp-1">
                                    {sub.title}
                                  </div>
                                  <div className="text-muted-foreground text-[11px]">
                                    by <span className="text-foreground/90 font-medium">{sub.author}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Category Badge */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <Badge
                                variant="outline"
                                className="text-[10px] py-0.5 px-2 font-medium bg-background/80 border-border/60 text-foreground max-w-[150px] truncate"
                              >
                                {sub.category_name}
                              </Badge>
                            </td>

                            {/* Date Finished */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground text-[11px]">
                              {sub.date_finished ? (
                                format(new Date(sub.date_finished), 'MMM d, yyyy')
                              ) : (
                                '—'
                              )}
                            </td>

                            {/* Points */}
                            <td className="py-3.5 px-3 text-center whitespace-nowrap">
                              <span className="font-bold font-display text-amber-500 text-sm">
                                +{sub.points_earned || 10}
                              </span>
                            </td>

                            {/* Status Badge */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {isApproved && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  Approved
                                </span>
                              )}
                              {isPending && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  Pending Review
                                </span>
                              )}
                              {isNeedsRevision && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                                  Needs Revision
                                </span>
                              )}
                            </td>

                            {/* Librarian Comments & Feedback */}
                            <td className="py-3.5 px-4">
                              {sub.admin_feedback ? (
                                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-foreground space-y-0.5">
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                                    <MessageSquare className="w-3 h-3" />
                                    Librarian Feedback
                                  </div>
                                  <p className="text-[11px] text-foreground/90 italic leading-snug line-clamp-2">
                                    "{sub.admin_feedback}"
                                  </p>
                                </div>
                              ) : sub.ai_feedback ? (
                                <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-muted-foreground space-y-0.5">
                                  <div className="flex items-center gap-1 text-[10px] font-semibold text-primary">
                                    <Sparkles className="w-3 h-3" />
                                    Academic Review Note
                                  </div>
                                  <p className="text-[11px] text-foreground/80 line-clamp-2">
                                    {sub.ai_feedback}
                                  </p>
                                </div>
                              ) : isPending ? (
                                <span className="text-[11px] text-muted-foreground italic flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-amber-400/80" />
                                  Awaiting librarian evaluation
                                </span>
                              ) : (
                                <span className="text-[11px] text-emerald-400/80 font-medium flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  Verified &amp; Awarded
                                </span>
                              )}
                            </td>

                            {/* Action Buttons */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2.5 text-xs text-foreground hover:bg-primary/10 hover:text-primary rounded-lg gap-1"
                                  onClick={() => setSelectedSubmissionForReflection(sub)}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  View
                                </Button>
                                {isLibrarian && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-xs text-foreground hover:bg-secondary rounded-lg"
                                      onClick={() => setEditingSubmission(sub)}
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 rounded-lg"
                                      onClick={() => setDeletingSubmission(sub)}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden space-y-3">
                  {filteredHistory.map((sub, idx) => {
                    const isApproved = sub.approval_status === 'approved';
                    const isPending = sub.approval_status === 'pending';
                    const isNeedsRevision = sub.approval_status === 'rejected' || sub.approval_status === 'needs_revision';

                    return (
                      <div
                        key={sub.id || idx}
                        className="p-4 rounded-2xl bg-secondary/50 border border-border/60 space-y-3 transition-all shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">
                              #{sub.category_number || idx + 1}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-foreground line-clamp-1">{sub.title}</h4>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                by <span className="text-foreground/90 font-medium">{sub.author}</span>
                              </p>
                              <div className="mt-1 flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-[10px] py-0 px-2 bg-background/60 text-foreground">
                                  {sub.category_name}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {sub.date_finished ? format(new Date(sub.date_finished), 'MMM d, yyyy') : ''}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-base font-display font-bold text-amber-500">
                              +{sub.points_earned || 10} pts
                            </div>
                            <div className="mt-1">
                              {isApproved && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Approved
                                </span>
                              )}
                              {isPending && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                  <Clock className="w-2.5 h-2.5" /> Pending
                                </span>
                              )}
                              {isNeedsRevision && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                  <AlertTriangle className="w-2.5 h-2.5" /> Needs Rev
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Admin Feedback Box */}
                        {sub.admin_feedback && (
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                              <MessageSquare className="w-3 h-3" />
                              Librarian Feedback
                            </div>
                            <p className="text-xs text-foreground/90 italic leading-relaxed">
                              "{sub.admin_feedback}"
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-border/30">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2.5 rounded-xl gap-1 text-foreground"
                            onClick={() => setSelectedSubmissionForReflection(sub)}
                          >
                            <Eye className="w-3.5 h-3.5" /> View Reflection
                          </Button>

                          {isLibrarian && (
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={() => setEditingSubmission(sub)}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => setDeletingSubmission(sub)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Edit Dialog */}
      {editingSubmission && (
        <EditSubmissionDialog
          open={!!editingSubmission}
          onOpenChange={(open) => !open && setEditingSubmission(null)}
          submission={editingSubmission}
          onSuccess={fetchSubmissions}
        />
      )}

      {/* Delete Dialog */}
      {deletingSubmission && (
        <DeleteSubmissionDialog
          open={!!deletingSubmission}
          onOpenChange={(open) => !open && setDeletingSubmission(null)}
          submissionId={deletingSubmission.id}
          bookTitle={deletingSubmission.title}
          onSuccess={fetchSubmissions}
        />
      )}

      {/* View Reflection & Feedback Dialog */}
      {selectedSubmissionForReflection && (
        <Dialog
          open={!!selectedSubmissionForReflection}
          onOpenChange={(open) => !open && setSelectedSubmissionForReflection(null)}
        >
          <DialogContent
            className="max-w-lg p-6 rounded-3xl border-border/80 bg-card shadow-2xl space-y-4"
            style={{
              background:
                "linear-gradient(165deg, hsl(var(--card)) 0%, hsl(var(--v-electric-blue) / 0.08) 100%)",
              border: "1px solid hsl(var(--v-electric-blue) / 0.3)",
            }}
          >
            <DialogHeader className="space-y-1.5 pb-2 border-b border-border/40">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[11px] font-semibold bg-primary/15 text-primary border-primary/30">
                  Realm #{selectedSubmissionForReflection.category_number}: {selectedSubmissionForReflection.category_name}
                </Badge>
                {selectedSubmissionForReflection.approval_status === 'approved' && (
                  <Badge variant="outline" className="text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                    Approved
                  </Badge>
                )}
                {selectedSubmissionForReflection.approval_status === 'pending' && (
                  <Badge variant="outline" className="text-[11px] font-semibold bg-amber-500/15 text-amber-400 border-amber-500/30">
                    Pending Review
                  </Badge>
                )}
                {(selectedSubmissionForReflection.approval_status === 'rejected' ||
                  selectedSubmissionForReflection.approval_status === 'needs_revision') && (
                  <Badge variant="outline" className="text-[11px] font-semibold bg-rose-500/15 text-rose-400 border-rose-500/30">
                    Needs Revision
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-xl font-display font-bold text-foreground">
                {selectedSubmissionForReflection.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                by <strong className="text-foreground">{selectedSubmissionForReflection.author}</strong> • Finished on{' '}
                {selectedSubmissionForReflection.date_finished
                  ? format(new Date(selectedSubmissionForReflection.date_finished), 'MMMM d, yyyy')
                  : '—'}
              </DialogDescription>
            </DialogHeader>

            {/* Reflection Content */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" />
                Student Reading Reflection
              </label>
              <div className="p-4 rounded-2xl bg-secondary/60 border border-border/60 text-foreground text-xs leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap font-serif">
                {selectedSubmissionForReflection.reflection || "No reflection text provided."}
              </div>
            </div>

            {/* Librarian Admin Feedback Box */}
            {selectedSubmissionForReflection.admin_feedback && (
              <div
                className="p-4 rounded-2xl space-y-1.5"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(var(--v-yellow) / 0.15) 0%, hsl(var(--v-orange) / 0.10) 100%)",
                  border: "1px solid hsl(var(--v-yellow) / 0.4)",
                }}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  Librarian Feedback &amp; Academic Notes
                </div>
                <p className="text-xs text-foreground/90 italic leading-relaxed font-sans">
                  "{selectedSubmissionForReflection.admin_feedback}"
                </p>
              </div>
            )}

            {/* AI Review feedback if present and no admin feedback */}
            {!selectedSubmissionForReflection.admin_feedback && selectedSubmissionForReflection.ai_feedback && (
              <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/25 text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-primary">
                  <Sparkles className="w-3.5 h-3.5" />
                  Academic Review Summary
                </div>
                <p className="text-[11px] text-foreground/80 leading-relaxed">
                  {selectedSubmissionForReflection.ai_feedback}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <div className="text-xs text-muted-foreground">
                Points Awarded:{' '}
                <strong className="text-amber-500 font-bold">
                  +{selectedSubmissionForReflection.points_earned || 10} pts
                </strong>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs text-foreground"
                onClick={() => setSelectedSubmissionForReflection(null)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Official Certificate Dialog */}
      {showCertDialog && (
        <Dialog open={showCertDialog} onOpenChange={setShowCertDialog}>
          <DialogContent className="max-w-4xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto">
            <DialogHeader className="flex flex-row items-center justify-between border-b pb-3">
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Award className="w-5 h-5 text-gold" /> Official Certificate of Achievement
              </DialogTitle>
              <Button
                size="sm"
                onClick={handleDownloadPDF}
                disabled={isDownloadingCert}
                className="gap-1.5 text-xs bg-gold text-slate-950 font-semibold hover:bg-gold/90"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </Button>
            </DialogHeader>
            <div className="flex justify-center items-center py-4 overflow-x-auto bg-slate-950/20 rounded-xl my-2">
              <div className="transform origin-top scale-[0.80] sm:scale-95 md:scale-100 py-2">
                <CertificateCanvas
                  ref={certRef}
                  data={{
                    studentName: currentStudentName,
                    nameCase: 'as-is',
                    level: computeStudentLevel(booksRead),
                    booksCount: booksRead,
                    signatoryName: selectedChallenge?.certificate_signatory_name || 'David O. Oloo',
                    signatoryTitle: selectedChallenge?.certificate_signatory_title || 'Director of Teaching & Learning',
                    dateAwarded: submissions[0]?.date_finished
                      ? new Date(submissions[0].date_finished).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                      : '1 July 2026',
                    verificationCode: getVerificationCode(profile?.email || user?.id || 'cert'),
                    studentEmail: profile?.email || user?.email || '',
                  }}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Offscreen unscaled certificate element for perfect 1:1 html2canvas PDF generation */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: '800px',
          height: '566px',
          overflow: 'hidden',
          pointerEvents: 'none',
          opacity: 0,
          zIndex: -100,
        }}
        aria-hidden="true"
      >
        <CertificateCanvas
          ref={printCertRef}
          scale={1}
          data={{
            studentName: currentStudentName,
            nameCase: 'as-is',
            level: computeStudentLevel(booksRead),
            booksCount: booksRead,
            signatoryName: selectedChallenge?.certificate_signatory_name || 'David O. Oloo',
            signatoryTitle: selectedChallenge?.certificate_signatory_title || 'Director of Teaching & Learning',
            dateAwarded: submissions[0]?.date_finished
              ? new Date(submissions[0].date_finished).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
              : '1 July 2026',
            verificationCode: getVerificationCode(profile?.email || user?.id || 'cert'),
            studentEmail: profile?.email || user?.email || '',
          }}
        />
      </div>
    </div>
  );
};

export default MyProgress;
