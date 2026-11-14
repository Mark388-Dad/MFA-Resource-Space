import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useChallenges, normalizeChallengeId } from '@/contexts/ChallengeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Trophy,
  Search,
  Download,
  ExternalLink,
  BookOpen,
  RefreshCw,
  Sparkles,
  Users,
  ShieldCheck,
  FileText,
  Filter,
  Award,
  Send,
  CheckSquare,
  Square,
  GraduationCap,
  ChevronDown,
  Layers,
  Building2,
  Mail,
  Check,
  X,
} from 'lucide-react';
import { HOUSES, YEAR_GROUPS, getHouseColor } from '@/lib/constants';
import { safeStorage } from '@/lib/safeStorage';
import { CertificateDispatchModal, CertificateDispatchTarget } from '@/components/CertificateDispatchModal';
import { computeStudentLevel, getVerificationCode } from '@/lib/certificateTypes';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface ScholarLeaderboardRow {
  user_id: string;
  full_name: string;
  email: string;
  house: string;
  year_group: string;
  class_name: string;
  books: number;
  points: number;
}

export const AdminFullLeaderboard: React.FC = () => {
  const { selectedChallenge } = useChallenges();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ScholarLeaderboardRow[]>([]);
  const [search, setSearch] = useState('');
  const [houseFilter, setHouseFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'points' | 'books' | 'name'>('points');
  const [selectedStudent, setSelectedStudent] = useState<ScholarLeaderboardRow | null>(null);
  const [studentDetail, setStudentDetail] = useState<{ category_name: string; count: number }[] | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Checkbox selection & bulk certificate dispatch state
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certSingleTarget, setCertSingleTarget] = useState<CertificateDispatchTarget | null>(null);
  const [certBatchTargets, setCertBatchTargets] = useState<CertificateDispatchTarget[]>([]);

  const loadLeaderboardData = useCallback(async () => {
    setLoading(true);
    try {
      const isAll = !selectedChallenge || selectedChallenge.id === 'all';
      const isMaster = selectedChallenge?.id === '45450000-2025-4026-8000-000000000045';

      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, house, year_group, class_name')
        .eq('role', 'student');

      const map = new Map<string, { books: number; points: number }>();
      const localAudit = safeStorage.getJSON<any[]>('mfa_submissions_audit', []);

      if (isAll) {
        const [bRes, cRes] = await Promise.all([
          supabase.from('book_submissions').select('user_id, points_earned'),
          supabase.from('challenge_submissions').select('user_id, points_earned'),
        ]);
        (bRes.data || []).forEach((s: any) => {
          const cur = map.get(s.user_id) || { books: 0, points: 0 };
          cur.books += 1;
          cur.points += s.points_earned || 10;
          map.set(s.user_id, cur);
        });
        (cRes.data || []).forEach((s: any) => {
          const cur = map.get(s.user_id) || { books: 0, points: 0 };
          cur.books += 1;
          cur.points += s.points_earned || 10;
          map.set(s.user_id, cur);
        });

        localAudit.forEach((aud: any) => {
          const uid = aud.user_id;
          if (uid) {
            const cur = map.get(uid) || { books: 0, points: 0 };
            cur.books += 1;
            cur.points += Number(aud.points_earned || aud.pointsEarned || 10);
            map.set(uid, cur);
          }
        });
      } else if (isMaster) {
        const { data: subs } = await supabase
          .from('book_submissions')
          .select('user_id, points_earned');

        (subs || []).forEach((s: any) => {
          const cur = map.get(s.user_id) || { books: 0, points: 0 };
          cur.books += 1;
          cur.points += s.points_earned || 10;
          map.set(s.user_id, cur);
        });

        localAudit.forEach((aud: any) => {
          const isTarget = !aud.challenge_id || aud.challenge_id === '45450000-2025-4026-8000-000000000045';
          const uid = aud.user_id;
          if (isTarget && uid) {
            const cur = map.get(uid) || { books: 0, points: 0 };
            cur.books += 1;
            cur.points += Number(aud.points_earned || aud.pointsEarned || 10);
            map.set(uid, cur);
          }
        });
      } else {
        const normId = normalizeChallengeId(selectedChallenge.id);
        const queryIds = Array.from(new Set([selectedChallenge.id, normId].filter(Boolean) as string[]));
        const { data: subs } = await supabase
          .from('challenge_submissions')
          .select('user_id, points_earned')
          .in('challenge_id', queryIds);

        (subs || []).forEach((s: any) => {
          const cur = map.get(s.user_id) || { books: 0, points: 0 };
          cur.books += 1;
          cur.points += s.points_earned || 10;
          map.set(s.user_id, cur);
        });

        localAudit.forEach((aud: any) => {
          const audNorm = normalizeChallengeId(aud.challenge_id);
          const isMatch = queryIds.includes(aud.challenge_id) || queryIds.includes(audNorm);
          const uid = aud.user_id;
          if (isMatch && uid) {
            const cur = map.get(uid) || { books: 0, points: 0 };
            cur.books += 1;
            cur.points += Number(aud.points_earned || aud.pointsEarned || 10);
            map.set(uid, cur);
          }
        });
      }

      const builtRows = (profs || []).map((p: any) => {
        const stat = map.get(p.user_id) || { books: 0, points: 0 };
        return {
          user_id: p.user_id,
          full_name: p.full_name || 'Scholar Reader',
          email: p.email || '',
          house: p.house || 'Unassigned',
          year_group: p.year_group || 'General',
          class_name: p.class_name || 'General',
          books: stat.books,
          points: stat.points,
        };
      });

      setRows(builtRows);
    } catch (err) {
      console.error('Failed to load admin leaderboard:', err);
      toast.error('Could not load leaderboard data');
    } finally {
      setLoading(false);
    }
  }, [selectedChallenge]);

  useEffect(() => {
    loadLeaderboardData();
    window.addEventListener('mfa_submission_created', loadLeaderboardData);
    window.addEventListener('mfa_submission_updated', loadLeaderboardData);
    return () => {
      window.removeEventListener('mfa_submission_created', loadLeaderboardData);
      window.removeEventListener('mfa_submission_updated', loadLeaderboardData);
    };
  }, [loadLeaderboardData]);

  // Load drilldown details when student clicked
  useEffect(() => {
    if (!selectedStudent) {
      setStudentDetail(null);
      return;
    }
    (async () => {
      setLoadingDetail(true);
      try {
        const { data } = await supabase
          .from('book_submissions')
          .select('category_name')
          .eq('user_id', selectedStudent.user_id);
        const m = new Map<string, number>();
        (data ?? []).forEach((s: any) => m.set(s.category_name, (m.get(s.category_name) ?? 0) + 1));
        setStudentDetail(Array.from(m, ([category_name, count]) => ({ category_name, count })).sort((a, b) => b.count - a.count));
      } catch (err) {
        console.warn('Could not load categories for student:', err);
      } finally {
        setLoadingDetail(false);
      }
    })();
  }, [selectedStudent]);

  // Filtered and sorted rows
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (houseFilter !== 'all' && r.house !== houseFilter) return false;
      if (yearFilter !== 'all' && r.year_group !== yearFilter) return false;
      if (q) {
        const matchName = r.full_name.toLowerCase().includes(q);
        const matchEmail = r.email.toLowerCase().includes(q);
        const matchHouse = r.house.toLowerCase().includes(q);
        const matchYear = r.year_group.toLowerCase().includes(q);
        const matchClass = r.class_name.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchHouse && !matchYear && !matchClass) return false;
      }
      return true;
    });
  }, [rows, search, houseFilter, yearFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === 'points') return b.points - a.points || b.books - a.books;
      if (sortBy === 'books') return b.books - a.books || b.points - a.points;
      return a.full_name.localeCompare(b.full_name);
    });
  }, [filtered, sortBy]);

  // Top 3 Podium
  const topThree = sorted.slice(0, 3);

  const totalBooksLogged = rows.reduce((acc, r) => acc + r.books, 0);
  const totalPointsEarned = rows.reduce((acc, r) => acc + r.points, 0);
  const activeReaders = rows.filter((r) => r.books > 0).length;

  const handleExportCSV = () => {
    const headers = ['Rank', 'Student Name', 'Email', 'House', 'Year Group', 'Class', 'Books Read', 'Total Points'];
    const csvRows = sorted.map((r, i) => [
      i + 1,
      `"${r.full_name.replace(/"/g, '""')}"`,
      r.email,
      r.house,
      r.year_group,
      r.class_name,
      r.books,
      r.points,
    ]);
    const csvContent = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `MFA_Full_Leaderboard_${selectedChallenge?.title?.replace(/\s+/g, '_') || 'All'}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success('Full Leaderboard CSV downloaded successfully!');
  };

  // Helper to construct CertificateDispatchTarget for any scholar
  const computeTarget = useCallback(
    (scholar: ScholarLeaderboardRow): CertificateDispatchTarget => {
      const books = scholar.books || 0;
      const level = computeStudentLevel(books, selectedChallenge);
      const code = getVerificationCode(
        `${scholar.user_id}-${scholar.email}-${selectedChallenge?.id || '45'}`
      );
      return {
        id: scholar.user_id,
        userId: scholar.user_id,
        name: scholar.full_name || 'Scholar Reader',
        email:
          scholar.email ||
          `${scholar.full_name.toLowerCase().replace(/\s+/g, '.')}@mpesafoundationacademy.ac.ke`,
        house: scholar.house,
        yearGroup: scholar.year_group,
        className: scholar.class_name,
        booksCount: books,
        level,
        verificationCode: code,
      };
    },
    [selectedChallenge]
  );

  // Dynamic unique cohorts
  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.class_name && r.class_name !== 'General' && r.class_name !== 'Unassigned') {
        set.add(r.class_name);
      }
    });
    return Array.from(set).sort();
  }, [rows]);

  const uniqueYearGroups = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.year_group && r.year_group !== 'General') {
        set.add(r.year_group);
      }
    });
    return Array.from(set).sort();
  }, [rows]);

  const uniqueHouses = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.house && r.house !== 'Unassigned') {
        set.add(r.house);
      }
    });
    return Array.from(set).sort();
  }, [rows]);

  // Selection state helpers
  const isAllFilteredSelected =
    sorted.length > 0 && sorted.every((s) => selectedUserIds.has(s.user_id));
  const isSomeFilteredSelected =
    sorted.some((s) => selectedUserIds.has(s.user_id)) && !isAllFilteredSelected;

  const toggleSelectOne = (userId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      setSelectedUserIds((prev) => {
        const next = new Set(prev);
        sorted.forEach((s) => next.delete(s.user_id));
        return next;
      });
    } else {
      setSelectedUserIds((prev) => {
        const next = new Set(prev);
        sorted.forEach((s) => next.add(s.user_id));
        return next;
      });
    }
  };

  const clearSelection = () => {
    setSelectedUserIds(new Set());
  };

  const selectAllEnrolled = () => {
    setSelectedUserIds(new Set(rows.map((r) => r.user_id)));
    toast.success(`Selected all ${rows.length} enrolled scholars.`);
  };

  const selectByClass = (className: string) => {
    const matches = rows.filter((r) => r.class_name === className);
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      matches.forEach((m) => next.add(m.user_id));
      return next;
    });
    toast.success(`Selected ${matches.length} scholars in Class ${className}`);
  };

  const selectByYearGroup = (yg: string) => {
    const matches = rows.filter((r) => r.year_group === yg);
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      matches.forEach((m) => next.add(m.user_id));
      return next;
    });
    toast.success(`Selected ${matches.length} scholars in Year Group ${yg}`);
  };

  const selectByHouse = (houseName: string) => {
    const matches = rows.filter((r) => r.house === houseName);
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      matches.forEach((m) => next.add(m.user_id));
      return next;
    });
    toast.success(`Selected ${matches.length} scholars in ${houseName} House`);
  };

  const selectByTier = (tier: 'Gold' | 'Silver' | 'Bronze' | 'Active') => {
    let matches: ScholarLeaderboardRow[] = [];
    if (tier === 'Gold') matches = rows.filter((r) => r.books >= 45);
    else if (tier === 'Silver') matches = rows.filter((r) => r.books >= 16);
    else if (tier === 'Bronze') matches = rows.filter((r) => r.books >= 6);
    else matches = rows.filter((r) => r.books >= 1);

    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      matches.forEach((m) => next.add(m.user_id));
      return next;
    });
    toast.success(`Selected ${matches.length} scholars in ${tier} Tier`);
  };

  // Certificate Dispatch actions
  const handleSendToSelected = () => {
    const targets = rows
      .filter((r) => selectedUserIds.has(r.user_id))
      .map(computeTarget);
    if (targets.length === 0) {
      toast.error('Please select at least one scholar first.');
      return;
    }
    setCertSingleTarget(null);
    setCertBatchTargets(targets);
    setCertModalOpen(true);
  };

  const handleSendToClass = (className: string) => {
    const matches = rows.filter((r) => r.class_name === className);
    if (matches.length === 0) {
      toast.error(`No students found in Class ${className}`);
      return;
    }
    const targets = matches.map(computeTarget);
    setSelectedUserIds(new Set(matches.map((r) => r.user_id)));
    setCertSingleTarget(null);
    setCertBatchTargets(targets);
    setCertModalOpen(true);
  };

  const handleSendToYearGroup = (yg: string) => {
    const matches = rows.filter((r) => r.year_group === yg);
    if (matches.length === 0) {
      toast.error(`No students found in Year Group ${yg}`);
      return;
    }
    const targets = matches.map(computeTarget);
    setSelectedUserIds(new Set(matches.map((r) => r.user_id)));
    setCertSingleTarget(null);
    setCertBatchTargets(targets);
    setCertModalOpen(true);
  };

  const handleSendToIndividual = (scholar: ScholarLeaderboardRow, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = computeTarget(scholar);
    setCertSingleTarget(target);
    setCertBatchTargets([]);
    setCertModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions with Well-Rounded Gradient Divs */}
      <div
        className="rounded-3xl p-6 text-white border-2 border-amber-500/40 shadow-xl relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #18181b 0%, #1e1b4b 50%, #09090b 100%)',
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-amber-300 bg-amber-500/20 px-3 py-1 rounded-xl border border-amber-500/40">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                ADMIN FULL LEADERBOARD ACCESS
              </span>
              <span className="text-xs font-semibold text-slate-300">
                Challenge: <strong>{selectedChallenge?.title || 'All Active Challenges'}</strong>
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Whole School Reader Rankings
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              As Academy Administrator or Librarian, you have unclipped visibility of all {rows.length} enrolled students across Longonot, Kenya, Kilimanjaro, and Elgon houses without pagination limits.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <Button
              onClick={handleExportCSV}
              className="text-xs font-bold h-9 px-4 rounded-xl gap-2 bg-amber-500 hover:bg-amber-400 text-black border-0 shadow-lg"
            >
              <Download className="w-4 h-4 text-black" />
              <span>Export CSV</span>
            </Button>
            <Button
              variant="outline"
              asChild
              className="text-xs font-semibold h-9 px-4 rounded-xl gap-2 border-white/20 text-white hover:bg-white/10"
            >
              <Link to="/leaderboard" target="_blank">
                <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                <span>Open Public View</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* 4 Quick Stat Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-2xl font-black font-display text-amber-400">{rows.length}</div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Enrolled Scholars</div>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-2xl font-black font-display text-emerald-400">{activeReaders}</div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Active Readers</div>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-2xl font-black font-display text-cyan-400">{totalBooksLogged}</div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Books Verified</div>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-2xl font-black font-display text-violet-400">{totalPointsEarned}</div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Points</div>
          </div>
        </div>
      </div>

      {/* PODIUM OF TOP 3 READERS */}
      {topThree.length > 0 && topThree[0].books > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topThree.map((scholar, idx) => {
            const place = idx + 1;
            const house = scholar.house ? getHouseColor(scholar.house) : null;
            return (
              <div
                key={scholar.user_id}
                className={cn(
                  'p-5 rounded-3xl border-2 transition-all shadow-md relative overflow-hidden',
                  place === 1
                    ? 'bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-card border-amber-500/60 shadow-[0_10px_30px_rgba(245,158,11,0.2)]'
                    : place === 2
                    ? 'bg-gradient-to-br from-slate-400/20 via-zinc-400/10 to-card border-slate-400/50'
                    : 'bg-gradient-to-br from-amber-700/20 via-orange-600/10 to-card border-amber-700/50'
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-2xl font-black font-display text-lg flex items-center justify-center shadow-md',
                      place === 1 ? 'bg-amber-500 text-black' : place === 2 ? 'bg-slate-300 text-black' : 'bg-amber-700 text-white'
                    )}
                  >
                    #{place}
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold">
                    {place === 1 ? '🥇 GOLD CHAMPION' : place === 2 ? '🥈 SILVER' : '🥉 BRONZE'}
                  </Badge>
                </div>

                <h4 className="font-bold text-foreground text-base truncate">{scholar.full_name}</h4>
                <p className="text-xs text-muted-foreground truncate mb-3">{scholar.email}</p>

                <div className="flex items-center justify-between pt-3 border-t border-border/60 text-xs">
                  <div>
                    <span className="font-bold text-foreground">{scholar.books}</span>{' '}
                    <span className="text-muted-foreground">books</span>
                  </div>
                  <div>
                    <span className="font-bold text-amber-500 font-display text-sm">{scholar.points}</span>{' '}
                    <span className="text-muted-foreground">pts</span>
                  </div>
                  {house && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                      style={{ background: house.hex }}
                    >
                      {scholar.house}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SEARCH & FILTER CONTROLS */}
      <Card className="rounded-2xl border-border bg-card">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search scholars by name, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs rounded-xl"
              />
            </div>

            <Select value={houseFilter} onValueChange={setHouseFilter}>
              <SelectTrigger className="text-xs rounded-xl">
                <SelectValue placeholder="House Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Houses</SelectItem>
                {HOUSES.map((h) => (
                  <SelectItem key={h} value={h}>{h} House</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="text-xs rounded-xl">
                <SelectValue placeholder="Year Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Year Groups</SelectItem>
                {YEAR_GROUPS.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="text-xs rounded-xl">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="points">Sort: Most Points</SelectItem>
                <SelectItem value="books">Sort: Most Books</SelectItem>
                <SelectItem value="name">Sort: Name (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* FULL UNCLIPPED TABLE OF ALL READERS WITH CHECKBOXES & BULK ACTIONS */}
      <Card className="rounded-2xl border-border bg-card overflow-hidden shadow-sm">
        <CardHeader className="p-5 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Complete Leaderboard ({sorted.length} of {rows.length} Students)
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select scholars to dispatch official certificates in bulk to emails, or target specific classes &amp; year groups.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Cohort Select Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-9 px-3 gap-1.5 rounded-xl border-border text-foreground hover:bg-muted font-semibold"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-primary" />
                  <span>Select Cohort</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Quick Select Filters
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={toggleSelectAllFiltered}
                  className="text-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 mr-2 text-primary" />
                  {isAllFilteredSelected ? 'Deselect Visible' : `Select All Visible (${sorted.length})`}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={selectAllEnrolled}
                  className="text-xs cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 mr-2 text-primary" />
                  Select All Enrolled ({rows.length})
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Submenu for Specific Classes */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="text-xs cursor-pointer">
                    <Building2 className="w-3.5 h-3.5 mr-2 text-primary" />
                    <span>Select by Class</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-48 max-h-56 overflow-y-auto rounded-xl">
                    {uniqueClasses.length === 0 ? (
                      <DropdownMenuItem disabled className="text-xs">No classes detected</DropdownMenuItem>
                    ) : (
                      uniqueClasses.map((cls) => {
                        const count = rows.filter((r) => r.class_name === cls).length;
                        return (
                          <DropdownMenuItem
                            key={cls}
                            onClick={() => selectByClass(cls)}
                            className="text-xs cursor-pointer justify-between"
                          >
                            <span>Class {cls}</span>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {count}
                            </Badge>
                          </DropdownMenuItem>
                        );
                      })
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* Submenu for Specific Year Groups */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="text-xs cursor-pointer">
                    <GraduationCap className="w-3.5 h-3.5 mr-2 text-primary" />
                    <span>Select by Year Group</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-48 rounded-xl">
                    {uniqueYearGroups.length === 0 ? (
                      <DropdownMenuItem disabled className="text-xs">No year groups</DropdownMenuItem>
                    ) : (
                      uniqueYearGroups.map((yg) => {
                        const count = rows.filter((r) => r.year_group === yg).length;
                        return (
                          <DropdownMenuItem
                            key={yg}
                            onClick={() => selectByYearGroup(yg)}
                            className="text-xs cursor-pointer justify-between"
                          >
                            <span>{yg}</span>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {count}
                            </Badge>
                          </DropdownMenuItem>
                        );
                      })
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* Submenu for Houses */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="text-xs cursor-pointer">
                    <ShieldCheck className="w-3.5 h-3.5 mr-2 text-primary" />
                    <span>Select by House</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-48 rounded-xl">
                    {uniqueHouses.map((h) => {
                      const count = rows.filter((r) => r.house === h).length;
                      return (
                        <DropdownMenuItem
                          key={h}
                          onClick={() => selectByHouse(h)}
                          className="text-xs cursor-pointer justify-between"
                        >
                          <span>{h}</span>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {count}
                          </Badge>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* Submenu for Reading Achievement Tiers */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="text-xs cursor-pointer">
                    <Award className="w-3.5 h-3.5 mr-2 text-primary" />
                    <span>Select by Milestone</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-48 rounded-xl">
                    <DropdownMenuItem onClick={() => selectByTier('Gold')} className="text-xs cursor-pointer">
                      🥇 Gold Achievers (45+ bks)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => selectByTier('Silver')} className="text-xs cursor-pointer">
                      🥈 Silver Achievers (16+ bks)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => selectByTier('Bronze')} className="text-xs cursor-pointer">
                      🥉 Bronze Achievers (6+ bks)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => selectByTier('Active')} className="text-xs cursor-pointer">
                      ✨ Active Readers (1+ bks)
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {selectedUserIds.size > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={clearSelection}
                      className="text-xs text-destructive cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5 mr-2" />
                      Clear Selection ({selectedUserIds.size})
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Direct Send to Cohort Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="text-xs h-9 px-3.5 gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send to Cohort</span>
                  <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-80" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 rounded-xl">
                <DropdownMenuLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Direct Cohort Dispatch
                </DropdownMenuLabel>

                {selectedUserIds.size > 0 && (
                  <DropdownMenuItem
                    onClick={handleSendToSelected}
                    className="text-xs font-semibold cursor-pointer bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 focus:bg-emerald-500/20"
                  >
                    <Send className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                    Send to Selected ({selectedUserIds.size})
                  </DropdownMenuItem>
                )}

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="text-xs cursor-pointer">
                    <Building2 className="w-3.5 h-3.5 mr-2 text-primary" />
                    <span>Send to Specific Class</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-48 max-h-56 overflow-y-auto rounded-xl">
                    {uniqueClasses.map((cls) => {
                      const count = rows.filter((r) => r.class_name === cls).length;
                      return (
                        <DropdownMenuItem
                          key={cls}
                          onClick={() => handleSendToClass(cls)}
                          className="text-xs cursor-pointer justify-between"
                        >
                          <span>Class {cls}</span>
                          <span className="text-[10px] text-muted-foreground">({count})</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="text-xs cursor-pointer">
                    <GraduationCap className="w-3.5 h-3.5 mr-2 text-primary" />
                    <span>Send to Year Group</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-48 rounded-xl">
                    {uniqueYearGroups.map((yg) => {
                      const count = rows.filter((r) => r.year_group === yg).length;
                      return (
                        <DropdownMenuItem
                          key={yg}
                          onClick={() => handleSendToYearGroup(yg)}
                          className="text-xs cursor-pointer justify-between"
                        >
                          <span>{yg}</span>
                          <span className="text-[10px] text-muted-foreground">({count})</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => {
                    const active = rows.filter((r) => r.books > 0);
                    if (active.length === 0) {
                      toast.error('No active readers with completed books found.');
                      return;
                    }
                    const targets = active.map(computeTarget);
                    setSelectedUserIds(new Set(active.map((r) => r.user_id)));
                    setCertSingleTarget(null);
                    setCertBatchTargets(targets);
                    setCertModalOpen(true);
                  }}
                  className="text-xs cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-2 text-amber-500" />
                  All Active Readers ({activeReaders})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        {/* ACTIVE SELECTION FLOATING BANNER */}
        {selectedUserIds.size > 0 && (
          <div className="px-5 py-3 bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-transparent border-b border-amber-500/30 flex items-center justify-between gap-3 flex-wrap animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-amber-500 text-black font-extrabold text-xs">
                {selectedUserIds.size}
              </span>
              <span className="text-xs font-bold text-foreground">
                {selectedUserIds.size} {selectedUserIds.size === 1 ? 'scholar' : 'scholars'} selected
              </span>
              <span className="hidden sm:inline text-[11px] text-muted-foreground">
                (ready for immediate certificate generation and email dispatch)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSendToSelected}
                className="text-xs font-bold h-8 px-4 gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black border-0 shadow-sm"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Send Certificates ({selectedUserIds.size})</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearSelection}
                className="text-xs h-8 px-2.5 rounded-xl text-muted-foreground hover:text-foreground"
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p>Loading complete leaderboard...</p>
            </div>
          ) : sorted.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              No students found matching current filters.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  <TableRow>
                    {/* Bulk Selection Header Checkbox */}
                    <TableHead className="w-12 text-center px-3">
                      <Checkbox
                        checked={isAllFilteredSelected ? true : isSomeFilteredSelected ? 'indeterminate' : false}
                        onCheckedChange={toggleSelectAllFiltered}
                        aria-label="Select all visible scholars"
                        className="cursor-pointer"
                      />
                    </TableHead>
                    <TableHead className="w-14 text-center font-bold">Rank</TableHead>
                    <TableHead className="font-bold">Scholar Name</TableHead>
                    <TableHead className="font-bold">Cohort / Class</TableHead>
                    <TableHead className="font-bold">House</TableHead>
                    <TableHead className="text-center font-bold">Books &amp; Tier</TableHead>
                    <TableHead className="text-right font-bold">Total Points</TableHead>
                    <TableHead className="text-right font-bold min-w-[140px]">Certificate Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((s, idx) => {
                    const rank = idx + 1;
                    const house = s.house ? getHouseColor(s.house) : null;
                    const isSelected = selectedUserIds.has(s.user_id);
                    const lvl = computeStudentLevel(s.books, selectedChallenge);

                    return (
                      <TableRow
                        key={s.user_id}
                        onClick={() => toggleSelectOne(s.user_id)}
                        data-selected={isSelected}
                        className={cn(
                          'cursor-pointer transition-colors',
                          isSelected
                            ? 'bg-amber-500/10 dark:bg-amber-500/15 border-l-4 border-l-amber-500 font-medium'
                            : 'hover:bg-muted/40'
                        )}
                      >
                        {/* Checkbox Cell */}
                        <TableCell className="w-12 text-center px-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectOne(s.user_id)}
                            aria-label={`Select ${s.full_name}`}
                            className="cursor-pointer"
                          />
                        </TableCell>

                        {/* Rank */}
                        <TableCell className="text-center font-display font-bold text-xs">
                          <span
                            className={cn(
                              'inline-flex w-7 h-7 rounded-xl items-center justify-center',
                              rank === 1
                                ? 'bg-amber-500 text-black font-extrabold shadow-sm'
                                : rank === 2
                                ? 'bg-slate-300 text-black font-extrabold'
                                : rank === 3
                                ? 'bg-amber-700 text-white font-extrabold'
                                : 'text-muted-foreground'
                            )}
                          >
                            {rank}
                          </span>
                        </TableCell>

                        {/* Scholar Name & Email */}
                        <TableCell>
                          <div className="font-semibold text-foreground text-xs leading-tight">
                            {s.full_name}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {s.email}
                          </div>
                        </TableCell>

                        {/* Cohort & Class */}
                        <TableCell className="text-xs text-muted-foreground">
                          <div className="font-medium text-foreground">{s.year_group}</div>
                          {s.class_name && (
                            <span className="text-[11px] text-muted-foreground">Class {s.class_name}</span>
                          )}
                        </TableCell>

                        {/* House */}
                        <TableCell>
                          {house ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-xs"
                              style={{ background: house.hex }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                              {s.house}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>

                        {/* Books Read & Tier Badge */}
                        <TableCell className="text-center text-xs">
                          <div className="font-bold text-foreground">{s.books}</div>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[9px] py-0 px-1.5 font-bold uppercase mt-0.5',
                              lvl === 'Gold'
                                ? 'border-amber-500 text-amber-500 bg-amber-500/10'
                                : lvl === 'Silver'
                                ? 'border-slate-400 text-slate-300 bg-slate-500/10'
                                : lvl === 'Bronze'
                                ? 'border-orange-500 text-orange-500 bg-orange-500/10'
                                : lvl === 'Beginner'
                                ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10'
                                : 'border-muted-foreground/30 text-muted-foreground'
                            )}
                          >
                            {lvl}
                          </Badge>
                        </TableCell>

                        {/* Points */}
                        <TableCell className="text-right font-display font-bold text-sm text-amber-500">
                          {s.points} pts
                        </TableCell>

                        {/* Individual Row Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              onClick={(e) => handleSendToIndividual(s, e)}
                              className="text-[11px] h-7 px-2.5 font-bold gap-1 bg-amber-500 hover:bg-amber-400 text-black border-0 rounded-lg shadow-xs"
                              title="Award & Send Certificate"
                            >
                              <Award className="w-3.5 h-3.5" />
                              <span>Award</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStudent(s);
                              }}
                              className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                              title="Audit student submissions"
                            >
                              Inspect
                            </Button>
                          </div>
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

      {/* STUDENT CATEGORY DRILLDOWN MODAL */}
      <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              {selectedStudent?.full_name} — Reading Audit
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedStudent?.year_group} • {selectedStudent?.class_name} • {selectedStudent?.house} House
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border text-center">
              <div>
                <div className="text-xl font-bold font-display text-primary">{selectedStudent?.books}</div>
                <div className="text-[10px] uppercase text-muted-foreground">Books Read</div>
              </div>
              <div>
                <div className="text-xl font-bold font-display text-amber-500">{selectedStudent?.points}</div>
                <div className="text-[10px] uppercase text-muted-foreground">Points Earned</div>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold text-foreground">Categories Explored</span>
              {loadingDetail ? (
                <div className="p-4 text-center text-xs text-muted-foreground">Loading realms...</div>
              ) : !studentDetail || studentDetail.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No category submissions recorded yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {studentDetail.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-muted/30 text-xs">
                      <span className="truncate">{c.category_name}</span>
                      <Badge variant="outline" className="text-[10px] font-bold">
                        {c.count} {c.count === 1 ? 'book' : 'books'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedStudent(null)}
              className="text-xs rounded-xl"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CERTIFICATE DISPATCH STUDIO MODAL */}
      <CertificateDispatchModal
        open={certModalOpen}
        onOpenChange={setCertModalOpen}
        target={certSingleTarget}
        batchTargets={certBatchTargets}
        challengeTitle={selectedChallenge?.title || '45-Book Reading Challenge'}
        challengeId={selectedChallenge?.id || '45450000-2025-4026-8000-000000000045'}
        signatoryName="Tonny Odundo"
        signatoryTitle="Head Librarian & Director of Literacy"
        onDownloadPDF={(target) => {
          toast.success(`Generated official PDF Certificate for ${target.name}!`);
        }}
        onSuccess={() => {
          setCertModalOpen(false);
          clearSelection();
          toast.success('Certificate dispatched successfully across emails & student inboxes!');
        }}
      />
    </div>
  );
};
