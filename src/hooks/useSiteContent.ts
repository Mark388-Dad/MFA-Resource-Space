import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { safeStorage } from "@/lib/safeStorage";

export type SiteBlock = { title: string; content: string; visible: boolean };

export const SITE_DEFAULTS: Record<string, SiteBlock> = {
  // Brand & School Badge
  brand: { title: "45-Book Reading Challenge", content: "2026/2027", visible: true },
  school_badge_label: { title: "M-Pesa Foundation Academy Badge", content: "Thinkers. Doers. Leaders.", visible: true },

  // Hero Section
  hero_kicker: { title: "45-BOOK READING CHALLENGE 2026/2027", content: "Academic Year 2026/2027", visible: true },
  hero_theme: { title: "Beyond the Pages - 26/27", content: "📚 Read. 💡 Discover. ☀️ Become.", visible: true },
  hero_welcome: {
    title: "Welcome",
    content:
      "Welcome to the 45-Book Reading Challenge 2026/2027, a year-long reading adventure designed to inspire curiosity, imagination, and a lifelong love of reading. This year's theme, Beyond the Pages, transforms every reading category into a Literary Realm waiting to be explored.",
    visible: true,
  },
  hero_cta_dashboard: { title: "Go to Dashboard", content: "/dashboard", visible: true },
  hero_cta_challenges: { title: "Browse Challenges", content: "/challenges", visible: true },
  hero_cta_realms: { title: "Explore 15 literary realms", content: "#categories", visible: true },

  // Jump to navigation
  quicklinks: {
    title: "Jump to",
    content: "Goals | Points | Levels | Categories | Reflections | IB Connections | Outcomes",
    visible: true,
  },

  // Hero Houses and Social Proof
  hero_houses: {
    title: "4 Houses",
    content: "Kenya · Longonot · Menengai · Suswa competing live",
    visible: true,
  },

  // Daily Quote
  hero_daily_quote: {
    title: "Daily quote",
    content: '"Every book you open is a door into a new world."',
    visible: true,
  },
  hero_daily_quote_author: {
    title: "Quote Author",
    content: "— George R.R. Martin",
    visible: true,
  },

  // Fast Stats & Bento Badges
  hero_stats_books: { title: "45", content: "Books goal", visible: true },
  hero_stats_realms: { title: "15", content: "Literary realms", visible: true },
  hero_stats_levels: { title: "Levels", content: "Bronze: 15 books | Silver: 30 books | Gold: 45 books", visible: true },
  hero_stats_ib: { title: "IB Learner", content: "Profile aligned", visible: true },

  // Challenge Goals
  goals: {
    title: "Challenge Goals",
    content:
      "Beyond the Pages turns every category into a Literary Realm waiting to be explored.\n• Foster a lifelong love of reading.\n• Encourage exploration of diverse genres and authors.\n• Develop critical thinking, creativity, and empathy.\n• Strengthen communication, reflection, and self-management skills.\n• Build a vibrant reading culture within the school community.",
    visible: true,
  },

  // Points & Awards
  points: {
    title: "Point Awards",
    content:
      "Bonus points stack on top of your book points and count towards the leaderboard. One book already earns you 6 points.\n• Join the Challenge: 3 pts\n• Each book completed: 3 pts\n• Reach Bronze Level (15 books): 5 pts\n• Reach Silver Level (30 books): 10 pts\n• Reach Gold Level (45 books): 15 pts",
    visible: true,
  },

  // Achievement Levels
  levels_header: {
    title: "Achievement Levels",
    content: "Select one book under each achievement level and reflect based on the provided instructions.",
    visible: true,
  },
  levels_bronze: {
    title: "Bronze Reader",
    content:
      "First Semester | 15 books\nComplete reflections inspired by 'Titles That Speak' and 'Moments That Change Everything'.\n\"How titles and turning points shape meaning.\"",
    visible: true,
  },
  levels_silver: {
    title: "Silver Reader",
    content:
      "Second Semester | 30 books\nExplore 'Characters That Stay With Us' through deeper reflection.\n\"How characters reveal identity, resilience, and moral growth.\"",
    visible: true,
  },
  levels_gold: {
    title: "Gold Reader",
    content:
      "Full Year | 45 books\nCreate a final reflection under 'Stories That Matter'.\n\"Connecting your reading journey to personal and global themes.\"",
    visible: true,
  },

  // 15 Literary Realms
  realms_header: {
    title: "The 15 Literary Realms",
    content:
      "15 Literary Realms · 45 Books Journey\nRead one book from each realm, then complete the rest from any realms you love. A maximum of 4 books may be counted from the same realm.",
    visible: true,
  },
  realms_list: {
    title: "Realms Specifications",
    content: `1 | Explorer's Frontier | Adventure | What made the journey gripping? Describe 3 moments of risk, discovery or courage that stood out. | Max 4 books
2 | Realm of Wonders | Fantasy | How convincing was the world-building? Share 3 magical or imagined elements you enjoyed most. | Max 4 books
3 | Timekeeper's Vault | Historical | What did you learn about the period? Mention 3 details that made the past feel real. | Max 4 books
4 | Shadowlands | Horror | What created the tension or fear? Discuss 3 techniques the author used to unsettle you. | Max 4 books
5 | Heartlands | Romance | How did the relationship develop? Reflect on 3 moments that shaped the connection between the characters. | Max 4 books
6 | Discovery Lab | Science | What scientific idea did the book explore? Explain 3 things you now understand better. | Max 4 books
7 | Story Islands | Short Stories | Which story stayed with you and why? Compare 3 stories in terms of theme, mood or style. | Max 4 books
8 | Grand Stage | Play | How did dialogue and stage directions shape the drama? Reflect on 3 scenes that carried the most weight. | Max 4 books
9 | Motherland Voices | African Fiction | How did the African setting and voice shape the story? Share 3 cultural or social insights you gained. | Max 4 books
10 | Pwani ya Lugha | Swahili | Eleza ulichojifunza kutokana na kitabu hiki. Taja mambo 3 yaliyokuvutia kuhusu lugha, wahusika au maudhui. | Max 4 books
11 | Verse Garden | Poetry | Reflect on the themes, emotions and imagery used by the poet. Did any poem resonate with you personally? | Max 4 books
12 | Riddle Quarter | Mystery | How well was the puzzle built? Discuss 3 clues, red herrings or twists that shaped your reading. | Max 4 books
13 | Mirror City | Realistic | How true to life did the story feel? Share 3 situations or characters that mirrored real experiences. | Max 4 books
14 | Hall of Lives | Biography | How did this life story inspire or challenge you? What 3 lessons or perspectives did you gain? | Max 4 books
15 | Graphic Galaxy | Graphic Novels | Did the artwork enhance the storytelling? Share 3 aspects of the visuals and narrative that you appreciated. | Max 4 books`,
    visible: true,
  },

  // Reflection Prompts
  reflections: {
    title: "Reflection Prompts",
    content:
      "Use these guiding prompts to deepen your reflections throughout the challenge.\n• Titles That Speak: \"How does a title capture a story's message or emotion?\"\n• Moments That Change Everything: \"What scene or decision reshapes the story's direction?\"\n• Characters That Stay With Us: \"Which character resonates with you, and why?\"\n• Stories That Matter: \"Why does this story matter to you or to the world?\"",
    visible: true,
  },

  // IB & CBC Connections
  ib_connections: {
    title: "IB & CBC Connections",
    content:
      "Every realm you explore builds the skills and competencies at the heart of both frameworks.\n\n[IB_ATL]\n• Communication\n• Research\n• Reflection\n\n[IB_PROFILE]\n• Thinkers\n• Caring\n• Communicators\n• Open-minded\n\n[TOK]\nHow do stories shape what we know about identity, justice and truth?\n\n[CBC]\n• Critical Thinking & Problem Solving\n• Communication & Collaboration\n• Creativity & Imagination\n• Digital Literacy\n• Self-Efficacy & Self-Management\n• Citizenship",
    visible: true,
  },

  // Outcomes: What Will You Gain?
  outcomes: {
    title: "What Will You Gain?",
    content:
      "By completing this journey, you will:\n• Read up to 45 books across a variety of genres.\n• Become a more confident and independent reader.\n• Explore diverse cultures, experiences, and perspectives.\n• Develop stronger critical thinking and communication skills.\n• Build lasting reading habits.\n• Strengthen creativity, empathy, and imagination.\n• Reflect on how stories can change the way you understand the world.\n• Contribute to a thriving reading culture within the school community.",
    visible: true,
  },

  // Footer & Values
  footer_quote: {
    title: "Beyond the Pages",
    content:
      "Read 45 books across a variety of genres. Become confident independent readers. Explore diverse cultures and perspectives. Build lasting reading habits.",
    visible: true,
  },
  footer_values: {
    title: "CLAIRE Values",
    content:
      "Curiosity | Leadership | Accountability | Innovation | Responsible Citizenship | Excellence",
    visible: true,
  },
  footer_note: {
    title: "M-PESA Foundation Academy",
    content: "Thinkers. Doers. Leaders.",
    visible: true,
  },
  announcement: { title: "", content: "", visible: false },
  deadline: { title: "", content: "", visible: false },
  tip_of_day: { title: "Traveller's Tip", content: "", visible: true },
};

