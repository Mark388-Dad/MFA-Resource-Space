import React, { useState } from "react";
import { useChallenges, ALL_CHALLENGES_ID } from "@/contexts/ChallengeContext";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy, PlusCircle, CheckCircle2, UserCheck, Target, Sparkles, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export const ActiveChallengeHeaderBanner: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { selectedChallenge, selectedChallengeId, isRegistered, registerForChallenge } = useChallenges();
  const { profile } = useAuth();
  const location = useLocation();
  const [registering, setRegistering] = useState(false);

  const isAll = selectedChallengeId === ALL_CHALLENGES_ID;
  const isLocked = selectedChallenge?.status === "locked";
  const isClosed = selectedChallenge?.status === "closed" || selectedChallenge?.is_active === false;
  const isStudent = profile?.role === "student";

  const challengeRegistered = selectedChallenge ? isRegistered(selectedChallenge.id) : true;

  const handleRegister = async () => {
    if (!selectedChallenge) return;
    setRegistering(true);
    await registerForChallenge(selectedChallenge.id);
    setRegistering(false);
  };

  const submissionTypeLabel = (() => {
    const st = selectedChallenge?.submission_type;
    if (st === "poem") return "Poetry & Verses";
    if (st === "essay") return "Essays & Research";
    if (st === "art") return "Art & Comics";
    if (st === "article") return "Articles";
    if (st === "audio") return "Audio & Podcasts";
    return "Books & Reviews";
  })();

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-12 gap-3 mb-4", className)}>
      {/* DIV 1: Challenge Identity Tile */}
      <div
        className="md:col-span-5 rounded-3xl border p-3.5 shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-3 min-w-0 rotating-gradient-card"
        style={{
          borderColor: "hsl(var(--v-electric-blue) / 0.32)",
          backgroundImage:
            "linear-gradient(var(--grad-angle, 135deg), hsl(var(--v-electric-blue) / 0.18) 0%, hsl(var(--card)) 52%, hsl(var(--v-emerald) / 0.16) 100%)",
        }}
      >
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 text-white flex items-center justify-center shrink-0 text-lg shadow-sm">
          <span>{selectedChallenge?.badge_icon || "🏆"}</span>
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase font-extrabold tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1">
            <Sparkles className="w-3 h-3 shrink-0" />
            <span>Active Challenge</span>
          </div>
          <div className="font-display font-bold text-sm text-foreground truncate mt-0.5">
            {selectedChallenge?.title || "All Academy Reading Challenges"}
          </div>
        </div>
      </div>

      {/* DIV 2: Format, Target & Points Tile */}
      <div
        className="md:col-span-4 rounded-3xl border p-3.5 shadow-md hover:-translate-y-0.5 transition-all duration-200 grid grid-cols-3 gap-2 items-center rotating-gradient-card"
        style={{
          borderColor: "hsl(var(--v-yellow) / 0.34)",
          backgroundImage:
            "linear-gradient(var(--grad-angle, 135deg), hsl(var(--v-yellow) / 0.16) 0%, hsl(var(--card)) 52%, hsl(var(--v-violet) / 0.15) 100%)",
        }}
      >
        <div className="rounded-2xl bg-background/70 border border-border/60 px-2.5 py-1.5 min-w-0">
          <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground truncate">Format</div>
          <div className="text-[11px] font-bold text-foreground truncate">{submissionTypeLabel}</div>
        </div>
        <div className="rounded-2xl bg-background/70 border border-border/60 px-2.5 py-1.5 min-w-0">
          <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
            <Target className="w-2.5 h-2.5 text-emerald-500 shrink-0" /> Goal
          </div>
          <div className="text-[11px] font-bold text-foreground tabular-nums truncate">
            {selectedChallenge?.target_books || 10} Entries
          </div>
        </div>
        <div className="rounded-2xl bg-background/70 border border-border/60 px-2.5 py-1.5 min-w-0">
          <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground truncate">Reward</div>
          <div className="text-[11px] font-extrabold text-amber-600 dark:text-amber-300 tabular-nums truncate">
            +{selectedChallenge?.points_reward || 100} Pts
          </div>
        </div>
      </div>

      {/* DIV 3: Status & Quick Actions Tile */}
      <div
        className="md:col-span-3 rounded-3xl border p-3.5 shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between gap-2 rotating-gradient-card"
        style={{
          borderColor: isLocked
            ? "hsl(var(--v-yellow) / 0.38)"
            : isClosed
            ? "hsl(var(--border))"
            : "hsl(var(--v-emerald) / 0.34)",
          backgroundImage: isLocked
            ? "linear-gradient(var(--grad-angle, 135deg), hsl(var(--v-yellow) / 0.18) 0%, hsl(var(--card)) 55%, hsl(var(--v-orange) / 0.14) 100%)"
            : isClosed
            ? "linear-gradient(var(--grad-angle, 135deg), hsl(var(--muted)) 0%, hsl(var(--card)) 100%)"
            : "linear-gradient(var(--grad-angle, 135deg), hsl(var(--v-emerald) / 0.18) 0%, hsl(var(--card)) 55%, hsl(var(--v-cyan) / 0.14) 100%)",
        }}
      >
        <div className="min-w-0">
          <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Status</div>
          {isAll ? (
            <div className="text-xs font-extrabold text-primary truncate">Combined View</div>
          ) : isLocked ? (
            <div className="text-xs font-extrabold text-amber-700 dark:text-amber-300 flex items-center gap-1 truncate">
              <Lock className="w-3 h-3 shrink-0" /> Locked
            </div>
          ) : isClosed ? (
            <div className="text-xs font-bold text-muted-foreground truncate">Concluded</div>
          ) : (
            <div className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-1 truncate">
              <CheckCircle2 className="w-3 h-3 shrink-0" /> Accepting
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isStudent && !isAll && !challengeRegistered && (
            <Button
              size="sm"
              onClick={handleRegister}
              disabled={registering}
              className="h-8 rounded-xl text-[11px] font-bold gap-1 bg-amber-500 hover:bg-amber-600 text-slate-950 border-0 whitespace-nowrap shrink-0"
            >
              <UserCheck className="w-3 h-3" />
              <span>{registering ? "Joining..." : "Join"}</span>
            </Button>
          )}

          {location.pathname !== "/challenges" && (
            <Button asChild variant="outline" size="sm" className="h-8 rounded-xl text-[11px] font-semibold gap-1 bg-background/80 whitespace-nowrap shrink-0">
              <Link to={`/challenges?id=${selectedChallenge?.id || "all"}`}>
                <Trophy className="w-3 h-3 text-amber-500" />
                <span>Details</span>
              </Link>
            </Button>
          )}

          {isStudent && selectedChallenge?.is_active && location.pathname !== "/submit" && (
            <Button
              asChild
              size="sm"
              className="h-8 rounded-xl text-[11px] font-bold gap-1 text-white border-0 whitespace-nowrap shrink-0"
              style={{ background: "linear-gradient(120deg, hsl(var(--v-green)), hsl(var(--v-cyan)))" }}
            >
              <Link
                to={
                  selectedChallenge && selectedChallenge.id !== ALL_CHALLENGES_ID
                    ? `/submit?challenge=${selectedChallenge.id}`
                    : "/submit"
                }
              >
                <PlusCircle className="w-3 h-3" />
                <span>Submit</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
