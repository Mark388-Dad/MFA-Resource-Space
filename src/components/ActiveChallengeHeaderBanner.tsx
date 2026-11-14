import React, { useState } from "react";
import { useChallenges, ALL_CHALLENGES_ID } from "@/contexts/ChallengeContext";
import { Link, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, BookOpen, PlusCircle, CheckCircle2, UserCheck, Sparkles, Feather } from "lucide-react";
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

  const statusBadge = isAll ? (
    <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] font-bold py-0.5">
      COMBINED VIEW
    </Badge>
  ) : isLocked ? (
    <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold py-0.5">
      🔒 LOCKED
    </Badge>
  ) : isClosed ? (
    <Badge variant="outline" className="text-muted-foreground border-border text-[10px] font-bold py-0.5">
      ⚪ CONCLUDED
    </Badge>
  ) : (
    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold py-0.5">
      🟢 ACCEPTING ENTRIES
    </Badge>
  );

  const submissionTypeLabel = (() => {
    const st = selectedChallenge?.submission_type;
    if (st === "poem") return "✍️ Poetry & Verses";
    if (st === "essay") return "📝 Essays & Research";
    if (st === "art") return "🎨 Art & Comics";
    if (st === "article") return "📰 Articles";
    if (st === "audio") return "🎙️ Audio & Podcasts";
    return "📚 Books & Reviews";
  })();

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card/90 backdrop-blur p-3 sm:p-4 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs transition-all",
        className
      )}
      style={{
        borderLeftWidth: "4px",
        borderLeftColor: selectedChallenge?.accent_color
          ? `hsl(${selectedChallenge.accent_color})`
          : "hsl(var(--primary))",
      }}
    >
      {/* Challenge Summary */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-xl shadow-xs">
          <span>{selectedChallenge?.badge_icon || "🏆"}</span>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              Active Challenge
            </span>
            {statusBadge}
            <Badge variant="outline" className="text-[10px] font-medium py-0 border-border">
              {submissionTypeLabel}
            </Badge>
            <span className="hidden sm:inline text-xs text-muted-foreground">·</span>
            <span className="hidden sm:inline text-xs font-semibold text-muted-foreground">
              Goal: {selectedChallenge?.target_books || 10} Entries
            </span>
            <span className="hidden sm:inline text-xs text-muted-foreground">·</span>
            <span className="hidden sm:inline text-xs font-bold text-amber-500">
              +{selectedChallenge?.points_reward || 100} Pts
            </span>
          </div>

          <div className="font-display font-bold text-sm sm:text-base text-foreground truncate mt-0.5">
            {selectedChallenge?.title || "All Academy Reading Challenges"}
          </div>
        </div>
      </div>

      {/* Actions and Registration Status */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
        {/* Student registration pill or register button */}
        {isStudent && !isAll && (
          challengeRegistered ? (
            <Badge
              variant="outline"
              className="h-8 px-2.5 bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Registered</span>
            </Badge>
          ) : (
            <Button
              size="sm"
              onClick={handleRegister}
              disabled={registering}
              className="h-8 text-xs font-bold gap-1.5 bg-amber-500 hover:bg-amber-600 text-black border-0 shadow-xs"
            >
              <UserCheck className="w-3.5 h-3.5" />
              {registering ? "Joining..." : "Register for Challenge"}
            </Button>
          )
        )}

        {/* Quick link to Challenge Page if not already there */}
        {location.pathname !== "/challenges" && (
          <Button asChild variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1">
            <Link to={`/challenges?id=${selectedChallenge?.id || "all"}`}>
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Details</span>
            </Link>
          </Button>
        )}

        {/* Student Submit Entry Button */}
        {isStudent && selectedChallenge?.is_active && location.pathname !== "/submit" && (
          <Button
            asChild
            size="sm"
            className="h-8 text-xs font-semibold gap-1 text-white border-0"
            style={{ background: "linear-gradient(120deg, hsl(var(--v-green)), hsl(var(--v-cyan)))" }}
          >
            <Link
              to={
                selectedChallenge && selectedChallenge.id !== ALL_CHALLENGES_ID
                  ? `/submit?challenge=${selectedChallenge.id}`
                  : "/submit"
              }
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Submit Entry</span>
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
};