/** Split a content block into clean bullet/paragraph lines. */
export function contentLines(content: string): string[] {
  return content
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[•\-*–]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
}

export function getLocalHomepageOverrides(): Record<string, SiteBlock> {
  return safeStorage.getJSON<Record<string, SiteBlock>>("mfa_homepage_overrides", {});
}

export function setHomepageBlockOverride(key: string, block: Partial<SiteBlock>) {
  const current = getLocalHomepageOverrides();
  const existing = current[key] || cache?.[key] || SITE_DEFAULTS[key] || { title: "", content: "", visible: true };
  const updated: SiteBlock = {
    ...existing,
    ...block,
  };
  current[key] = updated;
  safeStorage.setJSON("mfa_homepage_overrides", current);
  if (cache) {
    cache[key] = updated;
    listeners.forEach((l) => l({ ...cache }));
  }

  // Attempt to sync to supabase homepage_content table in background
  try {
    supabase
      .from("homepage_content" as any)
      .upsert({
        section_key: key,
        title: updated.title,
        content: updated.content,
        is_visible: updated.visible,
      } as any)
      .then(() => {})
      .catch(() => {});
  } catch {
    // Ignore db sync failure, safeStorage ensures persistent local state
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mfa_homepage_content_updated"));
  }
}

export function resetHomepageBlockOverrides() {
  safeStorage.remove("mfa_homepage_overrides");
  load();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mfa_homepage_content_updated"));
  }
}

