import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Navbar from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Download,
  Search,
  Users,
  BookOpen,
  Trophy,
  Library,
  Megaphone,
  Award,
  RefreshCw,
  ListChecks,
  ShieldCheck,
  Sliders,
  ArrowUpRight,
  Clock,
} from 'lucide-react';
import AdminPasswordReset from '@/components/AdminPasswordReset';
import { CreateUserDialog } from '@/components/LibrarianCommandCenter';
import LibrarianCommandCenter from '@/components/LibrarianCommandCenter';
import StaffCohortBroadcastDialog from '@/components/StaffCohortBroadcastDialog';
import { HOUSES, YEAR_GROUPS, CLASSES, isYearGroupMatch } from '@/lib/constants';
import { computeStudentLevel } from '@/lib/certificateTypes';
import { format } from 'date-fns';
import { useChallenges } from '@/contexts/ChallengeContext';
import { AppDownloadButton } from '@/components/AppDownloadBanner';
import { cn } from '@/lib/utils';

interface Submission {
  id: string;
  user_id: string;
  title: string;
  author: string;
  category_number: number;
  category_name: string;
  date_started: string;
  date_finished: string;
  reflection: string;
  points_earned: number;
  created_at: string;
}

interface Profile {
  full_name: string;
  email: string;
  year_group: string;
  class_name: string;
  house: string;
}

interface SubmissionWithProfile extends Submission {
  profiles: Profile;
}

interface PendingSubmission {
  id: string;
  email: string;
  student_name: string;
  year_group: string;
  class_name: string;
  house: string;
  category_number: number;
  category_name: string;
  title: string;
  author: string;
  date_started: string;
  date_finished: string;
  reflection: string;
  created_at: string;
}

const SECTION_LABELS: Record<string, string> = {
  submissions: 'All Submissions',
  flagged: 'Flagged Queue',
  import: 'Bulk Import',
  controls: 'Session & Theme Controls',
  challenges: 'Active Challenges',
  registrations: 'Enrolment Roster',
  create: 'Create Challenge',
  categories: 'Reading Categories',
  certificates: 'Certificate Studio',
  homepage: 'Homepage Studio',
  broadcast: 'Mass Broadcaster',
  'certificate-dispatch': 'Certificate Dispatch',
  'system-links': 'System Links',
  students: 'Student Profiles',
  members: 'Staff Members',
  codes: 'Access Codes',
  leaderboard: 'Leaderboard Audit',
};

