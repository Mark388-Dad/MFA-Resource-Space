import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Medal,
  Award,
  Crown,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Target,
  PlusCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TOTAL_BOOK_GOAL } from '@/lib/constants';

interface CircularGoalProgressTrackerProps {
  booksRead: number;
  goal?: number;
  totalPoints?: number;
  challengeTitle?: string;
  challengeId?: string;
  isRegistered?: boolean;
  className?: string;
}

export const CircularGoalProgressTracker: React.FC<CircularGoalProgressTrackerProps> = ({
  booksRead = 0,
  goal = TOTAL_BOOK_GOAL, // 45 books
  totalPoints = 0,
  challengeTitle = '45-Book Reading Challenge',
  challengeId,
  className,
}) => {
  const [showMilestoneDetails, setShowMilestoneDetails] = useState<string | null>(null);

  const safeBooks = Math.max(0, booksRead);
  const safeGoal = Math.max(1, goal);
  const percentage = Math.min(100, Math.round((safeBooks / safeGoal) * 100));
  const remaining = Math.max(0, safeGoal - safeBooks);

  // SVG circular gauge geometry
  const radius = 86;
  const strokeWidth = 14;
  const normalizedRadius = radius;
  const circumference = normalizedRadius * 2 * Math.PI; // ~540.35
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Dynamic milestone thresholds based on goal (defaults to 15, 30, 45 for standard 45-book goal)
  const bronzeTarget = safeGoal === 45 ? 15 : Math.max(1, Math.round(safeGoal * 0.33));
  const silverTarget = safeGoal === 45 ? 30 : Math.max(2, Math.round(safeGoal * 0.66));
  const goldTarget = safeGoal;

  // Determine current tier
  const isBronze = safeBooks >= bronzeTarget;
  const isSilver = safeBooks >= silverTarget;
  const isGold = safeBooks >= goldTarget;

  let tierName = 'Reader';
  let tierColor = 'var(--v-electric-blue)';
  let TierIcon = Target;

  if (isGold) {
    tierName = 'Gold Champion';
    tierColor = 'var(--v-yellow)';
    TierIcon = Crown;
  } else if (isSilver) {
    tierName = 'Silver Scholar';
    tierColor = 'var(--v-cyan)';
    TierIcon = Award;
  } else if (isBronze) {
    tierName = 'Bronze Pioneer';
    tierColor = 'var(--v-orange)';
    TierIcon = Medal;
  }

  // Next milestone calculation
  const getNextMilestone = () => {
    if (!isBronze) {
      return {
        name: 'Bronze Milestone',
        booksTarget: bronzeTarget,
        remaining: Math.max(0, bronzeTarget - safeBooks),
        icon: Medal,
        bonus: '+5 Bonus Pts',
        color: '#f97316',
      };
    }
    if (!isSilver) {
      return {
        name: 'Silver Milestone',
        booksTarget: silverTarget,
        remaining: Math.max(0, silverTarget - safeBooks),
        icon: Award,
        bonus: '+10 Bonus Pts',
        color: '#06b6d4',
      };
    }
    if (!isGold) {
      return {
        name: 'Gold Championship',
        booksTarget: goldTarget,
        remaining: Math.max(0, goldTarget - safeBooks),
        icon: Crown,
        bonus: '+15 Bonus Pts & Certificate',
        color: '#eab308',
      };
    }
    return {
      name: `${safeGoal}-Book Goal Conquered!`,
      booksTarget: safeGoal,
      remaining: 0,
      icon: Sparkles,
      bonus: 'Gold Medal Honor Roll',
      color: '#22c55e',
    };
  };

  const nextMilestone = getNextMilestone();

  // Milestone marker coordinates on the circle (at angle = percentage * 360 - 90 deg)
  const getMarkerPoint = (bookCount: number) => {
    const fraction = Math.min(1, bookCount / safeGoal);
    // Start at top (-90 degrees / -PI/2)
    const angle = fraction * 2 * Math.PI - Math.PI / 2;
    const cx = 110;
    const cy = 110;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      reached: safeBooks >= bookCount,
    };
  };

  const bronzeMarker = getMarkerPoint(bronzeTarget);
  const silverMarker = getMarkerPoint(silverTarget);
  const goldMarker = getMarkerPoint(goldTarget);

  const submitLink = challengeId && challengeId !== 'all' ? `/submit?challenge=${challengeId}` : '/submit';
  const progressLink = '/progress';

  return (
    <Card
      className={cn(
        'relative overflow-hidden border-2 shadow-lg transition-all',
        isGold
          ? 'border-amber-400/50 bg-gradient-to-br from-amber-500/10 via-card to-card'
          : 'border-primary/30 bg-card',
        className
      )}
    >
      {/* Glow decorative orbs */}
      <div
        className="pointer-events-none absolute -top-16 -right-16 w-52 h-52 rounded-full blur-3xl opacity-20"
        style={{
          background: isGold
            ? 'hsl(var(--v-yellow))'
            : isSilver
            ? 'hsl(var(--v-cyan))'
            : isBronze
            ? 'hsl(var(--v-orange))'
            : 'hsl(var(--v-electric-blue))',
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-16 w-44 h-44 rounded-full blur-3xl opacity-15"
        style={{ background: 'hsl(var(--v-lime))' }}
      />

      {/* Header */}
      <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
              style={{
                background: `linear-gradient(135deg, hsl(${tierColor} / 0.25), hsl(${tierColor} / 0.1))`,
                border: `1.5px solid hsl(${tierColor} / 0.4)`,
              }}
            >
              <TierIcon className="w-5 h-5" style={{ color: `hsl(${tierColor})` }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold font-display tracking-tight text-foreground">
                  45-Book Goal Tracker
                </CardTitle>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 capitalize',
                    isGold
                      ? 'bg-amber-500/15 text-amber-500 border-amber-500/30 font-bold animate-pulse'
                      : isSilver
                      ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                      : isBronze
                      ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                      : 'bg-primary/10 text-primary border-primary/20'
                  )}
                >
                  {tierName}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs sm:max-w-md">
                {challengeTitle} · Goal: {safeGoal} Books
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              {percentage}% Complete
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 pb-6 space-y-6">
        {/* Main Circular Progress & Quick Stats Section */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-center">
          {/* Circular Progress Wheel */}
          <div className="xl:col-span-5 flex flex-col items-center justify-center">
            <div className="relative w-[210px] h-[210px] sm:w-[220px] sm:h-[220px] flex items-center justify-center select-none group">
              {/* Outer decorative ring */}
              <div className="absolute inset-1 rounded-full border border-border/40 dashed opacity-50" />

              <svg
                className="w-full h-full transform -rotate-90 drop-shadow-md"
                viewBox="0 0 220 220"
                aria-label={`${safeBooks} of ${safeGoal} books read`}
              >
                <defs>
                  {/* Gradient for progress stroke */}
                  <linearGradient id="circleProgressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="35%" stopColor="#22c55e" />
                    <stop offset="70%" stopColor="#eab308" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                  {/* Subtle inner shadow filter */}
                  <filter id="glowCircle" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#38bdf8" floodOpacity="0.4" />
                  </filter>
                </defs>

                {/* Background track circle */}
                <circle
                  cx="110"
                  cy="110"
                  r={radius}
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  className="text-muted/30 transition-colors"
                />

                {/* Secondary track outline for polished depth */}
                <circle
                  cx="110"
                  cy="110"
                  r={radius - strokeWidth / 2 - 3}
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="3,4"
                  className="text-border/60"
                />

                {/* Animated active progress stroke */}
                <circle
                  cx="110"
                  cy="110"
                  r={radius}
                  fill="transparent"
                  stroke="url(#circleProgressGrad)"
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />

                {/* Milestone tick dots */}
                {/* 15 Books (Bronze - 33%) */}
                <circle
                  cx={bronzeMarker.x}
                  cy={bronzeMarker.y}
                  r={bronzeMarker.reached ? 5.5 : 4}
                  fill={bronzeMarker.reached ? '#f97316' : 'hsl(var(--muted-foreground))'}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="transition-all"
                />
                {/* 30 Books (Silver - 66%) */}
                <circle
                  cx={silverMarker.x}
                  cy={silverMarker.y}
                  r={silverMarker.reached ? 5.5 : 4}
                  fill={silverMarker.reached ? '#06b6d4' : 'hsl(var(--muted-foreground))'}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="transition-all"
                />
                {/* 45 Books (Gold - 100%) */}
                <circle
                  cx={goldMarker.x}
                  cy={goldMarker.y}
                  r={goldMarker.reached ? 6.5 : 4.5}
                  fill={goldMarker.reached ? '#eab308' : 'hsl(var(--muted-foreground))'}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="transition-all"
                />
              </svg>

              {/* Center Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl sm:text-5xl font-black font-display tracking-tight text-foreground">
                    {safeBooks}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-muted-foreground">
                    /{safeGoal}
                  </span>
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">
                  Books Read
                </span>

                {/* Next Milestone Tag */}
                <div className="mt-2 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted/60 border border-border text-[11px] font-medium text-foreground">
                  {isGold ? (
                    <span className="text-amber-500 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Conquered!
                    </span>
                  ) : (
                    <span>
                      <strong className="text-primary">{remaining}</strong> to go
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Milestone Legend underneath circle */}
            <div className="flex items-center justify-center gap-3 mt-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    isBronze ? 'bg-orange-500 ring-2 ring-orange-500/30' : 'bg-muted-foreground/40'
                  )}
                />
                15 🥉
              </span>
              <span className="text-border">•</span>
              <span className="flex items-center gap-1">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    isSilver ? 'bg-cyan-500 ring-2 ring-cyan-500/30' : 'bg-muted-foreground/40'
                  )}
                />
                30 🥈
              </span>
              <span className="text-border">•</span>
              <span className="flex items-center gap-1">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    isGold ? 'bg-yellow-500 ring-2 ring-yellow-500/30' : 'bg-muted-foreground/40'
                  )}
                />
                45 🥇
              </span>
            </div>
          </div>

          {/* Right Column: Key Metrics & Milestone Roadmap */}
          <div className="xl:col-span-7 space-y-4">
            {/* Motivational Banner / Next Milestone Card */}
            <div
              className={cn(
                'p-4 rounded-2xl border transition-all',
                isGold
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                  : 'bg-muted/40 border-border'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${nextMilestone.color}20`, color: nextMilestone.color }}
                  >
                    <nextMilestone.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                      <span>Next Horizon:</span>
                      <span className="font-bold text-foreground">{nextMilestone.name}</span>
                    </div>
                    <div className="text-xs text-foreground font-medium mt-0.5">
                      {isGold ? (
                        <span>You reached all 45 books! Submit reflections or explore other literary realms.</span>
                      ) : (
                        <span>
                          Read <strong>{nextMilestone.remaining} more books</strong> to unlock{' '}
                          <span className="text-primary font-bold">{nextMilestone.name}</span> ({nextMilestone.bonus})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Linear Progress Bar with Continuous Percentage & Book Count */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-muted/30 border border-border">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-foreground">
                  <Target className="w-3.5 h-3.5 text-primary" /> Goal Progress ({safeBooks} / {safeGoal} Books)
                </span>
                <span className="font-mono font-bold text-primary">{percentage}% Complete</span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted/60 overflow-hidden border border-border/40">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.max(percentage, safeBooks > 0 ? 3 : 0)}%`,
                    background: isGold
                      ? "linear-gradient(90deg, #22c55e 0%, #eab308 100%)"
                      : "linear-gradient(90deg, #38bdf8 0%, #22c55e 60%, #eab308 100%)",
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono px-0.5">
                <span>0 Books</span>
                <span className={cn(safeBooks >= bronzeTarget ? "text-orange-500 font-bold" : "")}>15 Bronze</span>
                <span className={cn(safeBooks >= silverTarget ? "text-cyan-500 font-bold" : "")}>30 Silver</span>
                <span className={cn(safeBooks >= goldTarget ? "text-amber-500 font-bold" : "")}>{safeGoal} Gold</span>
              </div>
            </div>

            {/* Three Milestone Checkpoints (15, 30, 45) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
                <span>Milestone Journey</span>
                <span className="text-[11px] text-muted-foreground/80">Click a milestone for details</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {/* Bronze */}
                <button
                  type="button"
                  onClick={() => setShowMilestoneDetails(showMilestoneDetails === 'bronze' ? null : 'bronze')}
                  className={cn(
                    'p-3 rounded-xl border text-center transition-all flex flex-col justify-between cursor-pointer hover:scale-[1.02] text-left sm:text-center',
                    isBronze
                      ? 'bg-orange-500/10 border-orange-500/40 shadow-xs'
                      : 'bg-muted/20 border-border/70 opacity-75 hover:opacity-100',
                    showMilestoneDetails === 'bronze' && 'ring-2 ring-orange-500'
                  )}
                >
                  <div className="flex items-center justify-center mb-1">
                    <Medal
                      className={cn('w-5 h-5', isBronze ? 'text-orange-500' : 'text-muted-foreground')}
                    />
                  </div>
                  <div className="font-bold text-xs text-foreground">Bronze</div>
                  <div className="text-[11px] text-muted-foreground">{bronzeTarget} Books</div>
                  <div className="mt-2">
                    {isBronze ? (
                      <Badge className="bg-orange-500 text-white text-[9px] px-1.5 py-0 h-4 gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Done
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {Math.max(0, bronzeTarget - safeBooks)} to go
                      </span>
                    )}
                  </div>
                </button>

                {/* Silver */}
                <button
                  type="button"
                  onClick={() => setShowMilestoneDetails(showMilestoneDetails === 'silver' ? null : 'silver')}
                  className={cn(
                    'p-3 rounded-xl border text-center transition-all flex flex-col justify-between cursor-pointer hover:scale-[1.02] text-left sm:text-center',
                    isSilver
                      ? 'bg-cyan-500/10 border-cyan-500/40 shadow-xs'
                      : 'bg-muted/20 border-border/70 opacity-75 hover:opacity-100',
                    showMilestoneDetails === 'silver' && 'ring-2 ring-cyan-500'
                  )}
                >
                  <div className="flex items-center justify-center mb-1">
                    <Award
                      className={cn('w-5 h-5', isSilver ? 'text-cyan-400' : 'text-muted-foreground')}
                    />
                  </div>
                  <div className="font-bold text-xs text-foreground">Silver</div>
                  <div className="text-[11px] text-muted-foreground">{silverTarget} Books</div>
                  <div className="mt-2">
                    {isSilver ? (
                      <Badge className="bg-cyan-500 text-white text-[9px] px-1.5 py-0 h-4 gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Done
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {Math.max(0, silverTarget - safeBooks)} to go
                      </span>
                    )}
                  </div>
                </button>

                {/* Gold */}
                <button
                  type="button"
                  onClick={() => setShowMilestoneDetails(showMilestoneDetails === 'gold' ? null : 'gold')}
                  className={cn(
                    'p-3 rounded-xl border text-center transition-all flex flex-col justify-between cursor-pointer hover:scale-[1.02] text-left sm:text-center',
                    isGold
                      ? 'bg-amber-500/15 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                      : 'bg-muted/20 border-border/70 opacity-75 hover:opacity-100',
                    showMilestoneDetails === 'gold' && 'ring-2 ring-amber-500'
                  )}
                >
                  <div className="flex items-center justify-center mb-1">
                    <Crown
                      className={cn('w-5 h-5', isGold ? 'text-amber-400 animate-bounce' : 'text-muted-foreground')}
                    />
                  </div>
                  <div className="font-bold text-xs text-foreground">Gold Champion</div>
                  <div className="text-[11px] text-muted-foreground">{goldTarget} Books</div>
                  <div className="mt-2">
                    {isGold ? (
                      <Badge className="bg-amber-500 text-black font-bold text-[9px] px-1.5 py-0 h-4 gap-0.5 shadow-xs">
                        <Sparkles className="w-2.5 h-2.5" /> Master!
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {Math.max(0, goldTarget - safeBooks)} to go
                      </span>
                    )}
                  </div>
                </button>
              </div>

              {/* Expandable milestone details card */}
              {showMilestoneDetails && (
                <div className="p-3 rounded-xl bg-muted/50 border border-border text-xs space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  {showMilestoneDetails === 'bronze' && (
                    <>
                      <div className="font-bold text-orange-400 flex items-center gap-1.5">
                        <Medal className="w-3.5 h-3.5" /> Bronze Milestone — 15 Books
                      </div>
                      <p className="text-muted-foreground">
                        Earns an automatic <strong>+5 bonus points</strong> and unlocks the Bronze Reader Crest. Readers should explore multiple literary realms to achieve this milestone.
                      </p>
                    </>
                  )}
                  {showMilestoneDetails === 'silver' && (
                    <>
                      <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5" /> Silver Milestone — 30 Books
                      </div>
                      <p className="text-muted-foreground">
                        Earns an automatic <strong>+10 bonus points</strong> and Silver Scholar status. Demonstrates deep consistency across varied literary categories.
                      </p>
                    </>
                  )}
                  {showMilestoneDetails === 'gold' && (
                    <>
                      <div className="font-bold text-amber-400 flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5" /> Gold Championship — 45 Books
                      </div>
                      <p className="text-muted-foreground">
                        The ultimate goal of the M-PESA Foundation Academy! Earns <strong>+15 bonus points</strong>, an official printable certificate with high-security verification QR, and honor roll recognition.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="p-2.5 rounded-xl bg-muted/30 border border-border">
                <div className="text-[10px] uppercase font-semibold text-muted-foreground">Books Read</div>
                <div className="text-lg font-bold font-display text-foreground mt-0.5">
                  {safeBooks} <span className="text-xs text-muted-foreground font-normal">/ {safeGoal}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-muted/30 border border-border">
                <div className="text-[10px] uppercase font-semibold text-muted-foreground">Remaining</div>
                <div className="text-lg font-bold font-display text-primary mt-0.5">
                  {remaining} <span className="text-xs text-muted-foreground font-normal">books</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-muted/30 border border-border col-span-2 sm:col-span-1">
                <div className="text-[10px] uppercase font-semibold text-muted-foreground">Total Points</div>
                <div className="text-lg font-bold font-display text-amber-500 mt-0.5">
                  {totalPoints} <span className="text-xs text-muted-foreground font-normal">pts</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-border/60">
          <Button
            asChild
            className="w-full sm:flex-1 text-white font-bold h-10 shadow-md gap-2"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--v-emerald)), hsl(var(--v-lime)))',
            }}
          >
            <Link to={submitLink}>
              <PlusCircle className="w-4 h-4" />
              <span>Submit / Log a Book</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full sm:flex-1 border-2 h-10 gap-2"
            style={{
              borderColor: 'hsl(var(--v-electric-blue) / 0.5)',
              color: 'hsl(var(--v-electric-blue))',
            }}
          >
            <Link to={progressLink}>
              <BookOpen className="w-4 h-4" />
              <span>View 15 Literary Realms &amp; Details</span>
              <ArrowRight className="w-3.5 h-3.5 ml-auto sm:ml-0" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CircularGoalProgressTracker;