let cache: Record<string, SiteBlock> | null = null;
const listeners = new Set<(v: Record<string, SiteBlock>) => void>();
let subscribed = false;

async function load() {
  const localOverrides = getLocalHomepageOverrides();
  try {
    const { data } = await supabase
      .from("homepage_content")
      .select("section_key,title,content,is_visible");
    const next: Record<string, SiteBlock> = { ...SITE_DEFAULTS };
    (data ?? []).forEach((r: any) => {
      next[r.section_key] = {
        title: r.title ?? SITE_DEFAULTS[r.section_key]?.title ?? "",
        content: r.content ?? SITE_DEFAULTS[r.section_key]?.content ?? "",
        visible: r.is_visible !== false,
      };
    });
    // Merge local overrides on top so live edits reflect instantly
    Object.assign(next, localOverrides);
    cache = next;
    listeners.forEach((l) => l(next));
  } catch (err) {
    console.warn("Could not load homepage content from database, using defaults:", err);
    cache = { ...SITE_DEFAULTS, ...localOverrides };
    listeners.forEach((l) => l(cache!));
  }
}

/** Site-wide editable copy, driven by the homepage_content table and live local overrides. */
export function useSiteContent() {
  const [blocks, setBlocks] = useState<Record<string, SiteBlock>>(() => {
    const overrides = getLocalHomepageOverrides();
    return cache ? { ...cache, ...overrides } : { ...SITE_DEFAULTS, ...overrides };
  });

  useEffect(() => {
    listeners.add(setBlocks);
    load();

    const handleLocalUpdate = () => {
      const overrides = getLocalHomepageOverrides();
      setBlocks((prev) => ({ ...prev, ...overrides }));
    };
    window.addEventListener("mfa_homepage_content_updated", handleLocalUpdate);

    if (!subscribed) {
      subscribed = true;
      supabase
        .channel("homepage_content_live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "homepage_content" },
          () => load()
        )
        .subscribe();
    }
    return () => {
      listeners.delete(setBlocks);
      window.removeEventListener("mfa_homepage_content_updated", handleLocalUpdate);
    };
  }, []);

  const get = (key: string): SiteBlock => blocks[key] ?? SITE_DEFAULTS[key] ?? { title: "", content: "", visible: true };
  return { blocks, get, updateBlock: setHomepageBlockOverride, resetOverrides: resetHomepageBlockOverrides };
}

/* ========================================================
   Librarian Homepage Design, Font & Section Switches Studio
   ======================================================== */
