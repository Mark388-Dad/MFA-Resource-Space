import React from "react";
import { useChallenges, Challenge, ALL_CHALLENGES_ID, ALL_CHALLENGES_OBJECT } from "@/contexts/ChallengeContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trophy, CheckCircle, Clock, Sparkles, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChallengeSwitcherProps {
  className?: string;
  showDetails?: boolean;
  filterOnlyActive?: boolean;
  includeAllOption?: boolean;
  onSelect?: (challenge: Challenge) => void;
}

export default function ChallengeSwitcher({
  className = "",
  showDetails = true,
  filterOnlyActive = false,
  includeAllOption = true,
  onSelect,
}: ChallengeSwitcherProps) {
  const { challenges, activeChallenges, selectedChallengeId, setSelectedChallengeId, selectedChallenge } = useChallenges();

  const list = filterOnlyActive ? activeChallenges : challenges;

  const handleChange = (id: string) => {
    setSelectedChallengeId(id);
    if (id === ALL_CHALLENGES_ID) {
      if (onSelect) onSelect(ALL_CHALLENGES_OBJECT);
    } else {
      const found = challenges.find((c) => c.id === id);
      if (found && onSelect) {
        onSelect(found);
      }
    }
  };

  const isAll = selectedChallengeId === ALL_CHALLENGES_ID;

  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-border/80 bg-card/70 shadow-sm", className)}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center shrink-0 text-xl">
          {selectedChallenge?.badge_icon || "🏆"}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Active Workspace:
            </span>
            {isAll ? (
              <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] font-bold py-0 h-4">
                📚 All Challenges View
              </Badge>
            ) : selectedChallenge?.is_active ? (
              <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px] font-bold py-0 h-4">
                🟢 Active Challenge
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-[10px] py-0 h-4">
                ⚪ Concluded / View Only
              </Badge>
            )}
          </div>
          <div className="font-display font-bold text-sm text-foreground truncate max-w-md mt-0.5">
            {selectedChallenge?.title}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Select value={selectedChallengeId} onValueChange={handleChange}>
          <SelectTrigger className="h-9 min-w-[220px] bg-background text-xs font-medium border-border">
            <SelectValue placeholder="Switch challenge..." />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {includeAllOption && (
              <SelectItem value={ALL_CHALLENGES_ID} className="font-medium text-xs">
                <div className="flex items-center gap-2 w-full">
                  <span>📚</span>
                  <span className="font-semibold text-xs">All Challenges (Combined)</span>
                  <span className="text-[10px] text-primary font-bold ml-auto">All</span>
                </div>
              </SelectItem>
            )}
            {list.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <div className="flex items-center gap-2">
                  <span>{c.badge_icon || "🏆"}</span>
                  <span className="font-medium text-xs truncate max-w-[190px]">{c.title}</span>
                  {c.is_active ? (
                    <span className="text-[10px] text-emerald-500 font-bold ml-auto">Active</span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground ml-auto">Closed</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
