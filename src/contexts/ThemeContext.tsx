import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { safeStorage } from "@/lib/safeStorage";

export type Mode =
  | "dark"
  | "light"
  | "high-contrast"
  | "soft"
  | "midnight-blue"
  | "forest-emerald"
  | "cyber-neon"
  | "sunset-crimson"
  | "nordic-frost";

export interface CustomThemePreset {
  id: string;
  label: string;
  hex: string;
  description?: string;
  isCustom?: boolean;
}

interface ThemeCtx {
  mode: Mode;
  accent: string;
  themes: CustomThemePreset[];
  setMode: (m: Mode) => void;
  toggleMode: () => void;
  setAccent: (hex: string) => void;
  addTheme: (theme: { label: string; hex: string; description?: string }) => Promise<void>;
}

export const ACCENT_PRESETS: CustomThemePreset[] = [
  { id: "mfa-savannah", label: "MFA Savannah", hex: "#0d8a4a", description: "Official Mpesa Foundation Academy Forest Green" },
  { id: "mfa-royal", label: "MFA Royal Blue", hex: "#2563eb", description: "Academic Cobalt & Gold" },
  { id: "longonot", label: "Longonot Terracotta", hex: "#ea580c", description: "Volcanic Rift Warmth" },
  { id: "kilimanjaro", label: "Kilimanjaro Sky", hex: "#0284c7", description: "Glacial High-Altitude Azure" },
  { id: "elgon", label: "Elgon Amethyst", hex: "#7c3aed", description: "Mountain Mist Royal Purple" },
  { id: "teal", label: "Academy Teal", hex: "#0d9488", description: "Luminous Scholastic Teal" },
  { id: "amber", label: "Savannah Gold", hex: "#f59e0b", description: "Radiant Achievement Gold" },
  { id: "rose", label: "Crimson Rose", hex: "#e11d48", description: "High-contrast Kenya Ruby" },
  { id: "cyan", label: "Electric Cyan", hex: "#06b6d4", description: "Vibrant Luminescent Cyan" },
  { id: "fuchsia", label: "Cyber Fuchsia", hex: "#d946ef", description: "Bold Amethyst Glow" },
];

const DEFAULT_ACCENT = "#0d8a4a"; // MFA Savannah

const ThemeContext = createContext<ThemeCtx | undefined>(undefined);

