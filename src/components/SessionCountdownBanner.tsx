import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  Calendar, Clock, Sparkles, Lock, CheckCircle2, Hourglass
} from "lucide-react";
import { Link } from "react-router-dom";

export interface SessionDates {
  startDate: Date | null;
  endDate: Date | null;
  status: "upcoming" | "active" | "ended";
}

export function useSessionDates() {
  const [sessionDates, setSessionDates] = useState<SessionDates>({
    startDate: new Date("2026-09-01T08:00:00"),
    endDate: new Date("2027-07-31T23:59:59"),
    status: "active",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("system_settings")
          .select("setting_key, setting_value")
          .in("setting_key", ["reading_session_start", "reading_session_end", "reading_challenge_active"]);

        let start: Date | null = new Date("2026-09-01T08:00:00");
        let end: Date | null = new Date("2027-07-31T23:59:59");
        let adminDisabled = false;

        (data || []).forEach((row) => {
          if (row.setting_key === "reading_session_start" && row.setting_value) {
            const parsed = new Date(row.setting_value);
            if (!isNaN(parsed.getTime())) start = parsed;
          }
          if (row.setting_key === "reading_session_end" && row.setting_value) {
            const parsed = new Date(row.setting_value);
            if (!isNaN(parsed.getTime())) end = parsed;
          }
          if (row.setting_key === "reading_challenge_active" && row.setting_value === "false") {
            adminDisabled = true;
          }
        });

        const now = new Date();
        if (end && now > end && end.getFullYear() <= 2026) {
          end = new Date("2027-07-31T23:59:59");
        }

        let status: "upcoming" | "active" | "ended" = "active";
        if (adminDisabled) {
          status = "ended";
        } else if (start && now < start) {
          status = "upcoming";
        } else if (end && now > end) {
          status = "ended";
        }

        setSessionDates({ startDate: start, endDate: end, status });
      } catch (err) {
        console.warn("Could not load session dates:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { ...sessionDates, loading };
}

export function SessionCountdownBanner({ isLibrarian = false }: { isLibrarian?: boolean }) {
  const { startDate, endDate, status } = useSessionDates();
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    targetLabel: "Session Submissions Lock In",
  });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      let targetTime: number | null = null;
      let label = "Session Remaining";

      if (startDate && now < startDate.getTime()) {
        targetTime = startDate.getTime();
        label = "Submissions Open In";
      } else if (endDate && now < endDate.getTime()) {
        targetTime = endDate.getTime();
        label = "Submissions Lock In";
      }

      if (!targetTime) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, targetLabel: "Reading Session Concluded" });
        return;
      }

      const diff = Math.max(0, targetTime - now);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, targetLabel: label });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [startDate, endDate]);

  const formatDate = (d: Date | null) => {
    if (!d) return "TBD";
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className="rounded-3xl p-5 mb-8 shadow-2xl relative overflow-hidden space-y-4"
      style={{
        background:
          "linear-gradient(135deg, hsl(212 100% 56% / 0.16) 0%, hsl(270 90% 62% / 0.12) 35%, hsl(140 85% 48% / 0.10) 70%, hsl(50 100% 58% / 0.12) 100%)",
        border: "1px solid hsl(212 100% 56% / 0.35)",
        boxShadow: "0 18px 40px -12px hsl(222 45% 4% / 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
      }}
    >
      {/* Decorative background glow divs */}
      <div 
        className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-40"
        style={{ background: "hsl(var(--v-magenta) / 0.35)" }}
      />
      <div 
        className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-40"
        style={{ background: "hsl(var(--v-electric-blue) / 0.35)" }}
      />

      {/* TOP BAR DIV: Session Identity & Real-time Status Badge */}
      <div
        className="rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-md"
        style={{
          background: "linear-gradient(90deg, hsl(var(--card) / 0.95) 0%, hsl(var(--card) / 0.8) 100%)",
          border: "1px solid hsl(var(--primary) / 0.28)",
        }}
      >
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
            style={{
              background: "linear-gradient(135deg, hsl(var(--v-yellow)) 0%, hsl(var(--v-orange)) 100%)",
            }}
          >
            <Sparkles className="w-6 h-6 text-slate-950 font-bold" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-bold text-lg text-foreground tracking-wide">
                Academy Reading Session Window
              </span>
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                Academic Year 2026/2027
              </span>
            </div>
            <p className="text-xs text-foreground/80 mt-0.5">
              Official whole-school reading session portal &amp; real-time lock management.
            </p>
          </div>
        </div>

        {/* Status Pill Div */}
        <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
          {status === "active" && (
            <div
              className="rounded-2xl px-3.5 py-1.5 flex items-center gap-2 text-xs font-bold text-emerald-400 shadow-sm"
              style={{
                background: "linear-gradient(135deg, hsl(140 85% 48% / 0.22) 0%, hsl(160 80% 55% / 0.12) 100%)",
                border: "1px solid hsl(140 85% 48% / 0.45)",
              }}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>🟢 Submissions Window Active &amp; Open</span>
            </div>
          )}

          {status === "upcoming" && (
            <div
              className="rounded-2xl px-3.5 py-1.5 flex items-center gap-2 text-xs font-bold text-amber-300 shadow-sm"
              style={{
                background: "linear-gradient(135deg, hsl(50 100% 58% / 0.22) 0%, hsl(35 100% 55% / 0.12) 100%)",
                border: "1px solid hsl(50 100% 58% / 0.45)",
              }}
            >
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>⏳ Session Opening Soon</span>
            </div>
          )}

          {status === "ended" && (
            <div
              className="rounded-2xl px-3.5 py-1.5 flex items-center gap-2 text-xs font-bold text-rose-300 shadow-sm"
              style={{
                background: "linear-gradient(135deg, hsl(0 92% 58% / 0.22) 0%, hsl(350 92% 55% / 0.12) 100%)",
                border: "1px solid hsl(0 92% 58% / 0.45)",
              }}
            >
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>🔒 Submissions Concluded &amp; Locked</span>
            </div>
          )}

          {isLibrarian && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-8 text-xs font-bold rounded-xl border-primary/40 bg-primary/10 hover:bg-primary/20 text-foreground"
            >
              <Link to="/admin?s=settings">Edit Dates</Link>
            </Button>
          )}
        </div>
      </div>

      {/* TWO-COLUMN GRID OF LINEAR GRADIENT DIVS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CARD DIV 1: Session Dates & Schedule */}
        <div
          className="rounded-2xl p-4 flex flex-col justify-between space-y-3"
          style={{
            background:
              "linear-gradient(145deg, hsl(212 100% 56% / 0.15) 0%, hsl(222 35% 10% / 0.95) 100%)",
            border: "1px solid hsl(212 100% 56% / 0.32)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Official Timeline
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">Term Calendar</span>
          </div>

          <div className="space-y-2">
            {/* Start Date Div */}
            <div
              className="rounded-xl p-2.5 flex items-center justify-between"
              style={{
                background: "linear-gradient(90deg, hsl(212 100% 56% / 0.14) 0%, transparent 100%)",
                border: "1px solid hsl(212 100% 56% / 0.25)",
              }}
            >
              <span className="text-xs text-foreground/80 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Session Start:
              </span>
              <span className="text-xs font-bold text-foreground font-mono">
                {formatDate(startDate)}
              </span>
            </div>

            {/* Deadline Div */}
            <div
              className="rounded-xl p-2.5 flex items-center justify-between"
              style={{
                background: "linear-gradient(90deg, hsl(0 92% 58% / 0.14) 0%, transparent 100%)",
                border: "1px solid hsl(0 92% 58% / 0.28)",
              }}
            >
              <span className="text-xs text-foreground/80 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Lock Deadline:
              </span>
              <span className="text-xs font-bold text-rose-300 font-mono">
                {formatDate(endDate)}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground leading-snug">
            All submitted book reflections submitted before the deadline are reviewed by faculty.
          </p>
        </div>

        {/* CARD DIV 2: Live Countdown Clocks */}
        <div
          className="rounded-2xl p-4 flex flex-col justify-between space-y-3"
          style={{
            background:
              "linear-gradient(145deg, hsl(50 100% 58% / 0.15) 0%, hsl(25 100% 55% / 0.10) 50%, hsl(222 35% 10% / 0.95) 100%)",
            border: "1px solid hsl(50 100% 58% / 0.35)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Hourglass className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
              {timeLeft.targetLabel}
            </span>
            <span className="text-[10px] text-amber-300 font-semibold uppercase tracking-wider">
              Live Timer
            </span>
          </div>

          {/* 4 Unit Countdown Divs */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { val: timeLeft.days, label: "Days", tone: "var(--v-yellow)" },
              { val: timeLeft.hours, label: "Hours", tone: "var(--v-orange)" },
              { val: timeLeft.minutes, label: "Mins", tone: "var(--v-electric-blue)" },
              { val: timeLeft.seconds, label: "Secs", tone: "var(--v-emerald)" },
            ].map((unit, idx) => (
              <div
                key={idx}
                className="rounded-2xl p-2.5 flex flex-col items-center justify-center text-center shadow-md transition-transform hover:scale-105"
                style={{
                  background:
                    "linear-gradient(180deg, hsl(222 35% 15% / 0.95) 0%, hsl(222 45% 8% / 0.95) 100%)",
                  border: `1px solid hsl(${unit.tone} / 0.45)`,
                  boxShadow: `0 4px 14px -2px hsl(${unit.tone} / 0.15)`,
                }}
              >
                <span
                  className="font-mono text-xl sm:text-2xl font-black tracking-tight"
                  style={{ color: `hsl(${unit.tone})` }}
                >
                  {String(unit.val).padStart(2, "0")}
                </span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-foreground/75 mt-0.5">
                  {unit.label}
                </span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground text-center leading-snug">
            Real-time synchronized countdown across all scholar portals.
          </p>
        </div>
      </div>

      {/* BOTTOM METRIC PILLS BAR DIV */}
      <div
        className="rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs"
        style={{
          background:
            "linear-gradient(90deg, hsl(var(--card) / 0.95) 0%, hsl(212 100% 56% / 0.08) 50%, hsl(var(--card) / 0.95) 100%)",
          border: "1px solid hsl(var(--border) / 0.5)",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-foreground/90 font-medium">
            <strong>Target:</strong> 45 Books &amp; Reflections
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-foreground/90 font-medium">
            <strong>Points Reward:</strong> 10 Pts per Book + Milestone Honors
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-foreground/90 font-medium">
            <strong>Access:</strong> All Academy Houses &amp; Year Groups
          </span>
        </div>
      </div>
    </div>
  );
}
