/**
 * Reading Milestone Badges Engine for M-PESA Foundation Academy
 * Automatically calculates and awards scholar honors based on reading velocity,
 * genre diversity, reflections depth, and house contributions.
 */

export interface BadgeDefinition {
  id: string;
  name: string;
  shortLabel: string;
  icon: string;
  category: "genres" | "velocity" | "milestone" | "reflection" | "house" | "mastery";
  categoryLabel: string;
  tier: "bronze" | "silver" | "gold" | "diamond";
  description: string;
  criteria: string;
  gradient: string;
  accentColor: string;
  borderColor: string;
  textColor: string;
  maxProgress: number;
}

export interface BadgeRecord extends BadgeDefinition {
  unlocked: boolean;
  unlockedAt?: string;
  currentProgress: number;
  progressPercent: number;
}

export interface BadgeSubmissionInput {
  category_name?: string | null;
  category_number?: number | string | null;
  points_earned?: number | null;
  approval_status?: string | null;
  date_finished?: string | null;
  created_at?: string | null;
  reflection?: string | null;
  review?: string | null;
  [key: string]: unknown;
}

export interface BadgeProfileInput {
  house?: string | null;
  [key: string]: unknown;
}

export const ALL_BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: "genre-explorer",
    name: "Genre Explorer",
    shortLabel: "Genre Explorer",
    icon: "🧭",
    category: "genres",
    categoryLabel: "Literary Discovery",
    tier: "gold",
    description: "Read books across 4 or more diverse categories and IB literary realms.",
    criteria: "Read and review books from at least 4 distinct category realms.",
    gradient: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #6366f1 100%)",
    accentColor: "#06b6d4",
    borderColor: "rgba(6, 182, 212, 0.45)",
    textColor: "#e0f2fe",
    maxProgress: 4,
  },
  {
    id: "fast-reader",
    name: "Fast Reader",
    shortLabel: "Fast Reader",
    icon: "⚡",
    category: "velocity",
    categoryLabel: "Reading Velocity",
    tier: "gold",
    description: "Maintained exceptional reading momentum by completing 2 or more books in a 7-day span.",
    criteria: "Finish and review 2 or more books within any 7-day window.",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #ec4899 100%)",
    accentColor: "#f59e0b",
    borderColor: "rgba(245, 158, 11, 0.45)",
    textColor: "#fef3c7",
    maxProgress: 2,
  },
  {
    id: "first-steps",
    name: "Literary Pioneer",
    shortLabel: "First Steps",
    icon: "🌱",
    category: "milestone",
    categoryLabel: "Academy Milestone",
    tier: "bronze",
    description: "Officially started the reading journey by completing your first verified book review.",
    criteria: "Submit and get 1 book reflection approved.",
    gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    accentColor: "#10b981",
    borderColor: "rgba(16, 185, 129, 0.45)",
    textColor: "#d1fae5",
    maxProgress: 1,
  },
  {
    id: "avid-bookworm",
    name: "Avid Bookworm",
    shortLabel: "Bookworm",
    icon: "🐛",
    category: "milestone",
    categoryLabel: "Academy Milestone",
    tier: "silver",
    description: "Steadily built a regular reading habit by completing 5 verified books.",
    criteria: "Read and log at least 5 books in the challenge.",
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
    accentColor: "#8b5cf6",
    borderColor: "rgba(139, 92, 246, 0.45)",
    textColor: "#ede9fe",
    maxProgress: 5,
  },
  {
    id: "century-scholar",
    name: "Century Scholar",
    shortLabel: "Century Scholar",
    icon: "💯",
    category: "milestone",
    categoryLabel: "Score Honors",
    tier: "gold",
    description: "Crossed the 100-point achievement threshold for outstanding scholastic commitment.",
    criteria: "Accumulate 100 or more total challenge points.",
    gradient: "linear-gradient(135deg, #eab308 0%, #ca8a04 50%, #b45309 100%)",
    accentColor: "#eab308",
    borderColor: "rgba(234, 179, 8, 0.45)",
    textColor: "#fef9c3",
    maxProgress: 100,
  },
  {
    id: "deep-thinker",
    name: "Deep Thinker",
    shortLabel: "Deep Thinker",
    icon: "🧠",
    category: "reflection",
    categoryLabel: "Analytical Inquiry",
    tier: "gold",
    description: "Authored in-depth, high-caliber reflections demonstrating IB critical thinking and inquiry.",
    criteria: "Write at least 2 detailed reflections with 30+ words of thoughtful analysis.",
    gradient: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%)",
    accentColor: "#ec4899",
    borderColor: "rgba(236, 72, 153, 0.45)",
    textColor: "#fce7f3",
    maxProgress: 2,
  },
  {
    id: "house-champion",
    name: "House Champion",
    shortLabel: "House Champion",
    icon: "🏰",
    category: "house",
    categoryLabel: "House Pride",
    tier: "diamond",
    description: "Contributed 50+ points directly to their academy house standings (Kenya, Kilimanjaro, Longonot, or Elgon).",
    criteria: "Earn at least 50 points while enrolled in an official academy house.",
    gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #1e3a8a 100%)",
    accentColor: "#3b82f6",
    borderColor: "rgba(59, 130, 246, 0.45)",
    textColor: "#dbeafe",
    maxProgress: 50,
  },
  {
    id: "realm-voyager",
    name: "Realm Voyager",
    shortLabel: "Realm Voyager",
    icon: "🗺️",
    category: "genres",
    categoryLabel: "Literary Discovery",
    tier: "diamond",
    description: "Traversed 8 or more literary realms spanning fiction, world languages, philosophy, and history.",
    criteria: "Read and review books across at least 8 unique categories.",
    gradient: "linear-gradient(135deg, #14b8a6 0%, #06b6d4 50%, #0284c7 100%)",
    accentColor: "#14b8a6",
    borderColor: "rgba(20, 184, 166, 0.45)",
    textColor: "#ccfbf1",
    maxProgress: 8,
  },
  {
    id: "streak-master",
    name: "Consistency Master",
    shortLabel: "Consistency Master",
    icon: "🔥",
    category: "velocity",
    categoryLabel: "Habit & Discipline",
    tier: "silver",
    description: "Demonstrated sustained reading discipline with books read across multiple distinct weeks.",
    criteria: "Log verified books across at least 3 distinct calendar weeks or dates.",
    gradient: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
    accentColor: "#f97316",
    borderColor: "rgba(249, 115, 22, 0.45)",
    textColor: "#ffedd5",
    maxProgress: 3,
  },
  {
    id: "grand-master",
    name: "Grand Master of the Quill",
    shortLabel: "Grand Master",
    icon: "👑",
    category: "mastery",
    categoryLabel: "Highest Honor",
    tier: "diamond",
    description: "Achieved the pinnacle of the reading challenge with 45 books read and reviewed.",
    criteria: "Complete the entire 45-Book Challenge milestone.",
    gradient: "linear-gradient(135deg, #ffd700 0%, #ff8c00 50%, #ff007f 100%)",
    accentColor: "#ffd700",
    borderColor: "rgba(255, 215, 0, 0.6)",
    textColor: "#fffbeb",
    maxProgress: 45,
  },
];

