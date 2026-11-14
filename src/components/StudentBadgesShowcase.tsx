import React, { useState } from "react";
import { BadgeRecord, computeStudentBadges, BadgeSubmissionInput, BadgeProfileInput } from "@/lib/badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Lock,
  CheckCircle2,
  Trophy,
  Compass,
  Zap,
  Info,
  Calendar,
  Layers,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface StudentBadgesShowcaseProps {
  submissions?: BadgeSubmissionInput[];
  totalPoints?: number;
  totalBooks?: number;
  profile?: BadgeProfileInput;
  variant?: "full" | "compact-ribbon" | "mini-chips";
  className?: string;
  onBadgeClick?: (badge: BadgeRecord) => void;
}

export const StudentBadgesShowcase: React.FC<StudentBadgesShowcaseProps> = ({
  submissions = [],
  totalPoints,
  totalBooks,
  profile,
  variant = "full",
  className = "",
  onBadgeClick,
}) => {
  const [selectedBadge, setSelectedBadge] = useState<BadgeRecord | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const badges = computeStudentBadges(submissions, totalPoints, totalBooks, profile);
  const unlockedBadges = badges.filter((b) => b.unlocked);
  const lockedBadges = badges.filter((b) => !b.unlocked);

  const filteredBadges = badges.filter((b) => {
    if (categoryFilter === "all") return true;
    if (categoryFilter === "unlocked") return b.unlocked;
    if (categoryFilter === "in-progress") return !b.unlocked;
    return b.category === categoryFilter;
  });

  const handleCardClick = (badge: BadgeRecord) => {
    setSelectedBadge(badge);
    if (onBadgeClick) onBadgeClick(badge);
  };

  // 1. Mini Chips Variant (for Leaderboard table rows)
  if (variant === "mini-chips") {
    if (unlockedBadges.length === 0) return null;

    return (
      <div className={cn("inline-flex items-center gap-1.5 flex-wrap", className)}>
        {unlockedBadges.slice(0, 3).map((badge) => (
          <span
            key={badge.id}
            title={`${badge.name}: ${badge.description}`}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs transition-transform hover:scale-105 select-none"
            style={{
              background: badge.gradient,
              color: badge.textColor,
              boxShadow: `0 2px 8px ${badge.accentColor}33`,
            }}
          >
            <span>{badge.icon}</span>
            <span className="truncate max-w-[90px]">{badge.shortLabel}</span>
          </span>
        ))}
        {unlockedBadges.length > 3 && (
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            +{unlockedBadges.length - 3}
          </span>
        )}
      </div>
    );
  }

  // 2. Compact Ribbon Variant (for Student Dashboard header)
  if (variant === "compact-ribbon") {
    return (
      <div className={cn("space-y-2.5", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Earned Milestone Badges ({unlockedBadges.length}/{badges.length})
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">
            {unlockedBadges.length === badges.length ? "All honors unlocked! 🎉" : "Auto-awarded on reading milestones"}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
          {unlockedBadges.length === 0 ? (
            <div className="p-3 rounded-2xl bg-muted/40 border border-dashed border-border text-xs text-muted-foreground flex items-center gap-2 w-full">
              <Compass className="w-4 h-4 text-primary shrink-0" />
              <span>Log your first verified book review to unlock <strong>Literary Pioneer</strong>, <strong>Genre Explorer</strong>, and <strong>Fast Reader</strong>!</span>
            </div>
          ) : (
            unlockedBadges.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => handleCardClick(b)}
                className="group shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm border"
                style={{
                  background: b.gradient,
                  color: b.textColor,
                  borderColor: b.borderColor,
                }}
              >
                <span className="text-base">{b.icon}</span>
                <span className="text-xs font-bold whitespace-nowrap">{b.name}</span>
                <CheckCircle2 className="w-3.5 h-3.5 opacity-80" />
              </button>
            ))
          )}
        </div>

        {/* Badge detail dialog */}
        {selectedBadge && (
          <Dialog open={Boolean(selectedBadge)} onOpenChange={() => setSelectedBadge(null)}>
            <DialogContent className="sm:max-w-md rounded-3xl border-border bg-card">
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg border"
                    style={{ background: selectedBadge.gradient, borderColor: selectedBadge.borderColor }}
                  >
                    {selectedBadge.icon}
                  </div>
                  <div>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider mb-1">
                      {selectedBadge.categoryLabel} • {selectedBadge.tier.toUpperCase()}
                    </Badge>
                    <DialogTitle className="text-xl font-bold font-display text-foreground">
                      {selectedBadge.name}
                    </DialogTitle>
                  </div>
                </div>
                <DialogDescription className="text-xs sm:text-sm text-foreground/85 leading-relaxed pt-1">
                  {selectedBadge.description}
                </DialogDescription>
              </DialogHeader>

              <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-2 mt-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Milestone Criteria:</span>
                  <span className="text-emerald-500 flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Unlocked &amp; Verified
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{selectedBadge.criteria}</p>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedBadge(null)}
                  className="rounded-xl text-xs"
                >
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  // 3. Full Showcase Mode (For MyProgress and Leaderboard detail modal)
  return (
    <div className={cn("space-y-6 select-none", className)}>
      {/* Header and Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-card via-card/90 to-primary/5 border border-border shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
            <Trophy className="w-3.5 h-3.5" />
            <span>ACADEMY HONORS &amp; MILESTONES</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-display text-foreground">
            Student Milestone Badges
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Badges automatically unlock as you explore new genres, maintain reading momentum, and contribute points.
          </p>
        </div>

        {/* Quick summary stats */}
        <div className="flex items-center gap-3">
          <div className="p-3 px-4 rounded-2xl bg-background border border-border text-center shadow-xs">
            <div className="text-xl font-black font-display text-emerald-500">
              {unlockedBadges.length}
            </div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Unlocked</div>
          </div>
          <div className="p-3 px-4 rounded-2xl bg-background border border-border text-center shadow-xs">
            <div className="text-xl font-black font-display text-muted-foreground">
              {lockedBadges.length}
            </div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Remaining</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {[
          { id: "all", label: `All Honors (${badges.length})` },
          { id: "unlocked", label: `Unlocked (${unlockedBadges.length})` },
          { id: "in-progress", label: `In Progress (${lockedBadges.length})` },
          { id: "genres", label: "🧭 Genre Explorer" },
          { id: "velocity", label: "⚡ Fast Reader" },
          { id: "reflection", label: "🧠 Deep Thinker" },
          { id: "house", label: "🏰 House Pride" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setCategoryFilter(tab.id)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border",
              categoryFilter === tab.id
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card/70 border-border text-muted-foreground hover:bg-card hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid of Badges in Tactile Linear-Gradient Rounded Divs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredBadges.map((badge) => {
          return (
            <div
              key={badge.id}
              onClick={() => handleCardClick(badge)}
              className={cn(
                "rounded-3xl p-5 border transition-all duration-300 relative overflow-hidden flex flex-col justify-between cursor-pointer group shadow-sm hover:shadow-md",
                badge.unlocked
                  ? "hover:-translate-y-1"
                  : "bg-muted/20 border-border/80 opacity-80 hover:opacity-100"
              )}
              style={
                badge.unlocked
                  ? {
                      background: `linear-gradient(135deg, ${badge.accentColor}18 0%, hsl(var(--card)) 65%)`,
                      borderColor: badge.borderColor,
                      boxShadow: `0 8px 24px ${badge.accentColor}18`,
                    }
                  : {}
              }
            >
              {/* Decorative subtle ambient circle for unlocked badges */}
              {badge.unlocked && (
                <div
                  className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-40"
                  style={{ background: badge.accentColor }}
                />
              )}

              <div className="space-y-3 relative z-10">
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm border transition-transform group-hover:scale-105",
                      badge.unlocked ? "text-white" : "bg-muted text-muted-foreground border-border"
                    )}
                    style={badge.unlocked ? { background: badge.gradient, borderColor: badge.borderColor } : {}}
                  >
                    {badge.icon}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {badge.unlocked ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>UNLOCKED</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-muted text-muted-foreground border border-border">
                        <Lock className="w-3 h-3" />
                        <span>{badge.currentProgress}/{badge.maxProgress}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-foreground font-display group-hover:text-primary transition-colors">
                      {badge.name}
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {badge.description}
                  </p>
                </div>
              </div>

              {/* Progress Bar & Milestone Criteria Footer */}
              <div className="pt-4 border-t border-border/60 mt-4 space-y-2 relative z-10">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground font-medium">
                    {badge.unlocked ? "Milestone verified:" : "Unlock requirement:"}
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {badge.unlocked ? "100%" : `${badge.progressPercent}%`}
                  </span>
                </div>

                {/* Progress bar track */}
                <div className="w-full h-2 rounded-full bg-muted/80 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${badge.progressPercent}%`,
                      background: badge.unlocked ? badge.gradient : "hsl(var(--primary))",
                    }}
                  />
                </div>

                <div className="text-[11px] text-muted-foreground leading-snug line-clamp-1">
                  {badge.criteria}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Dialog */}
      {selectedBadge && (
        <Dialog open={Boolean(selectedBadge)} onOpenChange={() => setSelectedBadge(null)}>
          <DialogContent className="sm:max-w-md rounded-3xl border-border bg-card">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg border"
                  style={{ background: selectedBadge.gradient, borderColor: selectedBadge.borderColor }}
                >
                  {selectedBadge.icon}
                </div>
                <div>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider mb-1">
                    {selectedBadge.categoryLabel} • {selectedBadge.tier.toUpperCase()}
                  </Badge>
                  <DialogTitle className="text-xl font-bold font-display text-foreground">
                    {selectedBadge.name}
                  </DialogTitle>
                </div>
              </div>
              <DialogDescription className="text-xs sm:text-sm text-foreground/85 leading-relaxed pt-1">
                {selectedBadge.description}
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-2 mt-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Milestone Criteria:</span>
                {selectedBadge.unlocked ? (
                  <span className="text-emerald-500 flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Unlocked &amp; Verified
                  </span>
                ) : (
                  <span className="text-amber-500 flex items-center gap-1 font-bold">
                    <Lock className="w-3.5 h-3.5" /> In Progress ({selectedBadge.currentProgress}/{selectedBadge.maxProgress})
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{selectedBadge.criteria}</p>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedBadge(null)}
                className="rounded-xl text-xs"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default StudentBadgesShowcase;
