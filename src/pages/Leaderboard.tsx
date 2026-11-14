import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useChallenges, normalizeChallengeId } from '@/contexts/ChallengeContext';
import Navbar from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/dialog';
import {
  Trophy,
  Users,
  BookOpen,
  GraduationCap,
  School,
  Search,
  FileDown,
  FileText,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import SEO from '@/components/SEO';
import { AppDownloadButton } from '@/components/AppDownloadBanner';
import { exportCSV, exportPDF, exportSchoolWideReportPDF, exportIndividualStudentRankingPDF, type ExportRow } from '@/lib/exporters';
import { POINTS_PER_BOOK, POINTS_FOR_JOINING, MILESTONES, HOUSE_COLORS, getHouseColor, normalizeYearGroup, YEAR_GROUPS } from '@/lib/constants';
import { safeStorage } from '@/lib/safeStorage';
import { cn } from '@/lib/utils';
import StudentBadgesShowcase from '@/components/StudentBadgesShowcase';
import { BadgeSubmissionInput } from '@/lib/badges';

interface Row {
  user_id: string;
  full_name: string;
  house: string | null;
  year_group: string | null;
  class_name: string | null;
  books: number;
  points: number;
  submissions?: BadgeSubmissionInput[];
}

interface GroupRow {
  name: string;
  readers: number;
  books: number;
  points: number;
}

const TONES = [
  'var(--v-green)',
  'var(--v-electric-blue)',
  'var(--v-yellow)',
  'var(--v-red)',
  'var(--v-orange)',
  'var(--v-fuchsia)',
  'var(--v-cyan)',
  'var(--v-violet)',
];

const PAGE_SIZE = 25;

const Leaderboard = () => {
  const { profile, user } = useAuth();
  const { selectedChallenge } = useChallenges();
  const isStaff = profile?.role && profile.role !== 'student';
  const isLibrarian = profile?.role === 'librarian' || profile?.role === 'admin';

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [scope, setScope] = useState<'all' | 'year' | 'house' | 'class'>('all');
  const [scopeValue, setScopeValue] = useState<string>('all');
  const [houseFilter, setHouseFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'points' | 'books'>('points');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false);

  // Drill-down
  const [selected, setSelected] = useState<Row | null>(null);
  const [detail, setDetail] = useState<{ category_name: string; count: number }[] | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const onUpdate = () => setRefreshKey((k) => k + 1);
    window.addEventListener('mfa_submission_created', onUpdate);
    window.addEventListener('mfa_submission_updated', onUpdate);
    window.addEventListener('storage', onUpdate);
    return () => {
      window.removeEventListener('mfa_submission_created', onUpdate);
      window.removeEventListener('mfa_submission_updated', onUpdate);
      window.removeEventListener('storage', onUpdate);
    };
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const isAll = !selectedChallenge || selectedChallenge.id === 'all';
        const isMaster = selectedChallenge?.id === '45450000-2025-4026-8000-000000000045';

        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, full_name, house, year_group, class_name')
          .eq('role', 'student');

        const allProfs: any[] = [...(profs || [])];
        if (profile && user?.id && !allProfs.some((p: any) => p.user_id === user.id)) {
          allProfs.push({
            user_id: user.id,
            full_name: profile.full_name || user.email?.split('@')[0] || 'Student Reader',
            house: profile.house,
            year_group: profile.year_group,
            class_name: profile.class_name,
          });
        }

        const map = new Map<string, { books: number; points: number }>();
        const submissionsMap = new Map<string, any[]>();
        const localAudit = safeStorage.getJSON<any[]>('mfa_submissions_audit', []);

        if (isAll) {
          // Combined leaderboard across all challenges
          const [bRes, cRes] = await Promise.all([
            supabase.from('book_submissions').select('user_id, points_earned, category_name, category_number, date_finished, created_at, reflection'),
            supabase.from('challenge_submissions').select('user_id, points_earned, category_name, category_number, date_finished, created_at, reflection'),
          ]);
          (bRes.data || []).forEach((s: any) => {
            const cur = map.get(s.user_id) || { books: 0, points: 0 };
            cur.books += 1;
            cur.points += s.points_earned || 10;
            map.set(s.user_id, cur);

            const userSubs = submissionsMap.get(s.user_id) || [];
            userSubs.push(s);
            submissionsMap.set(s.user_id, userSubs);
          });
          (cRes.data || []).forEach((s: any) => {
            const cur = map.get(s.user_id) || { books: 0, points: 0 };
            cur.books += 1;
            cur.points += s.points_earned || 10;
            map.set(s.user_id, cur);

            const userSubs = submissionsMap.get(s.user_id) || [];
            userSubs.push(s);
            submissionsMap.set(s.user_id, userSubs);
          });

          // Merge local audit submissions
          localAudit.forEach((aud: any) => {
            const uid = aud.user_id || user?.id;
            if (uid) {
              const cur = map.get(uid) || { books: 0, points: 0 };
              cur.books += 1;
              cur.points += Number(aud.points_earned || aud.pointsEarned || 10);
              map.set(uid, cur);

              const userSubs = submissionsMap.get(uid) || [];
              userSubs.push(aud);
              submissionsMap.set(uid, userSubs);
            }
          });

          const grandRows: Row[] = allProfs
            .map((p: any) => {
              const stats = map.get(p.user_id) || { books: 0, points: 0 };
              return {
                user_id: p.user_id,
                full_name: p.full_name || 'Student Reader',
                house: p.house,
                year_group: p.year_group,
                class_name: p.class_name,
                books: stats.books,
                points: stats.points,
                submissions: submissionsMap.get(p.user_id) || [],
              };
            })
            .filter((r) => r.books > 0 || r.points > 0);

          setRows(grandRows);
        } else if (isMaster) {
          // Query strictly for 45-book challenge
          const { data: subs } = await supabase
            .from('book_submissions')
            .select('user_id, points_earned, category_name, category_number, date_finished, created_at, reflection');

          (subs || []).forEach((s: any) => {
            const cur = map.get(s.user_id) || { books: 0, points: 0 };
            cur.books += 1;
            cur.points += s.points_earned || 10;
            map.set(s.user_id, cur);

            const userSubs = submissionsMap.get(s.user_id) || [];
            userSubs.push(s);
            submissionsMap.set(s.user_id, userSubs);
          });

          // Merge local audit for 45-book challenge
          localAudit.forEach((aud: any) => {
            const isTarget = !aud.challenge_id || aud.challenge_id === '45450000-2025-4026-8000-000000000045';
            const uid = aud.user_id || user?.id;
            if (isTarget && uid) {
              const cur = map.get(uid) || { books: 0, points: 0 };
              cur.books += 1;
              cur.points += Number(aud.points_earned || aud.pointsEarned || 10);
              map.set(uid, cur);

              const userSubs = submissionsMap.get(uid) || [];
              userSubs.push(aud);
              submissionsMap.set(uid, userSubs);
            }
          });

          const masterRows: Row[] = allProfs
            .map((p: any) => {
              const stats = map.get(p.user_id) || { books: 0, points: 0 };
              return {
                user_id: p.user_id,
                full_name: p.full_name || 'Student Reader',
                house: p.house,
                year_group: p.year_group,
                class_name: p.class_name,
                books: stats.books,
                points: stats.points,
                submissions: submissionsMap.get(p.user_id) || [],
              };
            })
            .filter((r) => r.books > 0 || r.points > 0);

          setRows(masterRows);
        } else {
          // Specific custom challenge strictly by challenge_id
          const normId = normalizeChallengeId(selectedChallenge.id);
          const queryIds = Array.from(new Set([selectedChallenge.id, normId].filter(Boolean) as string[]));
          const { data: subs } = await supabase
            .from('challenge_submissions')
            .select('user_id, points_earned, category_name, category_number, date_finished, created_at, reflection')
            .in('challenge_id', queryIds);

          (subs || []).forEach((s: any) => {
            const cur = map.get(s.user_id) || { books: 0, points: 0 };
            cur.books += 1;
            cur.points += s.points_earned || 10;
            map.set(s.user_id, cur);

            const userSubs = submissionsMap.get(s.user_id) || [];
            userSubs.push(s);
            submissionsMap.set(s.user_id, userSubs);
          });

          // Merge local audit matching this specific challenge
          localAudit.forEach((aud: any) => {
            const audNorm = normalizeChallengeId(aud.challenge_id);
            const isMatch = queryIds.includes(aud.challenge_id) || queryIds.includes(audNorm);
            const uid = aud.user_id || user?.id;
            if (isMatch && uid) {
              const cur = map.get(uid) || { books: 0, points: 0 };
              cur.books += 1;
              cur.points += Number(aud.points_earned || aud.pointsEarned || 10);
              map.set(uid, cur);

              const userSubs = submissionsMap.get(uid) || [];
              userSubs.push(aud);
              submissionsMap.set(uid, userSubs);
            }
          });

          const challengeRows: Row[] = allProfs
            .map((p: any) => {
              const stats = map.get(p.user_id) || { books: 0, points: 0 };
              return {
                user_id: p.user_id,
                full_name: p.full_name || 'Student Reader',
                house: p.house,
                year_group: p.year_group,
                class_name: p.class_name,
                books: stats.books,
                points: stats.points,
                submissions: submissionsMap.get(p.user_id) || [],
              };
            })
            .filter((r) => r.books > 0 || r.points > 0);

          setRows(challengeRows);
        }
      } catch (err) {
        console.warn("Could not load challenge leaderboard:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedChallenge, refreshKey, profile, user?.id]);

  useEffect(() => {
    setPage(1);
  }, [scope, scopeValue, sortBy, search, houseFilter, yearFilter, classFilter]);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    (async () => {
      if (selectedChallenge && selectedChallenge.id !== 'all' && selectedChallenge.id !== '45450000-2025-4026-8000-000000000045') {
        const normId = normalizeChallengeId(selectedChallenge.id);
        const queryIds = Array.from(new Set([selectedChallenge.id, normId].filter(Boolean) as string[]));
        const { data } = await supabase
          .from('challenge_submissions')
          .select('category_name')
          .in('challenge_id', queryIds)
          .eq('user_id', selected.user_id);
        const m = new Map<string, number>();
        (data ?? []).forEach((s: any) => m.set(s.category_name, (m.get(s.category_name) ?? 0) + 1));
        setDetail(Array.from(m, ([category_name, count]) => ({ category_name, count })).sort((a, b) => b.count - a.count));
      } else {
        const { data } = await supabase
          .from('book_submissions')
          .select('category_name')
          .eq('user_id', selected.user_id);
        const m = new Map<string, number>();
        (data ?? []).forEach((s: any) => m.set(s.category_name, (m.get(s.category_name) ?? 0) + 1));
        setDetail(Array.from(m, ([category_name, count]) => ({ category_name, count })).sort((a, b) => b.count - a.count));
      }
    })();
  }, [selected, selectedChallenge]);

  const classKey = (s: Row) => [s.year_group, s.class_name].filter(Boolean).join(' ');

  const classOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const c = classKey(r) || r.class_name;
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [rows]);

  const scopeOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const v =
        scope === 'year' ? r.year_group : scope === 'house' ? r.house : scope === 'class' ? classKey(r) : null;
      if (v) set.add(v);
    });
    return Array.from(set).sort();
  }, [rows, scope]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      // Direct House filter
      if (houseFilter !== 'all' && r.house !== houseFilter) return false;

      // Direct Year Group filter
      if (yearFilter !== 'all') {
        const matchesYear = normalizeYearGroup(r.year_group) === normalizeYearGroup(yearFilter);
        if (!matchesYear) return false;
      }

      // Direct Class filter
      if (classFilter !== 'all' && classKey(r) !== classFilter && r.class_name !== classFilter) return false;

      if (scope !== 'all' && scopeValue !== 'all') {
        const v =
          scope === 'year' ? r.year_group : scope === 'house' ? r.house : classKey(r);
        if ((v ?? '') !== scopeValue) return false;
      }

      if (q) {
        const matchesName = r.full_name?.toLowerCase().includes(q);
        const matchesHouse = r.house?.toLowerCase().includes(q) || (q === 'yellow' && r.house?.toLowerCase() === 'longonot') || (q === 'navy' && r.house?.toLowerCase() === 'kenya') || (q === 'red' && r.house?.toLowerCase() === 'kilimanjaro') || (q === 'green' && r.house?.toLowerCase() === 'elgon');
        const matchesYear = r.year_group?.toLowerCase().includes(q);
        const matchesClass = r.class_name?.toLowerCase().includes(q) || classKey(r)?.toLowerCase().includes(q);
        if (!matchesName && !matchesHouse && !matchesYear && !matchesClass) return false;
      }
      return true;
    });
  }, [rows, scope, scopeValue, search, houseFilter, yearFilter, classFilter, isStaff, isLibrarian, profile]);

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) =>
        sortBy === 'points' ? b.points - a.points || b.books - a.books : b.books - a.books || b.points - a.points
      ),
    [filtered, sortBy]
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const displayedRows = showFullLeaderboard ? sorted : pageRows;

  const groupBy = (key: 'house' | 'year_group' | 'class_name') => {
    const m = new Map<string, { name: string; readers: Set<string>; books: number; points: number }>();
    filtered.forEach((s) => {
      const k = key === 'class_name' ? classKey(s) : ((s as any)[key] as string | null);
      if (!k) return;
      const cur = m.get(k) ?? { name: k, readers: new Set<string>(), books: 0, points: 0 };
      cur.readers.add(s.user_id);
      cur.books += s.books;
      cur.points += s.points;
      m.set(k, cur);
    });
    return Array.from(m.values())
      .map((v) => ({ name: v.name, readers: v.readers.size, books: v.books, points: v.points }))
      .sort((a, b) => (sortBy === 'points' ? b.points - a.points : b.books - a.books));
  };

  const byHouse = useMemo(() => groupBy('house'), [filtered, sortBy]);
  const byYear = useMemo(() => groupBy('year_group'), [filtered, sortBy]);
  const byClass = useMemo(() => groupBy('class_name'), [filtered, sortBy]);

  const scopeLabel =
    scope === 'all' || scopeValue === 'all'
      ? 'Whole school'
      : `${scope === 'year' ? 'Year group' : scope === 'house' ? 'House' : 'Class'}: ${scopeValue}`;

  const studentExportRows = (): ExportRow[] =>
    sorted.map((s, i) => ({
      Rank: i + 1,
      Student: s.full_name,
      'Year Group': s.year_group ?? '',
      Class: classKey(s),
      House: s.house ?? '',
      Books: s.books,
      Points: s.points,
    }));

  const groupExportRows = (g: GroupRow[]): ExportRow[] =>
    g.map((r, i) => ({
      Rank: i + 1,
      Group: r.name,
      Readers: r.readers,
      Books: r.books,
      Points: r.points,
    }));

  const ExportBar = ({ rows: exportRows, name }: { rows: ExportRow[]; name: string }) => {
    // Exporting student files is restricted to librarians, teachers, and academy staff
    if (!isStaff) return null;

    const handleExportSchoolWide = () => {
      const reportData = {
        challengeTitle: selectedChallenge?.title || '45-Book Reading Challenge',
        totalBooks: rows.reduce((s, r) => s + r.books, 0),
        totalReaders: rows.filter((r) => r.books > 0).length,
        houses: byHouse.map((h) => ({
          house: h.name,
          color: h.name === 'Longonot' ? 'Yellow' : h.name === 'Kenya' ? 'Navy Blue' : h.name === 'Kilimanjaro' ? 'Red' : 'Green',
          books: h.books,
          readers: h.readers,
          points: h.points,
        })),
        yearGroups: byYear.map((y) => ({
          year: y.name,
          books: y.books,
          readers: y.readers,
          points: y.points,
        })),
        classes: byClass.map((c) => ({
          className: c.name,
          books: c.books,
          readers: c.readers,
          points: c.points,
        })),
        topStudents: sorted.slice(0, 30).map((s, idx) => ({
          rank: idx + 1,
          name: s.full_name,
          house: s.house || '-',
          yearGroup: s.year_group || '-',
          className: classKey(s) || '-',
          books: s.books,
          points: s.points,
        })),
      };
      exportSchoolWideReportPDF(reportData);
    };

    return (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          className="rounded-full text-xs font-semibold shadow-xs text-white border-0"
          style={{ background: 'linear-gradient(120deg, hsl(var(--v-green)), hsl(var(--v-cyan)))' }}
          onClick={handleExportSchoolWide}
        >
          <FileText className="w-3.5 h-3.5 mr-1.5" /> School-Wide Report (PDF)
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="rounded-full text-xs"
          onClick={() => exportPDF(exportRows, `${name}-${Date.now()}`, `45-Book Reading Challenge — ${name}`, scopeLabel)}
        >
          <FileText className="w-3.5 h-3.5 mr-1.5" /> Table (PDF)
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="rounded-full text-xs"
          onClick={() => exportCSV(exportRows, `${name}-${Date.now()}`)}
        >
          <FileDown className="w-3.5 h-3.5 mr-1.5" /> CSV
        </Button>
      </div>
    );
  };

  const Rank = ({ i }: { i: number }) => {
    const tone =
      i === 0 ? 'var(--v-yellow)' : i === 1 ? 'var(--v-cyan)' : i === 2 ? 'var(--v-orange)' : 'var(--muted-foreground)';
    return (
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0"
        style={{ background: `hsl(${tone})` }}
      >
        {i + 1}
      </div>
    );
  };

  const GroupList = ({ rows: gRows, label }: { rows: GroupRow[]; label: string }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {gRows.length} {label.toLowerCase()} • {scopeLabel}
        </p>
        <ExportBar rows={groupExportRows(gRows)} name={label} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {gRows.slice(0, 4).map((r, i) => {
          const isHouse = label === 'Houses';
          const house = isHouse ? getHouseColor(r.name) : null;
          const tone = house ? house.hsl : TONES[i % TONES.length];
          return (
            <Card
              key={r.name}
              className="rounded-2xl border-0 overflow-hidden shadow-sm"
              style={{
                background: house
                  ? `linear-gradient(135deg, ${house.bgLight}, hsl(var(--card)))`
                  : `linear-gradient(135deg, hsl(${tone} / 0.20), hsl(${tone} / 0.04))`,
                border: house ? `2px solid ${house.hex}` : `1px solid hsl(${tone} / 0.4)`,
              }}
            >
              <CardContent className="p-5 flex items-center gap-4">
                <Rank i={i} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg font-bold truncate">{r.name}</span>
                    {house && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wider"
                        style={{ background: house.hex }}
                      >
                        {house.colorName}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {r.readers} readers • {r.books} books
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="text-3xl font-display font-bold"
                    style={{ color: house ? house.hex : `hsl(${tone})` }}
                  >
                    {sortBy === 'points' ? r.points : r.books}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {sortBy === 'points' ? 'pts' : 'books'}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">All {label}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {gRows.map((r, i) => {
              const isHouse = label === 'Houses';
              const house = isHouse ? getHouseColor(r.name) : null;
              const tone = house ? house.hsl : TONES[i % TONES.length];
              return (
                <div
                  key={r.name}
                  className="flex items-center gap-3 p-3 rounded-xl transition"
                  style={{
                    background: house ? house.bgLight : `hsl(${tone} / 0.06)`,
                    border: house ? `1.5px solid ${house.hex}` : `1px solid hsl(${tone} / 0.25)`,
                  }}
                >
                  <Rank i={i} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{r.name}</span>
                      {house && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wider"
                          style={{ background: house.hex }}
                        >
                          {house.colorName}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r.readers} readers • {r.books} books
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="font-display text-xl font-bold"
                      style={{ color: house ? house.hex : `hsl(${tone})` }}
                    >
                      {r.points}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">pts</div>
                  </div>
                </div>
              );
            })}
            {gRows.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">No data yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const handleExportStudent = (s: Row, rank: number) => {
    const level = s.books >= 45 ? 'Gold' : s.books >= 30 ? 'Silver' : s.books >= 15 ? 'Bronze' : s.books > 0 ? 'Beginner' : 'None';
    exportIndividualStudentRankingPDF({
      studentName: s.full_name,
      email: '',
      house: s.house || 'Unassigned',
      yearGroup: s.year_group || 'General',
      className: classKey(s) || s.class_name || 'General',
      overallRank: rank,
      booksCount: s.books,
      totalPoints: s.points,
      level,
      challengeTitle: selectedChallenge?.title || '45-Book Reading Challenge',
      submissions: [
        {
          title: `${s.books} Books Verified & Completed`,
          author: `${s.points} Total Points Earned`,
          category: s.house ? `${s.house} House` : 'Academy Reader',
          points: s.points,
        },
      ],
    });
  };

  const StudentList = () => {
    // For students: They can see their OWN position, books, and points, but NOT others'
    if (!isStaff) {
      const myId = user?.id || profile?.user_id;
      const myIndex = sorted.findIndex(
        (r) =>
          (myId && r.user_id === myId) ||
          (profile?.full_name && r.full_name?.toLowerCase().trim() === profile.full_name.toLowerCase().trim())
      );
      const myRow = myIndex >= 0 ? sorted[myIndex] : null;
      const myRank = myIndex >= 0 ? myIndex + 1 : null;
      const house = (myRow?.house || profile?.house) ? getHouseColor(myRow?.house || profile?.house || '') : null;

      return (
        <div className="space-y-6">
          <Card className="rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm overflow-hidden">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Your Personal Reading Standing
                </CardTitle>
                <span className="px-3 py-1 rounded-full text-xs font-semibold border border-primary/40 text-primary bg-primary/10">
                  Private Standing
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {myRow && myRank ? (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-5 rounded-2xl bg-muted/40 border border-border">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-amber-500 text-black font-display font-extrabold text-2xl flex items-center justify-center shadow-md shrink-0">
                        #{myRank}
                      </div>
                      <div>
                        <div className="text-xl font-bold text-foreground">
                          {myRow.full_name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>Position <strong>#{myRank}</strong> of {sorted.length} active readers</span>
                          {myRow.year_group && <span>• {myRow.year_group}</span>}
                          {myRow.class_name && <span>• {myRow.class_name}</span>}
                          {house && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-xs",
                                myRow.house === "Longonot" ? "text-neutral-950 font-black" : "text-white"
                              )}
                              style={{ background: house.hex }}
                            >
                              <span className={cn("w-1.5 h-1.5 rounded-full", myRow.house === "Longonot" ? "bg-black/50" : "bg-white/50")} />
                              {house.colorName} ({myRow.house})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 text-center">
                      <div className="p-3 px-5 rounded-xl bg-card border border-border">
                        <div className="text-2xl font-bold font-display text-primary">{myRow.books}</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Books Read</div>
                      </div>
                      <div className="p-3 px-5 rounded-xl bg-card border border-border">
                        <div className="text-2xl font-bold font-display text-amber-500">{myRow.points}</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Points</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full text-xs font-semibold gap-1.5 text-primary border-primary/30"
                      onClick={() => handleExportStudent(myRow, myRank)}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Download My Official Ranking Certificate (PDF)
                    </Button>
                  </div>

                  {/* Student Milestone Badges Showcase */}
                  <div className="pt-4 border-t border-border/60">
                    <StudentBadgesShowcase
                      submissions={myRow.submissions || []}
                      totalPoints={myRow.points}
                      totalBooks={myRow.books}
                      profile={profile || { house: myRow.house }}
                      variant="full"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-muted mx-auto flex items-center justify-center text-muted-foreground">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-foreground text-base">You haven't logged any books yet!</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Submit your first verified book reflection for this challenge to activate your personal ranking position and earn house points.
                  </p>
                  <Button asChild size="sm" className="rounded-full text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black">
                    <Link to="/submit">Submit Book Now &rarr;</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Privacy Notice for Students */}
          <div className="p-5 rounded-2xl border border-border bg-card/60 flex items-start gap-3.5 text-xs shadow-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-foreground">
                Academy Reader Privacy &amp; Academic Integrity Policy
              </span>
              <p className="text-muted-foreground leading-relaxed">
                In accordance with academy standards and to foster each student's personal joy of reading without peer comparison, individual student positions and submissions are private to each scholar. You can track your personal ranking and verified points above, while aggregate team standings for Houses, Year Groups, and Classes are publicly accessible in the other tabs.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Staff view: full student leaderboard with search, pagination, PDF/CSV export
    return (
      <Card className="rounded-2xl">
        <CardHeader className="flex-row items-center justify-between gap-3 flex-wrap space-y-0">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" style={{ color: 'hsl(var(--v-yellow))' }} />
            Readers ({sorted.length})
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant={showFullLeaderboard ? "default" : "outline"}
              onClick={() => setShowFullLeaderboard(!showFullLeaderboard)}
              className={cn(
                "text-xs font-bold gap-1.5 rounded-xl h-8",
                showFullLeaderboard
                  ? "bg-amber-500 hover:bg-amber-400 text-black border-0 shadow-sm"
                  : "border-primary/40 text-primary hover:bg-primary/10"
              )}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>{showFullLeaderboard ? `Full View (${sorted.length})` : `View Full Leaderboard (${sorted.length})`}</span>
            </Button>
            <ExportBar rows={studentExportRows()} name="Students" />
          </div>
        </CardHeader>
        <CardContent>
          {showFullLeaderboard && (
            <div className="p-3 mb-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 text-xs text-amber-700 dark:text-amber-300">
              <div className="flex items-center gap-2 font-bold">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>👑 Full Unclipped Leaderboard Active: Showing all {sorted.length} readers without pagination.</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowFullLeaderboard(false)}
                className="h-6 text-[11px] text-amber-600 dark:text-amber-300 hover:underline shrink-0"
              >
                Switch to Paginated
              </Button>
            </div>
          )}

          <div className="space-y-2">
            {displayedRows.map((s, idx) => {
              const i = showFullLeaderboard ? idx : (page - 1) * PAGE_SIZE + idx;
              const house = s.house ? getHouseColor(s.house) : null;
              const tone = house ? house.hsl : TONES[i % TONES.length];
              return (
                <div
                  key={s.user_id}
                  onClick={() => setSelected(s)}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-xl hover:brightness-110 transition cursor-pointer"
                  style={{
                    background: house ? house.bgLight : `hsl(${tone} / 0.06)`,
                    border: house ? `1px solid ${house.hex}40` : `1px solid hsl(${tone} / 0.25)`,
                  }}
                >
                  <Rank i={i} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{s.full_name}</span>
                      <StudentBadgesShowcase
                        submissions={s.submissions || []}
                        totalPoints={s.points}
                        totalBooks={s.books}
                        profile={{ house: s.house }}
                        variant="mini-chips"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate mt-0.5">
                      {s.year_group && <span>{s.year_group}</span>}
                      {s.class_name && <span>• {s.class_name}</span>}
                      {s.house && house && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs ml-1",
                            s.house === "Longonot" ? "text-neutral-950 font-black" : "text-white"
                          )}
                          style={{ background: house.hex }}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full", s.house === "Longonot" ? "bg-black/50" : "bg-white/50")} />
                          {house.colorName}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-center px-3">
                    <div className="font-semibold">{s.books}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">books</div>
                  </div>
                  <div className="text-right">
                    <div
                      className="font-display text-xl font-bold"
                      style={{ color: house ? house.hex : `hsl(${tone})` }}
                    >
                      {s.points}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">pts</div>
                  </div>
                  {isStaff && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 rounded-lg text-xs font-semibold gap-1 text-primary hover:text-primary hover:bg-primary/10 shrink-0 ml-1 border-primary/30"
                      title={`Export PDF ranking for ${s.full_name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportStudent(s, i + 1);
                      }}
                    >
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      <span className="hidden sm:inline">PDF</span>
                    </Button>
                  )}
                </div>
              );
            })}
            {sorted.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">No readers match these filters.</p>
            )}
          </div>

          {!showFullLeaderboard && sorted.length > PAGE_SIZE && (
            <div className="flex items-center justify-between pt-4 mt-3 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages} ({sorted.length} total readers)
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const breakdown = (books: number) => {
    const joining = books > 0 ? POINTS_FOR_JOINING : 0;
    const reading = books * POINTS_PER_BOOK;
    const awards = MILESTONES.filter((m) => books >= m.books);
    return { joining, reading, awards, awardsTotal: awards.reduce((s, m) => s + m.bonus, 0) };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Leaderboard &amp; House Standings"
        description="Live school-wide reading challenge rankings across Kenya, Kilimanjaro, Longonot, and Elgon houses, year groups, classes, and individual student scholars."
        keywords="Leaderboard, House Rankings, Reading Standings, Kenya House, Kilimanjaro House, Longonot House, Elgon House, MFA Readers"
      />
      <Navbar />
      <main className="w-full max-w-none px-3 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="rounded-3xl p-6 sm:p-8 border border-border" style={{ background: 'var(--gradient-hero)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
                Active Standings: {selectedChallenge?.title || '45-Book Reading Challenge'}
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold">
                <span className="text-gradient-luminous">Challenge Leaderboard</span> 🏆
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Rankings and statistics specifically for <strong>{selectedChallenge?.title}</strong> ({selectedChallenge?.target_books} books goal).
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <AppDownloadButton label="Download App" className="text-xs h-9 shrink-0 gap-1.5" />
              <Button asChild variant="outline" size="sm" className="text-xs h-9 shrink-0 gap-1.5">
                <Link to={`/challenges?id=${selectedChallenge?.id}`}>
                  <Trophy className="w-3.5 h-3.5 text-amber-500" /> Challenge Details
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Staff Leadership Group Notice */}
        {isStaff && !isLibrarian && (
          <div className="p-4 rounded-2xl border border-primary/30 bg-primary/10 flex items-center gap-3 text-xs shadow-xs">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
            <div>
              <span className="font-bold text-foreground">
                Leadership Group Leaderboard:{" "}
                {profile?.role === 'head_of_year' ? `${profile.year_group || ''} Year Group` :
                 profile?.role === 'homeroom_tutor' ? `${profile.year_group || ''} ${profile.class_name || ''}` :
                 profile?.role === 'house_patron' ? `${profile.house || ''} House` : 'Your Assigned Cohort'}
              </span>
              <p className="text-muted-foreground mt-0.5">
                As a leadership staff member, you view student rankings, books read, and point positions strictly for the cohort you lead.
              </p>
            </div>
          </div>
        )}

        {/* Global Search and Filter Bar */}
        <Card className="rounded-2xl mb-6 border-border shadow-xs">
          <CardContent className="p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {/* Search by student name, house, or class level */}
              <div className="relative sm:col-span-2 lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by student name, house, or class level…"
                  className="pl-9 rounded-xl text-xs h-10"
                />
              </div>

              {/* House Filter */}
              <Select value={houseFilter} onValueChange={setHouseFilter}>
                <SelectTrigger className="rounded-xl text-xs h-10">
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

              {/* Year Group Filter */}
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="rounded-xl text-xs h-10">
                  <SelectValue placeholder="All Cohorts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cohorts</SelectItem>
                  <SelectItem value="DP2">DP2 (Senior Diploma)</SelectItem>
                  <SelectItem value="DP1">DP1 (Junior Diploma)</SelectItem>
                  <SelectItem value="G10">G10 (Pre-IB)</SelectItem>
                </SelectContent>
              </Select>

              {/* Class Level Filter */}
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="rounded-xl text-xs h-10">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-muted-foreground font-medium">Sort Order:</span>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="rounded-xl h-8 w-44 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="points">Points Earned (High to Low)</SelectItem>
                    <SelectItem value="books">Books Completed (High to Low)</SelectItem>
                  </SelectContent>
                </Select>

                {(search || houseFilter !== 'all' || yearFilter !== 'all' || classFilter !== 'all') && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSearch('');
                      setHouseFilter('all');
                      setYearFilter('all');
                      setClassFilter('all');
                      setScope('all');
                      setScopeValue('all');
                    }}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Reset Filters
                  </Button>
                )}
              </div>

              <div className="text-muted-foreground">
                Showing <strong className="text-foreground">{sorted.length}</strong> scholars in standings
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue={isStaff ? 'years' : 'houses'} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-6">
            <TabsTrigger value="years" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" /> Years
            </TabsTrigger>
            <TabsTrigger value="classes" className="flex items-center gap-2">
              <School className="w-4 h-4" /> Classes
            </TabsTrigger>
            <TabsTrigger value="houses" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Houses
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="w-4 h-4" /> Students
            </TabsTrigger>
          </TabsList>

          <TabsContent value="years">
            <GroupList rows={byYear} label="Year Groups" />
          </TabsContent>
          <TabsContent value="classes">
            <GroupList rows={byClass} label="Classes" />
          </TabsContent>
          <TabsContent value="houses">
            <GroupList rows={byHouse} label="Houses" />
          </TabsContent>
          <TabsContent value="students">
            <StudentList />
          </TabsContent>
        </Tabs>
      </main>

      {/* Point breakdown drill-down */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {selected?.full_name}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                {[selected.year_group, selected.class_name, selected.house].filter(Boolean).join(' • ')}
              </p>

              <div className="space-y-2">
                {(() => {
                  const b = breakdown(selected.books);
                  const items = [
                    { label: 'Joining the challenge', value: b.joining, tone: 'var(--v-cyan)' },
                    {
                      label: `Books completed (${selected.books} × ${POINTS_PER_BOOK})`,
                      value: b.reading,
                      tone: 'var(--v-green)',
                    },
                    ...b.awards.map((m) => ({
                      label: `${m.level} completion award (${m.books} books)`,
                      value: m.bonus,
                      tone: 'var(--v-yellow)',
                    })),
                  ];
                  return items.map((it) => (
                    <div
                      key={it.label}
                      className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: `hsl(${it.tone} / 0.08)`, border: `1px solid hsl(${it.tone} / 0.3)` }}
                    >
                      <span className="text-sm">{it.label}</span>
                      <span className="font-display font-bold" style={{ color: `hsl(${it.tone})` }}>
                        +{it.value}
                      </span>
                    </div>
                  ));
                })()}
                <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/40">
                  <span className="font-semibold text-sm">Total points</span>
                  <span className="font-display text-xl font-bold text-primary">{selected.points}</span>
                </div>
              </div>

              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Story categories
                </div>
                {detail === null ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : detail.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No category detail available.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {detail.map((d) => (
                      <div
                        key={d.category_name}
                        className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted"
                      >
                        <span className="truncate">{d.category_name}</span>
                        <span className="font-semibold">{d.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reading Milestone Badges & Honors */}
              <div className="pt-2 border-t border-border/60 space-y-2">
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                  <span>Reading Milestone Badges</span>
                  <span className="text-[10px] text-primary font-mono font-bold">Auto-Unlocked</span>
                </div>
                <StudentBadgesShowcase
                  submissions={selected.submissions || []}
                  totalPoints={selected.points}
                  totalBooks={selected.books}
                  profile={{ house: selected.house }}
                  variant="compact-ribbon"
                />
              </div>

              {isStaff && (
                <div className="space-y-2">
                  <Button
                    className="w-full rounded-xl text-xs font-semibold text-white border-0 shadow-sm"
                    style={{ background: 'linear-gradient(120deg, hsl(var(--v-green)), hsl(var(--v-cyan)))' }}
                    onClick={() => {
                      const studentRank = sorted.findIndex((r) => r.user_id === selected.user_id) + 1;
                      const level = selected.books >= 45 ? 'Gold' : selected.books >= 30 ? 'Silver' : selected.books >= 15 ? 'Bronze' : selected.books > 0 ? 'Beginner' : 'None';
                      exportIndividualStudentRankingPDF({
                        studentName: selected.full_name,
                        email: '',
                        house: selected.house || 'Unassigned',
                        yearGroup: selected.year_group || 'General',
                        className: [selected.year_group, selected.class_name].filter(Boolean).join(' ') || 'General',
                        overallRank: studentRank || 1,
                        booksCount: selected.books,
                        totalPoints: selected.points,
                        level,
                        challengeTitle: selectedChallenge?.title || '45-Book Reading Challenge',
                        submissions: (detail || []).map((d) => ({
                          title: `${d.count} Books Completed`,
                          author: 'Verified Log',
                          category: d.category_name,
                          points: d.count * 10,
                        })),
                      });
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" /> Export Student Ranking Report (PDF)
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl text-xs font-semibold"
                    onClick={() =>
                      exportPDF(
                        [
                          {
                            Student: selected.full_name,
                            'Year Group': selected.year_group ?? '',
                            Class: [selected.year_group, selected.class_name].filter(Boolean).join(' '),
                            House: selected.house ?? '',
                            Books: selected.books,
                            Points: selected.points,
                          },
                        ],
                        `${selected.full_name}-breakdown`,
                        `Point breakdown — ${selected.full_name}`
                      )
                    }
                  >
                    <FileDown className="w-4 h-4 mr-2" /> Export Data Table (CSV / PDF)
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Leaderboard;