export interface HomepageThemeConfig {
  fontFamily: "sans" | "serif" | "mono" | "display" | "inter" | "cinzel" | "playfair" | "california";
  fontSizeScale: "compact" | "normal" | "large" | "xl" | "expressive";
  gradientTheme:
    | "lime-glow"
    | "royal-indigo"
    | "warm-amber"
    | "emerald-forest"
    | "ruby-rose"
    | "ocean-cyan"
    | "midnight-luxe"
    | "school-navy"
    | "gold-leaf";
  primaryColor?: string; // e.g. #0B192C
  accentColor?: string; // e.g. #16A34A
  cardGlowEffect?: "none" | "subtle" | "radiant" | "luxury";
  glassmorphism?: boolean;
  borderRadiusStyle?: "sharp" | "rounded" | "extra-rounded" | "pill";
  cardBorderAccent?: "subtle" | "gold" | "colored" | "none";
  sectionSwitches: {
    hero: boolean;
    quote: boolean;
    stats: boolean;
    houses: boolean;
    quicklinks: boolean;
    customBlocks: boolean;
    goals: boolean;
    points: boolean;
    levels: boolean;
    realms: boolean;
    reflections: boolean;
    ib: boolean;
    outcomes: boolean;
    footer: boolean;
  };
}

export const DEFAULT_HOMEPAGE_THEME_CONFIG: HomepageThemeConfig = {
  fontFamily: "sans",
  fontSizeScale: "normal",
  gradientTheme: "lime-glow",
  primaryColor: "#0B192C",
  accentColor: "#16A34A",
  cardGlowEffect: "subtle",
  glassmorphism: true,
  borderRadiusStyle: "rounded",
  cardBorderAccent: "subtle",
  sectionSwitches: {
    hero: true,
    quote: true,
    stats: true,
    houses: true,
    quicklinks: true,
    customBlocks: true,
    goals: true,
    points: true,
    levels: true,
    realms: true,
    reflections: true,
    ib: true,
    outcomes: true,
    footer: true,
  },
};

const THEME_STORAGE_KEY = "mfa_homepage_theme_design_config_v2";

export function getHomepageThemeConfig(): HomepageThemeConfig {
  try {
    const raw = safeStorage.getItem(THEME_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_HOMEPAGE_THEME_CONFIG,
        ...parsed,
        sectionSwitches: {
          ...DEFAULT_HOMEPAGE_THEME_CONFIG.sectionSwitches,
          ...(parsed.sectionSwitches || {}),
        },
      };
    }
  } catch (e) {
    console.warn("Could not read homepage theme config:", e);
  }
  return DEFAULT_HOMEPAGE_THEME_CONFIG;
}

export function saveHomepageThemeConfig(cfg: HomepageThemeConfig): void {
  try {
    safeStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(cfg));
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("mfa_homepage_theme_updated", { detail: cfg })
      );
    }
  } catch (e) {
    console.error("Could not save homepage theme config:", e);
  }
}

export function useHomepageTheme() {
  const [theme, setTheme] = useState<HomepageThemeConfig>(getHomepageThemeConfig);

  useEffect(() => {
    const handleUpdate = () => {
      setTheme(getHomepageThemeConfig());
    };
    window.addEventListener("mfa_homepage_theme_updated", handleUpdate);
    return () => {
      window.removeEventListener("mfa_homepage_theme_updated", handleUpdate);
    };
  }, []);

  const updateTheme = (partial: Partial<HomepageThemeConfig>) => {
    const current = getHomepageThemeConfig();
    const next: HomepageThemeConfig = {
      ...current,
      ...partial,
      sectionSwitches: {
        ...current.sectionSwitches,
        ...(partial.sectionSwitches || {}),
      },
    };
    saveHomepageThemeConfig(next);
    setTheme(next);
  };

  const toggleSection = (sectionKey: keyof HomepageThemeConfig["sectionSwitches"]) => {
    const current = getHomepageThemeConfig();
    const next: HomepageThemeConfig = {
      ...current,
      sectionSwitches: {
        ...current.sectionSwitches,
        [sectionKey]: !current.sectionSwitches[sectionKey],
      },
    };
    saveHomepageThemeConfig(next);
    setTheme(next);
  };

  const resetTheme = () => {
    saveHomepageThemeConfig(DEFAULT_HOMEPAGE_THEME_CONFIG);
    setTheme(DEFAULT_HOMEPAGE_THEME_CONFIG);
  };

  return { theme, updateTheme, toggleSection, resetTheme };
}
