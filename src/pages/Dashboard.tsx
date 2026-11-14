import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChallenges, normalizeChallengeId } from '@/contexts/ChallengeContext';
import Navbar from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  BookOpen,
  Trophy,
  Target,
  Star,
  Medal,
  Award,
  Crown,
  ArrowRight,
  Sparkles,
  Sliders,
  Contrast,
  PlusCircle,
  KeyRound,
  Mail,
  CheckCircle2,
  ExternalLink,
  Calendar,
  School,
  GraduationCap,
  Building,
  Users,
  ShieldCheck,
  RefreshCw,
  Lock,
  Search,
  Download,
  SlidersHorizontal,
  ChevronRight,
  Clock,
  Send,
  CheckSquare,
  X,
  Filter,
  Home,
  Settings,
  BarChart3,
  Inbox,
  BadgeCheck,
  ListChecks,
  Flag,
  FolderUp,
  Plus,
  Layers,
  Megaphone,
  Link2,
  IdCard,
  UserCog,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Helmet } from 'react-helmet-async';
import ThemeModeSelector from '@/components/ThemeModeSelector';
import { AppDownloadButton } from '@/components/AppDownloadBanner';
import { cn } from '@/lib/utils';
import { getHouseColor, HOUSE_COLORS, HOUSES, normalizeYearGroup } from '@/lib/constants';

/**
 * Official academic year groups at M-Pesa Foundation Academy.
 * Defined locally as a constant to prevent bundling or resolution ReferenceErrors.
 */
export const YEAR_GROUPS = [
  'MYP1',
  'MYP2',
  'MYP3',
  'MYP4',
  'MYP5',
  'G10',
  'DP1',
  'DP2',
] as const;
export type YearGroup = (typeof YEAR_GROUPS)[number];

import ChallengeAccessCodeDialog from '@/components/ChallengeAccessCodeDialog';
import WelcomeEmailDialog from '@/components/WelcomeEmailDialog';
import { getWelcomeEmails, markWelcomeEmailRead, WelcomeEmailRecord } from '@/lib/challengeRegistrationManager';
import { getUnreadEmailCount } from '@/lib/emailRepliesManager';
import CircularGoalProgressTracker from '@/components/CircularGoalProgressTracker';
import { SessionCountdownBanner } from '@/components/SessionCountdownBanner';
import { safeStorage } from '@/lib/safeStorage';
import { toast } from 'sonner';
import { getUnifiedSubmissions } from '@/lib/submissionSyncService';
import { LockedChallengeNotice } from '@/components/LockedChallengeNotice';
import { CertificateDispatchModal, CertificateDispatchTarget } from '@/components/CertificateDispatchModal';
import StaffCohortBroadcastDialog from '@/components/StaffCohortBroadcastDialog';
import StudentBadgesShowcase from '@/components/StudentBadgesShowcase';
import { computeStudentLevel, CertificateLevel } from '@/lib/certificateTypes';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface StudentProgress {
  books_read: number;
  total_points: number;
  achievement_level: 'none' | 'bronze' | 'silver' | 'gold';
}

interface HouseLeaderboard {
  house: string;
  total_readers: number;
  total_books: number;
  total_points: number;
}

interface CohortStat {
  name: string;
  books: number;
  readers: number;
  points: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { challenges = [], activeChallenges = [], selectedChallenge, selectedChallengeId, isRegistered, refreshChallenges, setChallengeStatus } = useChallenges();
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [leaderboard, setLeaderboard] = useState<HouseLeaderboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [welcomeLetters, setWelcomeLetters] = useState<WelcomeEmailRecord[]>([]);
  const [selectedWelcomeEmail, setSelectedWelcomeEmail] = useState<WelcomeEmailRecord | null>(null);
  const [unreadEmailCount, setUnreadEmailCount] = useState<number>(() => getUnreadEmailCount(profile?.email || user?.email || user?.id));
  const [studentSubmissions, setStudentSubmissions] = useState<Record<string, any>[]>([]);

  // Certificate Dispatch state (Admin-only quick action)
  const [certDispatchOpen, setCertDispatchOpen] = useState(false);
  const [certStudentPickerOpen, setCertStudentPickerOpen] = useState(false);
  const [selectedCertTarget, setSelectedCertTarget] = useState<CertificateDispatchTarget | null>(null);
  const [certBatchTargets, setCertBatchTargets] = useState<CertificateDispatchTarget[]>([]);
  const [certSearchQuery, setCertSearchQuery] = useState('');
  const [certPickerSelectedUserIds, setCertPickerSelectedUserIds] = useState<Set<string>>(new Set());
  const [dashboardSelectedUserIds, setDashboardSelectedUserIds] = useState<Set<string>>(new Set());

  // School overview statistics state
  const [totalSchoolBooks, setTotalSchoolBooks] = useState<number>(0);
  const [totalSchoolReaders, setTotalSchoolReaders] = useState<number>(0);
  const [totalEnrolledStudents, setTotalEnrolledStudents] = useState<number>(0);
  const [classStats, setClassStats] = useState<CohortStat[]>([]);
  const [yearStats, setYearStats] = useState<CohortStat[]>([]);
  const [houseStats, setHouseStats] = useState<CohortStat[]>([]);

  // Staff dynamic cohort filters
  const [staffYearFilter, setStaffYearFilter] = useState<string>('all');
  const [staffClassFilter, setStaffClassFilter] = useState<string>('all');
  const [staffHouseFilter, setStaffHouseFilter] = useState<string>('all');
  const [allRawSubs, setAllRawSubs] = useState<any[]>([]);
  const [allStudentProfiles, setAllStudentProfiles] = useState<any[]>([]);
  const [initializedCohort, setInitializedCohort] = useState<boolean>(false);
  const [rosterSearch, setRosterSearch] = useState<string>('');

  useEffect(() => {
    const acc = profile?.email || user?.email || user?.id;
    const updateCount = () => setUnreadEmailCount(getUnreadEmailCount(acc));
    updateCount();
    window.addEventListener("mfa_email_replies_updated", updateCount);
    return () => window.removeEventListener("mfa_email_replies_updated", updateCount);
  }, [profile?.email, user?.email, user?.id]);

  const targetBooks = selectedChallenge?.target_books || 45;
  const isCreator = Boolean(
    profile?.email?.toLowerCase().includes('tonny') ||
    user?.email?.toLowerCase().includes('tonny')
  );
  const isStaff = Boolean(profile?.role && profile.role !== 'student');
  const isLibrarian = Boolean(profile?.role === 'librarian' || profile?.role === 'admin');
  const isHomeroomTutor = profile?.role === 'homeroom_tutor';
  const isHousePatron = profile?.role === 'house_patron';
  const isHeadOfYear = profile?.role === 'head_of_year';

  const isAdminOrLibrarian = (profile?.role === 'admin' || profile?.role === 'librarian' || user?.email?.toLowerCase().includes('admin') || user?.email?.toLowerCase().includes('librarian')) && !isCreator;

  const roleBadgeText = profile?.role === 'head_of_year'
    ? `HEAD OF YEAR COHORT LEADERSHIP • ${profile.year_group || 'ALL YEARS'}`
    : profile?.role === 'homeroom_tutor'
    ? `HOMEROOM TUTOR DASHBOARD • ${profile.year_group || ''} ${profile.class_name || ''}`
    : profile?.role === 'house_patron'
    ? `HOUSE PATRON LEADERSHIP • ${profile.house ? `${profile.house.toUpperCase()} HOUSE` : 'ACADEMY HOUSES'}`
    : profile?.role === 'librarian' || profile?.role === 'admin'
    ? '45-BOOK READING CHALLENGE 2025/2026 • HEAD LIBRARIAN & ADMIN'
    : 'ACADEMY FACULTY & STAFF OVERSIGHT';

  const roleDashboardTitle = profile?.role === 'head_of_year'
    ? `${profile.year_group ? `${profile.year_group} ` : ''}Head of Year Dashboard 📊`
    : profile?.role === 'homeroom_tutor'
    ? `${profile.year_group ? `${profile.year_group} ` : ''}${profile.class_name ? `${profile.class_name} ` : ''}Tutor Dashboard 📊`
    : profile?.role === 'house_patron'
    ? `${profile.house ? `${profile.house} ` : ''}House Patron Dashboard 🏆`
    : profile?.role === 'librarian' || profile?.role === 'admin'
    ? 'Head Librarian & Admin Command Dashboard 📚'
    : 'Faculty & Staff Reading Overview 📊';

  const roleDashboardSubtitle = profile?.role === 'head_of_year'
    ? `Dedicated academic cohort oversight for ${profile.year_group || 'your academic year'}: Tracking student books, participation, and class standings.`
    : profile?.role === 'homeroom_tutor'
    ? `Dedicated homeroom class oversight for ${profile.class_name || 'your class'}: Tracking reader participation, books logged, and milestones.`
    : profile?.role === 'house_patron'
    ? `House reader tally, verified books logged, and leaderboard standings for ${profile.house || 'your house'}.`
    : profile?.role === 'librarian' || profile?.role === 'admin'
    ? '45 Books Quest — Unified Librarian & Admin workspace for submissions, programme controls, broadcasts, certificates, and governance.'
    : 'Whole-school reading progress, cohort statistics, and house standings across the 45-book quest.';

  // Initialize staff filter default to assigned group once profile is loaded
  useEffect(() => {
    if (profile && isStaff && !initializedCohort) {
      if (profile.role === 'head_of_year' && profile.year_group) {
        setStaffYearFilter(profile.year_group);
      } else if (profile.role === 'homeroom_tutor') {
        if (profile.year_group) setStaffYearFilter(profile.year_group);
        if (profile.class_name) setStaffClassFilter(profile.class_name);
      } else if (profile.role === 'house_patron' && profile.house) {
        setStaffHouseFilter(profile.house);
      }
      setInitializedCohort(true);
    }
  }, [profile, isStaff, initializedCohort]);

  const studentBooksRead = progress?.books_read ?? studentSubmissions.length;
  const studentTotalPoints = progress?.total_points ?? (studentSubmissions.length * 10);
  const studentLevel = progress?.achievement_level || (studentBooksRead >= (targetBooks || 45) ? 'Gold' : studentBooksRead >= 15 ? 'Bronze' : 'None');

  const [recentFilter, setRecentFilter] = useState<'today' | 'week' | 'all'>('all');

  const categoriesExplored = useMemo(() => {
    const cats = new Set(studentSubmissions.map((s) => s.category_number || s.category_name).filter(Boolean));
    return cats.size;
  }, [studentSubmissions]);

