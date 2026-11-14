import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  Sparkles,
  Lock,
  Hourglass,
  Target,
  Award,
  ShieldCheck,
  CheckCircle2,
  Sliders,
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
    targetLabel: "Submissions Lock In",
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

  const countdownUnits = [
    {
      val: timeLeft.days,
      label: "Days",
      tone: "var(--v-yellow)",
      accent: "var(--v-orange)",
      textClass: "text-amber-700 dark:text-amber-300",
    },
    {
      val: timeLeft.hours,
      label: "Hours",
      tone: "var(--v-orange)",
      accent: "var(--v-hot-pink)",
      textClass: "text-orange-700 dark:text-orange-300",
    },
    {
      val: timeLeft.minutes,
      label: "Mins",
      tone: "var(--v-electric-blue)",
      accent: "var(--v-cyan)",
      textClass: "text-blue-700 dark:text-blue-300",
    },
    {
      val: timeLeft.seconds,
      label: "Secs",
      tone: "var(--v-emerald)",
      accent: "var(--v-mint)",
      textClass: "text-emerald-700 dark:text-emerald-300",
    },
  ];

  const scopeCards = [
    {
      icon: Target,
      label: "Target Goal",
      value: "45 Books",
      tone: "var(--v-emerald)",
      accent: "var(--v-mint)",
      iconBg: "from-emerald-500 to-teal-600",
      labelColor: "text-emerald-700 dark:text-emerald-300",
    },
    {
      icon: Award,
      label: "Points Reward",
      value: "10 Pts / Book",
      tone: "var(--v-yellow)",
      accent: "var(--v-orange)",
      iconBg: "from-amber-500 to-orange-500",
      labelColor: "text-amber-700 dark:text-amber-300",
    },
    {
      icon: ShieldCheck,
      label: "Access",
      value: "All Houses",
      tone: "var(--v-violet)",
      accent: "var(--v-electric-blue)",
      iconBg: "from-violet-500 to-indigo-600",
      labelColor: "text-violet-700 dark:text-violet-300",
    },
  ];

  return (
    <section aria-label="Academy Reading Session Window">
      {/* Compact single-row bento grid of well-rounded, rotating linear-gradient floating divs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3.5 items-stretch">
        {/* DIV 1 (3 Cols): Session Identity & Live Status Card */}
        <div
          className="xl:col-span-3 rounded-3xl border p-4 shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between gap-3 rotating-gradient-card"
          style={{
            borderColor: "hsl(var(--v-violet) / 0.34)",
            backgroundImage:
              "linear-gradient(var(--grad-angle, 135deg), hsl(var(--v-violet) / 0.18) 0%, hsl(var(--card)) 48%, hsl(var(--v-electric-blue) / 0.18) 100%)",
          }}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-violet-700 dark:text-violet-300">
                2026/2027 Session
              </div>
              <h2 className="font-display font-bold text-sm sm:text-base text-foreground leading-snug mt-0.5">
                Reading Session Window
              </h2>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
            {status === "active" && (
              <div
                className="rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 border"
                style={{
                  borderColor: "hsl(var(--v-emerald) / 0.40)",
                  backgroundImage:
                    "linear-gradient(135deg, hsl(var(--v-emerald) / 0.22), hsl(var(--v-mint) / 0.12))",
                }}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Window Open</span>
              </div>
            )}

            {status === "upcoming" && (
              <div
                className="rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 border"
                style={{
                  borderColor: "hsl(var(--v-yellow) / 0.45)",
                  backgroundImage:
                    "linear-gradient(135deg, hsl(var(--v-yellow) / 0.22), hsl(var(--v-orange) / 0.12))",
                }}
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Opening Soon</span>
              </div>
            )}

            {status === "ended" && (
              <div
                className="rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 text-[11px] font-bold text-rose-700 dark:text-rose-300 border"
                style={{
                  borderColor: "hsl(var(--v-red) / 0.45)",
                  backgroundImage:
                    "linear-gradient(135deg, hsl(var(--v-red) / 0.22), hsl(var(--v-hot-pink) / 0.12))",
                }}
              >
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Window Locked</span>
              </div>
            )}

            {isLibrarian && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-[11px] font-bold rounded-xl border-primary/35 bg-background/80 hover:bg-primary/10 text-foreground gap-1 whitespace-nowrap shrink-0"
              >
                <Link to="/admin?s=controls">
                  <Sliders className="w-3 h-3 text-primary" />
                  <span>Edit Dates</span>
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* DIV 2 (3 Cols): Official Timeline Card */}
        <div
          className="xl:col-span-3 rounded-3xl border p-4 shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between gap-2.5 rotating-gradient-card"
          style={{
            borderColor: "hsl(var(--v-electric-blue) / 0.34)",
            backgroundImage:
              "linear-gradient(var(--grad-angle, 135deg), hsl(var(--v-electric-blue) / 0.18) 0%, hsl(var(--card)) 50%, hsl(var(--v-cyan) / 0.16) 100%)",
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Official Timeline
            </span>
          </div>

          <div className="space-y-2">
            <div
              className="rounded-2xl border p-2.5 flex items-center justify-between gap-2"
              style={{
                borderColor: "hsl(var(--v-electric-blue) / 0.28)",
                backgroundImage:
                  "linear-gradient(125deg, hsl(var(--v-electric-blue) / 0.16), hsl(var(--card) / 0.92))",
              }}
            >
              <span className="text-[11px] font-semibold text-foreground/85 shrink-0">Start</span>
              <span className="text-[11px] font-bold text-foreground font-mono tabular-nums truncate">
                {formatDate(startDate)}
              </span>
            </div>

            <div
              className="rounded-2xl border p-2.5 flex items-center justify-between gap-2"
              style={{
                borderColor: "hsl(var(--v-red) / 0.30)",
                backgroundImage:
                  "linear-gradient(125deg, hsl(var(--v-red) / 0.15), hsl(var(--card) / 0.92))",
              }}
            >
              <span className="text-[11px] font-semibold text-foreground/85 shrink-0">Locks</span>
              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 font-mono tabular-nums truncate">
                {formatDate(endDate)}
              </span>
            </div>
          </div>
        </div>

        {/* DIV 3 (4 Cols): Live Countdown Card with 4 Color-Coded Floating Unit Divs */}
        <div
          className="xl:col-span-4 rounded-3xl border p-4 shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between gap-2.5 rotating-gradient-card"
          style={{
            borderColor: "hsl(var(--v-yellow) / 0.38)",
            backgroundImage:
              "linear-gradient(var(--grad-angle, 135deg), hsl(var(--v-yellow) / 0.18) 0%, hsl(var(--card)) 50%, hsl(var(--v-orange) / 0.18) 100%)",
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
              <Hourglass className="w-3.5 h-3.5" />
              {timeLeft.targetLabel}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              Live
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {countdownUnits.map((unit) => (
              <div
                key={unit.label}
                className="rounded-2xl border p-2.5 flex flex-col items-center justify-center text-center shadow-sm rotating-gradient-card-fast"
                style={{
                  borderColor: `hsl(${unit.tone} / 0.40)`,
                  backgroundImage: `linear-gradient(var(--grad-angle, 135deg), hsl(${unit.tone} / 0.24) 0%, hsl(var(--card) / 0.94) 52%, hsl(${unit.accent} / 0.18) 100%)`,
                }}
              >
                <span className={`font-mono text-xl sm:text-2xl font-black tracking-tight tabular-nums ${unit.textClass}`}>
                  {String(unit.val).padStart(2, "0")}
                </span>
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-muted-foreground mt-0.5">
                  {unit.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* DIV 4 (2 Cols): 3 Compact Floating Scope Divs */}
        <div className="xl:col-span-2 grid grid-cols-3 xl:grid-cols-1 gap-2">
          {scopeCards.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-2xl border px-3 py-2 shadow-sm hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2.5 rotating-gradient-card"
                style={{
                  borderColor: `hsl(${item.tone} / 0.36)`,
                  backgroundImage: `linear-gradient(var(--grad-angle, 135deg), hsl(${item.tone} / 0.18) 0%, hsl(var(--card)) 52%, hsl(${item.accent} / 0.14) 100%)`,
                }}
              >
                <div
                  className={`w-7 h-7 rounded-xl bg-gradient-to-br ${item.iconBg} text-white flex items-center justify-center shrink-0 shadow-xs`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className={`text-[9px] font-extrabold uppercase tracking-wider truncate ${item.labelColor}`}>
                    {item.label}
                  </div>
                  <div className="text-[11px] font-bold text-foreground truncate">{item.value}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