/* hex -> "H S% L%" (Tailwind HSL triplet) */
export function hexToHslTriplet(hex: string): string {
  const m = hex.replace("#", "");
  const bigint = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export const CSS_CUSTOM_PROPERTY_OVERRIDES: Record<Mode, Record<string, string>> = {
  dark: {
    "--background": "222 40% 6%",
    "--foreground": "0 0% 98%",
    "--card": "222 35% 10%",
    "--card-foreground": "0 0% 98%",
    "--popover": "222 35% 10%",
    "--popover-foreground": "0 0% 98%",
    "--border": "222 28% 20%",
    "--input": "222 28% 18%",
    "--muted": "222 28% 15%",
    "--muted-foreground": "220 18% 86%",
    "--sidebar-background": "222 45% 7%",
    "--sidebar-foreground": "0 0% 95%",
    "--sidebar-border": "222 28% 20%",
  },
  "high-contrast": {
    "--background": "0 0% 0%",
    "--foreground": "0 0% 100%",
    "--card": "0 0% 4%",
    "--card-foreground": "0 0% 100%",
    "--popover": "0 0% 4%",
    "--popover-foreground": "0 0% 100%",
    "--border": "0 0% 70%",
    "--input": "0 0% 12%",
    "--muted": "0 0% 16%",
    "--muted-foreground": "0 0% 95%",
    "--primary": "50 100% 50%",
    "--primary-foreground": "0 0% 0%",
    "--ring": "50 100% 50%",
    "--sidebar-background": "0 0% 2%",
    "--sidebar-foreground": "0 0% 100%",
    "--sidebar-border": "0 0% 70%",
  },
  soft: {
    "--background": "38 40% 96%",
    "--foreground": "220 25% 18%",
    "--card": "40 30% 99%",
    "--card-foreground": "220 25% 18%",
    "--popover": "40 30% 99%",
    "--popover-foreground": "220 25% 18%",
    "--border": "38 22% 82%",
    "--input": "40 30% 99%",
    "--muted": "38 25% 90%",
    "--muted-foreground": "220 14% 44%",
    "--primary": "152 45% 32%",
    "--primary-foreground": "0 0% 100%",
    "--ring": "152 45% 32%",
    "--sidebar-background": "38 35% 94%",
    "--sidebar-foreground": "220 25% 18%",
    "--sidebar-border": "38 22% 82%",
  },
  light: {
    "--background": "210 40% 98%",
    "--foreground": "222 40% 12%",
    "--card": "0 0% 100%",
    "--card-foreground": "222 40% 12%",
    "--popover": "0 0% 100%",
    "--popover-foreground": "222 40% 12%",
    "--border": "220 15% 88%",
    "--input": "0 0% 100%",
    "--muted": "220 20% 94%",
    "--muted-foreground": "220 12% 42%",
    "--sidebar-background": "0 0% 100%",
    "--sidebar-foreground": "222 40% 12%",
    "--sidebar-border": "220 15% 88%",
  },
  "midnight-blue": {
    "--background": "222 55% 5%",
    "--foreground": "210 40% 98%",
    "--card": "222 45% 9%",
    "--card-foreground": "210 40% 98%",
    "--popover": "222 45% 9%",
    "--popover-foreground": "210 40% 98%",
    "--border": "220 38% 18%",
    "--input": "222 35% 14%",
    "--muted": "222 35% 13%",
    "--muted-foreground": "215 25% 75%",
    "--primary": "215 100% 56%",
    "--primary-foreground": "0 0% 100%",
    "--ring": "215 100% 56%",
    "--sidebar-background": "222 55% 6%",
    "--sidebar-foreground": "210 40% 96%",
    "--sidebar-border": "220 38% 18%",
  },
  "forest-emerald": {
    "--background": "158 50% 5%",
    "--foreground": "140 25% 98%",
    "--card": "158 42% 8%",
    "--card-foreground": "140 25% 98%",
    "--popover": "158 42% 8%",
    "--popover-foreground": "140 25% 98%",
    "--border": "155 30% 18%",
    "--input": "158 35% 12%",
    "--muted": "158 32% 12%",
    "--muted-foreground": "150 20% 75%",
    "--primary": "142 76% 45%",
    "--primary-foreground": "0 0% 100%",
    "--ring": "142 76% 45%",
    "--sidebar-background": "158 52% 6%",
    "--sidebar-foreground": "140 25% 96%",
    "--sidebar-border": "155 30% 18%",
  },
  "cyber-neon": {
    "--background": "275 60% 5%",
    "--foreground": "0 0% 100%",
    "--card": "275 48% 9%",
    "--card-foreground": "0 0% 100%",
    "--popover": "275 48% 9%",
    "--popover-foreground": "0 0% 100%",
    "--border": "280 45% 22%",
    "--input": "275 40% 14%",
    "--muted": "275 38% 14%",
    "--muted-foreground": "280 25% 80%",
    "--primary": "315 95% 60%",
    "--primary-foreground": "0 0% 100%",
    "--ring": "315 95% 60%",
    "--sidebar-background": "275 60% 6%",
    "--sidebar-foreground": "0 0% 98%",
    "--sidebar-border": "280 45% 22%",
  },
  "sunset-crimson": {
    "--background": "16 52% 5%",
    "--foreground": "30 30% 98%",
    "--card": "16 42% 9%",
    "--card-foreground": "30 30% 98%",
    "--popover": "16 42% 9%",
    "--popover-foreground": "30 30% 98%",
    "--border": "16 35% 20%",
    "--input": "16 32% 14%",
    "--muted": "16 30% 13%",
    "--muted-foreground": "25 25% 78%",
    "--primary": "25 100% 55%",
    "--primary-foreground": "0 0% 100%",
    "--ring": "25 100% 55%",
    "--sidebar-background": "16 52% 6%",
    "--sidebar-foreground": "30 30% 96%",
    "--sidebar-border": "16 35% 20%",
  },
  "nordic-frost": {
    "--background": "215 35% 97%",
    "--foreground": "218 35% 15%",
    "--card": "0 0% 100%",
    "--card-foreground": "218 35% 15%",
    "--popover": "0 0% 100%",
    "--popover-foreground": "218 35% 15%",
    "--border": "215 22% 84%",
    "--input": "0 0% 100%",
    "--muted": "215 25% 91%",
    "--muted-foreground": "218 15% 42%",
    "--primary": "205 92% 42%",
    "--primary-foreground": "0 0% 100%",
    "--ring": "205 92% 42%",
    "--sidebar-background": "215 30% 95%",
    "--sidebar-foreground": "218 35% 15%",
    "--sidebar-border": "215 22% 84%",
  },
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<Mode>(() =>
    (safeStorage.getItem("mfa-theme-mode") as Mode) || "dark"
  );
  const [accent, setAccentState] = useState<string>(
    () => safeStorage.getItem("mfa-theme-accent") || DEFAULT_ACCENT
  );
  const [themes, setThemes] = useState<CustomThemePreset[]>(() => {
    try {
      const stored = safeStorage.getItem("mfa-custom-themes");
      if (stored) {
        const parsed = JSON.parse(stored);
        return [...ACCENT_PRESETS, ...parsed];
      }
    } catch { /* fallback */ }
    return ACCENT_PRESETS;
  });

  useEffect(() => {
    root.classList.remove(
      "dark",
      "light",
      "high-contrast",
      "soft",
      "theme-soft",
      "theme-midnight",
      "theme-forest",
      "theme-cyber",
      "theme-sunset",
      "theme-nordic"
    );

    if (
      mode === "dark" ||
      mode === "midnight-blue" ||
      mode === "forest-emerald" ||
      mode === "cyber-neon" ||
      mode === "sunset-crimson"
    ) {
      root.classList.add("dark", `theme-${mode.split("-")[0]}`);
    } else if (mode === "light" || mode === "nordic-frost") {
      root.classList.add("light", `theme-${mode.split("-")[0]}`);
    } else if (mode === "high-contrast") {
      root.classList.add("dark", "high-contrast");
    } else if (mode === "soft") {
      root.classList.add("light", "soft", "theme-soft");
    }

    // Apply direct CSS custom property overrides
    const overrides = CSS_CUSTOM_PROPERTY_OVERRIDES[mode] || CSS_CUSTOM_PROPERTY_OVERRIDES.dark;
    Object.entries(overrides).forEach(([prop, val]) => {
      root.style.setProperty(prop, val);
    });

    // If in dark, light, or custom palette mode, allow accent override if non-default
    if (accent && accent !== DEFAULT_ACCENT && (mode === "dark" || mode === "light")) {
      const triplet = hexToHslTriplet(accent);
      root.style.setProperty("--primary", triplet);
      root.style.setProperty("--ring", triplet);
      root.style.setProperty("--sidebar-primary", triplet);
      root.style.setProperty("--sidebar-ring", triplet);
    }

    safeStorage.setItem("mfa-theme-mode", mode);
  }, [mode, accent]);

  useEffect(() => {
    safeStorage.setItem("mfa-theme-accent", accent);
  }, [accent]);

  // Load custom themes from system_settings if available
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("system_settings")
          .select("setting_value")
          .eq("setting_key", "custom_themes")
          .maybeSingle();
        if (data?.setting_value) {
          const parsed = JSON.parse(data.setting_value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setThemes((prev) => {
              const existingIds = new Set(prev.map((p) => p.id));
              const newThemes = parsed.filter((p: CustomThemePreset) => p && typeof p === "object" && "id" in p && !existingIds.has(p.id));
              return [...prev, ...newThemes];
            });
          }
        }
      } catch { /* non-blocking */ }
    })();
  }, []);

  const addTheme = useCallback(async (newTheme: { label: string; hex: string; description?: string }) => {
    const item: CustomThemePreset = {
      id: `theme-${Date.now()}`,
      label: newTheme.label,
      hex: newTheme.hex,
      description: newTheme.description,
      isCustom: true,
    };

    setThemes((prev) => {
      const next = [...prev, item];
      const customs = next.filter((t) => t.isCustom);
      localStorage.setItem("mfa-custom-themes", JSON.stringify(customs));
      return next;
    });

    setAccentState(newTheme.hex);

    // Persist to system_settings in Supabase
    try {
      const stored = localStorage.getItem("mfa-custom-themes") || "[]";
      await supabase.from("system_settings").upsert(
        {
          setting_key: "custom_themes",
          setting_value: stored,
          description: "Community and administrator custom theme presets",
        },
        { onConflict: "setting_key" }
      );
    } catch (err) {
      console.warn("Could not save custom theme to remote db:", err);
    }
  }, []);

  const setMode = useCallback((m: Mode) => setModeState(m), []);
  const setAccent = useCallback((hex: string) => setAccentState(hex), []);
  const toggleMode = useCallback(() => setModeState((m) => (m === "dark" ? "light" : "dark")), []);

  return (
    <ThemeContext.Provider value={{ mode, accent, themes, setMode, toggleMode, setAccent, addTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
};