  const timeOfDay = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }, []);

  useEffect(() => {
    let mounted = true;

    // Guaranteed failover: UI is never stuck in loading
    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 1500);

    const fetchData = async () => {
      if (!profile && !user) {
        if (mounted) setLoading(false);
        return;
      }
      setLoading(true);

      try {
        const isAllAcademy = !selectedChallengeId || selectedChallengeId === 'all';
        const isMain45 =
          selectedChallengeId === '45450000-2025-4026-8000-000000000045' ||
          (!isAllAcademy && selectedChallenge?.target_books === 45);
        const isSpecific = !isAllAcademy && !isMain45 && Boolean(selectedChallengeId);

        // 1. Fetch Student-Specific Progress (if student) - Ground truth is ALWAYS actual submissions!
        if (!isStaff) {
          const currentUserId = user?.id || profile.user_id;
          const unified = await getUnifiedSubmissions(currentUserId, selectedChallengeId);
          const subs = unified.approvedSubmissions;

          setStudentSubmissions(subs);

          // Synchronized category-capped progress (matches SubmitBook.tsx and reading rules)
          const maxPerCat = selectedChallenge?.max_books_per_category || 4;
          const catCounts: Record<number, number> = {};
          subs.forEach((s) => {
            const num = Number(s.category_number) || 1;
            catCounts[num] = (catCounts[num] || 0) + 1;
          });
          const cappedCount = Object.entries(catCounts).reduce((sum, [_, n]) => {
            return sum + Math.min(n, maxPerCat);
          }, 0);
          const countedBooksForGoal = isMain45 ? Math.min(targetBooks, cappedCount) : subs.length;

          const basePoints = subs.reduce((acc: number, cur: { points_earned?: number }) => acc + (cur.points_earned || 10), 0);
          const bonus = (countedBooksForGoal >= 15 ? 5 : 0) + (countedBooksForGoal >= 30 ? 10 : 0) + (countedBooksForGoal >= 45 ? 15 : 0);
          const computedPts = basePoints + bonus;

          let level: 'none' | 'bronze' | 'silver' | 'gold' = 'none';
          if (countedBooksForGoal >= targetBooks) level = 'gold';
          else if (countedBooksForGoal >= Math.max(2, Math.round(targetBooks * 0.66))) level = 'silver';
          else if (countedBooksForGoal >= Math.max(1, Math.round(targetBooks * 0.33))) level = 'bronze';

          setProgress({
            books_read: countedBooksForGoal,
            total_points: computedPts,
            achievement_level: level,
          });

          // Resiliently sync ground truth back into student_progress table
          try {
            await supabase.from('student_progress').upsert({
              user_id: currentUserId,
              books_read: countedBooksForGoal,
              total_points: computedPts,
              achievement_level: level,
            });
          } catch {
            // ignore silent update error
          }
        }

        // 2. Fetch Aggregates (Staff & School overview filtered by group assignment)
        let rawSubs: { id?: string; user_id: string; points_earned?: number; challenge_id?: string; approval_status?: string; title?: string; author?: string }[] = [];

        if (isSpecific) {
          const normId = normalizeChallengeId(selectedChallengeId);
          const queryIds = Array.from(new Set([selectedChallengeId, normId].filter(Boolean) as string[]));
          const { data: cData } = await supabase
            .from('challenge_submissions')
            .select('id, user_id, points_earned, challenge_id, title, author')
            .in('challenge_id', queryIds);
          rawSubs = (cData || []).map((s: any) => ({ ...s, approval_status: 'approved' }));
        } else if (isMain45) {
          const [bRes, cRes] = await Promise.all([
            supabase.from('book_submissions').select('id, user_id, points_earned, approval_status, title, author'),
            supabase.from('challenge_submissions').select('id, user_id, points_earned, challenge_id, title, author').eq('challenge_id', '45450000-2025-4026-8000-000000000045'),
          ]);
          const bFiltered = (bRes.data || []).filter((s) => s.approval_status !== 'rejected');
          rawSubs = [...bFiltered, ...(cRes.data || []).map((s: any) => ({ ...s, approval_status: 'approved' }))];
        } else {
          // Combined academy submissions across all challenges
          const [bRes, cRes] = await Promise.all([
            supabase.from('book_submissions').select('id, user_id, points_earned, approval_status, title, author'),
            supabase.from('challenge_submissions').select('id, user_id, points_earned, challenge_id, title, author'),
          ]);
          const bFiltered = (bRes.data || []).filter((s) => s.approval_status !== 'rejected');
          rawSubs = [...bFiltered, ...(cRes.data || []).map((s: any) => ({ ...s, approval_status: 'approved' }))];
        }

        // Merge local audit submissions matching active challenge
        const localAudit = safeStorage.getJSON<any[]>('mfa_submissions_audit', []);
        const normSelected = normalizeChallengeId(selectedChallengeId);
        const filteredAudit = localAudit.filter((loc) => {
          if (isAllAcademy) return true;
          if (isMain45) return !loc.challenge_id || loc.challenge_id === '45450000-2025-4026-8000-000000000045';
          const locNorm = normalizeChallengeId(loc.challenge_id);
          return loc.challenge_id === selectedChallengeId || locNorm === normSelected;
        });

        const localMapped = filteredAudit.map((loc) => ({
          id: loc.id,
          user_id: loc.user_id || user?.id || profile?.user_id || 'student-local',
          points_earned: Number(loc.points_earned || loc.pointsEarned || 10),
          challenge_id: loc.challenge_id || '45450000-2025-4026-8000-000000000045',
          title: loc.title,
          author: loc.author,
          approval_status: 'approved',
        }));

        // Deduplicate merged rawSubs strictly by canonical (user_id + normalized title)
        const combinedRaw = [...localMapped, ...rawSubs];
        const seenAuditKeys = new Set<string>();
        rawSubs = combinedRaw.filter((s) => {
          const titleKey = (s.title || '').trim().toLowerCase();
          const authorKey = (s.author || '').trim().toLowerCase();
          const canonical = `${s.user_id}:::${titleKey}:::${authorKey}`;
          if (seenAuditKeys.has(canonical)) return false;
          seenAuditKeys.add(canonical);
          return true;
        });

        // Get profiles to map house, class, year group, full name, and email
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, house, class_name, year_group, role')
          .eq('role', 'student');

        const profMap = new Map((profs || []).map((p) => [p.user_id, p]));
        if (profile && profile.role === 'student' && (user?.id || profile.user_id)) {
          profMap.set(user?.id || profile.user_id, profile);
        }
        setAllRawSubs(rawSubs);
        setAllStudentProfiles(profs || []);

        const subsList = rawSubs;

        const uniqueReaders = new Set<string>();

        // Houses: Kenya, Kilimanjaro, Longonot, Elgon
        const houseMap: Record<string, { books: number; readers: Set<string>; points: number }> = {
          Kenya: { books: 0, readers: new Set(), points: 0 },
          Kilimanjaro: { books: 0, readers: new Set(), points: 0 },
          Longonot: { books: 0, readers: new Set(), points: 0 },
          Elgon: { books: 0, readers: new Set(), points: 0 },
        };

        const classMap: Record<string, { books: number; readers: Set<string>; points: number }> = {};
        const yearMap: Record<string, { books: number; readers: Set<string>; points: number }> = {};

        subsList.forEach((s) => {
          uniqueReaders.add(s.user_id);
          const p = profMap.get(s.user_id);
          const house = p?.house;
          const cls = p?.class_name;
          const year = p?.year_group;
          const pts = s.points_earned || 10;

          if (house && houseMap[house]) {
            houseMap[house].books += 1;
            houseMap[house].points += pts;
            houseMap[house].readers.add(s.user_id);
          }

          if (cls) {
            const classKey = year ? `${year} ${cls}` : cls;
            if (!classMap[classKey]) classMap[classKey] = { books: 0, readers: new Set(), points: 0 };
            classMap[classKey].books += 1;
            classMap[classKey].points += pts;
            classMap[classKey].readers.add(s.user_id);
          }

          if (year) {
            if (!yearMap[year]) yearMap[year] = { books: 0, readers: new Set(), points: 0 };
            yearMap[year].books += 1;
            yearMap[year].points += pts;
            yearMap[year].readers.add(s.user_id);
          }
        });

        setTotalEnrolledStudents(profs?.length || (uniqueReaders.size > 0 ? uniqueReaders.size : 0));
        setTotalSchoolBooks(rawSubs.length);
        setTotalSchoolReaders(uniqueReaders.size);

        // Sort and populate
        const houseArray: CohortStat[] = Object.entries(houseMap).map(([house, d]) => ({
          name: house,
          books: d.books,
          readers: d.readers.size,
          points: d.points,
        })).sort((a, b) => b.points - a.points);

        setHouseStats(houseArray);

        setLeaderboard(houseArray.map((h) => ({
          house: h.name,
          total_books: h.books,
          total_readers: h.readers,
          total_points: h.points,
        })));

        const classArray: CohortStat[] = Object.entries(classMap).map(([cls, d]) => ({
          name: cls,
          books: d.books,
          readers: d.readers.size,
          points: d.points,
        })).sort((a, b) => b.books - a.books);
        setClassStats(classArray);

        const yearArray: CohortStat[] = Object.entries(yearMap).map(([year, d]) => ({
          name: year,
          books: d.books,
          readers: d.readers.size,
          points: d.points,
        })).sort((a, b) => b.books - a.books);
        setYearStats(yearArray);

      } catch (err) {
        console.warn('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Supabase Realtime subscription to keep submissions, profiles, challenges & dashboard stats updated live
    const realtimeChannel = supabase
      .channel('realtime-dashboard-submissions-stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'book_submissions' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_submissions' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_submissions' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_progress' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sheet_sync_logs' }, () => {
        fetchData();
      })
      .subscribe();

    if (user?.id) {
      setWelcomeLetters(getWelcomeEmails(user.id));
    }

    const handleEmailUpdate = () => {
      if (user?.id) setWelcomeLetters(getWelcomeEmails(user.id));
    };
    window.addEventListener('mfa-welcome-email-received', handleEmailUpdate);
    window.addEventListener('mfa-welcome-email-updated', handleEmailUpdate);

    const onLiveUpdate = () => fetchData();
    window.addEventListener('mfa_submission_created', onLiveUpdate);
    window.addEventListener('mfa_submission_updated', onLiveUpdate);
    window.addEventListener('mfa_google_sync_completed', onLiveUpdate);
    window.addEventListener('mfa_challenge_deleted', onLiveUpdate);
    window.addEventListener('mfa-challenge-changed', onLiveUpdate);
    window.addEventListener('storage', onLiveUpdate);

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      supabase.removeChannel(realtimeChannel);
      window.removeEventListener('mfa-welcome-email-received', handleEmailUpdate);
      window.removeEventListener('mfa-welcome-email-updated', handleEmailUpdate);
      window.removeEventListener('mfa_submission_created', onLiveUpdate);
      window.removeEventListener('mfa_submission_updated', onLiveUpdate);
      window.removeEventListener('mfa_google_sync_completed', onLiveUpdate);
      window.removeEventListener('mfa_challenge_deleted', onLiveUpdate);
      window.removeEventListener('mfa-challenge-changed', onLiveUpdate);
      window.removeEventListener('storage', onLiveUpdate);
    };
  }, [profile, user, user?.id, selectedChallengeId, targetBooks, isStaff, selectedChallenge?.max_books_per_category, selectedChallenge?.target_books]);

  // Cohort options dynamically extracted from students
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    (allStudentProfiles || []).forEach((p) => {
      const norm = normalizeYearGroup(p?.year_group);
      if (norm) set.add(norm);
    });
    YEAR_GROUPS.forEach((y) => set.add(y));
    return Array.from(set).sort();
  }, [allStudentProfiles]);

  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    (allStudentProfiles || []).forEach((p) => {
      if (p?.class_name) set.add(p.class_name);
    });
    return Array.from(set).sort();
  }, [allStudentProfiles]);

  const availableHouses = ['Kenya', 'Kilimanjaro', 'Longonot', 'Elgon'];

  // Dynamically compute staff cohort statistics based on selected year, house, and class
  const cohortData = useMemo(() => {
    const safeProfiles = allStudentProfiles || [];
    const safeSubs = allRawSubs || [];
    const profMap = new Map(safeProfiles.map((p) => [p.user_id, p]));
    const isFiltered = staffYearFilter !== 'all' || staffHouseFilter !== 'all' || staffClassFilter !== 'all';

    const filteredStudents = safeProfiles.filter((p) => {
      if (!p) return false;
      if (staffYearFilter !== 'all' && p.year_group !== staffYearFilter) return false;
      if (staffHouseFilter !== 'all' && p.house !== staffHouseFilter) return false;
      if (staffClassFilter !== 'all' && p.class_name !== staffClassFilter) return false;
      return true;
    });

    const allowedUserIds = new Set(filteredStudents.map((p) => p.user_id));

    const cohortSubs = isFiltered
      ? safeSubs.filter((s) => s && s.user_id && allowedUserIds.has(s.user_id))
      : safeSubs;

    const uniqueReaders = new Set<string>();
    let totalPoints = 0;
    const studentStatsMap = new Map<string, { books: number; points: number }>();

    const houseMap: Record<string, { books: number; readers: Set<string>; points: number }> = {
      Kenya: { books: 0, readers: new Set(), points: 0 },
      Kilimanjaro: { books: 0, readers: new Set(), points: 0 },
      Longonot: { books: 0, readers: new Set(), points: 0 },
      Elgon: { books: 0, readers: new Set(), points: 0 },
    };

    const classMap: Record<string, { books: number; readers: Set<string>; points: number }> = {};
    const yearMap: Record<string, { books: number; readers: Set<string>; points: number }> = {};

    cohortSubs.forEach((s) => {
      uniqueReaders.add(s.user_id);
      const pts = s.points_earned || 10;
      totalPoints += pts;

      const p = profMap.get(s.user_id);
      const house = p?.house;
      const cls = p?.class_name;
      const year = p?.year_group;

      if (house && houseMap[house]) {
        houseMap[house].books += 1;
        houseMap[house].points += pts;
        houseMap[house].readers.add(s.user_id);
      }

      if (cls) {
        const classKey = year ? `${year} ${cls}` : cls;
        if (!classMap[classKey]) classMap[classKey] = { books: 0, readers: new Set(), points: 0 };
        classMap[classKey].books += 1;
        classMap[classKey].points += pts;
        classMap[classKey].readers.add(s.user_id);
      }

      if (year) {
        if (!yearMap[year]) yearMap[year] = { books: 0, readers: new Set(), points: 0 };
        yearMap[year].books += 1;
        yearMap[year].points += pts;
        yearMap[year].readers.add(s.user_id);
      }

      const cur = studentStatsMap.get(s.user_id) || { books: 0, points: 0 };
      cur.books += 1;
      cur.points += pts;
      studentStatsMap.set(s.user_id, cur);
    });

    const houseArray: CohortStat[] = Object.entries(houseMap).map(([house, d]) => ({
      name: house,
      books: d.books,
      readers: d.readers.size,
      points: d.points,
    })).sort((a, b) => b.points - a.points);

    const classArray: CohortStat[] = Object.entries(classMap).map(([cls, d]) => ({
      name: cls,
      books: d.books,
      readers: d.readers.size,
      points: d.points,
    })).sort((a, b) => b.books - a.books);

    const yearArray: CohortStat[] = Object.entries(yearMap).map(([year, d]) => ({
      name: year,
      books: d.books,
      readers: d.readers.size,
      points: d.points,
    })).sort((a, b) => b.books - a.books);

    const targetList = (isFiltered ? filteredStudents : safeProfiles).filter(Boolean);
    const roster = targetList.map((p) => {
      const stats = studentStatsMap.get(p.user_id) || { books: 0, points: 0 };
      return {
        user_id: p.user_id,
        full_name: p.full_name || 'Student Reader',
        email: p.email || '',
        house: p.house || 'Unassigned',
        year_group: p.year_group || 'Unassigned',
        class_name: p.class_name || 'Unassigned',
        books: stats.books,
        points: stats.points,
      };
    }).sort((a, b) => b.points - a.points || b.books - a.books);

    return {
      isFiltered,
      totalEnrolled: isFiltered ? filteredStudents.length : safeProfiles.length,
      totalBooks: cohortSubs.length,
      activeReaders: uniqueReaders.size,
      totalPoints,
      houses: houseArray,
      classes: classArray,
      years: yearArray,
      roster,
    };
  }, [allRawSubs, allStudentProfiles, staffYearFilter, staffHouseFilter, staffClassFilter]);

  const filteredCohortRoster = useMemo(() => {
    const list = cohortData?.roster || [];
    if (!rosterSearch.trim()) return list;
    const q = rosterSearch.toLowerCase().trim();
    return list.filter(
      (s) =>
        (s.full_name || '').toLowerCase().includes(q) ||
        (s.house || '').toLowerCase().includes(q) ||
        (s.year_group || '').toLowerCase().includes(q) ||
        (s.class_name || '').toLowerCase().includes(q)
    );
  }, [cohortData?.roster, rosterSearch]);

  const handleExportCohortCsv = (exportOnlySelected = false) => {
    const useSelected = exportOnlySelected || (dashboardSelectedUserIds.size > 0);
    const sourceList = useSelected
      ? filteredCohortRoster.filter((s) => dashboardSelectedUserIds.has(s.user_id))
      : filteredCohortRoster;

    if (sourceList.length === 0) {
      toast.error('No student records available to export.');
      return;
    }

    const headers = [
      'Rank',
      'Student ID',
      'Full Name',
      'Email Address',
      'House Affiliation',
      'Academic Year Group',
      'Homeroom Class',
      'Verified Books Read',
      'Target Books (45)',
      'Total Reading Points',
      'Official Award Tier',
      'Challenge Progress (%)',
      'Audit Status',
      'Verification Serial Code',
      'Academic Year',
      'Report Export Date'
    ];

    const todayDate = new Date().toISOString().slice(0, 10);
    const rows = sourceList.map((s, idx) => {
      const level = computeStudentLevel(s.books);
      const progressPercent = Math.min(100, Math.round((s.books / 45) * 100));
      const verificationCode = `MFA-RC-2026-${(s.user_id || '').slice(-5).toUpperCase() || Math.floor(10000 + Math.random() * 90000)}`;
      const status = s.books >= 45 ? 'Challenge Completed' : s.books >= 15 ? 'Award Qualified' : s.books > 0 ? 'Active Reader' : 'Pending First Book';
      const studentEmail = s.email || `${s.full_name.toLowerCase().replace(/\s+/g, '.')}@mpesafoundationacademy.ac.ke`;

      return [
        idx + 1,
        `"${(s.user_id || '').replace(/"/g, '""')}"`,
        `"${s.full_name.replace(/"/g, '""')}"`,
        `"${studentEmail.replace(/"/g, '""')}"`,
        `"${(s.house || 'Longonot').replace(/"/g, '""')}"`,
        `"${(s.year_group || '').replace(/"/g, '""')}"`,
        `"${(s.class_name || '').replace(/"/g, '""')}"`,
        s.books,
        45,
        s.points,
        `"${level}"`,
        `"${progressPercent}%"`,
        `"${status}"`,
        `"${verificationCode}"`,
        `"2025/2026"`,
        `"${todayDate}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const filterTag = useSelected
      ? `${dashboardSelectedUserIds.size}_Selected_Scholars`
      : staffYearFilter !== 'all'
      ? staffYearFilter
      : staffHouseFilter !== 'all'
      ? staffHouseFilter
      : staffClassFilter !== 'all'
      ? staffClassFilter
      : 'All_Cohort';
    const fileName = `MFA_Reading_Report_${filterTag.replace(/\s+/g, '_')}_${todayDate}.csv`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Downloaded school report for ${sourceList.length} scholars (${fileName})`, {
      description: 'Official student progress data exported to CSV successfully.'
    });
  };

  // Admin Dashboard Roster Bulk Selection & Certificate Dispatch Helpers
  const toggleSelectOneDashboard = (userId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDashboardSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const isAllVisibleRosterSelected =
    filteredCohortRoster.length > 0 &&
    filteredCohortRoster.every((s) => dashboardSelectedUserIds.has(s.user_id));

  const isSomeVisibleRosterSelected =
    filteredCohortRoster.some((s) => dashboardSelectedUserIds.has(s.user_id)) && !isAllVisibleRosterSelected;

  const toggleSelectAllVisibleDashboard = () => {
    if (isAllVisibleRosterSelected) {
      setDashboardSelectedUserIds((prev) => {
        const next = new Set(prev);
        filteredCohortRoster.forEach((s) => next.delete(s.user_id));
        return next;
      });
    } else {
      setDashboardSelectedUserIds((prev) => {
        const next = new Set(prev);
        filteredCohortRoster.forEach((s) => next.add(s.user_id));
        return next;
      });
    }
  };

  const selectRosterByClass = (className: string) => {
    if (!className || className === 'all') {
      setStaffClassFilter('all');
      return;
    }
    setStaffClassFilter(className);
    const match = (cohortData.roster || []).filter((s) => s.class_name === className);
    setDashboardSelectedUserIds((prev) => {
      const next = new Set(prev);
      match.forEach((m) => next.add(m.user_id));
      return next;
    });
    toast.success(`Filtered and selected ${match.length} scholars in Class ${className}`);
  };

  const selectRosterByYear = (yearGroup: string) => {
    if (!yearGroup || yearGroup === 'all') {
      setStaffYearFilter('all');
      return;
    }
    setStaffYearFilter(yearGroup);
    const match = (cohortData.roster || []).filter((s) => s.year_group === yearGroup);
    setDashboardSelectedUserIds((prev) => {
      const next = new Set(prev);
      match.forEach((m) => next.add(m.user_id));
      return next;
    });
    toast.success(`Filtered and selected ${match.length} scholars in Year Group ${yearGroup}`);
  };

  const clearDashboardRosterSelection = () => {
    setDashboardSelectedUserIds(new Set());
  };

  const handleSendCertificatesForSelectedDashboard = () => {
    const selectedStudents = (cohortData.roster || []).filter((s) =>
      dashboardSelectedUserIds.has(s.user_id)
    );

    if (selectedStudents.length === 0) {
      toast.error('Please check at least one student from the list first.');
      return;
    }

    const targets: CertificateDispatchTarget[] = selectedStudents.map((s) => ({
      userId: s.user_id,
      name: s.full_name,
      email: s.email || `${s.full_name.toLowerCase().replace(/\s+/g, '.')}@mpesafoundationacademy.ac.ke`,
      house: s.house,
      yearGroup: s.year_group,
      className: s.class_name,
      booksCount: s.books,
      level: computeStudentLevel(s.books),
      verificationCode: `MFA-CERT-${s.house ? s.house.substring(0, 3).toUpperCase() : 'MFA'}-${Math.floor(1000 + Math.random() * 9000)}`,
    }));

    setCertBatchTargets(targets);
    setSelectedCertTarget(null);
    setCertDispatchOpen(true);
  };

  const handleResetToMyCohort = () => {
    if (profile?.role === 'head_of_year' && profile.year_group) {
      setStaffYearFilter(profile.year_group);
      setStaffHouseFilter('all');
      setStaffClassFilter('all');
    } else if (profile?.role === 'homeroom_tutor') {
      if (profile.year_group) setStaffYearFilter(profile.year_group);
      if (profile.class_name) setStaffClassFilter(profile.class_name);
      setStaffHouseFilter('all');
    } else if (profile?.role === 'house_patron' && profile.house) {
      setStaffHouseFilter(profile.house);
      setStaffYearFilter('all');
      setStaffClassFilter('all');
    } else {
      setStaffYearFilter('all');
      setStaffHouseFilter('all');
      setStaffClassFilter('all');
    }
  };

  const filterSummaryText = useMemo(() => {
    const parts: string[] = [];
    if (staffYearFilter !== 'all') parts.push(`Year: ${staffYearFilter}`);
    if (staffHouseFilter !== 'all') parts.push(`House: ${staffHouseFilter}`);
    if (staffClassFilter !== 'all') parts.push(`Class: ${staffClassFilter}`);
    return parts.length > 0 ? parts.join(' • ') : 'Whole Academy (All Cohorts)';
  }, [staffYearFilter, staffHouseFilter, staffClassFilter]);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{
          profile?.role === 'head_of_year' ? `${profile.year_group || 'Academic Year'} Head of Year Dashboard — MFA 45-Book Quest` :
          profile?.role === 'homeroom_tutor' ? `${profile.year_group || ''} ${profile.class_name || ''} Tutor Dashboard — MFA 45-Book Quest` :
          profile?.role === 'house_patron' ? `${profile.house || 'House'} House Patron Dashboard — MFA 45-Book Quest` :
          profile?.role === 'librarian' || profile?.role === 'admin' ? `Librarian & Admin Dashboard — MFA 45-Book Quest` :
          isStaff ? `Staff Leadership Dashboard — MFA 45-Book Quest` :
          isCreator ? `Tonny Odundo (Student & Creator) — MFA 45-Book Quest` :
          `Student Reading Dashboard — MFA 45-Book Quest`
        }</title>
        <meta name="description" content="Mpesa Foundation Academy 45-Book Reading Challenge progress, house leaderboard, and reading statistics." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <main className="w-full px-2 sm:px-4 md:px-5 py-4 space-y-6 max-w-none">
        {/* High-Contrast Locked Challenge Banner on Dashboard when locked */}
        {selectedChallenge && selectedChallenge.status === "locked" && (
          <div className="mb-4">
            <LockedChallengeNotice challenge={selectedChallenge} />
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAFF DASHBOARD VIEW: Leadership Hero, School Stats, Cohorts, and Rosters */}
        {/* ========================================================================= */}
        {isStaff ? (
          <div className="space-y-6">
            {/* Live Session Countdown & Deadline Window (Visible to Staff) */}
            <SessionCountdownBanner isLibrarian={isLibrarian} />

            {/* Floating Well-Rounded Rotating-Gradient Staff Hero Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
              {/* DIV 1 (6 Cols): Role Identity & Dashboard Title */}
              <div
                className={cn(
                  "rounded-3xl border p-6 shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between gap-4 rotating-gradient-card",
                  isLibrarian ? "xl:col-span-6" : "xl:col-span-7"
                )}
                style={{
                  borderColor: "hsl(var(--v-electric-blue) / 0.34)",
                  backgroundImage:
                    "linear-gradient(var(--grad-angle, 135deg), hsl(var(--v-electric-blue) / 0.18) 0%, hsl(var(--card)) 48%, hsl(var(--v-emerald) / 0.16) 100%)",
                }}
              >
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary/15 text-primary border border-primary/25 mb-2.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{roleBadgeText}</span>
                  </div>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                    {roleDashboardTitle}
                  </h1>
                  <p className="text-muted-foreground text-xs sm:text-sm mt-1.5 leading-relaxed">
                    {roleDashboardSubtitle}
                  </p>
                </div>
              </div>

              {/* DIV 2 (3 Cols, Librarians): Live Submission Window Toggle Tile */}
              {isLibrarian && (
                <div
                  className="xl:col-span-3 rounded-3xl border p-5 shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between gap-3 rotating-gradient-card"
                  style={{
                    borderColor: "hsl(var(--v-yellow) / 0.38)",
                    backgroundImage:
                      "linear-gradient(var(--grad-angle, 135deg), hsl(var(--v-yellow) / 0.18) 0%, hsl(var(--card)) 52%, hsl(var(--v-orange) / 0.16) 100%)",
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      Challenge State
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-background/80 border border-border/70 text-foreground capitalize">
                      {selectedChallenge?.status || "open"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const id = selectedChallenge?.id || "45-books";
                        setChallengeStatus(id, "open");
                      }}
                      className={cn(
                        "h-9 text-xs font-bold rounded-2xl px-2 border",
                        selectedChallenge?.status === "open"
                          ? "bg-emerald-500 text-white border-emerald-400 shadow-sm"
                          : "bg-background/70 text-foreground/80 border-border/60 hover:bg-emerald-500/15"
                      )}
                    >
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const id = selectedChallenge?.id || "45-books";
                        setChallengeStatus(id, "locked");
                      }}
                      className={cn(
                        "h-9 text-xs font-bold rounded-2xl px-2 border",
                        selectedChallenge?.status === "locked"
                          ? "bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-extrabold"
                          : "bg-background/70 text-foreground/80 border-border/60 hover:bg-amber-500/15"
                      )}
                    >
                      Lock
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const id = selectedChallenge?.id || "45-books";
                        setChallengeStatus(id, "closed");
                      }}
                      className={cn(
                        "h-9 text-xs font-bold rounded-2xl px-2 border",
                        selectedChallenge?.status === "closed"
                          ? "bg-rose-500 text-white border-rose-400 shadow-sm"
                          : "bg-background/70 text-foreground/80 border-border/60 hover:bg-rose-500/15"
                      )}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}

              {/* DIV 3 (3 Cols Librarian / 5 Cols Staff): Quick Actions & Dispatches Tile */}
              <div
                className={cn(
                  "rounded-3xl border p-5 shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between gap-3 rotating-gradient-card",
                  isLibrarian ? "xl:col-span-3" : "xl:col-span-5"
                )}
                style={{
                  borderColor: "hsl(var(--v-violet) / 0.34)",
                  backgroundImage:
                    "linear-gradient(var(--grad-angle, 135deg), hsl(var(--v-violet) / 0.16) 0%, hsl(var(--card)) 52%, hsl(var(--v-hot-pink) / 0.14) 100%)",
                }}
              >
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                  Quick Dispatches &amp; Tools
                </div>
                <div className="flex flex-wrap gap-2">
                  {isLibrarian && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => navigate("/admin?s=submissions")}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1.5 rounded-2xl text-xs h-9 px-3.5 shadow-sm whitespace-nowrap shrink-0"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                      <span>Command Center</span>
                    </Button>
                  )}

                  {isLibrarian ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setCertStudentPickerOpen(true)}
                      className="bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:opacity-95 text-slate-950 border-0 shadow-sm font-bold gap-1.5 rounded-2xl text-xs h-9 px-3.5 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Award className="w-3.5 h-3.5 text-slate-950" />
                      <span>Certificates</span>
                    </Button>
                  ) : (
                    <StaffCohortBroadcastDialog
                      staffRole={profile?.role}
                      yearGroup={profile?.year_group}
                      className={profile?.class_name}
                      house={profile?.house}
                      triggerButton={
                        <Button
                          type="button"
                          size="sm"
                          className="bg-gradient-to-r from-emerald-500 to-cyan-600 hover:opacity-95 text-white border-0 shadow-sm font-bold gap-1.5 rounded-2xl text-xs h-9 px-3.5 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Cohort Email</span>
                        </Button>
                      }
                    />
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate("/inbox")}
                    className="bg-background/80 hover:bg-muted text-foreground border-border/80 shadow-xs gap-1.5 rounded-2xl text-xs h-9 px-3.5 font-semibold whitespace-nowrap shrink-0"
                  >
                    <Mail className="w-3.5 h-3.5 text-amber-500" />
                    <span>Inbox</span>
                    <span className="px-1.5 py-0.5 rounded-lg bg-primary/15 text-primary text-[10px] font-bold tabular-nums">
                      {unreadEmailCount || 0}
                    </span>
                  </Button>

                  <AppDownloadButton
                    className="bg-background/80 hover:bg-muted text-foreground border-border/80 shadow-xs rounded-2xl text-xs h-9 px-3.5 font-semibold whitespace-nowrap shrink-0"
                    label="App"
                  />
                </div>
              </div>
            </div>

            {/* ACADEMY OVERVIEW STATISTICS CARDS: Total Students, Total Books, Active Challenges */}
            <div>
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Academy Reading Overview Statistics
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Live Updates
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                {/* Card 1: Total Students */}
                <div
                  className="rounded-3xl border p-6 shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between sm:min-h-[175px] relative overflow-hidden group rotating-gradient-card"
                  style={{
                    borderColor: "hsl(var(--v-emerald) / 0.36)",
                    backgroundImage:
                      "linear-gradient(var(--grad-angle, 135deg), hsl(var(--v-emerald) / 0.18) 0%, hsl(var(--card)) 52%, hsl(var(--v-mint) / 0.14) 100%)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold shadow-xs">
                      <Users className="w-6 h-6" />
                    </div>
                    <Badge variant="outline" className="text-[11px] font-semibold border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10">
                      Academy Roster
                    </Badge>
                  </div>
                  <div className="my-auto pt-2">
                    <div className="text-4xl sm:text-5xl font-display font-extrabold text-foreground tracking-tight tabular-nums">
                      {totalEnrolledStudents || totalSchoolReaders || 0}
                    </div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1 font-bold">
                      Total Students
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground pt-3 border-t border-border/50 flex items-center justify-between">
                    <span>Active Readers</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{totalSchoolReaders} logging</span>
                  </div>
                </div>

                {/* Card 2: Total Books */}
                <div
                  className="rounded-3xl border p-6 shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between sm:min-h-[175px] relative overflow-hidden group rotating-gradient-card"
                  style={{
                    borderColor: "hsl(var(--v-electric-blue) / 0.36)",
                    backgroundImage:
                      "linear-gradient(var(--grad-angle, 135deg), hsl(var(--v-electric-blue) / 0.18) 0%, hsl(var(--card)) 52%, hsl(var(--v-cyan) / 0.14) 100%)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <Badge variant="outline" className="text-[11px] font-semibold border-primary/40 text-primary bg-primary/10">
                      Verified Books
                    </Badge>
                  </div>
                  <div className="my-auto pt-2">
                    <div className="text-4xl sm:text-5xl font-display font-extrabold text-foreground tracking-tight tabular-nums">
                      {totalSchoolBooks}
                    </div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1 font-bold">
                      Total Books Read
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground pt-3 border-t border-border/50 flex items-center justify-between">
                    <span>Whole Academy</span>
                    <span className="font-semibold text-primary">All Challenges</span>
                  </div>
                </div>

                {/* Card 3: Active Challenges */}
                <Link
                  to="/challenges"
                  className="rounded-3xl border p-6 shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between sm:min-h-[175px] relative overflow-hidden group cursor-pointer block rotating-gradient-card"
                  style={{
                    borderColor: "hsl(var(--v-yellow) / 0.40)",
                    backgroundImage:
                      "linear-gradient(var(--grad-angle, 135deg), hsl(var(--v-yellow) / 0.20) 0%, hsl(var(--card)) 52%, hsl(var(--v-orange) / 0.14) 100%)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <Badge variant="outline" className="text-[11px] font-semibold border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 flex items-center gap-1">
                      Active Now <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Badge>
                  </div>
                  <div className="my-auto pt-2">
                    <div className="text-4xl sm:text-5xl font-display font-extrabold text-foreground tracking-tight tabular-nums">
                      {(activeChallenges?.length) || (challenges?.filter((c) => c?.is_active && c?.status !== "closed")?.length) || 1}
                    </div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1 font-bold">
                      Active Challenges
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground pt-3 border-t border-border/50 flex items-center justify-between">
                    <span>Workspaces</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">View Challenges &rarr;</span>
                  </div>
                </Link>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* LIBRARIAN & ADMIN COMMAND HUB — Color-coded ordered workspace sections     */}
            {/* ========================================================================= */}
            {isLibrarian && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white flex items-center justify-center shadow-sm">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-display font-bold text-foreground tracking-tight">
                        45-Book Reading Challenge 2025/2026 • Librarian Workspace
                      </h2>
                      <p className="text-[11px] text-muted-foreground">
                        45 Books Quest — Quick-launch every librarian &amp; admin module arranged in operational order.
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[11px] font-mono border-emerald-500/40 bg-emerald-500/10 text-emerald-500 self-start sm:self-auto">
                    7 Modules • Unified Librarian &amp; Admin
                  </Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* 01 • Reading Portal */}
                  <div className="rounded-3xl border-2 border-emerald-500/35 bg-gradient-to-br from-emerald-500/12 via-teal-500/5 to-card p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-emerald-500/20">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded-xl text-[11px] font-mono font-black bg-emerald-500 text-white shadow-xs">
                          01
                        </span>
                        <div>
                          <h3 className="font-display font-bold text-base text-foreground">Reading Portal</h3>
                          <p className="text-[11px] text-muted-foreground">Core academy pages, leaderboards, inbox &amp; settings</p>
                        </div>
                      </div>
                      <Home className="w-5 h-5 text-emerald-500 shrink-0" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {[
                        { label: 'Dashboard', desc: 'Overview & KPIs', to: '/dashboard', icon: Home, badgeBg: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' },
                        { label: 'Challenges', desc: '45 Books Quest', to: '/challenges', icon: Trophy, badgeBg: 'bg-amber-500/20 text-amber-500 border-amber-500/30' },
                        { label: 'Full Leaderboard', desc: 'School Rankings', to: '/leaderboard', icon: BarChart3, badgeBg: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' },
                        { label: 'Inbox', desc: unreadEmailCount > 0 ? `${unreadEmailCount} Unread` : 'Mail & Replies', to: '/inbox', icon: Inbox, badgeBg: 'bg-orange-500/20 text-orange-500 border-orange-500/30' },
                        { label: 'Certificates', desc: 'Certificate Studio', to: '/admin?s=certificates', icon: BadgeCheck, badgeBg: 'bg-cyan-500/20 text-cyan-500 border-cyan-500/30' },
                        { label: 'Settings', desc: 'Account & Theme', to: '/settings', icon: Settings, badgeBg: 'bg-teal-500/20 text-teal-500 border-teal-500/30' },
                      ].map((item) => (
                        <Link
                          key={item.label}
                          to={item.to}
                          className="group rounded-2xl border border-emerald-500/20 bg-background/75 hover:bg-background hover:border-emerald-500/50 p-3 transition-all hover:-translate-y-0.5 shadow-2xs flex flex-col justify-between gap-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className={cn('w-8 h-8 rounded-xl border flex items-center justify-center', item.badgeBg)}>
                              <item.icon className="w-4 h-4" />
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-foreground leading-tight">{item.label}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{item.desc}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* 02 • Submissions & Reviews */}
                  <div className="rounded-3xl border-2 border-blue-500/35 bg-gradient-to-br from-blue-500/12 via-cyan-500/5 to-card p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-blue-500/20">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded-xl text-[11px] font-mono font-black bg-blue-500 text-white shadow-xs">
                          02
                        </span>
                        <div>
                          <h3 className="font-display font-bold text-base text-foreground">Submissions &amp; Reviews</h3>
                          <p className="text-[11px] text-muted-foreground">Audit logs, inspect flagged reflections &amp; import records</p>
                        </div>
                      </div>
                      <ListChecks className="w-5 h-5 text-blue-500 shrink-0" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {[
                        { label: 'All Submissions', desc: 'Approve, review & export', to: '/admin?s=submissions', icon: ListChecks, badgeBg: 'bg-blue-500/20 text-blue-500 border-blue-500/30' },
                        { label: 'Flagged', desc: 'Policy & AI check queue', to: '/admin?s=flagged', icon: Flag, badgeBg: 'bg-red-500/20 text-red-500 border-red-500/30' },
                        { label: 'Bulk Import', desc: 'Upload CSV / spreadsheets', to: '/admin?s=import', icon: FolderUp, badgeBg: 'bg-cyan-500/20 text-cyan-500 border-cyan-500/30' },
                      ].map((item) => (
                        <Link
                          key={item.label}
                          to={item.to}
                          className="group rounded-2xl border border-blue-500/20 bg-background/75 hover:bg-background hover:border-blue-500/50 p-3.5 transition-all hover:-translate-y-0.5 shadow-2xs flex flex-col justify-between gap-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className={cn('w-9 h-9 rounded-xl border flex items-center justify-center', item.badgeBg)}>
                              <item.icon className="w-4 h-4" />
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-foreground">{item.label}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* 03 • Programme & Controls */}
                  <div className="rounded-3xl border-2 border-amber-500/35 bg-gradient-to-br from-amber-500/12 via-yellow-500/5 to-card p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-amber-500/20">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded-xl text-[11px] font-mono font-black bg-amber-500 text-black shadow-xs">
                          03
                        </span>
                        <div>
                          <h3 className="font-display font-bold text-base text-foreground">Programme &amp; Controls</h3>
                          <p className="text-[11px] text-muted-foreground">Session toggles, challenges, categories &amp; Certificate Studio</p>
                        </div>
                      </div>
                      <Sliders className="w-5 h-5 text-amber-500 shrink-0" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {[
                        { label: 'Session & Theme Controls', desc: 'Dates, lock & themes', to: '/admin?s=controls', icon: Sliders, badgeBg: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' },
                        { label: 'Active Challenges', desc: 'Manage live quests', to: '/admin?s=challenges', icon: Trophy, badgeBg: 'bg-amber-500/20 text-amber-500 border-amber-500/30' },
                        { label: 'Enrolment & Participants', desc: 'Students & staff roster', to: '/admin?s=registrations', icon: Users, badgeBg: 'bg-teal-500/20 text-teal-500 border-teal-500/30' },
                        { label: 'Create Challenge', desc: 'Launch new challenge', to: '/admin?s=create', icon: Plus, badgeBg: 'bg-green-500/20 text-green-500 border-green-500/30' },
                        { label: 'Reading Categories', desc: 'Realms & prompts', to: '/admin?s=categories', icon: Layers, badgeBg: 'bg-fuchsia-500/20 text-fuchsia-500 border-fuchsia-500/30' },
                        { label: 'Certificate Studio', desc: 'Design & generate PDFs', to: '/admin?s=certificates', icon: Award, badgeBg: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' },
                      ].map((item) => (
                        <Link
                          key={item.label}
                          to={item.to}
                          className="group rounded-2xl border border-amber-500/20 bg-background/75 hover:bg-background hover:border-amber-500/50 p-3 transition-all hover:-translate-y-0.5 shadow-2xs flex flex-col justify-between gap-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className={cn('w-8 h-8 rounded-xl border flex items-center justify-center', item.badgeBg)}>
                              <item.icon className="w-4 h-4" />
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-foreground leading-tight">{item.label}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{item.desc}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* 04 • Publishing & Broadcasts */}
                  <div className="rounded-3xl border-2 border-rose-500/35 bg-gradient-to-br from-rose-500/12 via-pink-500/5 to-card p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-rose-500/20">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded-xl text-[11px] font-mono font-black bg-rose-500 text-white shadow-xs">
                          04
                        </span>
                        <div>
                          <h3 className="font-display font-bold text-base text-foreground">Publishing &amp; Broadcasts</h3>
                          <p className="text-[11px] text-muted-foreground">Email blasts, award dispatches, redirects &amp; Homepage Studio</p>
                        </div>
                      </div>
                      <Megaphone className="w-5 h-5 text-rose-500 shrink-0" />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { label: 'Mass Broadcaster', desc: 'Announcements to students & staff', to: '/admin?s=broadcast', icon: Megaphone, badgeBg: 'bg-rose-500/20 text-rose-500 border-rose-500/30' },
                        { label: 'Certificate Dispatch', desc: 'Email verified awards & PDFs', to: '/admin?s=certificate-dispatch', icon: Award, badgeBg: 'bg-amber-500/20 text-amber-500 border-amber-500/30' },
                        { label: 'System Links & Redirects', desc: 'Verification & download URLs', to: '/admin?s=system-links', icon: Link2, badgeBg: 'bg-cyan-500/20 text-cyan-500 border-cyan-500/30' },
                        { label: 'Homepage Studio', desc: 'Customize public homepage', to: '/admin?s=homepage', icon: Home, badgeBg: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' },
                      ].map((item) => (
                        <Link
                          key={item.label}
                          to={item.to}
                          className="group rounded-2xl border border-rose-500/20 bg-background/75 hover:bg-background hover:border-rose-500/50 p-3 transition-all hover:-translate-y-0.5 shadow-2xs flex flex-col justify-between gap-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className={cn('w-8 h-8 rounded-xl border flex items-center justify-center', item.badgeBg)}>
                              <item.icon className="w-4 h-4" />
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-foreground leading-tight">{item.label}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{item.desc}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* 05 • People & Governance */}
                  <div className="rounded-3xl border-2 border-indigo-500/35 bg-gradient-to-br from-indigo-500/12 via-blue-500/5 to-card p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-indigo-500/20">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded-xl text-[11px] font-mono font-black bg-indigo-500 text-white shadow-xs">
                          05
                        </span>
                        <div>
                          <h3 className="font-display font-bold text-base text-foreground">People &amp; Governance</h3>
                          <p className="text-[11px] text-muted-foreground">Manage student profiles, staff roles &amp; access codes</p>
                        </div>
                      </div>
                      <IdCard className="w-5 h-5 text-indigo-500 shrink-0" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {[
                        { label: 'Student Profiles', desc: 'Edit cohorts, houses & resets', to: '/admin?s=students', icon: IdCard, badgeBg: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' },
                        { label: 'Staff Members', desc: 'Tutors, patrons & librarians', to: '/admin?s=members', icon: UserCog, badgeBg: 'bg-indigo-500/20 text-indigo-500 border-indigo-500/30' },
                        { label: 'Access Codes', desc: 'Registration & cohort codes', to: '/admin?s=codes', icon: KeyRound, badgeBg: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' },
                      ].map((item) => (
                        <Link
                          key={item.label}
                          to={item.to}
                          className="group rounded-2xl border border-indigo-500/20 bg-background/75 hover:bg-background hover:border-indigo-500/50 p-3.5 transition-all hover:-translate-y-0.5 shadow-2xs flex flex-col justify-between gap-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className={cn('w-9 h-9 rounded-xl border flex items-center justify-center', item.badgeBg)}>
                              <item.icon className="w-4 h-4" />
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-foreground">{item.label}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* 06 • Data & Leaderboard Audit + System Verification */}
                  <div className="rounded-3xl border-2 border-violet-500/35 bg-gradient-to-br from-violet-500/12 via-purple-500/5 to-card p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-violet-500/20">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded-xl text-[11px] font-mono font-black bg-violet-500 text-white shadow-xs">
                          06
                        </span>
                        <div>
                          <h3 className="font-display font-bold text-base text-foreground">Data Audit &amp; System Verification</h3>
                          <p className="text-[11px] text-muted-foreground">Unclipped school rankings &amp; year-group migration checks</p>
                        </div>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-violet-500 shrink-0" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Link
                        to="/admin?s=leaderboard"
                        className="group rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-background/80 hover:border-amber-500/60 p-4 transition-all hover:-translate-y-0.5 shadow-2xs flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="w-9 h-9 rounded-xl border bg-amber-500/20 text-amber-500 border-amber-500/30 flex items-center justify-center">
                            <Trophy className="w-4 h-4" />
                          </span>
                          <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-500">
                            Data &amp; Audit
                          </Badge>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-foreground flex items-center justify-between">
                            <span>Full Leaderboard Audit</span>
                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-1">
                            Inspect every student, house, and cohort ranking with export tools.
                          </div>
                        </div>
                      </Link>

                      <Link
                        to="/admin/migration-check"
                        className="group rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-background/80 hover:border-violet-500/60 p-4 transition-all hover:-translate-y-0.5 shadow-2xs flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="w-9 h-9 rounded-xl border bg-violet-500/20 text-violet-500 border-violet-500/30 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                          </span>
                          <Badge variant="outline" className="text-[10px] border-violet-500/40 text-violet-500">
                            System Verification
                          </Badge>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-foreground flex items-center justify-between">
                            <span>Migration Check</span>
                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-1">
                            Verify DP2, DP1 &amp; G10 counts, role distribution, and mismatched records.
                          </div>
                        </div>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 1. Dynamic Cohort & Leadership Selection Bar */}
            <Card className="rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm overflow-hidden">
              <CardHeader className="border-b border-border/40 pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                      <SlidersHorizontal className="w-5 h-5 text-primary" />
                      Staff Cohort Focus &amp; Dynamic Dashboard
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Choose any Year Group, House, or Homeroom Class. All reading metrics, house scores, and the student roster below immediately reflect your selection.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {cohortData.isFiltered && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setStaffYearFilter('all');
                          setStaffHouseFilter('all');
                          setStaffClassFilter('all');
                        }}
                        className="text-xs h-8 rounded-full border-border bg-card hover:bg-muted text-muted-foreground gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Show Whole School
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleResetToMyCohort}
                      className="text-xs h-8 rounded-full border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 gap-1"
                    >
                      <ShieldCheck className="w-3 h-3" />
                      Reset to My Assigned Cohort
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Year Group Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-primary" />
                      Academic Year Group
                    </label>
                    <Select value={staffYearFilter} onValueChange={setStaffYearFilter}>
                      <SelectTrigger className="h-9 text-xs font-semibold bg-background">
                        <SelectValue placeholder="All Year Groups" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Whole School (All Year Groups)</SelectItem>
                        {availableYears.map((yr) => (
                          <SelectItem key={yr} value={yr}>
                            {yr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* House Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-amber-500" />
                      Academy House
                    </label>
                    <Select value={staffHouseFilter} onValueChange={setStaffHouseFilter}>
                      <SelectTrigger className="h-9 text-xs font-semibold bg-background">
                        <SelectValue placeholder="All Houses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Houses</SelectItem>
                        {availableHouses.map((house) => {
                          const info = getHouseColor(house);
                          return (
                            <SelectItem key={house} value={house}>
                              {house} ({info.colorName})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Class / Homeroom Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-emerald-600" />
                      Homeroom / Tutorial Class
                    </label>
                    <Select value={staffClassFilter} onValueChange={setStaffClassFilter}>
                      <SelectTrigger className="h-9 text-xs font-semibold bg-background">
                        <SelectValue placeholder="All Classes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        {availableClasses.map((cls) => (
                          <SelectItem key={cls} value={cls}>
                            {cls}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-muted-foreground">Active Focus:</span>
                    <Badge variant="outline" className="text-xs font-mono border-primary/40 bg-primary/10 text-primary">
                      {filterSummaryText}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    Participation Rate:{' '}
                    <strong className="text-foreground">
                      {cohortData.totalEnrolled > 0
                        ? Math.round((cohortData.activeReaders / cohortData.totalEnrolled) * 100)
                        : 0}
                      %
                    </strong>{' '}
                    ({cohortData.activeReaders} of {cohortData.totalEnrolled} active)
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Reading KPI Summary for Selected Cohort */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="rounded-2xl border-2 border-primary/30 bg-primary/5">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <Badge variant="outline" className="text-[10px] font-semibold border-primary/40 text-primary">
                      {cohortData.isFiltered ? 'Selected Cohort' : 'Whole School'}
                    </Badge>
                  </div>
                  <div className="text-3xl font-display font-bold text-foreground">
                    {cohortData.totalBooks}
                  </div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1 font-semibold">
                    Total Books Read {cohortData.isFiltered ? 'in Focus Group' : 'Entire Academy'}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                      <Users className="w-5 h-5" />
                    </div>
                    <Badge variant="outline" className="text-[10px] font-semibold border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                      Active Readers
                    </Badge>
                  </div>
                  <div className="text-3xl font-display font-bold text-foreground">
                    {cohortData.activeReaders}
                  </div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1 font-semibold">
                    Students Actively Logging
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-2 border-amber-500/30 bg-amber-500/5">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-black flex items-center justify-center font-bold">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <Badge variant="outline" className="text-[10px] font-semibold border-amber-500/40 text-amber-600 dark:text-amber-400">
                      Roster Size
                    </Badge>
                  </div>
                  <div className="text-3xl font-display font-bold text-foreground">
                    {cohortData.totalEnrolled}
                  </div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1 font-semibold">
                    Total Enrolled Scholars
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-2 border-blue-500/30 bg-blue-500/5">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                      <Star className="w-5 h-5" />
                    </div>
                    <Badge variant="outline" className="text-[10px] font-semibold border-blue-500/40 text-blue-600 dark:text-blue-400">
                      Points
                    </Badge>
                  </div>
                  <div className="text-3xl font-display font-bold text-foreground">
                    {cohortData.totalPoints}
                  </div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1 font-semibold">
                    Total Points Earned
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 3. Books Read From Each House in Selected Cohort (Pure Color Swatches) */}
            <Card className="rounded-3xl border border-border shadow-sm">
              <CardHeader className="bg-muted/30 border-b border-border py-4 px-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                      <Crown className="w-5 h-5 text-amber-500" />
                      Books Read From Each House {cohortData.isFiltered ? `(${filterSummaryText})` : ''}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Live total books and house points logged by students in each house for this selected group.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs self-start sm:self-auto font-mono">
                    All 4 Academy Houses
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {cohortData.houses.map((h) => {
                    const info = getHouseColor(h.name);
                    const isLongonot = h.name === 'Longonot';
                    return (
                      <div
                        key={h.name}
                        className="p-5 rounded-2xl border-2 transition-transform hover:-translate-y-1 relative overflow-hidden"
                        style={{
                          borderColor: `${info.hex}60`,
                          background: `linear-gradient(135deg, ${info.bgLight}, transparent)`,
                        }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-bold text-base text-foreground">
                            {h.name}
                          </span>
                          <span
                            className={cn(
                              "px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-xs",
                              isLongonot ? "text-neutral-950 font-black" : "text-white"
                            )}
                            style={{ background: info.hex }}
                          >
                            <span className={cn("w-2 h-2 rounded-full", isLongonot ? "bg-black/40" : "bg-white/40")} />
                            {info.colorName}
                          </span>
                        </div>

                        <div className="text-3xl font-display font-bold text-foreground">
                          {h.books}
                          <span className="text-xs font-normal text-muted-foreground ml-1.5">books</span>
                        </div>

                        <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
                          <span>{h.readers} readers</span>
                          <span className="font-semibold" style={{ color: info.hex }}>{h.points} pts</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 4. Books Read From Each Year Group */}
            <Card className="rounded-3xl border border-border shadow-sm">
              <CardHeader className="bg-muted/30 border-b border-border py-4 px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                      <GraduationCap className="w-5 h-5 text-primary" />
                      Books Read From Each Year Group {cohortData.isFiltered ? `(${filterSummaryText})` : ''}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Breakdown of total books and participating readers across academic cohorts.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {cohortData.years.length} Cohorts
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {cohortData.years.map((y) => (
                    <div
                      key={y.name}
                      className="p-4 rounded-2xl border border-border bg-card/60 hover:bg-card transition-colors space-y-1"
                    >
                      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">
                        {y.name}
                      </div>
                      <div className="text-2xl font-display font-bold text-foreground">
                        {y.books} <span className="text-xs font-normal text-muted-foreground">books</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {y.readers} students • {y.points} pts
                      </div>
                    </div>
                  ))}
                  {cohortData.years.length === 0 && (
                    <div className="col-span-full text-center py-6 text-sm text-muted-foreground">
                      No student year group data recorded for this selection.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 5. Books Read From Every Class in Focus Group */}
            <Card className="rounded-3xl border border-border shadow-sm">
              <CardHeader className="bg-muted/30 border-b border-border py-4 px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                      <Building className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      Books Read From Every Class {cohortData.isFiltered ? `(${filterSummaryText})` : ''}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Homeroom and tutorial class reading performance for the selected group.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {cohortData.classes.length} Classes Logged
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {cohortData.classes.map((c) => (
                    <div
                      key={c.name}
                      className="p-3.5 rounded-2xl border border-border bg-card/60 hover:bg-card transition-colors space-y-1 text-center"
                    >
                      <div className="font-bold text-xs text-foreground truncate">
                        {c.name}
                      </div>
                      <div className="text-xl font-display font-bold text-emerald-600 dark:text-emerald-400">
                        {c.books}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {c.readers} readers • {c.points} pts
                      </div>
                    </div>
                  ))}
                  {cohortData.classes.length === 0 && (
                    <div className="col-span-full text-center py-6 text-sm text-muted-foreground">
                      No class submissions logged for this selection.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 6. Selected Cohort Student Roster with Checkbox Column, Persistent Action Bar & Send Certificates */}
            <Card className="rounded-3xl border border-border shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border py-4 px-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                      <Users className="w-5 h-5 text-primary" />
                      Selected Cohort Student Roster ({filteredCohortRoster.length})
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Individual student reading performance reflecting <strong>{filterSummaryText}</strong>.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative min-w-[220px]">
                      <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        placeholder="Search scholar, class, or year..."
                        value={rosterSearch}
                        onChange={(e) => setRosterSearch(e.target.value)}
                        className="h-8 pl-8 pr-7 text-xs bg-background rounded-xl focus-visible:ring-1 focus-visible:ring-primary"
                      />
                      {rosterSearch && (
                        <button
                          type="button"
                          onClick={() => setRosterSearch("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          title="Clear search"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExportCohortCsv(false)}
                      className="h-8 text-xs rounded-xl gap-1.5 font-medium border-border hover:bg-muted shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-500" />
                      Download CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* PERSISTENT ACTION BAR FOR COHORT FILTERING (PLUS CERTIFICATE DISPATCH FOR LIBRARIANS ONLY) */}
              <div className="bg-gradient-to-r from-emerald-500/8 via-blue-500/5 to-muted/40 border-b border-border/80 px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 sticky top-0 z-10 backdrop-blur-md">
                {isLibrarian ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Master Checkbox for All Visible */}
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-foreground select-none">
                      <Checkbox
                        checked={isAllVisibleRosterSelected ? true : isSomeVisibleRosterSelected ? "indeterminate" : false}
                        onCheckedChange={toggleSelectAllVisibleDashboard}
                        aria-label="Select all visible students"
                      />
                      <span>
                        {isAllVisibleRosterSelected ? "Deselect Visible" : `Select Visible (${filteredCohortRoster.length})`}
                      </span>
                    </label>

                    {/* Selection Status Badge */}
                    {dashboardSelectedUserIds.size > 0 ? (
                      <Badge className="bg-amber-500 text-black font-extrabold text-[11px] px-2.5 py-0.5 rounded-lg shadow-xs">
                        {dashboardSelectedUserIds.size} {dashboardSelectedUserIds.size === 1 ? "Scholar" : "Scholars"} Checked
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground hidden lg:inline">
                        (Check scholars to dispatch certificates in bulk)
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="w-4 h-4 text-primary shrink-0" />
                    <span>
                      Read-only scholar oversight ({filteredCohortRoster.length} scholars) • Email your cohort anytime
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Quick Filter by Class */}
                  <div className="flex items-center gap-1">
                    <Select
                      value={staffClassFilter}
                      onValueChange={(val) => selectRosterByClass(val)}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background/90 rounded-xl min-w-[125px] border-border/80 font-semibold">
                        <SelectValue placeholder="Class: All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        {availableClasses.map((cls) => (
                          <SelectItem key={cls} value={cls}>Class {cls}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quick Filter by Year */}
                  <div className="flex items-center gap-1">
                    <Select
                      value={staffYearFilter}
                      onValueChange={(val) => selectRosterByYear(val)}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background/90 rounded-xl min-w-[115px] border-border/80 font-semibold">
                        <SelectValue placeholder="Year: All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {availableYears.map((y) => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Persistent 'Send Certificates' Action Button (Librarian & Admin Only) */}
                  {isLibrarian ? (
                    <Button
                      size="sm"
                      onClick={handleSendCertificatesForSelectedDashboard}
                      disabled={dashboardSelectedUserIds.size === 0}
                      className={cn(
                        "h-8 px-3.5 text-xs font-bold gap-1.5 rounded-xl transition-all shadow-sm",
                        dashboardSelectedUserIds.size > 0
                          ? "bg-amber-500 hover:bg-amber-400 text-black border-0 shadow-amber-500/20"
                          : "bg-muted text-muted-foreground border border-border"
                      )}
                      title={
                        dashboardSelectedUserIds.size > 0
                          ? `Dispatch official certificates to ${dashboardSelectedUserIds.size} checked scholars`
                          : "Check students above to enable bulk certificate dispatch"
                      }
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Send Certificates ({dashboardSelectedUserIds.size})</span>
                    </Button>
                  ) : (
                    <StaffCohortBroadcastDialog
                      staffRole={profile?.role}
                      yearGroup={profile?.year_group}
                      className={profile?.class_name}
                      house={profile?.house}
                      triggerButton={
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 px-3.5 text-xs font-bold gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 hover:opacity-95 text-white border-0 shadow-sm whitespace-nowrap shrink-0"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Email Cohort</span>
                        </Button>
                      }
                    />
                  )}

                  {/* Persistent 'Download CSV' Action Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExportCohortCsv(false)}
                    className="h-8 px-3 text-xs font-semibold gap-1.5 rounded-xl border-border bg-card/90 hover:bg-card text-foreground transition-all shadow-2xs hover:border-emerald-500/50"
                    title={
                      isLibrarian && dashboardSelectedUserIds.size > 0
                        ? `Download official school CSV report for ${dashboardSelectedUserIds.size} checked scholars`
                        : `Download official school CSV report for all ${filteredCohortRoster.length} cohort scholars`
                    }
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                    <span>
                      {isLibrarian && dashboardSelectedUserIds.size > 0
                        ? `Download CSV (${dashboardSelectedUserIds.size})`
                        : `Download CSV (${filteredCohortRoster.length})`}
                    </span>
                  </Button>

                  {isLibrarian && dashboardSelectedUserIds.size > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearDashboardRosterSelection}
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              <CardContent className="p-0">
                <div className="divide-y divide-border/50 max-h-[460px] overflow-y-auto">
                  {filteredCohortRoster.map((s, idx) => {
                    const houseInfo = getHouseColor(s.house);
                    const isLongonot = s.house === 'Longonot';
                    const isSelected = isLibrarian && dashboardSelectedUserIds.has(s.user_id);
                    const lvl = computeStudentLevel(s.books);

                    return (
                      <div
                        key={s.user_id}
                        onClick={isLibrarian ? () => toggleSelectOneDashboard(s.user_id) : undefined}
                        className={cn(
                          "p-3.5 px-6 flex items-center justify-between gap-3 transition-colors",
                          isLibrarian && "cursor-pointer",
                          isSelected
                            ? "bg-amber-500/10 dark:bg-amber-500/15 border-l-4 border-l-amber-500 font-medium"
                            : "hover:bg-muted/30"
                        )}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Bulk Select Checkbox Column (Librarians & Admins only) */}
                          {isLibrarian && (
                            <div onClick={(e) => e.stopPropagation()} className="shrink-0 flex items-center">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelectOneDashboard(s.user_id)}
                                aria-label={`Select ${s.full_name}`}
                                className="cursor-pointer"
                              />
                            </div>
                          )}

                          <div className="w-7 h-7 rounded-lg bg-muted text-xs font-bold text-muted-foreground flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-foreground truncate">
                              {s.full_name}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
                              {s.year_group && <span>{s.year_group}</span>}
                              {s.class_name && <span>• {s.class_name}</span>}
                              {s.house && (
                                <span
                                  className={cn(
                                    "px-2 py-0.2 rounded-full text-[10px] font-bold shadow-xs inline-flex items-center gap-1",
                                    isLongonot ? "text-neutral-950 font-black" : "text-white"
                                  )}
                                  style={{ background: houseInfo.hex }}
                                >
                                  <span className={cn("w-1.5 h-1.5 rounded-full", isLongonot ? "bg-black/50" : "bg-white/50")} />
                                  {s.house}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 text-right" onClick={(e) => e.stopPropagation()}>
                          <div>
                            <div className="text-sm font-bold text-primary">
                              {s.books} <span className="text-[10px] font-normal text-muted-foreground">books</span>
                            </div>
                            <div className="text-xs font-semibold text-amber-500">
                              {s.points} pts
                            </div>
                          </div>
                          {isLibrarian && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedCertTarget({
                                  userId: s.user_id,
                                  name: s.full_name,
                                  email: s.email || `${s.full_name.toLowerCase().replace(/\s+/g, ".")}@mpesafoundationacademy.ac.ke`,
                                  house: s.house,
                                  yearGroup: s.year_group,
                                  className: s.class_name,
                                  booksCount: s.books,
                                  level: lvl,
                                  verificationCode: `MFA-CERT-${s.house ? s.house.substring(0,3).toUpperCase() : 'MFA'}-${Math.floor(1000 + Math.random() * 9000)}`,
                                });
                                setCertBatchTargets([]);
                                setCertDispatchOpen(true);
                              }}
                              className="h-7 px-2 text-[10px] font-bold text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 gap-1 rounded-lg cursor-pointer"
                              title="Dispatch official certificate to student"
                            >
                              <Award className="w-3.5 h-3.5 text-amber-500" />
                              <span className="hidden sm:inline">Dispatch Cert</span>
                            </Button>
                          )}
                          {s.books > 0 ? (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-[10px]">
                              0 books
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {filteredCohortRoster.length === 0 && (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No students found matching "{rosterSearch || filterSummaryText}".
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* ========================================================================= */
          /* STUDENT DASHBOARD VIEW: Personal Progress, Goals & Student Leaderboard   */
          /* ========================================================================= */
          <>
            {/* ========================================================================= */}
            {/* STUDENT DASHBOARD BENTO: Clean divs, balanced layout matching design ref */}
            {/* ========================================================================= */}
            <div className="space-y-6">
              {/* TOP BENTO ROW: Greeting Card with Dashed Metric Divs + Indigo Suggestion Card */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                {/* Left 8 Cols: Greeting & Metric Divs */}
                <div
                  className="xl:col-span-8 rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card/90 to-card/95 p-6 sm:p-7 shadow-xl flex flex-col justify-between space-y-6 relative overflow-hidden backdrop-blur-xl"
                  style={{
                    boxShadow: '0 20px 45px -15px rgba(0, 0, 0, 0.08), 0 0 25px rgba(99, 102, 241, 0.05)',
                  }}
                >
                  {/* Subtle ambient highlight orb */}
                  <div className="absolute -right-16 -top-16 w-52 h-52 rounded-full blur-3xl opacity-20 bg-indigo-500 pointer-events-none" />

                  {/* Top Greeting & Action Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 mb-2">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>{isCreator ? "Student Scholar • Challenge Creator" : `Student Scholar • ${profile?.house || "MFA"} House`}</span>
                      </div>
                      <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                        Good {timeOfDay}, {profile?.full_name?.split(' ')[0] || 'Scholar'}
                      </h1>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        You've logged <strong>{studentBooksRead}</strong> books this term. {targetBooks - studentBooksRead > 0 ? `${targetBooks - studentBooksRead} books remaining for ${selectedChallenge?.title?.split(':')[0] || '45-Book Quest'}.` : 'Goal fully completed!'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/progress')}
                        className="rounded-xl h-9 px-3.5 text-xs font-semibold hover:bg-muted"
                      >
                        Review feedback
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => navigate(selectedChallenge?.id && selectedChallenge.id !== 'all' ? `/submit?challenge=${selectedChallenge.id}` : '/submit')}
                        className="rounded-xl h-9 px-4 text-xs font-bold bg-foreground text-background hover:bg-foreground/90 gap-1.5 shadow-sm"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Log book</span>
                      </Button>
                    </div>
                  </div>

                  {/* Student Milestone Badges Ribbon */}
                  <div className="relative z-10 p-4 rounded-3xl bg-card/85 border border-border shadow-xs backdrop-blur-md">
                    <StudentBadgesShowcase
                      submissions={studentSubmissions}
                      totalPoints={studentTotalPoints}
                      totalBooks={studentBooksRead}
                      profile={profile}
                      variant="compact-ribbon"
                    />
                  </div>

                  {/* Student Quick Access Divs (Focused & Color-Coded) */}
                  <div className="relative z-10 rounded-2xl border border-border/70 bg-muted/25 p-3 space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Quick Reading Portal
                      </span>
                      <span className="text-[11px] text-muted-foreground hidden sm:inline">
                        Jump straight to your tools
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                      {[
                        {
                          label: 'Submit Book',
                          to: selectedChallenge?.id && selectedChallenge.id !== 'all' ? `/submit?challenge=${selectedChallenge.id}` : '/submit',
                          icon: PlusCircle,
                          tone: 'var(--v-electric-blue)',
                        },
                        { label: 'My Progress', to: '/progress', icon: BarChart3, tone: 'var(--v-cyan)' },
                        { label: 'Leaderboard', to: '/leaderboard', icon: Trophy, tone: 'var(--v-gold)' },
                        {
                          label: 'Inbox',
                          to: '/inbox',
                          icon: Inbox,
                          tone: 'var(--v-orange)',
                          badge: unreadEmailCount,
                        },
                        { label: 'Challenges', to: '/challenges', icon: Target, tone: 'var(--v-emerald)' },
                        { label: 'Certificates', to: '/certificates', icon: BadgeCheck, tone: 'var(--v-fuchsia)' },
                        { label: 'Settings', to: '/settings', icon: Settings, tone: 'var(--v-mint)' },
                      ].map((item) => (
                        <button
                          key={item.to}
                          type="button"
                          onClick={() => navigate(item.to)}
                          className="group rounded-xl border p-2.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm flex flex-col justify-between gap-2 relative"
                          style={{
                            borderColor: `hsl(${item.tone} / 0.28)`,
                            background: `linear-gradient(155deg, hsl(${item.tone} / 0.12), hsl(${item.tone} / 0.03))`,
                          }}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: `hsl(${item.tone} / 0.18)` }}
                            >
                              <item.icon className="w-3.5 h-3.5" style={{ color: `hsl(${item.tone})` }} />
                            </span>
                            {typeof item.badge === 'number' && item.badge > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-500 text-white">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            {item.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4 Sleek Bento Metric Divs (Well-Colored Linear Gradients & Floating Divs) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 relative z-10">
                    {/* Card 1: Books read (Luxury Lime/Emerald Floating Card) */}
                    <div
                      className="rounded-3xl p-5 transition-all duration-300 shadow-md hover:-translate-y-1 flex flex-col justify-between min-h-[155px] relative overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, #d9f99d 0%, #bef264 50%, #86efac 100%)',
                        color: '#090d16',
                        border: '1.5px solid rgba(0, 0, 0, 0.15)',
                        boxShadow: '0 12px 30px rgba(217, 249, 157, 0.35)',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-800">
                          Books read
                        </span>
                        <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
                      </div>
                      <div className="my-2">
                        <div className="text-3xl sm:text-4xl font-display font-extrabold text-slate-950 tracking-tight">
                          {studentBooksRead} <span className="text-xs font-bold text-slate-700">/ {targetBooks}</span>
                        </div>
                        {/* Dot status track */}
                        <div className="flex items-center gap-1.5 mt-2">
                          {[...Array(8)].map((_, i) => {
                            const isFilled = i < Math.min(8, Math.round((studentBooksRead / (targetBooks || 45)) * 8));
                            return (
                              <span
                                key={i}
                                className={cn(
                                  "w-2 h-2 rounded-full",
                                  isFilled ? "bg-slate-950" : "bg-slate-950/20"
                                )}
                              />
                            );
                          })}
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-1 text-[11px] font-black bg-black text-[#d9f99d] px-2.5 py-0.5 rounded-lg w-fit shadow-xs">
                        <span>↑ {Math.round((studentBooksRead / (targetBooks || 45)) * 100)}% vs goal</span>
                      </div>
                    </div>

                    {/* Card 2: Realms Explored (Modern Cyan Linear Gradient Floating Card) */}
                    <div
                      className="rounded-3xl p-5 transition-all duration-300 shadow-sm hover:-translate-y-1 flex flex-col justify-between min-h-[155px] border"
                      style={{
                        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(13, 148, 136, 0.05) 100%)',
                        borderColor: 'rgba(6, 182, 212, 0.3)',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                          Realms explored
                        </span>
                        <BookOpen className="w-3.5 h-3.5 text-cyan-500" />
                      </div>
                      <div className="my-2">
                        <div className="text-3xl font-display font-bold text-foreground">
                          {categoriesExplored} <span className="text-xs font-normal text-muted-foreground">/ 11</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-2">
                          {[...Array(8)].map((_, i) => (
                            <span
                              key={i}
                              className={cn(
                                "w-2 h-2 rounded-full",
                                i < categoriesExplored ? "bg-cyan-500" : "bg-muted-foreground/20"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-[11px] font-semibold text-cyan-700 dark:text-cyan-300 bg-cyan-500/15 px-2.5 py-0.5 rounded-lg w-fit">
                        ✓ On track for term
                      </div>
                    </div>

                    {/* Card 3: House Points (Warm Amber Linear Gradient Floating Card) */}
                    <div
                      className="rounded-3xl p-5 transition-all duration-300 shadow-sm hover:-translate-y-1 flex flex-col justify-between min-h-[155px] border"
                      style={{
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.05) 100%)',
                        borderColor: 'rgba(245, 158, 11, 0.3)',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                          House points
                        </span>
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <div className="my-2">
                        <div className="text-3xl font-display font-bold text-foreground">
                          {studentTotalPoints}
                        </div>
                        <div className="flex items-center gap-1.5 mt-2">
                          {[...Array(8)].map((_, i) => (
                            <span
                              key={i}
                              className={cn(
                                "w-2 h-2 rounded-full",
                                i < 5 ? "bg-amber-500" : "bg-muted-foreground/20"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-lg w-fit font-bold">
                        {profile?.house || 'MFA'} House
                      </div>
                    </div>

                    {/* Card 4: Verification status (Vibrant Violet Floating Card) */}
                    <div
                      className="rounded-3xl p-5 transition-all duration-300 shadow-sm hover:-translate-y-1 flex flex-col justify-between min-h-[155px] border"
                      style={{
                        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(139, 92, 246, 0.05) 100%)',
                        borderColor: 'rgba(168, 85, 247, 0.3)',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                          Verification
                        </span>
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
                      </div>
                      <div className="my-2">
                        <div className="text-2xl sm:text-3xl font-display font-bold text-foreground capitalize">
                          {studentLevel}
                        </div>
                        <div className="flex items-center gap-1.5 mt-2">
                          {[...Array(8)].map((_, i) => (
                            <span
                              key={i}
                              className={cn(
                                "w-2 h-2 rounded-full",
                                i < 6 ? "bg-purple-500" : "bg-muted-foreground/20"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-500/15 px-2.5 py-0.5 rounded-lg w-fit">
                        ↓ Active reader
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right 4 Cols: Indigo / Violet Suggestion Card */}
                <div
                  className="xl:col-span-4 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[300px]"
                  style={{
                    background: 'linear-gradient(145deg, #1e1b4b 0%, #172554 50%, #030712 100%)',
                    border: '1.5px solid rgba(99, 102, 241, 0.4)',
                  }}
                >
                  <div className="space-y-3 relative z-10">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-950 bg-lime-400 px-2.5 py-0.5 rounded-full shadow-xs">
                        ✦ Reading suggestion
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate('/challenges')}
                        className="text-xs text-indigo-200/80 hover:text-white underline underline-offset-2 transition-colors"
                      >
                        Why this?
                      </button>
                    </div>

                    <h3 className="text-xl font-bold text-white leading-snug">
                      2 titles could expand your reflection depth
                    </h3>

                    {/* Suggestion List Items */}
                    <div className="space-y-2 pt-1">
                      <Link
                        to="/submit"
                        className="p-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-between gap-3 text-xs transition-colors group"
                      >
                        <div>
                          <div className="font-bold text-white group-hover:text-lime-300 transition-colors">
                            Realm 3 · African Literature
                          </div>
                          <div className="text-[11px] text-indigo-200/70">
                            Things Fall Apart · Chinua Achebe
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-lime-400 group-hover:translate-x-1 transition-transform" />
                      </Link>

                      <Link
                        to="/submit"
                        className="p-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-between gap-3 text-xs transition-colors group"
                      >
                        <div>
                          <div className="font-bold text-white group-hover:text-lime-300 transition-colors">
                            Realm 5 · Speculative Fiction
                          </div>
                          <div className="text-[11px] text-indigo-200/70">
                            The Memory Police · Yoko Ogawa
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-lime-400 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() => navigate('/challenges')}
                    className="w-full mt-4 h-10 rounded-2xl font-bold text-slate-950 bg-lime-400 hover:bg-lime-300 text-xs border-0 shadow-lg transition-transform hover:scale-[1.01]"
                  >
                    Review suggestions
                  </Button>
                </div>
              </div>

              {/* Live Session Countdown & Deadline Window (Dashboard Feature) */}
              <SessionCountdownBanner isLibrarian={false} />

              {/* LOWER BENTO ROW: Upcoming Reads & Submissions + Realm Progress Queue */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                {/* Left 8 Cols: Submissions Table + Week at a Glance */}
                <div className="xl:col-span-8 space-y-5">
                  {/* Submissions Card */}
                  <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h2 className="font-display text-lg font-bold text-foreground">
                          Recent reads &amp; submissions
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Verified entries and written reflections for {selectedChallenge?.title || '45-Book Quest'}.
                        </p>
                      </div>

                      {/* Segmented Filter Pills */}
                      <div className="flex items-center gap-1 p-1 bg-muted rounded-xl text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setRecentFilter('today')}
                          className={cn(
                            "px-3 py-1 rounded-lg transition-all",
                            recentFilter === 'today' ? "bg-foreground text-background font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Today
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecentFilter('week')}
                          className={cn(
                            "px-3 py-1 rounded-lg transition-all",
                            recentFilter === 'week' ? "bg-foreground text-background font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          This week
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecentFilter('all')}
                          className={cn(
                            "px-3 py-1 rounded-lg transition-all",
                            recentFilter === 'all' ? "bg-foreground text-background font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          All
                        </button>
                      </div>
                    </div>

                    {/* Table-like clean row items */}
                    {studentSubmissions.length === 0 ? (
                      <div className="text-center py-12 px-4 rounded-2xl bg-muted/20 border border-dashed border-border space-y-3">
                        <BookOpen className="w-10 h-10 text-muted-foreground mx-auto opacity-40" />
                        <div className="text-sm font-semibold text-foreground">
                          No reading submissions logged yet
                        </div>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                          Read a novel from any of the 15 literary realms and submit your reflection to earn points and claim your first badge.
                        </p>
                        <Button
                          size="sm"
                          onClick={() => navigate(selectedChallenge?.id ? `/submit?challenge=${selectedChallenge.id}` : '/submit')}
                          className="text-xs font-bold rounded-xl gap-1.5"
                        >
                          <PlusCircle className="w-3.5 h-3.5" /> Submit First Book
                        </Button>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/50">
                        {studentSubmissions.slice(0, 5).map((sub, idx) => (
                          <div
                            key={sub.id || idx}
                            className="py-3.5 flex items-center justify-between gap-3 hover:bg-muted/20 px-2 rounded-xl transition-colors group"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              {/* Time / Realm badge */}
                              <span className="w-16 text-center py-1 rounded-lg bg-muted text-[11px] font-mono font-bold text-muted-foreground shrink-0">
                                {sub.date_finished ? new Date(sub.date_finished).toLocaleDateString([], { month: 'short', day: 'numeric' }) : `R#${sub.category_number || idx + 1}`}
                              </span>

                              <div className="min-w-0">
                                <div className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                  {sub.title}
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span>{sub.author}</span>
                                  <span>•</span>
                                  <span className="text-slate-400">{sub.category_name || 'Literature Realm'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">
                                +{sub.points_earned || 10} pts
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                                Ready
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate('/progress')}
                                className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bottom Link */}
                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Showing latest verified reads</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/progress')}
                        className="text-xs text-primary hover:text-primary gap-1"
                      >
                        <span>View complete reading log</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Week at a Glance Mini-Tracker (Matching image_8999e6ac.png) */}
                  <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-sm font-bold text-foreground">
                        Week at a glance
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-foreground" />
                          Logging active
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                          Rest
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-7 gap-2.5">
                      {[
                        { day: 'Mon', num: 21, count: 4, active: true },
                        { day: 'Tue', num: 22, count: 3, active: false },
                        { day: 'Wed', num: 23, count: 2, active: false },
                        { day: 'Thu', num: 24, count: 4, active: false },
                        { day: 'Fri', num: 25, count: 3, active: false },
                        { day: 'Sat', num: 26, count: 1, active: false },
                        { day: 'Sun', num: 27, count: 2, active: false },
                      ].map((d) => (
                        <div
                          key={d.day}
                          className={cn(
                            "rounded-2xl p-3 flex flex-col justify-between min-h-[105px] border transition-transform hover:-translate-y-0.5",
                            d.active
                              ? "bg-foreground text-background border-foreground shadow-sm"
                              : "bg-card border-dashed border-border/80 text-foreground"
                          )}
                        >
                          <div className="flex items-center justify-between text-xs font-semibold opacity-80">
                            <span>{d.day}</span>
                            <span>{d.num}</span>
                          </div>
                          <div>
                            <div className="text-2xl font-bold font-display">{d.count}</div>
                            <div className="text-[10px] opacity-75">books read</div>
                          </div>
                          <div className="flex items-center gap-1 pt-1">
                            {[...Array(3)].map((_, i) => (
                              <span
                                key={i}
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  d.active ? "bg-background" : "bg-muted-foreground/40"
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right 4 Cols: Realm Progress Queue & House Standings */}
                <div className="xl:col-span-4 space-y-5">
                  <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-base font-bold text-foreground">
                        Feedback queue
                      </h3>
                      <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px] font-bold">
                        {studentBooksRead} / {targetBooks} waiting
                      </Badge>
                    </div>

                    {/* Realm Progress Bars matching image */}
                    <div className="space-y-4 pt-1">
                      {[
                        { title: 'Persuasive writing & African Prose', tag: 'Year 7 English', count: '8 / 24', pct: 33, complete: false },
                        { title: 'World Classics in Translation', tag: 'Year 8 World Lit', count: '24 / 30', pct: 80, complete: false },
                        { title: 'Historical & Biographical Prose', tag: 'Year 9 Humanities', count: '29 / 29', pct: 100, complete: true },
                        { title: 'Speculative & Science Fiction', tag: 'Year 7 Science', count: '12 / 26', pct: 46, complete: false },
                      ].map((item) => (
                        <div key={item.title} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground">{item.title}</span>
                            <span className="font-mono font-bold text-muted-foreground">{item.count}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">{item.tag}</div>
                          {/* Progress bar line */}
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                item.complete ? "bg-emerald-500" : "bg-foreground"
                              )}
                              style={{ width: `${item.pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Bottom Highlight Card matching image */}
                    <div className="mt-4 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-900 dark:text-purple-200 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="text-xs">
                        <div className="font-bold text-foreground">Oldest submission: 3 days</div>
                        <div className="text-[11px] text-muted-foreground">Persuasive writing · Under verification</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Real-Time Inter-House Championship Leaderboard Section (Rendered Directly Above Challenge Inbox) */}
        <div className="mt-8">
          <Card className="rounded-3xl border-border bg-card overflow-hidden shadow-sm">
            <CardHeader className="bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent border-b border-border py-4 px-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 shadow-xs">
                    <Trophy className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold flex flex-wrap items-center gap-2">
                      <span>Inter-House Championship Leaderboard</span>
                      <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-mono">
                        Real-Time Aggregated
                      </Badge>
                      <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live
                      </span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Live tracking of verified book progress and house points across all academy houses.
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fetchData()}
                    className="h-8 text-xs gap-1.5 border-border hover:bg-muted"
                    title="Refresh leaderboard stats"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate("/leaderboard")}
                    className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:opacity-90"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>Full Leaderboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-5">
              {/* 4 Houses Floating Bento Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {leaderboard.map((house, idx) => {
                  const houseInfo = getHouseColor(house.house);
                  const isMine = profile?.house === house.house;
                  const medalEmoji = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "🎖️";
                  const rankClass =
                    idx === 0
                      ? "border-amber-500/40 bg-gradient-to-b from-amber-500/10 via-card to-background shadow-sm"
                      : idx === 1
                      ? "border-slate-400/40 bg-gradient-to-b from-slate-400/10 via-card to-background"
                      : idx === 2
                      ? "border-amber-700/30 bg-gradient-to-b from-amber-700/10 via-card to-background"
                      : "border-border/70 bg-card";

                  const houseGoal = Math.max(100, Math.round(targetBooks * (house.total_readers || 5)));
                  const pct = Math.min(100, Math.round((house.total_books / houseGoal) * 100));

                  return (
                    <div
                      key={house.house}
                      className={cn(
                        "p-4 rounded-2xl border transition-all hover:shadow-md flex flex-col justify-between gap-4 relative overflow-hidden group",
                        rankClass,
                        isMine && "ring-2 ring-primary/40"
                      )}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xl">{medalEmoji}</span>
                            <span className="text-xs font-mono font-bold text-muted-foreground">
                              Rank #{idx + 1}
                            </span>
                          </div>
                          {isMine && (
                            <Badge className="text-[10px] px-1.5 py-0.5 bg-primary text-primary-foreground font-semibold">
                              My House
                            </Badge>
                          )}
                        </div>

                        <div>
                          <div className="font-display font-bold text-base text-foreground flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: houseInfo.hex || "#00205B" }}
                            />
                            <span>{house.house}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {house.total_readers} active scholar reader{house.total_readers === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2.5 pt-2.5 border-t border-border/60">
                        <div className="grid grid-cols-2 gap-2 text-center bg-muted/30 p-2 rounded-xl border border-border/50">
                          <div>
                            <div className="text-[10px] text-muted-foreground font-medium uppercase">
                              Books Read
                            </div>
                            <div className="text-base font-bold font-mono text-foreground">
                              {house.total_books}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground font-medium uppercase">
                              Points
                            </div>
                            <div className="text-base font-bold font-mono text-primary">
                              {house.total_points}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>Campaign Progress</span>
                            <span className="font-mono font-semibold text-foreground">{pct}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: houseInfo.hex || "var(--primary)",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Librarian & Admin Certificate Dispatch Shortcut Banner */}
              {isLibrarian && (
                <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        Librarian Certificate Issuance &amp; Dispatch
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Issue verified Bronze (15 books), Silver (30 books), or Gold (45 books) certificates to scholars.
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setCertStudentPickerOpen(true)}
                    className="h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:opacity-90 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Dispatch Certificates</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Inbuilt Email & Official Communications */}
        <div className="mt-8">
          <Card className="rounded-3xl border-border bg-card overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border py-4 px-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      Inbuilt Reading Mail &amp; Inbox
                      <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                        Academy In-App Mailbox
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Official letters, welcoming certificates, and challenge dispatches sent directly to your portal.
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate("/inbox")}
                    className="text-xs h-8 gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5 text-primary" /> Open Email Inbox
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {welcomeLetters.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {welcomeLetters.map((letter) => (
                    <div
                      key={letter.id}
                      onClick={() => {
                        markWelcomeEmailRead(letter.id);
                        setSelectedWelcomeEmail(letter);
                      }}
                      className={cn(
                        "p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md flex flex-col justify-between gap-3",
                        letter.read
                          ? "bg-muted/30 border-border"
                          : "bg-blue-500/5 border-blue-500/30 ring-1 ring-blue-500/20"
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xl">{letter.badge_icon || "🏆"}</span>
                            <span className="font-bold text-xs text-foreground truncate">
                              {letter.challenge_title}
                            </span>
                          </div>
                          {!letter.read && (
                            <Badge className="bg-blue-500 text-white text-[9px] px-1.5 py-0 h-4">
                              New
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs font-semibold text-foreground line-clamp-1">
                          {letter.subject}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {letter.content?.slice(0, 140)}…
                        </p>
                      </div>

                      <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] gap-2">
                        <span className="text-muted-foreground font-mono text-[10px]">
                          {new Date(letter.sent_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] font-semibold gap-1"
                        >
                          Read Letter <ArrowRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 px-4 rounded-2xl bg-muted/20 border border-dashed border-border space-y-2">
                  <Mail className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
                  <div className="text-sm font-semibold text-foreground">
                    Your Inbuilt Email Inbox is Active
                  </div>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    When you enroll in a challenge or the librarian sends broadcast communications or award certificates, official letters arrive here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Access Code Dialog */}
      <ChallengeAccessCodeDialog
        open={codeDialogOpen}
        onOpenChange={setCodeDialogOpen}
        challenge={selectedChallenge}
        challengeId={selectedChallenge?.id}
        challengeTitle={selectedChallenge?.title}
        onSuccess={() => {
          refreshChallenges();
        }}
      />

      {/* Welcome Email Modal */}
      <WelcomeEmailDialog
        emailRecord={selectedWelcomeEmail}
        open={!!selectedWelcomeEmail}
        onOpenChange={(open) => !open && setSelectedWelcomeEmail(null)}
      />

      {/* Admin & Librarian Certificate Student Picker Dialog */}
      {isLibrarian && (
        <>
          <Dialog open={certStudentPickerOpen} onOpenChange={setCertStudentPickerOpen}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 rounded-3xl border-border bg-card">
              <DialogHeader className="p-6 pb-4 border-b border-border bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center text-xl shadow-xs">
                    <Award className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold font-display text-foreground">
                      Certificate Dispatch Studio
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Select a scholar or broadcast certificates in bulk with verifiable PDF attachments delivered to student email and Challenge Inbox.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="p-5 space-y-4 flex-1 overflow-hidden flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      value={certSearchQuery}
                      onChange={(e) => setCertSearchQuery(e.target.value)}
                      placeholder="Search scholar by name, house, or year group..."
                      className="pl-9 h-9 text-xs bg-muted/40 rounded-xl"
                    />
                  </div>

                  {/* Bulk Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {certPickerSelectedUserIds.size > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          const targets = cohortData.roster
                            .filter((s) => certPickerSelectedUserIds.has(s.user_id))
                            .map((s) => ({
                              userId: s.user_id,
                              name: s.full_name,
                              email: s.email || `${s.full_name.toLowerCase().replace(/\s+/g, ".")}@mpesafoundationacademy.ac.ke`,
                              house: s.house,
                              yearGroup: s.year_group,
                              className: s.class_name,
                              booksCount: s.books,
                              level: computeStudentLevel(s.books),
                              verificationCode: `MFA-CERT-${s.house ? s.house.substring(0,3).toUpperCase() : 'MFA'}-${Math.floor(1000 + Math.random() * 9000)}`,
                            }));

                          setCertBatchTargets(targets);
                          setSelectedCertTarget(null);
                          setCertStudentPickerOpen(false);
                          setCertDispatchOpen(true);
                        }}
                        className="text-xs h-9 font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send to Selected ({certPickerSelectedUserIds.size})</span>
                      </Button>
                    )}

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const qualified = cohortData.roster
                          .filter((s) => s.books >= 15)
                          .map((s) => ({
                            userId: s.user_id,
                            name: s.full_name,
                            email: s.email || `${s.full_name.toLowerCase().replace(/\s+/g, ".")}@mpesafoundationacademy.ac.ke`,
                            house: s.house,
                            yearGroup: s.year_group,
                            className: s.class_name,
                            booksCount: s.books,
                            level: computeStudentLevel(s.books),
                            verificationCode: `MFA-CERT-${s.house ? s.house.substring(0,3).toUpperCase() : 'MFA'}-${Math.floor(1000 + Math.random() * 9000)}`,
                          }));

                        if (qualified.length === 0) {
                          toast.info("No scholars have reached 15 books yet. You can still dispatch individually to any scholar below.");
                          return;
                        }
                        setCertBatchTargets(qualified);
                        setSelectedCertTarget(null);
                        setCertStudentPickerOpen(false);
                        setCertDispatchOpen(true);
                      }}
                      className="text-xs h-9 font-bold bg-amber-500 hover:bg-amber-400 text-black border-0 gap-1.5 shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Batch (15+ Books)</span>
                    </Button>
                  </div>
                </div>

                {/* Selection toolbar bar */}
                {(() => {
                  const filteredList = cohortData.roster.filter((s) => {
                    if (!certSearchQuery.trim()) return true;
                    const q = certSearchQuery.toLowerCase();
                    return (
                      s.full_name.toLowerCase().includes(q) ||
                      (s.email && s.email.toLowerCase().includes(q)) ||
                      (s.house && s.house.toLowerCase().includes(q)) ||
                      (s.year_group && s.year_group.toLowerCase().includes(q))
                    );
                  });
                  const allFilteredSelected = filteredList.length > 0 && filteredList.every((s) => certPickerSelectedUserIds.has(s.user_id));

                  return (
                    <div className="flex items-center justify-between text-xs px-2 py-1 bg-muted/40 rounded-xl border border-border/50">
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
                        <Checkbox
                          checked={allFilteredSelected}
                          onCheckedChange={() => {
                            if (allFilteredSelected) {
                              setCertPickerSelectedUserIds((prev) => {
                                const next = new Set(prev);
                                filteredList.forEach((s) => next.delete(s.user_id));
                                return next;
                              });
                            } else {
                              setCertPickerSelectedUserIds((prev) => {
                                const next = new Set(prev);
                                filteredList.forEach((s) => next.add(s.user_id));
                                return next;
                              });
                            }
                          }}
                        />
                        <span>{allFilteredSelected ? "Deselect All Visible" : `Select All Visible (${filteredList.length})`}</span>
                      </label>
                      {certPickerSelectedUserIds.size > 0 && (
                        <button
                          type="button"
                          onClick={() => setCertPickerSelectedUserIds(new Set())}
                          className="text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          Clear Selection ({certPickerSelectedUserIds.size})
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* Scholars List */}
                <div className="border border-border/70 rounded-2xl overflow-y-auto max-h-[380px] divide-y divide-border/50">
                  {cohortData.roster
                    .filter((s) => {
                      if (!certSearchQuery.trim()) return true;
                      const q = certSearchQuery.toLowerCase();
                      return (
                        s.full_name.toLowerCase().includes(q) ||
                        (s.email && s.email.toLowerCase().includes(q)) ||
                        (s.house && s.house.toLowerCase().includes(q)) ||
                        (s.year_group && s.year_group.toLowerCase().includes(q))
                      );
                    })
                    .map((st) => {
                      const lvl = computeStudentLevel(st.books);
                      const isSelected = certPickerSelectedUserIds.has(st.user_id);
                      return (
                        <div
                          key={st.user_id}
                          onClick={() => {
                            setCertPickerSelectedUserIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(st.user_id)) next.delete(st.user_id);
                              else next.add(st.user_id);
                              return next;
                            });
                          }}
                          className={cn(
                            "p-3.5 px-4 flex items-center justify-between gap-3 cursor-pointer transition-colors",
                            isSelected ? "bg-amber-500/10 dark:bg-amber-500/15 border-l-4 border-l-amber-500" : "hover:bg-muted/40"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => {
                                  setCertPickerSelectedUserIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(st.user_id)) next.delete(st.user_id);
                                    else next.add(st.user_id);
                                    return next;
                                  });
                                }}
                              />
                            </div>
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                              {st.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-xs text-foreground truncate flex items-center gap-2">
                                <span>{st.full_name}</span>
                                {st.house && (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-border">
                                    {st.house}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {st.email || `${st.full_name.toLowerCase().replace(/\s+/g, ".")}@mpesafoundationacademy.ac.ke`} {st.year_group ? `• ${st.year_group}` : ""}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <div className="text-right">
                              <div className="text-xs font-bold text-primary">
                                {st.books} books
                              </div>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[9px] py-0 px-1.5 font-bold uppercase",
                                  lvl === "Gold"
                                    ? "border-amber-500 text-amber-500 bg-amber-500/10"
                                    : lvl === "Silver"
                                    ? "border-slate-400 text-slate-300 bg-slate-500/10"
                                    : lvl === "Bronze"
                                    ? "border-orange-500 text-orange-500 bg-orange-500/10"
                                    : "border-muted-foreground/30 text-muted-foreground"
                                )}
                              >
                                {lvl}
                              </Badge>
                            </div>

                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedCertTarget({
                                  userId: st.user_id,
                                  name: st.full_name,
                                  email: st.email || `${st.full_name.toLowerCase().replace(/\s+/g, ".")}@mpesafoundationacademy.ac.ke`,
                                  house: st.house,
                                  yearGroup: st.year_group,
                                  className: st.class_name,
                                  booksCount: st.books,
                                  level: lvl,
                                  verificationCode: `MFA-CERT-${st.house ? st.house.substring(0,3).toUpperCase() : 'MFA'}-${Math.floor(1000 + Math.random() * 9000)}`,
                                });
                                setCertBatchTargets([]);
                                setCertStudentPickerOpen(false);
                                setCertDispatchOpen(true);
                              }}
                              className="h-8 text-xs font-bold px-3 gap-1.5 bg-primary text-primary-foreground hover:opacity-90"
                            >
                              <Send className="w-3 h-3" />
                              <span>Dispatch</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <DialogFooter className="p-4 px-6 border-t border-border bg-muted/20">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCertStudentPickerOpen(false)}
                  className="text-xs ml-auto"
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Official Certificate Dispatch Modal with Live Preview and PDF Attachment */}
          <CertificateDispatchModal
            open={certDispatchOpen}
            onOpenChange={setCertDispatchOpen}
            target={selectedCertTarget}
            batchTargets={certBatchTargets}
            challengeTitle={selectedChallenge?.title || '45-Book Reading Challenge'}
            challengeId={selectedChallenge?.id || '45450000-2025-4026-8000-000000000045'}
            signatoryName={profile?.full_name || "Tonny Odundo"}
            signatoryTitle="Head Librarian & Director of Literacy"
            onDownloadPDF={(target) => {
              toast.success(`Generated official PDF Certificate for ${target.name}!`);
            }}
            onSuccess={() => {
              setCertDispatchOpen(false);
              toast.success("Certificate dispatched across all student channels and logged in Inbox!");
            }}
          />
        </>
      )}

    </div>
  );
};

export default Dashboard;
