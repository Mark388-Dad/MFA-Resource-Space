import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { computeStudentLevel, getVerificationCode, CERTIFICATE_LEVEL_CONFIG, CertificateLevel } from "@/lib/certificateTypes";
import { HOUSES, YEAR_GROUPS, CLASSES, isYearGroupMatch } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  Users,
  BookOpen,
  Trophy,
  Award,
  Sparkles,
  RefreshCw,
  LayoutGrid,
  Table as TableIcon,
  Eye,
  UserCog,
  Trash2,
  Calendar,
  AlertCircle,
  FileCheck2,
  KeyRound,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { CreateUserDialog } from "@/components/LibrarianCommandCenter";
import AdminPasswordReset from "@/components/AdminPasswordReset";
import StudentBadgesShowcase from "@/components/StudentBadgesShowcase";
import { cn } from "@/lib/utils";

interface StudentRecord {
  user_id: string;
  full_name: string;
  email: string;
  admission_number?: string | null;
  house?: string | null;
  year_group?: string | null;
  class_name?: string | null;
  books_count: number;
  points_earned: number;
  level: CertificateLevel;
  flagged_count: number;
  pending_count: number;
  approved_count: number;
  submissions: any[];
}

export default function StudentProfilesManager() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterHouse, setFilterHouse] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [filterActivity, setFilterActivity] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Dialog states
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<StudentRecord | null>(null);

  // Edit student cohort state (Staff only capability)
  const [editFullName, setEditFullName] = useState("");
  const [editHouse, setEditHouse] = useState("");
  const [editYearGroup, setEditYearGroup] = useState("");
  const [editClassName, setEditClassName] = useState("");
  const [editAdmissionNumber, setEditAdmissionNumber] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (editingStudent) {
      setEditFullName(editingStudent.full_name || "");
      setEditHouse(editingStudent.house || "Kenya");
      setEditYearGroup(editingStudent.year_group || "DP1");
      setEditClassName(editingStudent.class_name || "");
      setEditAdmissionNumber(editingStudent.admission_number || "");
    }
  }, [editingStudent]);

  const handleSaveEditedStudent = async (e: React.FormEvent) => {
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
          admission_number: editAdmissionNumber.trim() || null,
        })
        .eq("user_id", editingStudent.user_id);

      if (error) throw error;
      toast.success(`Academic cohort updated for ${editFullName}.`);
      setEditingStudent(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update student cohort.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Load students & their submissions from Supabase
  const loadData = async () => {
    setLoading(true);
    try {
      const [profilesRes, subsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("role", "student")
          .order("full_name"),
        supabase
          .from("book_submissions")
          .select("*")
          .order("date_finished", { ascending: false }),
      ]);

      const profs = profilesRes.data ?? [];
      const subs = subsRes.data ?? [];

      // Group submissions by user_id
      const subsByUser = new Map<string, any[]>();
      subs.forEach((s) => {
        const list = subsByUser.get(s.user_id) || [];
        list.push(s);
        subsByUser.set(s.user_id, list);
      });

      const records: StudentRecord[] = profs.map((p) => {
        const userSubs = subsByUser.get(p.user_id) || [];
        const approved = userSubs.filter((s) => s.approval_status === "approved" || !s.approval_status);
        const flagged = userSubs.filter((s) => s.approval_status === "flagged");
        const pending = userSubs.filter((s) => s.approval_status === "pending");
        
        // Count valid approved/unrejected books
        const validCount = userSubs.filter((s) => s.approval_status !== "rejected").length;
        const totalPoints = approved.reduce((sum, s) => sum + (s.points_earned || 3), 0);

        return {
          user_id: p.user_id,
          full_name: (p.full_name || p.email?.split("@")[0] || "Student").toUpperCase(),
          email: p.email || "",
          admission_number: p.admission_number,
          house: p.house || "Kenya",
          year_group: p.year_group || "DP1",
          class_name: p.class_name,
          books_count: validCount,
          points_earned: totalPoints,
          level: computeStudentLevel(validCount),
          flagged_count: flagged.length,
          pending_count: pending.length,
          approved_count: approved.length,
          submissions: userSubs,
        };
      });

      // Sort by books_count desc, then name
      records.sort((a, b) => b.books_count - a.books_count || a.full_name.localeCompare(b.full_name));
      setStudents(records);
    } catch (err) {
      console.error("Error loading students:", err);
      toast.error("Failed to load student profiles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered students
  const filtered = useMemo(() => {
    return students.filter((st) => {
      // Strict role-based group assignment filter for staff and librarians
      if (profile?.house && st.house && st.house.toLowerCase() !== profile.house.toLowerCase()) return false;
      if (profile?.year_group && st.year_group && st.year_group.toLowerCase() !== profile.year_group.toLowerCase()) return false;
      if (profile?.class_name && st.class_name && st.class_name.toLowerCase() !== profile.class_name.toLowerCase()) return false;

      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        st.full_name.toLowerCase().includes(q) ||
        st.email.toLowerCase().includes(q) ||
        (st.admission_number && st.admission_number.toLowerCase().includes(q));

      const matchesHouse = filterHouse === "all" || st.house === filterHouse;
      const matchesYear = filterYear === "all" || isYearGroupMatch(st.year_group, filterYear);
      const matchesClass = filterClass === "all" || st.class_name === filterClass;
      const matchesLevel = filterLevel === "all" || st.level === filterLevel;
      const matchesActivity =
        filterActivity === "all"
          ? true
          : filterActivity === "active"
          ? st.books_count > 0
          : st.books_count === 0;

      return matchesSearch && matchesHouse && matchesYear && matchesClass && matchesLevel && matchesActivity;
    });
  }, [students, search, filterHouse, filterYear, filterClass, filterLevel, filterActivity, profile]);

  // High-level statistics
  const stats = useMemo(() => {
    const total = students.length;
    const active = students.filter((s) => s.books_count > 0).length;
    const zero = total - active;
    const totalBooks = students.reduce((sum, s) => sum + s.books_count, 0);

    // House breakdown
    const houseBooks: Record<string, number> = {};
    students.forEach((s) => {
      if (s.house) houseBooks[s.house] = (houseBooks[s.house] || 0) + s.books_count;
    });
    const topHouse = Object.entries(houseBooks).sort((a, b) => b[1] - a[1])[0]?.[0] || "Kenya";

    return { total, active, zero, totalBooks, topHouse };
  }, [students]);

  const handleDelete = async () => {
    if (!deletingStudent) return;
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { target_user_id: deletingStudent.user_id },
      });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error ?? error?.message ?? "Failed to delete student");
        return;
      }
      toast.success(`Removed student ${deletingStudent.full_name}`);
      setDeletingStudent(null);
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Deletion failed");
    }
  };

  const getHouseColor = (h?: string | null) => {
    switch (h) {
      case "Kenya":
        return "bg-[#00205B]/15 text-[#00205B] dark:text-[#93c5fd] border-[#00205B]/40 font-semibold";
      case "Longonot":
        return "bg-[#EAB308]/20 text-[#a16207] dark:text-[#fde047] border-[#EAB308]/40 font-semibold";
      case "Kilimanjaro":
        return "bg-[#D32F2F]/15 text-[#D32F2F] dark:text-[#f87171] border-[#D32F2F]/40 font-semibold";
      case "Elgon":
        return "bg-[#2E7D32]/15 text-[#2E7D32] dark:text-[#86efac] border-[#2E7D32]/40 font-semibold";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Students</p>
              <p className="text-2xl font-bold font-display text-foreground mt-1">{stats.total}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Enrolled readers</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Readers</p>
              <p className="text-2xl font-bold font-display text-emerald-500 mt-1">{stats.active}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{stats.zero} currently at 0 books</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Logged</p>
              <p className="text-2xl font-bold font-display text-amber-500 mt-1">{stats.totalBooks}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Books verified</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top House</p>
              <p className="text-2xl font-bold font-display text-sky-500 mt-1">{stats.topHouse}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Leading the challenge</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Bar: Search, Filters, Add Student, Refresh */}
      <Card className="rounded-2xl border-border bg-card">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by student name, email, or admission #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 text-xs rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
                className="gap-1.5 h-10 rounded-xl text-xs font-semibold"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                Refresh
              </Button>
              <CreateUserDialog defaultRole="student" onCreated={loadData} />
              <AdminPasswordReset />
              <div className="flex items-center border rounded-xl overflow-hidden p-0.5 bg-muted/40">
                <Button
                  size="icon"
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  className="h-8 w-8 rounded-lg"
                  onClick={() => setViewMode("grid")}
                  title="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant={viewMode === "table" ? "default" : "ghost"}
                  className="h-8 w-8 rounded-lg"
                  onClick={() => setViewMode("table")}
                  title="Table view"
                >
                  <TableIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
            <div>
              <Label className="text-[10px] text-muted-foreground font-semibold uppercase">House</Label>
              <Select value={filterHouse} onValueChange={setFilterHouse}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="All Houses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Houses</SelectItem>
                  {HOUSES.map((h) => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] text-muted-foreground font-semibold uppercase">Cohort / Year</Label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="All Cohorts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cohorts</SelectItem>
                  {YEAR_GROUPS.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] text-muted-foreground font-semibold uppercase">Class</Label>
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {CLASSES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] text-muted-foreground font-semibold uppercase">Reading Level</Label>
              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="Gold">🥇 Gold (45 books)</SelectItem>
                  <SelectItem value="Silver">🥈 Silver (30-44 books)</SelectItem>
                  <SelectItem value="Bronze">🥉 Bronze (15-29 books)</SelectItem>
                  <SelectItem value="Beginner">🧭 Beginner (1-14 books)</SelectItem>
                  <SelectItem value="Not Started">⭕ 0 Books</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] text-muted-foreground font-semibold uppercase">Activity Status</Label>
              <Select value={filterActivity} onValueChange={setFilterActivity}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="All Students" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students ({students.length})</SelectItem>
                  <SelectItem value="active">Active Readers ({stats.active})</SelectItem>
                  <SelectItem value="zero">Zero Books ({stats.zero})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student List View */}
      {loading ? (
        <Card className="rounded-2xl border-border bg-card p-12 text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-primary" />
          <p className="text-sm font-semibold">Loading student profiles and reading progress...</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl border-border bg-card p-12 text-center">
          <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-base font-semibold">No students match your selected filters</p>
          <p className="text-xs text-muted-foreground mt-1">Try resetting your search query or filters.</p>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((st) => {
            const levelCfg = CERTIFICATE_LEVEL_CONFIG[st.level];
            const percent = Math.min(Math.round((st.books_count / 45) * 100), 100);

            return (
              <Card
                key={st.user_id}
                className="rounded-2xl border-border bg-card hover:border-primary/50 transition-all duration-200 overflow-hidden shadow-sm"
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary/40 text-primary-foreground font-display font-bold text-base flex items-center justify-center shrink-0 shadow-sm">
                        {st.full_name[0] || "?"}
                      </div>
                      <div className="min-w-0">
                        <div className="font-display font-bold text-sm truncate text-foreground">
                          {st.full_name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{st.email}</div>
                        {st.admission_number && (
                          <div className="text-[10px] text-muted-foreground/80 font-mono">
                            Adm: #{st.admission_number}
                          </div>
                        )}
                      </div>
                    </div>

                    <Badge variant="outline" className={cn("text-[10px] shrink-0 font-semibold border", getHouseColor(st.house))}>
                      {st.house}
                    </Badge>
                  </div>

                  {/* Badges: Cohort, Class, Level */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                    <Badge variant="secondary" className="text-[10px]">
                      {st.year_group || "DP1"}
                    </Badge>
                    {st.class_name && (
                      <Badge variant="outline" className="text-[10px]">
                        {st.class_name}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className="text-[10px] font-semibold gap-1 border-primary/30"
                    >
                      <span>{levelCfg.medal}</span> {st.level}
                    </Badge>
                    {st.flagged_count > 0 && (
                      <Badge variant="destructive" className="text-[10px] gap-1">
                        <AlertCircle className="w-2.5 h-2.5" /> {st.flagged_count} Flagged
                      </Badge>
                    )}
                  </div>

                  {/* Milestone Badges Chips */}
                  <StudentBadgesShowcase
                    submissions={st.submissions || []}
                    totalPoints={st.points_earned}
                    totalBooks={st.books_count}
                    profile={{ house: st.house }}
                    variant="mini-chips"
                  />

                  {/* Reading Progress */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-primary" />
                        {st.books_count} / 45 books
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">{percent}%</span>
                    </div>
                    <Progress value={percent} className="h-2 rounded-full" />
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="pt-2 border-t border-border flex items-center justify-between gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5 font-semibold"
                      onClick={() => setSelectedStudent(st)}
                    >
                      <Eye className="w-3.5 h-3.5 text-primary" /> View Profile
                    </Button>

                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 text-xs gap-1 font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20"
                        onClick={() => {
                          navigate(
                            `/admin?s=certificates&student=${encodeURIComponent(st.full_name)}&books=${st.books_count}&level=${st.level}&email=${encodeURIComponent(st.email)}`
                          );
                        }}
                        title="Generate verifiable certificate"
                      >
                        <Award className="w-3.5 h-3.5" /> Certificate
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => setEditingStudent(st)}
                        title="Edit profile"
                      >
                        <UserCog className="w-4 h-4" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => setDeletingStudent(st)}
                        title="Delete student"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <Card className="rounded-2xl border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Student</th>
                  <th className="text-left px-4 py-3 font-semibold">House</th>
                  <th className="text-left px-4 py-3 font-semibold">Cohort / Class</th>
                  <th className="text-left px-4 py-3 font-semibold">Level</th>
                  <th className="text-left px-4 py-3 font-semibold">Books Read</th>
                  <th className="text-left px-4 py-3 font-semibold">Points</th>
                  <th className="text-right px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((st) => {
                  const levelCfg = CERTIFICATE_LEVEL_CONFIG[st.level];
                  return (
                    <tr key={st.user_id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <div className="font-semibold text-foreground">{st.full_name}</div>
                        <div className="text-[11px] text-muted-foreground">{st.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn("text-[10px]", getHouseColor(st.house))}>
                          {st.house}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {st.year_group || "DP1"} · {st.class_name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 font-semibold">
                          <span>{levelCfg.medal}</span> {st.level}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-foreground">
                        {st.books_count} / 45
                      </td>
                      <td className="px-4 py-3 font-semibold text-amber-500">
                        +{st.points_earned}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setSelectedStudent(st)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1 text-primary" /> View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-amber-600 dark:text-amber-400 border-amber-500/30"
                            onClick={() => {
                              navigate(
                                `/admin?s=certificates&student=${encodeURIComponent(st.full_name)}&books=${st.books_count}&level=${st.level}&email=${encodeURIComponent(st.email)}`
                              );
                            }}
                          >
                            <Award className="w-3.5 h-3.5 mr-1" /> Certificate
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => setEditingStudent(st)}
                            title="Edit cohort (House, Year, Class)"
                          >
                            <UserCog className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => setDeletingStudent(st)}
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
        </Card>
      )}

      {/* Detailed Student Profile Modal */}
      {selectedStudent && (
        <Dialog open={!!selectedStudent} onOpenChange={(v) => !v && setSelectedStudent(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-6">
            <DialogHeader className="border-b pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/40 text-primary-foreground font-display font-bold text-lg flex items-center justify-center shrink-0">
                    {selectedStudent.full_name[0] || "?"}
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold font-display">
                      {selectedStudent.full_name}
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground">{selectedStudent.email}</p>
                    {selectedStudent.admission_number && (
                      <p className="text-[11px] text-muted-foreground/80 font-mono">
                        Admission #{selectedStudent.admission_number}
                      </p>
                    )}
                  </div>
                </div>

                <Badge variant="outline" className={cn("text-xs font-semibold px-2.5 py-1", getHouseColor(selectedStudent.house))}>
                  {selectedStudent.house} House
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-6 pt-2">
              {/* Quick stats grid */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-muted/40 border border-border">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Books Read</p>
                  <p className="text-xl font-bold font-display text-primary mt-0.5">{selectedStudent.books_count}</p>
                  <p className="text-[10px] text-muted-foreground">Goal: 45 books</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Level</p>
                  <p className="text-xl font-bold font-display text-amber-500 mt-0.5">
                    {CERTIFICATE_LEVEL_CONFIG[selectedStudent.level].medal} {selectedStudent.level}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Current tier</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Points</p>
                  <p className="text-xl font-bold font-display text-emerald-500 mt-0.5">+{selectedStudent.points_earned}</p>
                  <p className="text-[10px] text-muted-foreground">Total earned</p>
                </div>
              </div>

              {/* Verified Certificate Card */}
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Award className="w-4 h-4" /> Official Reading Certificate
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Serial: <code className="font-mono">{getVerificationCode(selectedStudent.email || selectedStudent.user_id)}</code>
                  </p>
                </div>
                <Button
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5"
                  onClick={() => {
                    setSelectedStudent(null);
                    navigate(
                      `/admin?s=certificates&student=${encodeURIComponent(selectedStudent.full_name)}&books=${selectedStudent.books_count}&level=${selectedStudent.level}&email=${encodeURIComponent(selectedStudent.email)}`
                    );
                  }}
                >
                  <Award className="w-3.5 h-3.5" /> Studio View
                </Button>
              </div>

              {/* Milestone Badges & Honors */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border">
                <StudentBadgesShowcase
                  submissions={selectedStudent.submissions || []}
                  totalPoints={selectedStudent.points_earned}
                  totalBooks={selectedStudent.books_count}
                  profile={{ house: selectedStudent.house }}
                  variant="compact-ribbon"
                />
              </div>

              {/* Submissions Reading History */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                    Reading History ({selectedStudent.submissions.length})
                  </h4>
                  {selectedStudent.flagged_count > 0 && (
                    <Badge variant="destructive" className="text-[10px]">
                      {selectedStudent.flagged_count} Flagged For Review
                    </Badge>
                  )}
                </div>

                {selectedStudent.submissions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground bg-muted/20">
                    No books submitted by this student yet.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {selectedStudent.submissions.map((sub, idx) => (
                      <div
                        key={sub.id || idx}
                        className={cn(
                          "rounded-xl border p-3 text-xs space-y-1.5 bg-background/50",
                          sub.approval_status === "flagged"
                            ? "border-destructive/40 bg-destructive/5"
                            : "border-border"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-foreground text-sm">
                            {sub.title}{" "}
                            <span className="font-normal text-muted-foreground text-xs">by {sub.author}</span>
                          </div>
                          <Badge
                            variant={sub.approval_status === "flagged" ? "destructive" : "secondary"}
                            className="text-[10px] capitalize shrink-0"
                          >
                            {sub.approval_status || "Approved"}
                          </Badge>
                        </div>

                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                          <span>Category: <b>{sub.category_name}</b></span>
                          <span>·</span>
                          <span>Finished: {sub.date_finished ? new Date(sub.date_finished).toLocaleDateString() : "—"}</span>
                          <span>·</span>
                          <span className="text-amber-500 font-semibold">+{sub.points_earned || 3} pts</span>
                        </div>

                        {sub.reflection && (
                          <div className="p-2 rounded-lg bg-muted/40 text-[11px] text-foreground/90 italic line-clamp-3">
                            "{sub.reflection}"
                          </div>
                        )}

                        {sub.ai_feedback && (
                          <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-[11px] text-destructive flex items-start gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{sub.ai_feedback}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="border-t pt-4">
              <Button variant="outline" onClick={() => setSelectedStudent(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Modal */}
      {deletingStudent && (
        <Dialog open={!!deletingStudent} onOpenChange={(v) => !v && setDeletingStudent(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete student account?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to permanently remove <b>{deletingStudent.full_name}</b> ({deletingStudent.email})?
              All reading submissions and records will be deleted.
            </p>
            <DialogFooter className="pt-3">
              <Button variant="outline" onClick={() => setDeletingStudent(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete Permanently</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Staff Edit Student Dialog: Class Name, Year Group, House */}
      {editingStudent && (
        <Dialog open={!!editingStudent} onOpenChange={(v) => !v && setEditingStudent(null)}>
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCog className="w-5 h-5 text-primary" /> Edit Scholar Academic Cohort
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Staff modification for <b>{editingStudent.full_name}</b> ({editingStudent.email}). Students cannot edit their cohort after registration.
              </p>
            </DialogHeader>

            <form onSubmit={handleSaveEditedStudent} className="space-y-4 pt-2">
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
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span>Year Group / Cohort</span>
                  <span className="text-[10px] text-amber-500 font-bold">*Mandatory</span>
                </Label>
                <Select value={editYearGroup} onValueChange={setEditYearGroup}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select Year Group (Grade 11, 12...)" /></SelectTrigger>
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

              <div className="space-y-1.5">
                <Label className="text-xs">Admission Number</Label>
                <Input
                  value={editAdmissionNumber}
                  onChange={(e) => setEditAdmissionNumber(e.target.value)}
                  placeholder="e.g. MFA-2024-089"
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
