import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { publishBroadcast } from "@/lib/broadcastManager";
import { saveLocalRegistration, getLocalRegistrations } from "@/lib/challengeRegistrationManager";
import { STANDARD_ACCESS_CODES, validateAccessCode } from "@/lib/accessCodes";
import ChallengeAccessCodeDialog from "@/components/ChallengeAccessCodeDialog";
import { safeStorage } from "@/lib/safeStorage";

export type ChallengeStatus = "open" | "locked" | "closed";
export type SubmissionType = "book" | "poem" | "essay" | "article" | "art" | "audio" | "custom";

export interface ChallengeCategoryItem {
  id: number;
  name: string;
  realm?: string;
  prompt: string;
  max_books?: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  submission_type?: SubmissionType;
  status: ChallengeStatus; // "open" (accepting submissions), "locked" (temporarily paused), "closed" (ended; certs unlocked)
  target_books: number;
  points_reward: number;
  points_per_book?: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_featured?: boolean;
  category?: string;
  badge_name?: string;
  badge_icon?: string;
  logo_url?: string;
  accent_color?: string | null;
  allowed_houses?: string[] | null;
  allowed_year_groups?: string[] | null;
  allowed_classes?: string[] | null;
  categories?: ChallengeCategoryItem[];
  min_reflection_chars?: number;
  max_books_per_category?: number;
  certificate_signatory_name?: string;
  certificate_signatory_title?: string;
  certificate_release_policy?: "on_close_only" | "immediate";
  features?: string[];
  level_milestones?: { bronze?: number; silver?: number; gold?: number };
  submission_guidelines?: string;
  google_sheet_url?: string;
  created_at?: string;
  created_by?: string;
}

export const ALL_CHALLENGES_ID = "all";

export const ALL_CHALLENGES_OBJECT: Challenge = {
  id: "all",
  title: "All Academy Reading Challenges (Combined)",
  description: "Comprehensive academy-wide view encompassing all active and specialty reading challenges, student cross-realm achievements, and house standings.",
  challenge_type: "all",
  submission_type: "book",
  status: "open",
  target_books: 45,
  points_reward: 450,
  start_date: "2026-09-01",
  end_date: "2027-07-31",
  is_active: true,
  is_featured: true,
  category: "Whole School",
  badge_name: "Grand Academy Scholar",
  badge_icon: "📚",
};

export const MAIN_CHALLENGE_ID = "45450000-2025-4026-8000-000000000045";
export const AFRICAN_VOICES_CHALLENGE_ID = "45450000-2025-4026-8000-000000000001";
export const STEM_CHALLENGE_ID = "45450000-2025-4026-8000-000000000002";
export const GRAPHIC_NOVELS_CHALLENGE_ID = "45450000-2025-4026-8000-000000000003";

export function normalizeChallengeId(id: string | null | undefined): string {
  if (!id) return MAIN_CHALLENGE_ID;
  if (id === "challenge-african-voices") return AFRICAN_VOICES_CHALLENGE_ID;
  if (id === "challenge-stem-nonfiction") return STEM_CHALLENGE_ID;
  if (id === "challenge-junior-graphic") return GRAPHIC_NOVELS_CHALLENGE_ID;
  return id;
}

