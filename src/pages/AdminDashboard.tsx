import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Navbar from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Search, Users, BookOpen, Trophy, Filter, Library, Clock, BookOpenCheck, FileWarning, Megaphone, FolderUp, IdCard, Award, Calendar as CalendarIcon, Home as HomeIcon, RefreshCw, KeyRound, Files, UserCog, Layers, Plus, ListChecks, Flag, ShieldCheck, Mail } from 'lucide-react';
import AdminPasswordReset from '@/components/AdminPasswordReset';
import { CreateUserDialog } from '@/components/LibrarianCommandCenter';
import LibrarianCommandCenter from '@/components/LibrarianCommandCenter';
import StaffCohortBroadcastDialog from '@/components/StaffCohortBroadcastDialog';
import { HOUSES, YEAR_GROUPS, CLASSES, isYearGroupMatch } from '@/lib/constants';
import { computeStudentLevel } from '@/lib/certificateTypes';
import { format } from 'date-fns';
import { useChallenges } from '@/contexts/ChallengeContext';
import { AppDownloadButton } from '@/components/AppDownloadBanner';
import { SessionCountdownBanner } from '@/components/SessionCountdownBanner';

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

const AdminDashboard = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { challenges, selectedChallenge, selectedChallengeId } = useChallenges();
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

  const isAssignedGroup = (userGroup: { class_name?: string | null; year_group?: string | null; house?: string | null } | null | undefined) => {
    if (isCreator) return true; // Creator has whole-school program administration access
    if (!userGroup) return false;
    // Strict RBAC: If staff or librarian has an assigned house, restrict strictly to that house
    if (profile?.house && userGroup.house && userGroup.house.toLowerCase() !== profile.house.toLowerCase()) {
      return false;
    }
    // Strict RBAC: If staff or librarian has an assigned year group, restrict strictly to that year group
    if (profile?.year_group && userGroup.year_group && userGroup.year_group.toLowerCase() !== profile.year_group.toLowerCase()) {
      return false;
    }
    // Strict RBAC: If staff or librarian has an assigned class, restrict strictly to that class
    if (profile?.class_name && userGroup.class_name && userGroup.class_name.toLowerCase() !== profile.class_name.toLowerCase()) {
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

    // Safety timeout: Ensure loading is never stuck indefinitely
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

        // Fetch all profiles
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, year_group, class_name, house');

        if (profilesData) {
          const profileMap = new Map(profilesData.map(p => [p.user_id, p]));
          const enrichedSubmissions = submissionsData.map(sub => ({
            ...sub,
            profiles: profileMap.get(sub.user_id) || null
          }));
          if (mounted) setSubmissions(enrichedSubmissions as unknown as SubmissionWithProfile[]);
        }

        // Fetch pending submissions
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

  const filteredSubmissions = submissions.filter(sub => {
    // Staff & librarians only see submissions filtered by their specific group assignments
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

  const filteredPending = pendingSubmissions.filter(sub => {
    // Staff & librarians only see pending submissions for their assigned group
    if (!isAssignedGroup({ house: sub.house, year_group: sub.year_group, class_name: sub.class_name })) return false;

    const matchesSearch = 
      sub.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesHouse = filterHouse === 'all' || sub.house === filterHouse;
    const matchesYear = filterYear === 'all' || isYearGroupMatch(sub.year_group, filterYear);

    return matchesSearch && matchesHouse && matchesYear;
  });

  const exportToCSV = () => {
    const dataToExport = activeTab === 'submissions' ? filteredSubmissions : filteredPending;
    
    if (activeTab === 'submissions') {
      const headers = ['Student Name', 'Email', 'Year Group', 'Class', 'House', 'Category', 'Book Title', 'Author', 'Date Started', 'Date Finished', 'Points', 'Reflection'];
      const rows = filteredSubmissions.map(sub => [
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

      const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
      downloadCSV(csv, 'book_submissions.csv');
    } else {
      const headers = ['Student Name', 'Email', 'Year Group', 'Class', 'House', 'Category', 'Book Title', 'Author', 'Date Started', 'Date Finished', 'Reflection'];
      const rows = filteredPending.map(sub => [
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

      const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
      downloadCSV(csv, 'pending_submissions.csv');
    }
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="p-8 rounded-3xl border border-border bg-card shadow-2xl max-w-sm w-full space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-bold text-base text-foreground">Loading Librarian Portal...</h3>
            <p className="text-xs text-muted-foreground">Preparing submissions, cohorts, and reading logs</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs w-full mt-2"
            onClick={() => setLoading(false)}
          >
            Skip to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="p-8 rounded-3xl border border-border bg-card shadow-xl max-w-md w-full space-y-4">
          <ShieldCheck className="w-12 h-12 text-primary mx-auto" />
          <h2 className="text-xl font-bold font-display text-foreground">Academy Staff &amp; Librarian Portal</h2>
          <p className="text-xs text-muted-foreground">
            This administrative area is for academy librarians, patrons, and faculty leaders.
          </p>
          <div className="pt-2 flex justify-center">
            <Button asChild size="sm" className="gap-2">
              <Link to="/dashboard">Go to Student &amp; Scholar Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalBooks = filteredSubmissions.length;
  const totalPending = filteredPending.length;
  const uniqueStudents = new Set(filteredSubmissions.map(s => s.user_id)).size;
  const totalPoints = filteredSubmissions.reduce((sum, s) => sum + s.points_earned, 0);

  const isWideWorkspace = isLibrarian && (commandSection === "broadcast" || commandSection === "certificates" || commandSection === "submissions");

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Admin &amp; Librarian Command Center — MFA Reading Challenge</title>
        <meta name="description" content="Manage reading challenges, student reflections, cohort broadcasts, and certified achievement dispatches for M-PESA Foundation Academy." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <Navbar />
      
      <main className="w-full max-w-none px-2 sm:px-4 md:px-5 py-4 transition-all duration-300">
        {/* Live Session Countdown & Deadline Window (Visible to all staff and librarians) */}
        <SessionCountdownBanner isLibrarian={isLibrarian} />

        {isLibrarian ? (
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
        ) : (
          <>
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-2 bg-primary/10 text-primary border border-primary/20">
                <ShieldCheck className="w-3.5 h-3.5" /> ACADEMY LEADERSHIP COHORT
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-1">
                {profile?.role === 'head_of_year' ? `${profile.year_group || ''} Head of Year Dashboard` :
                 profile?.role === 'homeroom_tutor' ? `${profile.year_group || ''} ${profile.class_name || ''} Tutor Dashboard` :
                 profile?.role === 'house_patron' ? `${profile.house || ''} House Patron Dashboard` :
                 'Staff Leadership Dashboard'} 📊
              </h1>
              <p className="text-muted-foreground text-sm">
                Viewing books, positions, and active challenge submissions exclusively for your assigned leadership cohort.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <StaffCohortBroadcastDialog
                staffRole={profile?.role}
                yearGroup={profile?.year_group}
                className={profile?.class_name}
                house={profile?.house}
              />
              <AppDownloadButton label="Download App" className="h-9 text-xs font-semibold" />
            </div>
          </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, book title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-xs font-semibold text-primary truncate max-w-xs">
                <span>{selectedChallenge?.badge_icon || "🏆"}</span>
                <span className="truncate">{selectedChallenge?.title || "All Challenges"}</span>
              </div>
              <Select value={filterHouse} onValueChange={setFilterHouse}>
                <SelectTrigger className="w-full lg:w-40">
                  <SelectValue placeholder="House" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Houses</SelectItem>
                  {HOUSES.map(house => (
                    <SelectItem key={house} value={house}>{house}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-full lg:w-40">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {YEAR_GROUPS.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="w-full lg:w-40">
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {CLASSES.map(cls => (
                    <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={exportToCSV} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
              <StaffCohortBroadcastDialog
                staffRole={profile?.role}
                yearGroup={profile?.year_group}
                className={profile?.class_name}
                house={profile?.house}
              />
              {isLibrarian && (
                <>
                  <CreateUserDialog defaultRole="student" onCreated={() => window.location.reload()} />
                  <AdminPasswordReset />
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tab Buttons */}
        <div className="flex gap-2 mb-6">
          <Button 
            variant={activeTab === 'submissions' ? 'default' : 'outline'}
            onClick={() => setActiveTab('submissions')}
          >
            Registered Submissions ({filteredSubmissions.length})
          </Button>
          <Button 
            variant={activeTab === 'pending' ? 'default' : 'outline'}
            onClick={() => setActiveTab('pending')}
          >
            Pending Import ({filteredPending.length})
          </Button>
          {isLibrarian && (
            <Button 
              variant="outline"
              onClick={() => setCommandSection('certificates')}
              className="gap-2 text-amber-400 hover:text-amber-300 border-amber-500/30 hover:border-amber-500/50"
            >
              <Award className="w-4 h-4" />
              Certificates
            </Button>
          )}
        </div>

        {/* Submissions Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {activeTab === 'submissions' ? 'All Submissions' : 'Pending Submissions (From CSV Import)'}
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                      <TableHead className="text-right">Action</TableHead>
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
                          <Badge variant="outline">{sub.profiles?.house}</Badge>
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
                        <TableCell className="text-sm">
                          {format(new Date(sub.date_finished), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-gold">+{sub.points_earned}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          {isLibrarian ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 border-gold/30 hover:bg-gold/10 hover:text-gold"
                              onClick={() => {
                                const studentName = sub.profiles?.full_name || 'Student';
                                const userBooks = submissions.filter((s) => s.user_id === sub.user_id).length || 1;
                                const level = computeStudentLevel(userBooks);
                                navigate(`/admin?s=certificates&student=${encodeURIComponent(studentName)}&books=${userBooks}&level=${level}&email=${encodeURIComponent(sub.profiles?.email || '')}`);
                              }}
                            >
                              <Award className="w-3.5 h-3.5 text-gold" /> Certificate
                            </Button>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">
                              Verified
                            </Badge>
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
                      <TableHead className="text-right">Action</TableHead>
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
                          <div className="text-sm">{sub.year_group} {sub.class_name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{sub.house}</Badge>
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
                        <TableCell className="text-sm">
                          {format(new Date(sub.date_finished), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          {isLibrarian ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 border-gold/30 hover:bg-gold/10 hover:text-gold"
                              onClick={() => {
                                const studentName = sub.student_name || 'Student';
                                const userBooks = pendingSubmissions.filter((p) => (p.email && p.email === sub.email) || p.student_name === sub.student_name).length || 1;
                                const level = computeStudentLevel(userBooks);
                                navigate(`/admin?s=certificates&student=${encodeURIComponent(studentName)}&books=${userBooks}&level=${level}&email=${encodeURIComponent(sub.email || '')}`);
                              }}
                            >
                              <Award className="w-3.5 h-3.5 text-gold" /> Certificate
                            </Button>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">
                              View Only
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {(activeTab === 'submissions' ? filteredSubmissions : filteredPending).length === 0 && (
                <p className="text-center text-muted-foreground py-12">
                  No submissions found matching your filters.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        </>
        )}
      </main>

    </div>
  );
};

export default AdminDashboard;