const AdminDashboard = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedChallenge, selectedChallengeId } = useChallenges();
  const [submissions, setSubmissions] = useState<SubmissionWithProfile[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<PendingSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const filterChallenge = selectedChallengeId || 'all';
  const [filterHouse, setFilterHouse] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'submissions' | 'pending'>('submissions');
  const commandSection = searchParams.get('s') ?? 'submissions';
  const setCommandSection = (key: string) => setSearchParams({ s: key });
  const [activeChallenges, setActiveChallenges] = useState(0);

  useEffect(() => {
    (async () => {
      const { count } = await supabase
        .from('challenges')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      setActiveChallenges(count ?? 0);
    })();
  }, []);

  const isCreator = Boolean(
    profile?.email?.toLowerCase().includes('tonny') ||
      user?.email?.toLowerCase().includes('tonny')
  );
  const isStaff = Boolean((profile?.role && profile.role !== 'student') || isCreator);
  const isLibrarian = Boolean(profile?.role === 'librarian' || profile?.role === 'admin' || isCreator);

  const isAssignedGroup = (
    userGroup: { class_name?: string | null; year_group?: string | null; house?: string | null } | null | undefined
  ) => {
    if (isCreator) return true;
    if (!userGroup) return false;
    if (profile?.house && userGroup.house && userGroup.house.toLowerCase() !== profile.house.toLowerCase()) {
      return false;
    }
    if (
      profile?.year_group &&
      userGroup.year_group &&
      userGroup.year_group.toLowerCase() !== profile.year_group.toLowerCase()
    ) {
      return false;
    }
    if (
      profile?.class_name &&
      userGroup.class_name &&
      userGroup.class_name.toLowerCase() !== profile.class_name.toLowerCase()
    ) {
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!authLoading && profile && !isStaff && !isCreator) {
      navigate('/dashboard');
    }
  }, [authLoading, profile, isStaff, isCreator, navigate]);

  useEffect(() => {
    let mounted = true;

    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 1500);

    const fetchData = async () => {
      if (!isStaff) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        setLoading(true);

        let submissionsData: Submission[] = [];
        if (filterChallenge === 'all') {
          const [bRes, cRes] = await Promise.all([
            supabase.from('book_submissions').select('*').order('created_at', { ascending: false }),
            supabase.from('challenge_submissions').select('*').order('created_at', { ascending: false }),
          ]);
          const seen = new Set<string>();
          const combined: Submission[] = [];
          (bRes.data || []).forEach((d: Record<string, unknown>) => {
            seen.add(String(d.id));
            combined.push(d as unknown as Submission);
          });
          (cRes.data || []).forEach((d: Record<string, unknown>) => {
            if (!seen.has(String(d.id))) {
              seen.add(String(d.id));
              combined.push({
                id: String(d.id),
                user_id: String(d.user_id),
                title: String(d.title || ''),
                author: String(d.author || ''),
                category_number: Number(d.category_number) || 1,
                category_name: String(d.category_name || 'Challenge Realm'),
                date_started: String(d.created_at || ''),
                date_finished: String(d.created_at || ''),
                reflection: String(d.reflection || ''),
                points_earned: Number(d.points_earned) || 10,
                created_at: String(d.created_at || ''),
              });
            }
          });
          submissionsData = combined;
        } else {
          const { data, error } = await supabase
            .from('challenge_submissions')
            .select('*')
            .eq('challenge_id', filterChallenge)
            .order('created_at', { ascending: false });
          if (!error && data) {
            submissionsData = data.map((d: Record<string, unknown>) => ({
              id: String(d.id),
              user_id: String(d.user_id),
              title: String(d.title || ''),
              author: String(d.author || ''),
              category_number: Number(d.category_number) || 1,
              category_name: String(d.category_name || 'Challenge Realm'),
              date_started: String(d.created_at || ''),
              date_finished: String(d.created_at || ''),
              reflection: String(d.reflection || ''),
              points_earned: Number(d.points_earned) || 10,
              created_at: String(d.created_at || ''),
            }));
          }
        }

        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, year_group, class_name, house');

        if (profilesData) {
          const profileMap = new Map(profilesData.map((p) => [p.user_id, p]));
          const enrichedSubmissions = submissionsData.map((sub) => ({
            ...sub,
            profiles: profileMap.get(sub.user_id) || null,
          }));
          if (mounted) setSubmissions(enrichedSubmissions as unknown as SubmissionWithProfile[]);
        }

        const { data: pendingData, error: pendingError } = await supabase
          .from('pending_submissions')
          .select('*')
          .order('created_at', { ascending: false });

        if (!pendingError && pendingData && mounted) {
          setPendingSubmissions(pendingData as PendingSubmission[]);
        }
      } catch (err) {
        console.warn('AdminDashboard fetch error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();

    const channel = supabase
      .channel('realtime-admindashboard-submissions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'book_submissions' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_submissions' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      supabase.removeChannel(channel);
    };
  }, [isStaff, filterChallenge]);

  const filteredSubmissions = submissions.filter((sub) => {
    if (!isAssignedGroup(sub.profiles)) return false;

    const matchesSearch =
      sub.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesHouse = filterHouse === 'all' || sub.profiles?.house === filterHouse;
    const matchesYear = filterYear === 'all' || isYearGroupMatch(sub.profiles?.year_group, filterYear);
    const matchesClass = filterClass === 'all' || sub.profiles?.class_name === filterClass;

    return matchesSearch && matchesHouse && matchesYear && matchesClass;
  });

  const filteredPending = pendingSubmissions.filter((sub) => {
    if (!isAssignedGroup({ house: sub.house, year_group: sub.year_group, class_name: sub.class_name })) return false;

    const matchesSearch =
      sub.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesHouse = filterHouse === 'all' || sub.house === filterHouse;
    const matchesYear = filterYear === 'all' || isYearGroupMatch(sub.year_group, filterYear);

    return matchesSearch && matchesHouse && matchesYear;
  });

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const exportToCSV = () => {
    if (activeTab === 'submissions') {
      const headers = [
        'Student Name',
        'Email',
        'Year Group',
        'Class',
        'House',
        'Category',
        'Book Title',
        'Author',
        'Date Started',
        'Date Finished',
        'Points',
        'Reflection',
      ];
      const rows = filteredSubmissions.map((sub) => [
        sub.profiles?.full_name || '',
        sub.profiles?.email || '',
        sub.profiles?.year_group || '',
        sub.profiles?.class_name || '',
        sub.profiles?.house || '',
        `${sub.category_number}. ${sub.category_name}`,
        sub.title,
        sub.author,
        sub.date_started,
        sub.date_finished,
        sub.points_earned,
        sub.reflection.replace(/"/g, '""'),
      ]);

      const csv = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');
      downloadCSV(csv, 'book_submissions.csv');
    } else {
      const headers = [
        'Student Name',
        'Email',
        'Year Group',
        'Class',
        'House',
        'Category',
        'Book Title',
        'Author',
        'Date Started',
        'Date Finished',
        'Reflection',
      ];
      const rows = filteredPending.map((sub) => [
        sub.student_name,
        sub.email,
        sub.year_group,
        sub.class_name,
        sub.house,
        `${sub.category_number}. ${sub.category_name}`,
        sub.title,
        sub.author,
        sub.date_started,
        sub.date_finished,
        sub.reflection.replace(/"/g, '""'),
      ]);

      const csv = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');
      downloadCSV(csv, 'pending_submissions.csv');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div
          className="p-8 rounded-3xl border border-emerald-500/30 shadow-2xl max-w-sm w-full space-y-4"
          style={{
            background:
              'linear-gradient(155deg, hsl(var(--v-emerald) / 0.14), hsl(var(--card)) 60%, hsl(var(--v-electric-blue) / 0.10))',
          }}
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white flex items-center justify-center mx-auto shadow-md">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-bold text-base text-foreground">Loading Librarian Portal...</h3>
            <p className="text-xs text-muted-foreground">Preparing active command workspace</p>
          </div>
          <Button variant="outline" size="sm" className="text-xs w-full mt-2 rounded-2xl" onClick={() => setLoading(false)}>
            Skip to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div
          className="p-8 rounded-3xl border border-indigo-500/30 shadow-2xl max-w-md w-full space-y-4"
          style={{
            background:
              'linear-gradient(155deg, hsl(var(--v-electric-blue) / 0.12), hsl(var(--card)) 60%, hsl(var(--v-violet) / 0.10))',
          }}
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-md">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold font-display text-foreground">Academy Staff &amp; Librarian Portal</h2>
          <p className="text-xs text-muted-foreground">
            This administrative area is for academy librarians, patrons, and faculty leaders.
          </p>
          <div className="pt-2 flex justify-center">
            <Button asChild size="sm" className="gap-2 rounded-2xl">
              <Link to="/dashboard">Go to Student &amp; Scholar Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalBooks = filteredSubmissions.length;
  const totalPending = filteredPending.length;
  const uniqueStudents = new Set(filteredSubmissions.map((s) => s.user_id)).size;
  const totalPoints = filteredSubmissions.reduce((sum, s) => sum + s.points_earned, 0);
  const currentSectionTitle = SECTION_LABELS[commandSection] || 'Librarian Command Workspace';

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{currentSectionTitle} — Admin &amp; Librarian Command Center</title>
        <meta
          name="description"
          content="Manage reading challenges, student reflections, cohort controls, and certified achievement dispatches for M-PESA Foundation Academy."
        />
        <meta name="robots" content="noindex" />
      </Helmet>
      <Navbar />

      <main className="w-full max-w-none px-3 sm:px-5 md:px-6 py-5 space-y-5 transition-all duration-300">
        {/* ========================================================================= */}
        {/* LIBRARIAN & ADMIN VIEW: Direct Selected Sidebar Feature Workspace         */}
        {/* Sidebar houses Challenge Operations, Participant Management & Controls;   */}
        {/* this panel renders the clicked sidebar feature cleanly without repeating. */}
        {/* ========================================================================= */}
        {isLibrarian ? (
          <div
            className="rounded-3xl border border-border/80 p-4 sm:p-6 shadow-xl"
            style={{
              background:
                'linear-gradient(165deg, hsl(var(--card)) 0%, hsl(var(--v-electric-blue) / 0.04) 50%, hsl(var(--v-emerald) / 0.04) 100%)',
            }}
          >
            <LibrarianCommandCenter
              stats={{
                students: uniqueStudents,
                submissions: totalBooks,
                activeChallenges,
                pending: totalPending,
              }}
              activeSection={commandSection}
              onSelectSection={setCommandSection}
            />
          </div>
        ) : (
          /* ========================================================================= */
          /* LEADERSHIP STAFF VIEW: Color-Coded 3-Section Grid + Cohort Submissions    */
          /* ========================================================================= */
          <div className="space-y-6">
            {/* Floating Linear-Gradient KPI Summary Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div
                className="rounded-3xl border p-5 shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between gap-4"
                style={{
                  borderColor: 'hsl(var(--v-emerald) / 0.35)',
                  background:
                    'linear-gradient(145deg, hsl(var(--v-emerald) / 0.18), hsl(var(--v-mint) / 0.06), hsl(var(--card)))',
                }}
              >
                <div>
                  <div className="text-xs font-semibold text-muted-foreground">Total Submissions</div>
                  <div className="text-3xl font-display font-extrabold text-foreground tabular-nums mt-1">{totalBooks}</div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                    Verified &amp; logged
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
              </div>

              <div
                className="rounded-3xl border p-5 shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between gap-4"
                style={{
                  borderColor: 'hsl(var(--v-electric-blue) / 0.35)',
                  background:
                    'linear-gradient(145deg, hsl(var(--v-electric-blue) / 0.18), hsl(var(--v-cyan) / 0.06), hsl(var(--card)))',
                }}
              >
                <div>
                  <div className="text-xs font-semibold text-muted-foreground">Active Scholars</div>
                  <div className="text-3xl font-display font-extrabold text-foreground tabular-nums mt-1">
                    {uniqueStudents}
                  </div>
                  <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-1">
                    Participating readers
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              <div
                className="rounded-3xl border p-5 shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between gap-4"
                style={{
                  borderColor: 'hsl(var(--v-yellow) / 0.40)',
                  background:
                    'linear-gradient(145deg, hsl(var(--v-yellow) / 0.20), hsl(var(--v-orange) / 0.06), hsl(var(--card)))',
                }}
              >
                <div>
                  <div className="text-xs font-semibold text-muted-foreground">Pending Imports</div>
                  <div className="text-3xl font-display font-extrabold text-foreground tabular-nums mt-1">{totalPending}</div>
                  <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1">
                    Awaiting claim / sync
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center shadow-md shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              <div
                className="rounded-3xl border p-5 shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between gap-4"
                style={{
                  borderColor: 'hsl(var(--v-violet) / 0.35)',
                  background:
                    'linear-gradient(145deg, hsl(var(--v-violet) / 0.18), hsl(var(--v-hot-pink) / 0.06), hsl(var(--card)))',
                }}
              >
                <div>
                  <div className="text-xs font-semibold text-muted-foreground">Cohort Points</div>
                  <div className="text-3xl font-display font-extrabold text-foreground tabular-nums mt-1">
                    {totalPoints}
                  </div>
                  <div className="text-[11px] text-violet-600 dark:text-violet-400 font-medium mt-1">
                    {activeChallenges} open challenges
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
              {/* SECTION 1: Challenge Operations */}
              <section
                aria-label="Challenge Operations"
                className="rounded-3xl border-2 p-5 shadow-xl space-y-4"
                style={{
                  borderColor: 'hsl(var(--v-emerald) / 0.35)',
                  background:
                    'linear-gradient(155deg, hsl(var(--v-emerald) / 0.16) 0%, hsl(var(--v-cyan) / 0.06) 50%, hsl(var(--card)) 100%)',
                }}
              >
                <div className="flex items-center gap-3 pb-3 border-b border-emerald-500/20">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shrink-0">
                    <ListChecks className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground">Challenge Operations</h2>
                    <p className="text-xs text-muted-foreground">Search logs, switch views &amp; export cohort data</p>
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search student, book title, email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 rounded-2xl bg-background/85"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('submissions')}
                    className={cn(
                      'rounded-2xl border p-3 text-left transition-all text-xs font-bold shadow-xs',
                      activeTab === 'submissions' ? 'ring-2 ring-emerald-500/60' : 'hover:-translate-y-0.5'
                    )}
                    style={{
                      borderColor: 'hsl(var(--v-emerald) / 0.35)',
                      background:
                        activeTab === 'submissions'
                          ? 'linear-gradient(145deg, hsl(var(--v-emerald) / 0.25), hsl(var(--card)))'
                          : 'linear-gradient(145deg, hsl(var(--v-emerald) / 0.10), hsl(var(--card)))',
                    }}
                  >
                    <div className="text-foreground">Registered</div>
                    <div className="text-lg font-display font-extrabold tabular-nums mt-0.5 text-emerald-600 dark:text-emerald-400">
                      {filteredSubmissions.length}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('pending')}
                    className={cn(
                      'rounded-2xl border p-3 text-left transition-all text-xs font-bold shadow-xs',
                      activeTab === 'pending' ? 'ring-2 ring-amber-500/60' : 'hover:-translate-y-0.5'
                    )}
                    style={{
                      borderColor: 'hsl(var(--v-yellow) / 0.35)',
                      background:
                        activeTab === 'pending'
                          ? 'linear-gradient(145deg, hsl(var(--v-yellow) / 0.25), hsl(var(--card)))'
                          : 'linear-gradient(145deg, hsl(var(--v-yellow) / 0.10), hsl(var(--card)))',
                    }}
                  >
                    <div className="text-foreground">Pending Import</div>
                    <div className="text-lg font-display font-extrabold tabular-nums mt-0.5 text-amber-600 dark:text-amber-400">
                      {filteredPending.length}
                    </div>
                  </button>
                </div>

                <Button
                  onClick={exportToCSV}
                  variant="outline"
                  className="w-full gap-2 rounded-2xl bg-background/85 font-semibold text-xs h-10"
                >
                  <Download className="w-4 h-4 text-emerald-500" />
                  <span>Export Cohort CSV</span>
                </Button>
              </section>

              {/* SECTION 2: Participant Management */}
              <section
                aria-label="Participant Management"
                className="rounded-3xl border-2 p-5 shadow-xl space-y-4"
                style={{
                  borderColor: 'hsl(var(--v-electric-blue) / 0.35)',
                  background:
                    'linear-gradient(155deg, hsl(var(--v-electric-blue) / 0.16) 0%, hsl(var(--v-violet) / 0.06) 50%, hsl(var(--card)) 100%)',
                }}
              >
                <div className="flex items-center gap-3 pb-3 border-b border-blue-500/20">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground">Participant Management</h2>
                    <p className="text-xs text-muted-foreground">Filter scholars by house, year group &amp; class</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2.5">
                  <Select value={filterHouse} onValueChange={setFilterHouse}>
                    <SelectTrigger className="rounded-2xl bg-background/85">
                      <SelectValue placeholder="House" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Houses</SelectItem>
                      {HOUSES.map((house) => (
                        <SelectItem key={house} value={house}>
                          {house}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterYear} onValueChange={setFilterYear}>
                    <SelectTrigger className="rounded-2xl bg-background/85">
                      <SelectValue placeholder="Year Group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {YEAR_GROUPS.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterClass} onValueChange={setFilterClass}>
                    <SelectTrigger className="rounded-2xl bg-background/85">
                      <SelectValue placeholder="Class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {CLASSES.map((cls) => (
                        <SelectItem key={cls} value={cls}>
                          {cls}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </section>

              {/* SECTION 3: Cohort Outreach & Catalog */}
              <section
                aria-label="Cohort Outreach & Catalog"
                className="rounded-3xl border-2 p-5 shadow-xl flex flex-col justify-between gap-4"
                style={{
                  borderColor: 'hsl(var(--v-orange) / 0.35)',
                  background:
                    'linear-gradient(155deg, hsl(var(--v-yellow) / 0.14) 0%, hsl(var(--v-hot-pink) / 0.07) 52%, hsl(var(--card)) 100%)',
                }}
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3 pb-3 border-b border-amber-500/20">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md shrink-0">
                      <Megaphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-bold text-foreground">Cohort Outreach &amp; Catalog</h2>
                      <p className="text-xs text-muted-foreground">View-only oversight • send cohort emails &amp; browse catalog</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-500/25 bg-background/75 p-3 text-xs flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground truncate">
                      {selectedChallenge?.title || 'All Challenges'}
                    </span>
                    <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 shrink-0">Active</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <StaffCohortBroadcastDialog
                      staffRole={profile?.role}
                      yearGroup={profile?.year_group}
                      className={profile?.class_name}
                      house={profile?.house}
                    />
                    <AppDownloadButton
                      className="rounded-2xl bg-primary/10 hover:bg-primary/20 text-primary border-primary/30 h-9 px-3.5 text-xs font-semibold whitespace-nowrap shrink-0"
                      label="Download App"
                    />
                    {isLibrarian && (
                      <>
                        <CreateUserDialog defaultRole="student" onCreated={() => window.location.reload()} />
                        <AdminPasswordReset />
                      </>
                    )}
                  </div>
                </div>

                <a
                  href="https://mfa.follettdestiny.com"
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-2xl border border-amber-500/35 p-3.5 flex items-center justify-between gap-3 transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-md"
                  style={{
                    background:
                      'linear-gradient(135deg, hsl(var(--v-yellow) / 0.20), hsl(var(--v-mint) / 0.14), hsl(var(--card)))',
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-amber-500 text-white flex items-center justify-center shrink-0">
                      <Library className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-foreground truncate">MFA Follet Destiny</div>
                      <div className="text-[11px] text-muted-foreground truncate">Open school book catalog</div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                </a>
              </section>
            </div>

            {/* Floating Rounded Linear-Gradient Submissions Table */}
            <div
              className="rounded-3xl border border-border/80 p-5 sm:p-6 shadow-xl space-y-4"
              style={{
                background: 'linear-gradient(165deg, hsl(var(--card)) 0%, hsl(var(--v-electric-blue) / 0.04) 100%)',
              }}
            >
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 text-white flex items-center justify-center shadow-xs">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">
                      {activeTab === 'submissions' ? 'All Submissions' : 'Pending Submissions (CSV Import)'}
                    </h3>
                    <p className="text-xs text-muted-foreground">Filtered submissions within your leadership cohort</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold tabular-nums text-muted-foreground">
                  {(activeTab === 'submissions' ? filteredSubmissions : filteredPending).length} entries
                </span>
              </div>

              <div className="overflow-x-auto">
                {activeTab === 'submissions' ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Year/Class</TableHead>
                        <TableHead>House</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Book</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubmissions.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{sub.profiles?.full_name}</div>
                              <div className="text-xs text-muted-foreground">{sub.profiles?.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {sub.profiles?.year_group} {sub.profiles?.class_name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-medium text-muted-foreground">{sub.profiles?.house}</span>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm max-w-[200px] truncate">
                              #{sub.category_number} {sub.category_name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium max-w-[200px] truncate">{sub.title}</div>
                              <div className="text-xs text-muted-foreground">{sub.author}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm tabular-nums">
                            {format(new Date(sub.date_finished), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold tabular-nums text-gold">+{sub.points_earned}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            {isLibrarian ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 rounded-xl border-gold/30 hover:bg-gold/10 hover:text-gold"
                                onClick={() => {
                                  const studentName = sub.profiles?.full_name || 'Student';
                                  const userBooks = submissions.filter((s) => s.user_id === sub.user_id).length || 1;
                                  const level = computeStudentLevel(userBooks);
                                  navigate(
                                    `/admin?s=certificates&student=${encodeURIComponent(studentName)}&books=${userBooks}&level=${level}&email=${encodeURIComponent(sub.profiles?.email || '')}`
                                  );
                                }}
                              >
                                <Award className="w-3.5 h-3.5 text-gold" /> Certificate
                              </Button>
                            ) : (
                              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                Verified
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Year/Class</TableHead>
                        <TableHead>House</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Book</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPending.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{sub.student_name}</div>
                              <div className="text-xs text-muted-foreground">{sub.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {sub.year_group} {sub.class_name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-medium text-muted-foreground">{sub.house}</span>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm max-w-[200px] truncate">
                              #{sub.category_number} {sub.category_name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium max-w-[200px] truncate">{sub.title}</div>
                              <div className="text-xs text-muted-foreground">{sub.author}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm tabular-nums">
                            {format(new Date(sub.date_finished), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-xs font-medium text-muted-foreground">Pending Claim</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {(activeTab === 'submissions' ? filteredSubmissions : filteredPending).length === 0 && (
                  <p className="text-center text-muted-foreground py-12 text-sm">
                    No submissions found matching your filters.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