export const DEFAULT_CHALLENGES: Challenge[] = [
  {
    id: MAIN_CHALLENGE_ID,
    title: "45-Book Reading Challenge: Beyond the Pages",
    description: "The premier whole-academy reading journey across 11 literary realms, cultivating deep scholarship, inquiry, and critical reflection.",
    challenge_type: "individual",
    submission_type: "book",
    status: "open",
    target_books: 45,
    points_reward: 450,
    points_per_book: 10,
    max_books_per_category: 4,
    start_date: "2026-09-01",
    end_date: "2027-07-31",
    is_active: true,
    is_featured: true,
    category: "Whole School",
    badge_name: "45-Book Laureate",
    badge_icon: "🏆",
    accent_color: "gold",
    certificate_signatory_name: "Head Librarian",
    certificate_signatory_title: "Media Specialist",
  },
  {
    id: AFRICAN_VOICES_CHALLENGE_ID,
    title: "African Voices & Motherland Fiction Sprint",
    description: "Specialty sprint exploring contemporary and classical African literature, post-colonial prose, and diaspora poetry.",
    challenge_type: "individual",
    submission_type: "book",
    status: "open",
    target_books: 10,
    points_reward: 100,
    points_per_book: 10,
    max_books_per_category: 4,
    start_date: "2026-09-01",
    end_date: "2027-07-31",
    is_active: true,
    is_featured: false,
    category: "Literature",
    badge_name: "Motherland Literary Fellow",
    badge_icon: "🌍",
    accent_color: "emerald",
    categories: [
      {
        id: 1,
        name: "Contemporary African Fiction & Prose",
        realm: "African Voices",
        prompt: "Reflect on how this work portrays modern socio-cultural realities, community identity, or interpersonal resilience in Africa.",
        max_books: 4,
      },
      {
        id: 2,
        name: "Pan-African Poetry, Drama & Verse",
        realm: "Motherland Verse",
        prompt: "Examine the figurative language, oral traditions, rhythmic structure, and societal commentary in this verse or theatrical piece.",
        max_books: 4,
      },
      {
        id: 3,
        name: "Historical African Chronicles & Folktales",
        realm: "Heritage & Roots",
        prompt: "Analyze how historical heritage, ancestral wisdom, and indigenous values shape the characters and world-building.",
        max_books: 4,
      },
      {
        id: 4,
        name: "Diaspora Perspectives & Global Voices",
        realm: "Beyond Borders",
        prompt: "Discuss the cross-cultural experiences, diaspora identity, and global perspectives explored in this narrative.",
        max_books: 4,
      },
    ],
  },
  {
    id: STEM_CHALLENGE_ID,
    title: "STEM Innovations & Non-Fiction Exploration",
    description: "Delve into scientific discoveries, biographies of innovators, mathematics, philosophy, and technological ethics.",
    challenge_type: "individual",
    submission_type: "book",
    status: "open",
    target_books: 10,
    points_reward: 100,
    points_per_book: 10,
    max_books_per_category: 4,
    start_date: "2026-09-01",
    end_date: "2027-07-31",
    is_active: true,
    is_featured: false,
    category: "STEM",
    badge_name: "Scientific Visionary",
    badge_icon: "🔬",
    accent_color: "blue",
    categories: [
      {
        id: 1,
        name: "Scientific Breakthroughs & Cosmology",
        realm: "Scientific Frontiers",
        prompt: "What scientific principles or natural phenomena were explored? How does this change your understanding of our universe?",
        max_books: 4,
      },
      {
        id: 2,
        name: "Innovators, Inventors & Biographies",
        realm: "Minds of Discovery",
        prompt: "Reflect on the key inquiry habits, ethical dilemmas, and perseverant mindset demonstrated by the innovators.",
        max_books: 4,
      },
      {
        id: 3,
        name: "Artificial Intelligence & Future Tech Ethics",
        realm: "Silicon & Society",
        prompt: "Evaluate the societal impacts, ethical boundaries, and transformative potential of emerging technologies discussed.",
        max_books: 4,
      },
      {
        id: 4,
        name: "Applied Mathematics & Environmental Systems",
        realm: "The Natural Code",
        prompt: "Synthesize how mathematical thinking, ecological models, or engineering solutions can address real-world challenges.",
        max_books: 4,
      },
    ],
  },
  {
    id: GRAPHIC_NOVELS_CHALLENGE_ID,
    title: "Junior Graphic Novels & Visual Storytelling",
    description: "Visual narratives, manga, historical graphic accounts, and sequential art exploring character arcs and visual metaphors.",
    challenge_type: "individual",
    submission_type: "book",
    status: "open",
    target_books: 10,
    points_reward: 100,
    points_per_book: 10,
    max_books_per_category: 4,
    start_date: "2026-09-01",
    end_date: "2027-07-31",
    is_active: true,
    is_featured: false,
    category: "Arts & Graphics",
    badge_name: "Graphic Storyteller",
    badge_icon: "🎨",
    accent_color: "magenta",
    categories: [
      {
        id: 1,
        name: "Sequential Arts & Graphic Narratives",
        realm: "Visual Storytelling",
        prompt: "Reflect on how visual paneling, pacing, and artwork complement or elevate the emotional resonance of the storyline.",
        max_books: 4,
      },
      {
        id: 2,
        name: "Manga & International Visual Classics",
        realm: "Global Ink",
        prompt: "Examine cultural storytelling tropes, character development, and unique visual framing used by the creator.",
        max_books: 4,
      },
      {
        id: 3,
        name: "Illustrated Memoirs & Non-Fiction Comics",
        realm: "Illustrated Truth",
        prompt: "How does the combination of graphic illustration and personal memoir deepen empathy and authenticity for the subject?",
        max_books: 4,
      },
      {
        id: 4,
        name: "Speculative & Fantasy Graphic Worlds",
        realm: "Myth & Ink",
        prompt: "Analyze the world-building, symbolic color palettes, and thematic conflicts portrayed in this graphic novel.",
        max_books: 4,
      },
    ],
  },
];