/**
 * Computes the unlocked status and progress for each badge given a student's reading record
 */
export function computeStudentBadges(
  submissions: BadgeSubmissionInput[] = [],
  totalPoints?: number,
  totalBooks?: number,
  profile?: BadgeProfileInput
): BadgeRecord[] {
  // Normalize approved / verified submissions
  const validSubs = submissions.filter((s) => !s.approval_status || s.approval_status === "approved");
  const booksCount = typeof totalBooks === "number" ? Math.max(totalBooks, validSubs.length) : validSubs.length;
  
  // Calculate total points
  const points =
    typeof totalPoints === "number"
      ? totalPoints
      : validSubs.reduce((acc, s) => acc + (Number(s.points_earned) || 10), 0);

  // 1. Unique categories count for Genre Explorer & Realm Voyager
  const categorySet = new Set<string>();
  validSubs.forEach((s) => {
    const cat = s.category_name ? String(s.category_name) : (s.category_number ? `cat_${s.category_number}` : null);
    if (cat) categorySet.add(cat.trim().toLowerCase());
  });
  const uniqueCategories = categorySet.size;

  // 2. Fast Reader: Check if 2 or more books were finished within any 7-day period
  let maxBooksIn7Days = 0;
  if (validSubs.length >= 2) {
    const dates = validSubs
      .map((s) => {
        const dStr = s.date_finished || s.created_at;
        return dStr ? new Date(String(dStr)).getTime() : 0;
      })
      .filter((t) => t > 0)
      .sort((a, b) => a - b);

    for (let i = 0; i < dates.length; i++) {
      let count = 1;
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      for (let j = i + 1; j < dates.length; j++) {
        if (dates[j] - dates[i] <= sevenDaysMs) {
          count++;
        } else {
          break;
        }
      }
      if (count > maxBooksIn7Days) maxBooksIn7Days = count;
    }
  } else if (validSubs.length === 1) {
    maxBooksIn7Days = 1;
  }

  // 3. Deep Thinker: Count reflections with 30+ words
  const deepReflections = validSubs.filter((s) => {
    const reflection = String(s.reflection || s.review || "");
    const words = reflection.trim().split(/\s+/).filter(Boolean);
    return words.length >= 30;
  }).length;

  // 4. Streak Master: Count distinct calendar weeks (using ISO week numbers or distinct dates)
  const distinctDays = new Set<string>();
  validSubs.forEach((s) => {
    const dStr = s.date_finished || s.created_at;
    if (dStr) {
      try {
        const d = new Date(String(dStr));
        distinctDays.add(`${d.getFullYear()}-${d.getMonth() + 1}-${Math.floor(d.getDate() / 7)}`);
      } catch {
        distinctDays.add(String(dStr).slice(0, 10));
      }
    }
  });
  const distinctWeeks = distinctDays.size;

  // Evaluate each badge
  return ALL_BADGE_DEFINITIONS.map((def) => {
    let currentProgress = 0;
    let unlocked = false;
    let unlockedAt: string | undefined = undefined;

    switch (def.id) {
      case "genre-explorer":
        currentProgress = uniqueCategories;
        unlocked = uniqueCategories >= 4;
        break;

      case "fast-reader":
        currentProgress = maxBooksIn7Days;
        unlocked = maxBooksIn7Days >= 2;
        break;

      case "first-steps":
        currentProgress = booksCount;
        unlocked = booksCount >= 1;
        break;

      case "avid-bookworm":
        currentProgress = booksCount;
        unlocked = booksCount >= 5;
        break;

      case "century-scholar":
        currentProgress = points;
        unlocked = points >= 100;
        break;

      case "deep-thinker":
        currentProgress = deepReflections;
        unlocked = deepReflections >= 2;
        break;

      case "house-champion":
        // Valid if enrolled in a house and has 50+ points
        currentProgress = points;
        unlocked = points >= 50 && Boolean(profile?.house && profile.house !== "Unassigned");
        break;

      case "realm-voyager":
        currentProgress = uniqueCategories;
        unlocked = uniqueCategories >= 8;
        break;

      case "streak-master":
        currentProgress = distinctWeeks;
        unlocked = distinctWeeks >= 3;
        break;

      case "grand-master":
        currentProgress = booksCount;
        unlocked = booksCount >= 45;
        break;

      default:
        currentProgress = 0;
        unlocked = false;
    }

    const cappedProgress = Math.min(currentProgress, def.maxProgress);
    const progressPercent = Math.min(100, Math.round((cappedProgress / def.maxProgress) * 100));

    // Guess unlock date from last matching submission if unlocked
    if (unlocked && validSubs.length > 0) {
      const latest = validSubs[validSubs.length - 1];
      unlockedAt = latest.date_finished ? String(latest.date_finished) : (latest.created_at ? String(latest.created_at) : undefined);
    }

    return {
      ...def,
      unlocked,
      unlockedAt,
      currentProgress: cappedProgress,
      progressPercent,
    };
  });
}

/**
 * Returns only the unlocked badges for a student, sorted by tier prestige
 */
export function getUnlockedBadgesForStudent(
  submissions: BadgeSubmissionInput[] = [],
  totalPoints?: number,
  totalBooks?: number,
  profile?: BadgeProfileInput
): BadgeRecord[] {
  const all = computeStudentBadges(submissions, totalPoints, totalBooks, profile);
  const tierWeight: Record<string, number> = {
    diamond: 4,
    gold: 3,
    silver: 2,
    bronze: 1,
  };
  return all
    .filter((b) => b.unlocked)
    .sort((a, b) => (tierWeight[b.tier] || 0) - (tierWeight[a.tier] || 0));
}

/**
 * Get top N unlocked badges for compact display (e.g. in leaderboard table row)
 */
export function getTopBadgesForStudent(
  submissions: BadgeSubmissionInput[] = [],
  totalPoints?: number,
  totalBooks?: number,
  profile?: BadgeProfileInput,
  limit = 3
): BadgeRecord[] {
  const unlocked = getUnlockedBadgesForStudent(submissions, totalPoints, totalBooks, profile);
  return unlocked.slice(0, limit);
}
