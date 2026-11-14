import { useTheme, Mode } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { 
  Moon, 
  Sun, 
  Contrast, 
  Feather, 
  Check, 
  Waves, 
  Trees, 
  Zap, 
  Flame, 
  Snowflake 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeModeSelectorProps {
  variant?: "segmented" | "cards" | "compact";
  className?: string;
}

export const THEME_MODES: {
  id: Mode;
  label: string;
  sublabel: string;
  icon: typeof Moon;
  tone: string;
  badge?: string;
}[] = [
  {
    id: "dark",
    label: "Vibrant Dark",
    sublabel: "Signature luminous dark mode",
    icon: Moon,
    tone: "hsl(var(--v-electric-blue, 217 91% 60%))",
  },
  {
    id: "midnight-blue",
    label: "Midnight Ocean",
    sublabel: "Deep nautical sapphire & cyan glow",
    icon: Waves,
    tone: "#38bdf8",
    badge: "Popular",
  },
  {
    id: "forest-emerald",
    label: "Savannah Forest",
    sublabel: "Rich acacia emerald & sage reading palette",
    icon: Trees,
    tone: "#34d399",
  },
  {
    id: "cyber-neon",
    label: "Cyber Neon",
    sublabel: "High-tech synthwave magenta & violet",
    icon: Zap,
    tone: "#f43f5e",
    badge: "Vibrant",
  },
  {
    id: "sunset-crimson",
    label: "Sunset Crimson",
    sublabel: "Warm Great Rift Valley dusk amber & ruby",
    icon: Flame,
    tone: "#f97316",
  },
  {
    id: "nordic-frost",
    label: "Nordic Frost",
    sublabel: "Cool polar glacier glass & ice blue",
    icon: Snowflake,
    tone: "#22d3ee",
  },
  {
    id: "soft",
    label: "Soft / Sepia",
    sublabel: "Warm parchment paper for reduced eyestrain",
    icon: Feather,
    tone: "#f59e0b",
    badge: "Paper Mode",
  },
  {
    id: "high-contrast",
    label: "High Contrast",
    sublabel: "WCAG AAA enhanced accessibility & sharp borders",
    icon: Contrast,
    tone: "#ffffff",
  },
  {
    id: "light",
    label: "Light Mode",
    sublabel: "Clean daytime contrast & paper clarity",
    icon: Sun,
    tone: "#eab308",
  },
];

export default function ThemeModeSelector({ variant = "segmented", className = "" }: ThemeModeSelectorProps) {
  const { mode, setMode } = useTheme();

  if (variant === "cards") {
    return (
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5", className)}>
        {THEME_MODES.map((t) => {
          const Icon = t.icon;
          const isActive = mode === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setMode(t.id)}
              className={cn(
                "p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between group overflow-hidden shadow-sm hover:shadow-md",
                isActive
                  ? "bg-primary/10 border-primary ring-2 ring-primary/40 shadow-md"
                  : "bg-card/80 border-border/80 hover:bg-card hover:border-primary/40"
              )}
            >
              <div className="flex items-center justify-between mb-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center border border-border/60 transition-transform group-hover:scale-105"
                  style={{
                    backgroundColor: isActive ? t.tone : "hsl(var(--muted))",
                    color: isActive && (t.id === "high-contrast" || t.id === "light") ? "#000000" : "#ffffff",
                  }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-1.5">
                  {t.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                      {t.badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-sm">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
              <div>
                <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  {t.label}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  {t.sublabel}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // Segmented control (default)
  return (
    <div
      role="radiogroup"
      aria-label="Color Theme and Accessibility Mode"
      className={cn(
        "inline-flex flex-wrap items-center p-1 bg-muted/80 backdrop-blur rounded-2xl border border-border/80 shadow-sm gap-1",
        className
      )}
    >
      {THEME_MODES.map((t) => {
        const Icon = t.icon;
        const isActive = mode === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => setMode(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all select-none",
              isActive
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/50 scale-[1.02]"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            )}
          >
            <Icon
              className={cn("w-3.5 h-3.5 transition-colors", isActive ? "text-primary" : "text-muted-foreground")}
            />
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
