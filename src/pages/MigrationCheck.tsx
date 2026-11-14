import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { YEAR_GROUPS } from "@/lib/constants";
import { AlertTriangle, CheckCircle2, RefreshCw, Users, Trophy } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useChallenges } from "@/contexts/ChallengeContext";

type Row = { label: string; count: number };

interface Mismatch {
  source: string;
  id: string;
  who: string;
  value: string;
  issue: string;
}

const VALID = YEAR_GROUPS as readonly string[];

const MigrationCheck = () => {
  const { profile } = useAuth();
  const { selectedChallenge, selectedChallengeId } = useChallenges();
  const isStaff = !!profile && profile.role !== "student";
  const [loading, setLoading] = useState(true);
  const [yearCounts, setYearCounts] = useState<Row[]>([]);
  const [roleCounts, setRoleCounts] = useState<Row[]>([]);
  const [mismatches, setMismatches] = useState<Mismatch[]>([]);
  const [submissionCounts, setSubmissionCounts] = useState<Row[]>([]);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: pending }, { data: subs }] = await Promise.all([
      supabase.from("profiles").select("id, user_id, full_name, email, role, year_group"),
      supabase.from("pending_submissions").select("id, student_name, email, year_group, imported_at"),
      supabase.from("book_submissions").select("id, user_id"),
    ]);

    const p = profiles ?? [];
    const students = p.filter((r) => r.role === "student");

    setYearCounts(
      VALID.map((y) => ({ label: y, count: students.filter((s) => s.year_group === y).length })),
    );
    setRoleCounts(
      Object.entries(
        p.reduce<Record<string, number>>((acc, r) => {
          acc[r.role] = (acc[r.role] ?? 0) + 1;
          return acc;
        }, {}),
      ).map(([label, count]) => ({ label, count })),
    );

    const issues: Mismatch[] = [];
    students.forEach((s) => {
      if (!s.year_group) {
        issues.push({ source: "Profile", id: s.id, who: s.full_name, value: "—", issue: "No year group set" });
      } else if (!VALID.includes(s.year_group)) {
        issues.push({
          source: "Profile",
          id: s.id,
          who: s.full_name,
          value: s.year_group,
          issue: "Retired year group (needs promotion)",
        });
      }
    });

    (pending ?? []).forEach((r) => {
      if (r.imported_at) return;
      if (!r.year_group || !VALID.includes(r.year_group)) {
        issues.push({
          source: "Pending entry",
          id: r.id,
          who: r.student_name || r.email,
          value: r.year_group || "—",
          issue: "Year group missing or retired",
        });
        return;
      }
      const match = p.find((x) => x.email?.toLowerCase() === r.email?.toLowerCase());
      if (match && match.year_group && match.year_group !== r.year_group) {
        issues.push({
          source: "Pending entry",
          id: r.id,
          who: r.student_name || r.email,
          value: `${r.year_group} → profile is ${match.year_group}`,
          issue: "Does not match student profile",
        });
      }
    });

    const knownUsers = new Set(p.map((x) => x.user_id));
    const orphanSubs = (subs ?? []).filter((s) => !knownUsers.has(s.user_id));
    orphanSubs.forEach((s) =>
      issues.push({ source: "Submission", id: s.id, who: "Unknown user", value: "—", issue: "No matching profile" }),
    );

    const byYear = VALID.map((y) => {
      const ids = new Set(students.filter((s) => s.year_group === y).map((s) => s.user_id));
      return { label: y, count: (subs ?? []).filter((s) => ids.has(s.user_id)).length };
    });
    setSubmissionCounts(byYear);
    setMismatches(issues);
    setLoading(false);
  };

  useEffect(() => {
    if (isStaff) load();
  }, [isStaff]);

  if (profile && !isStaff) {
    return <div className="p-8 text-muted-foreground">Staff access only.</div>;
  }

  const tone = ["--v-mint", "--v-cyan", "--v-amber"];

  return (
    <div className="p-4 md:p-8 space-y-6">
      <Helmet>
        <title>Year Group Migration Check | Reading Challenge</title>
        <meta name="description" content="Admin view of student counts per year group and any mismatched submissions or pending entries." />
      </Helmet>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Year Group Migration Check</h1>
          <p className="text-muted-foreground text-sm">
            Counts per year group (DP2, DP1, G10) plus anything that still points at old data.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="p-4 rounded-2xl border border-primary/30 bg-primary/5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl shrink-0">
            {selectedChallenge?.badge_icon || "🏆"}
          </div>
          <div>
            <div className="text-xs uppercase font-bold text-muted-foreground">Active Challenge Scope</div>
            <div className="font-bold text-base text-foreground">{selectedChallenge?.title}</div>
            <div className="text-xs text-muted-foreground">
              Allowed Year Groups: {selectedChallenge?.allowed_year_groups?.join(", ") || "All Year Groups (Whole School)"}
            </div>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          Goal: {selectedChallenge?.target_books || 45} Books
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {yearCounts.map((r, i) => (
          <Card key={r.label} className="overflow-hidden">
            <div className="h-1.5" style={{ background: `hsl(var(${tone[i % tone.length]}))` }} />
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" /> {r.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{r.count}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {submissionCounts.find((s) => s.label === r.label)?.count ?? 0} book submissions
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Accounts by role</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {roleCounts.map((r) => (
              <Badge key={r.label} variant="secondary" className="text-xs">
                {r.label.replace(/_/g, " ")}: {r.count}
              </Badge>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {mismatches.length === 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              )}
              Migration status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{mismatches.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {mismatches.length === 0 ? "Everything is aligned with DP2 / DP1 / G10." : "items need attention"}
            </p>
          </CardContent>
        </Card>
      </div>

      {mismatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mismatched records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {mismatches.slice(0, 100).map((m) => (
              <div
                key={`${m.source}-${m.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{m.source}</Badge>
                  <span className="font-medium">{m.who}</span>
                </div>
                <div className="text-muted-foreground text-xs">
                  {m.value} — {m.issue}
                </div>
              </div>
            ))}
            {mismatches.length > 100 && (
              <p className="text-xs text-muted-foreground">Showing first 100 of {mismatches.length}.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MigrationCheck;
