import React from "react";
import { useChallenges, Challenge, ALL_CHALLENGES_ID, ALL_CHALLENGES_OBJECT } from "@/contexts/ChallengeContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Trophy, Sparkles, Check, PlusCircle, Settings, Layers } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TopbarChallengeToggleProps {
  isStaff?: boolean;
  className?: string;
}

export const TopbarChallengeToggle: React.FC<TopbarChallengeToggleProps> = ({
  isStaff = false,
  className = "",
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    challenges,
    activeChallenges,
    userVisibleChallenges,
    selectedChallengeId,
    selectedChallenge,
    setSelectedChallengeId,
  } = useChallenges();

  const handleSelect = (challengeId: string) => {
    setSelectedChallengeId(challengeId);

    const targetObj =
      challengeId === ALL_CHALLENGES_ID
        ? ALL_CHALLENGES_OBJECT
        : challenges.find((c) => c.id === challengeId);

    toast.success(`Active Workspace: ${targetObj?.title || "Challenge updated"}`, {
      icon: targetObj?.badge_icon || "🏆",
    });

    // If currently on /challenges with challenge URL params, sync the param cleanly
    if (location.pathname === "/challenges") {
      navigate(`/challenges?id=${challengeId}`, { replace: true });
    }
  };

  const isAll = selectedChallengeId === ALL_CHALLENGES_ID;
  const isLocked = selectedChallenge?.status === "locked";
  const isClosed = selectedChallenge?.status === "closed" || selectedChallenge?.is_active === false;

  const statusColor = isAll
    ? "bg-primary"
    : isLocked
    ? "bg-amber-500"
    : isClosed
    ? "bg-slate-400"
    : "bg-emerald-500";

  const statusText = isAll
    ? "Combined View"
    : isLocked
    ? "Locked"
    : isClosed
    ? "Concluded"
    : "Active";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Switch reading challenge workspace"
          className={cn(
            "group flex items-center gap-2.5 p-1.5 pr-2.5 rounded-2xl border border-border/80 bg-muted/40 hover:bg-muted/80 hover:border-primary/40 transition-all text-left outline-none focus-visible:ring-1 focus-visible:ring-ring shrink-0",
            className
          )}
        >
          {/* Challenge icon avatar matching profile avatar size */}
          <div className="relative w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-lg shadow-sm group-hover:scale-105 transition-transform">
            <span>{selectedChallenge?.badge_icon || "🏆"}</span>
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background",
                statusColor
              )}
              title={`Status: ${statusText}`}
            />
          </div>

          {/* Symmetrical 2-line textual description matching user profile */}
          <div className="leading-tight text-left min-w-0 max-w-[100px] xs:max-w-[130px] sm:max-w-[170px] lg:max-w-[220px]">
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <span className="truncate">Challenge</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground/70 group-hover:text-foreground transition-transform group-data-[state=open]:rotate-180 shrink-0" />
            </div>
            <div className="text-xs font-semibold text-foreground truncate mt-0.5">
              {selectedChallenge?.title || "Select Challenge"}
            </div>
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 md:w-96 p-2 rounded-2xl border-border bg-card shadow-xl max-h-[85vh] overflow-y-auto"
      >
        <DropdownMenuLabel className="p-2 pb-1.5">
          <div className="flex items-center justify-between">
            <span className="font-display font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Switch Challenge Workspace
            </span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-bold py-0 h-4 border",
                isAll
                  ? "border-primary/40 text-primary"
                  : isClosed
                  ? "border-slate-400 text-muted-foreground"
                  : isLocked
                  ? "border-amber-500 text-amber-500"
                  : "border-emerald-500 text-emerald-500"
              )}
            >
              {statusText}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-normal">
            Switches active context across Dashboard, Challenges, Leaderboard, Submissions & Admin.
          </p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="my-1.5" />

        {/* Option 1: All Challenges Combined */}
        <DropdownMenuItem
          onClick={() => handleSelect(ALL_CHALLENGES_ID)}
          className={cn(
            "p-2.5 rounded-xl cursor-pointer flex items-center justify-between gap-3 transition-colors",
            isAll
              ? "bg-primary/10 text-primary font-semibold border border-primary/30"
              : "hover:bg-muted"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0 text-base">
              📚
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-foreground truncate">
                All Challenges (Combined Academy View)
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                Whole-school multi-realm overview & total points
              </div>
            </div>
          </div>
          {isAll && <Check className="w-4 h-4 text-primary shrink-0" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1.5" />

        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
          Reading Challenges
        </div>

        <div className="space-y-1">
          {(userVisibleChallenges && userVisibleChallenges.length > 0 ? userVisibleChallenges : challenges).map((c) => {
            const isSelected = selectedChallengeId === c.id;
            const cStatus = c.status || (c.is_active ? "open" : "closed");
            return (
              <DropdownMenuItem
                key={c.id}
                onClick={() => handleSelect(c.id)}
                className={cn(
                  "p-2.5 rounded-xl cursor-pointer flex items-center justify-between gap-2.5 transition-colors",
                  isSelected
                    ? "bg-primary/10 text-primary font-semibold border border-primary/30"
                    : "hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 text-base">
                    {c.badge_icon || "🏆"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">
                      {c.title}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                      <span>Goal: {c.target_books} books</span>
                      <span>·</span>
                      <span>+{c.points_reward} pts</span>
                      <span>·</span>
                      <span
                        className={cn(
                          "font-semibold",
                          cStatus === "open"
                            ? "text-emerald-500"
                            : cStatus === "locked"
                            ? "text-amber-500"
                            : "text-muted-foreground"
                        )}
                      >
                        {cStatus === "open" ? "🟢 Open" : cStatus === "locked" ? "🔒 Locked" : "⚪ Closed"}
                      </span>
                    </div>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
              </DropdownMenuItem>
            );
          })}
        </div>

        {isStaff && (
          <>
            <DropdownMenuSeparator className="my-1.5" />
            <div className="p-1 space-y-1">
              <DropdownMenuItem
                onClick={() => navigate("/admin?s=create")}
                className="p-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer flex items-center gap-2"
              >
                <PlusCircle className="w-3.5 h-3.5 text-primary" />
                <span>Create New Reading Challenge</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/challenges")}
                className="p-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer flex items-center gap-2"
              >
                <Settings className="w-3.5 h-3.5 text-primary" />
                <span>Manage Challenge Workspaces & Rules</span>
              </DropdownMenuItem>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