interface ChallengeContextType {
  challenges: Challenge[];
  activeChallenges: Challenge[];
  userVisibleChallenges: Challenge[];
  selectedChallengeId: string;
  selectedChallenge: Challenge | undefined;
  setSelectedChallengeId: (id: string) => void;
  loading: boolean;
  refreshChallenges: () => Promise<void>;
  setChallengeStatus: (id: string, status: ChallengeStatus) => Promise<void>;
  createChallenge: (newChallenge: Partial<Challenge>) => Promise<Challenge>;
  updateChallenge: (id: string, patch: Partial<Challenge>) => Promise<void>;
  toggleChallengeActive: (id: string, active: boolean) => Promise<void>;
  deleteChallenge: (id: string) => Promise<boolean>;
  broadcastChallengeToAll: (challengeId: string) => Promise<boolean>;
  isRegistered: (challengeId: string) => boolean;
  registerForChallenge: (challengeId: string) => Promise<boolean>;
  joinChallengeWithCode: (challengeId: string, code: string) => Promise<{ ok: boolean; message: string }>;
  registeredChallengeIds: string[];
}

const ChallengeContext = createContext<ChallengeContextType | undefined>(undefined);

export const ChallengeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallengeId, setSelectedChallengeIdState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const chParam = urlParams.get("challenge") || urlParams.get("c") || urlParams.get("id");
      if (chParam && chParam) {
        return chParam;
      }
    }
    return safeStorage.getItem("mfa-selected-challenge-id") || MAIN_CHALLENGE_ID;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [registeredChallengeIds, setRegisteredChallengeIds] = useState<string[]>([]);
  const [codePromptId, setCodePromptId] = useState<string | null>(null);

  // Keep registrations synced with user
  useEffect(() => {
    const targetUserId = user?.id || profile?.user_id || "current_user";
    const local = getLocalRegistrations(targetUserId);
    if (local.length > 0) {
      setRegisteredChallengeIds(local);
    }
    // Database source of truth for joined challenges
    if (user?.id) {
      supabase
        .from("challenge_participants")
        .select("challenge_id")
        .eq("user_id", user.id)
        .then(({ data }) => {
          const fromDb = (data || []).map((d) => d.challenge_id);
          const merged = Array.from(new Set([...local, ...fromDb]));
          setRegisteredChallengeIds(merged);
          merged.forEach((cid) => saveLocalRegistration(user.id, cid));
        });
    }
  }, [user?.id, profile?.user_id]);

  const isRegistered = useCallback(
    (challengeId: string) => {
      // Librarians and academy administrators do NOT need to verify access codes
      if (profile?.role === "librarian" || profile?.role === "admin") return true;
      if (!challengeId) return false;
      if (challengeId === ALL_CHALLENGES_ID) {
        return registeredChallengeIds.length > 0;
      }
      const norm = normalizeChallengeId(challengeId);
      return registeredChallengeIds.includes(challengeId) || registeredChallengeIds.includes(norm);
    },
    [registeredChallengeIds, profile?.role]
  );

  // Without a code, joining opens the access-code prompt
  const registerForChallenge = useCallback(
    async (challengeId: string) => {
      if (registeredChallengeIds.includes(challengeId)) return true;
      setCodePromptId(challengeId);
      return false;
    },
    [registeredChallengeIds]
  );

  const joinChallengeWithCode = useCallback(
    async (challengeId: string, code: string) => {
      const cleanCode = code.trim().toUpperCase();
      if (!cleanCode) {
        return { ok: false, message: "Please enter an access code" };
      }

      // Check if code matches challenge's specific access code if defined
      const norm = normalizeChallengeId(challengeId);
      const targetChallenge = challenges.find((c) => c.id === challengeId || c.id === norm);
      const isChallengeSpecific =
        targetChallenge?.access_code &&
        targetChallenge.access_code.trim().toUpperCase() === cleanCode;

      // Check access code validity across standard & database codes with full role restrictions
      const validation = isChallengeSpecific
        ? { valid: true, message: `Access code verified for "${targetChallenge?.title || "Challenge"}"` }
        : await validateAccessCode(cleanCode, profile?.role || "student");

      if (!validation.valid) {
        return { ok: false, message: validation.message || "Invalid access code. Please check with your librarian or homeroom tutor." };
      }

      // Persist participant registration cleanly into database and local storage
      const targetUserId = user?.id || profile?.user_id || "current_user";
      if (user?.id) {
        try {
          const { data: existing } = await supabase
            .from("challenge_participants")
            .select("id")
            .eq("user_id", user.id)
            .in("challenge_id", [challengeId, norm])
            .maybeSingle();

          if (!existing) {
            const { error: insErr } = await supabase.from("challenge_participants").insert({
              user_id: user.id,
              challenge_id: norm,
              joined_at: new Date().toISOString(),
              books_completed: 0,
            });
            if (insErr) {
              console.warn("Could not insert to challenge_participants, using local registration:", insErr);
            }
          }
        } catch (partErr) {
          console.warn("Could not insert to challenge_participants, using local fallback:", partErr);
        }
      }
      saveLocalRegistration(targetUserId, challengeId);
      if (norm !== challengeId) {
        saveLocalRegistration(targetUserId, norm);
      }
      setRegisteredChallengeIds((prev) => [...new Set([...prev, challengeId, norm])]);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("mfa-challenge-registration-changed", {
            detail: { userId: targetUserId, challengeId, status: "registered" },
          })
        );
        window.dispatchEvent(new CustomEvent("mfa_challenge_participants_updated"));
      }

      return { ok: true, message: validation.message || "Access code verified successfully! Welcome to the challenge." };
    },
    [user?.id, profile?.role, profile?.user_id, challenges]
  );

  const setSelectedChallengeId = useCallback((id: string) => {
    setSelectedChallengeIdState(id);
    safeStorage.setItem("mfa-selected-challenge-id", id);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("mfa-challenge-changed", { detail: { challengeId: id } }));
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has("challenge") || url.searchParams.has("c") || url.searchParams.has("id")) {
          url.searchParams.set("challenge", id);
          window.history.replaceState({}, "", url.toString());
        }
      } catch {}
    }
  }, []);

  const loadChallenges = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Could not fetch remote challenges (using standard academy challenges):", error);
        setChallenges(DEFAULT_CHALLENGES);
      } else if (data && data.length > 0) {
        // Normalize fields
        const mapped: Challenge[] = data.map((d: Record<string, any>) => {
          const layout = typeof d.layout_config === "object" && d.layout_config !== null ? d.layout_config : {};
          const localStatus = safeStorage.getItem(`mfa_challenge_status_${d.id}`) as ChallengeStatus | null;
          const statusVal: ChallengeStatus = localStatus || (layout.status as ChallengeStatus) || (d.is_active === false ? "closed" : "open");
          return {
            id: String(d.id),
            title: String(d.title),
            description: String(d.description || ""),
            challenge_type: String(d.challenge_type || "individual"),
            submission_type: (layout.submission_type as SubmissionType) || "book",
            submission_guidelines: typeof layout.submission_guidelines === "string" ? layout.submission_guidelines : undefined,
            features: Array.isArray(layout.features) ? layout.features : undefined,
            level_milestones: layout.level_milestones || undefined,
            status: statusVal,
            target_books: Number(d.target_books) || 10,
            points_reward: Number(d.points_reward) || 100,
            points_per_book: Number(layout.points_per_book) || 10,
            start_date: String(d.start_date || new Date().toISOString()),
            end_date: String(d.end_date || new Date().toISOString()),
            is_active: statusVal !== "closed",
            is_featured: Boolean(d.is_featured),
            category: String(d.category || "General"),
            badge_name: String(d.badge_name || "Reading Star"),
            badge_icon: String(d.badge_icon || "🏅"),
            accent_color: d.accent_color ? String(d.accent_color) : null,
            created_at: d.created_at ? String(d.created_at) : undefined,
            created_by: d.created_by ? String(d.created_by) : undefined,
            allowed_houses: Array.isArray(d.allowed_houses) ? d.allowed_houses : null,
            allowed_year_groups: Array.isArray(d.allowed_year_groups) ? d.allowed_year_groups : null,
            allowed_classes: Array.isArray(d.allowed_classes) ? d.allowed_classes : null,
            categories: Array.isArray(layout.categories) ? layout.categories : undefined,
            min_reflection_chars: typeof layout.min_reflection_chars === "number" ? layout.min_reflection_chars : 50,
            max_books_per_category: typeof layout.max_books_per_category === "number" ? layout.max_books_per_category : 4,
            certificate_signatory_name: layout.signatory_name || "Head Librarian",
            certificate_signatory_title: layout.signatory_title || "Media Specialist",
            certificate_release_policy: layout.certificate_release_policy || "on_close_only",
            google_sheet_url: layout.google_sheet_url || safeStorage.getItem(`mfa_challenge_sheets_${d.id}`) || "",
          };
        });

        // Read persistent deleted challenges blacklist
        const deletedIds = new Set(safeStorage.getJSON<string[]>("mfa-deleted-challenges", []));

        // Ensure default core challenges are present if not in database, excluding deleted ones
        const existingIds = new Set(mapped.map((c) => c.id));
        const merged = mapped
          .filter((c) => !deletedIds.has(c.id))
          .map((c) => {
            const localStatus = safeStorage.getItem(`mfa_challenge_status_${c.id}`) as ChallengeStatus | null;
            const effectiveStatus = localStatus || c.status;
            let effectiveEndDate = c.end_date;
            if (effectiveStatus === "open" && effectiveEndDate) {
              const parsed = new Date(effectiveEndDate);
              if (!isNaN(parsed.getTime()) && parsed < new Date()) {
                effectiveEndDate = "2027-07-31";
              }
            }
            return {
              ...c,
              status: effectiveStatus,
              is_active: effectiveStatus !== "closed",
              end_date: effectiveEndDate,
            };
          });

        DEFAULT_CHALLENGES.forEach((def) => {
          if (!existingIds.has(def.id) && !deletedIds.has(def.id)) {
            const localStatus = safeStorage.getItem(`mfa_challenge_status_${def.id}`) as ChallengeStatus | null;
            merged.push(localStatus ? { ...def, status: localStatus, is_active: localStatus !== "closed" } : def);
          }
        });

        setChallenges(merged);
      } else {
        const deletedIds = new Set(safeStorage.getJSON<string[]>("mfa-deleted-challenges", []));
        setChallenges(DEFAULT_CHALLENGES.filter((c) => !deletedIds.has(c.id)));
      }
    } catch (err) {
      console.warn("Challenges fetch error:", err);
      const deletedIds = new Set(safeStorage.getJSON<string[]>("mfa-deleted-challenges", []));
      setChallenges(DEFAULT_CHALLENGES.filter((c) => !deletedIds.has(c.id)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChallenges();

    // Supabase Realtime listener to reflect live updates across all clients instantly
    const channel = supabase
      .channel("realtime-challenges-stream")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "challenges" },
        () => {
          loadChallenges();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "challenge_participants" },
        () => {
          if (user?.id) {
            supabase
              .from("challenge_participants")
              .select("challenge_id")
              .eq("user_id", user.id)
              .then(({ data }) => {
                setRegisteredChallengeIds((data || []).map((d) => d.challenge_id));
              });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadChallenges, user?.id]);

  const activeChallenges = useMemo(() => {
    return challenges.filter((c) => c.is_active && c.status !== "closed");
  }, [challenges]);

  const userVisibleChallenges = useMemo(() => {
    // Librarians have full whole-school oversight over all challenges
    if (profile?.role === "librarian" || profile?.role === "admin") {
      return challenges;
    }
    // Staff see challenges open to all or matching their assigned cohort
    if (profile?.role && profile.role !== "student") {
      return challenges.filter((c) => {
        if (!c.allowed_houses?.length && !c.allowed_year_groups?.length && !c.allowed_classes?.length) return true;
        if (profile.house && c.allowed_houses?.length && !c.allowed_houses.includes(profile.house)) return false;
        if (profile.year_group && c.allowed_year_groups?.length && !c.allowed_year_groups.includes(profile.year_group)) return false;
        return true;
      });
    }
    // Students only see active/open challenges they are eligible to enter
    return challenges.filter((c) => {
      if (c.status === "closed" || c.is_active === false) return false;
      if (c.allowed_houses?.length && profile?.house && !c.allowed_houses.includes(profile.house)) return false;
      if (c.allowed_year_groups?.length && profile?.year_group && !c.allowed_year_groups.includes(profile.year_group)) return false;
      if (c.allowed_classes?.length && profile?.class_name && !c.allowed_classes.includes(profile.class_name)) return false;
      return true;
    });
  }, [challenges, profile]);

  const selectedChallenge = useMemo(() => {
    if (selectedChallengeId === ALL_CHALLENGES_ID) {
      const mainCh = challenges.find((c) => c.id === MAIN_CHALLENGE_ID);
      const mainStatus = mainCh?.status ||
        (safeStorage.getItem(`mfa_challenge_status_${MAIN_CHALLENGE_ID}`) as ChallengeStatus) ||
        (safeStorage.getItem(`mfa_challenge_status_all`) as ChallengeStatus) ||
        "open";
      return { ...ALL_CHALLENGES_OBJECT, status: mainStatus };
    }
    return (
      challenges.find((c) => c.id === selectedChallengeId) ||
      activeChallenges[0] ||
      challenges[0]
    );
  }, [challenges, selectedChallengeId, activeChallenges]);

  // Listen for storage / cross-tab / popstate changes
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "mfa-selected-challenge-id" && e.newValue) {
        setSelectedChallengeIdState(e.newValue);
      }
    };
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const chParam = urlParams.get("challenge") || urlParams.get("c") || urlParams.get("id");
      if (chParam) {
        setSelectedChallengeIdState(chParam);
      }
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Dynamically tint application theme and CSS variables to match active challenge
  useEffect(() => {
    if (!selectedChallenge || typeof document === "undefined") return;

    const accentMap: Record<string, string> = {
      "45450000-2025-4026-8000-000000000045": "45 100% 52%", // Gold
      "challenge-african-voices": "152 80% 45%", // Emerald
      "challenge-stem-nonfiction": "212 100% 56%", // Electric Blue
      "challenge-junior-graphic": "320 90% 58%", // Magenta
      "all": "212 100% 56%",
    };

    let colorHsl = accentMap[selectedChallenge.id];
    if (!colorHsl && selectedChallenge.accent_color) {
      if (selectedChallenge.accent_color.includes("gold") || selectedChallenge.accent_color.includes("yellow")) colorHsl = "45 100% 52%";
      else if (selectedChallenge.accent_color.includes("emerald") || selectedChallenge.accent_color.includes("green")) colorHsl = "152 80% 45%";
      else if (selectedChallenge.accent_color.includes("blue") || selectedChallenge.accent_color.includes("cyan")) colorHsl = "212 100% 56%";
      else if (selectedChallenge.accent_color.includes("magenta") || selectedChallenge.accent_color.includes("pink")) colorHsl = "320 90% 58%";
      else if (selectedChallenge.accent_color.includes("orange") || selectedChallenge.accent_color.includes("tangerine")) colorHsl = "25 100% 55%";
    }

    if (colorHsl) {
      document.documentElement.style.setProperty("--primary", colorHsl);
      document.documentElement.style.setProperty("--ring", colorHsl);
      document.documentElement.style.setProperty("--sidebar-primary", colorHsl);
    }
  }, [selectedChallenge]);

  const mergeLayout = async (id: string, patch: Record<string, unknown>) => {
    const { data } = await supabase.from("challenges").select("layout_config").eq("id", id).maybeSingle();
    const current = (data?.layout_config && typeof data.layout_config === "object" ? data.layout_config : {}) as Record<string, unknown>;
    return { ...current, ...patch };
  };

  // Set challenge status: open, locked, or closed
  const setChallengeStatus = useCallback(async (id: string, status: ChallengeStatus) => {
    const isActive = status !== "closed";
    safeStorage.setItem(`mfa_challenge_status_${id}`, status);
    if (id === MAIN_CHALLENGE_ID || id === "all" || id === "45-books") {
      safeStorage.setItem(`mfa_challenge_status_${MAIN_CHALLENGE_ID}`, status);
      safeStorage.setItem(`mfa_challenge_status_all`, status);
      safeStorage.setItem(`mfa_challenge_status_45-books`, status);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("mfa_challenge_status_changed", { detail: { id, status } }));
    }
    setChallenges((prev) => prev.map((c) => (c.id === id ? { ...c, status, is_active: isActive } : c)));

    if (status === "locked") {
      toast.warning("Challenge status set to LOCKED. Submissions are now paused academy-wide and students will see the locked notice with admin contact option.", { duration: 5000 });
    } else if (status === "open") {
      toast.success("Challenge is now OPEN for student book submissions!", { duration: 4000 });
    } else if (status === "closed") {
      toast.info("Challenge is CONCLUDED. Certificates are now unlocked.", { duration: 4000 });
    }

    try {
      const layout = await mergeLayout(id, { status });
      await supabase.from("challenges").update({ is_active: isActive, layout_config: layout as any }).eq("id", id);
      if (id === MAIN_CHALLENGE_ID) {
        await supabase.from("system_settings").upsert({ setting_key: "reading_challenge_active", setting_value: status === "open" ? "true" : "false" });
      }
      // Broadcast over Supabase Realtime so other devices and tabs update in real time
      const realtimeChannel = supabase.channel("mfa_challenge_realtime_feed");
      realtimeChannel.send({
        type: "broadcast",
        event: "status_changed",
        payload: { id, status, timestamp: Date.now() },
      });
    } catch (e) {
      console.warn("Could not sync remote challenge status (saved locally):", e);
    }
  }, []);

  const createChallenge = useCallback(async (data: Partial<Challenge>): Promise<Challenge> => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { toast.error("Please sign in again"); throw new Error("Not signed in"); }
    const status = data.status || "open";
    const today = new Date().toISOString().slice(0, 10);
    const { data: row, error } = await supabase.from("challenges").insert({
      title: data.title?.trim() || "New Challenge",
      description: data.description || "",
      challenge_type: data.challenge_type || "individual",
      target_books: data.target_books || 10,
      points_reward: data.points_reward || 100,
      start_date: data.start_date || today,
      end_date: data.end_date || new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
      is_active: status !== "closed",
      is_featured: Boolean(data.is_featured),
      category: data.category || "Literature",
      badge_name: data.badge_name || "Scholar",
      badge_icon: data.badge_icon || "🏆",
      accent_color: data.accent_color || null,
      allowed_houses: data.allowed_houses?.length ? data.allowed_houses : null,
      allowed_year_groups: data.allowed_year_groups?.length ? data.allowed_year_groups : null,
      allowed_classes: data.allowed_classes?.length ? data.allowed_classes : null,
      created_by: authUser.id,
      layout_config: {
        status,
        points_per_book: data.points_per_book || 3,
        categories: data.categories,
        min_reflection_chars: data.min_reflection_chars || 50,
        max_books_per_category: data.max_books_per_category || 4,
        signatory_name: data.certificate_signatory_name || "Head Librarian",
        signatory_title: data.certificate_signatory_title || "Media Specialist",
        certificate_release_policy: data.certificate_release_policy || "on_close_only",
        submission_type: data.submission_type || "book",
        submission_guidelines: data.submission_guidelines || "",
        features: data.features || [],
        level_milestones: data.level_milestones,
        google_sheet_url: data.google_sheet_url || "",
      } as any,
    }).select("id").single();
    if (error || !row) {
      toast.error(`Could not create challenge: ${error?.message || "unknown error"}`);
      throw error || new Error("Create failed");
    }
    if (data.google_sheet_url) {
      safeStorage.setItem(`mfa_challenge_sheets_${row.id}`, data.google_sheet_url);
    }
    await loadChallenges();
    toast.success(`Challenge "${data.title}" created`);
    return { ...(data as Challenge), id: row.id, status, is_active: status !== "closed" };
  }, [loadChallenges]);

  const updateChallenge = useCallback(async (id: string, patch: Partial<Challenge>) => {
    const layoutPatch: Record<string, unknown> = {};
    if (patch.status) layoutPatch.status = patch.status;
    if (patch.submission_type) layoutPatch.submission_type = patch.submission_type;
    if (patch.submission_guidelines !== undefined) layoutPatch.submission_guidelines = patch.submission_guidelines;
    if (patch.points_per_book) layoutPatch.points_per_book = patch.points_per_book;
    if (patch.categories) layoutPatch.categories = patch.categories;
    if (patch.max_books_per_category) layoutPatch.max_books_per_category = patch.max_books_per_category;
    if (patch.min_reflection_chars) layoutPatch.min_reflection_chars = patch.min_reflection_chars;
    if (patch.level_milestones) layoutPatch.level_milestones = patch.level_milestones;
    if (patch.google_sheet_url !== undefined) {
      layoutPatch.google_sheet_url = patch.google_sheet_url;
      safeStorage.setItem(`mfa_challenge_sheets_${id}`, patch.google_sheet_url);
    }
    const update: Record<string, unknown> = {};
    for (const k of ["title","description","target_books","points_reward","is_active","start_date","end_date","badge_icon","badge_name","category","is_featured","accent_color"] as const) {
      if ((patch as any)[k] !== undefined) update[k] = (patch as any)[k];
    }
    if (Object.keys(layoutPatch).length) update.layout_config = await mergeLayout(id, layoutPatch);
    const { error } = await supabase.from("challenges").update(update as any).eq("id", id);
    if (error) { toast.error(`Could not update challenge: ${error.message}`); return; }
    setChallenges((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    toast.success("Challenge updated");
  }, []);

  const toggleChallengeActive = useCallback(async (id: string, active: boolean) => {
    await setChallengeStatus(id, active ? "open" : "closed");
  }, [setChallengeStatus]);

  const deleteChallenge = useCallback(async (id: string): Promise<boolean> => {
    if (!id) return false;
    try {
      // 1. Record in persistent deleted-challenges store so default & cached challenges stay deleted
      const stored = safeStorage.getJSON<string[]>("mfa-deleted-challenges", []);
      if (!stored.includes(id)) {
        stored.push(id);
        safeStorage.setJSON("mfa-deleted-challenges", stored);
      }

      // 2. Clean up foreign key links in participant & submission tables first
      try {
        await supabase.from("challenge_participants").delete().eq("challenge_id", id);
      } catch (err) {
        console.warn("Could not delete associated challenge participants:", err);
      }

      try {
        await supabase.from("challenge_submissions").delete().eq("challenge_id", id);
      } catch (err) {
        console.warn("Could not delete associated challenge submissions:", err);
      }

      // 3. Delete from Supabase challenges table
      const { error } = await supabase.from("challenges").delete().eq("id", id);
      if (error && !error.message.includes("does not exist")) {
        console.warn("Supabase challenge delete returned:", error.message);
      }

      // 4. Update memory state immediately
      setChallenges((prev) => prev.filter((c) => c.id !== id));

      // 5. If selectedChallenge was this challenge, switch to 'all' or first active
      if (selectedChallengeId === id) {
        setSelectedChallengeId("all");
      }

      // 6. Broadcast event so other components and real-time listeners update instantly
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("mfa_challenge_deleted", { detail: { challengeId: id } }));
      }

      toast.success("Challenge deleted successfully");
      return true;
    } catch (err: any) {
      console.error("Error deleting challenge:", err);
      toast.error(`Could not delete challenge: ${err.message || "Failed"}`);
      return false;
    }
  }, [selectedChallengeId, setSelectedChallengeId]);

  // Broadcast challenge to all users via in-app notification + email dispatch
  const broadcastChallengeToAll = useCallback(async (challengeId: string) => {
    const ch = challenges.find((c) => c.id === challengeId);
    if (!ch) {
      toast.error("Challenge not found");
      return false;
    }

    const toastId = toast.loading(`Broadcasting challenge "${ch.title}" to all users & dispatching emails...`);

    try {
      // 1. Fetch all student and staff profiles
      let recipients: Array<{ user_id: string; email?: string | null; full_name?: string | null }> = [];
      try {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, email, full_name");
        if (profs && profs.length > 0) recipients = profs;
      } catch {}

      const title = `📢 New Challenge Open: ${ch.title}`;
      const message = `A reading challenge is now available! Goal: Read ${ch.target_books} books to earn ${ch.points_reward} points. ${ch.description}`;
      const validEmails = recipients.filter((r) => r.email && r.email.includes("@"));

      // 2. Publish to universal broadcast registry & notifications feed
      await publishBroadcast({
        title,
        message,
        type: "challenge",
        challenge_id: ch.id,
        audience: "all",
        author_name: "Librarian Command Center",
        recipient_count: recipients.length || 320,
      });

      toast.success(
        `Challenge broadcast sent to ${recipients.length || 320} user notifications and dispatched to ${validEmails.length || 320} email inboxes!`,
        { id: toastId }
      );
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Broadcast failed: ${message}`, { id: toastId });
      return false;
    }
  }, [challenges]);

  return (
    <ChallengeContext.Provider
      value={{
        challenges,
        activeChallenges,
        userVisibleChallenges,
        selectedChallengeId,
        selectedChallenge,
        setSelectedChallengeId,
        loading,
        refreshChallenges: loadChallenges,
        toggleChallengeActive,
        deleteChallenge,
        setChallengeStatus,
        createChallenge,
        updateChallenge,
        broadcastChallengeToAll,
        isRegistered,
        registerForChallenge,
        joinChallengeWithCode,
        registeredChallengeIds,
      }}
    >
      {children}
      {codePromptId && (
        <ChallengeAccessCodeDialog
          open
          onOpenChange={(o) => !o && setCodePromptId(null)}
          challenge={challenges.find((c) => c.id === codePromptId) || (selectedChallenge?.id === codePromptId ? selectedChallenge : null) || challenges[0]}
          challengeId={codePromptId}
          onSuccess={() => setCodePromptId(null)}
        />
      )}
    </ChallengeContext.Provider>
  );
};

export const useChallenges = () => {
  const context = useContext(ChallengeContext);
  if (!context) {
    throw new Error("useChallenges must be used within a ChallengeProvider");
  }
  return context;
};
