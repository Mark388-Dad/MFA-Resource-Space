import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTheme, Mode, ACCENT_PRESETS } from "@/contexts/ThemeContext";
import {
  Sparkles,
  Contrast,
  BookOpen,
  Check,
  Palette,
  X,
  Compass,
  Moon,
  Sun,
  Flame,
  Zap,
  Snowflake,
  TreePine,
  Layers,
  ChevronRight,
  Sliders,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeOption {
  id: Mode;
  name: string;
  category: "night" | "reading" | "vibrant";
  badge: string;
  tagline: string;
  description: string;
  icon: React.ElementType;
  bgHex: string;
  fgHex: string;
  accentHex: string;
  borderHex: string;
  gradientTone: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "dark",
    name: "Vibrant Dark",
    category: "night",
    badge: "Signature",
    tagline: "Luminous Obsidian",
    description: "Deep obsidian canvas with electric blue, emerald, and gold neon accents.",
    icon: Sparkles,
    bgHex: "#080e1a",
    fgHex: "#f8fafc",
    accentHex: "#3b82f6",
    borderHex: "rgba(59, 130, 246, 0.45)",
    gradientTone: "from-blue-600/20 via-emerald-500/10 to-amber-500/20",
  },
  {
    id: "midnight-blue",
    name: "Midnight Ocean",
    category: "night",
    badge: "MFA Royal",
    tagline: "Deep Cobalt Navy",
    description: "Scholastic midnight oceanic slate with glowing sapphire & electric cyan highlights.",
    icon: Compass,
    bgHex: "#060b19",
    fgHex: "#f0f6fc",
    accentHex: "#2563eb",
    borderHex: "rgba(37, 99, 235, 0.45)",
    gradientTone: "from-blue-700/25 via-indigo-600/15 to-cyan-500/20",
  },
  {
    id: "forest-emerald",
    name: "Savannah Forest",
    category: "night",
    badge: "Rainforest",
    tagline: "Deep Emerald Slate",
    description: "Rich dark rainforest canopy with radiant mint and achievement gold accents.",
    icon: TreePine,
    bgHex: "#05130b",
    fgHex: "#f2fbf5",
    accentHex: "#10b981",
    borderHex: "rgba(16, 185, 129, 0.45)",
    gradientTone: "from-emerald-700/25 via-teal-600/15 to-lime-500/20",
  },
  {
    id: "cyber-neon",
    name: "Cyber Neon",
    category: "vibrant",
    badge: "High-Vibe",
    tagline: "Amethyst Violet & Fuchsia",
    description: "Futuristic neon purple canvas with electric fuchsia, cyan, and gold illumination.",
    icon: Zap,
    bgHex: "#10061d",
    fgHex: "#ffffff",
    accentHex: "#d946ef",
    borderHex: "rgba(217, 70, 239, 0.5)",
    gradientTone: "from-fuchsia-600/25 via-purple-600/15 to-cyan-400/20",
  },
  {
    id: "sunset-crimson",
    name: "Sunset Crimson",
    category: "night",
    badge: "Rift Valley",
    tagline: "Volcanic Twilight",
    description: "Warm volcanic charcoal slate infused with rich terracotta, coral, and gold embers.",
    icon: Flame,
    bgHex: "#140806",
    fgHex: "#fff7f5",
    accentHex: "#f97316",
    borderHex: "rgba(249, 115, 22, 0.45)",
    gradientTone: "from-orange-600/25 via-rose-600/15 to-amber-500/20",
  },
  {
    id: "high-contrast",
    name: "High Contrast",
    category: "reading",
    badge: "WCAG AAA",
    tagline: "Maximum Legibility",
    description: "Pure AMOLED black with sharp gold highlights, bold 2px borders, and zero glare.",
    icon: Contrast,
    bgHex: "#000000",
    fgHex: "#ffffff",
    accentHex: "#eab308",
    borderHex: "#eab308",
    gradientTone: "from-amber-500/20 via-black to-amber-400/15",
  },
  {
    id: "soft",
    name: "Soft / Sepia",
    category: "reading",
    badge: "Eye Care",
    tagline: "Warm Reading Paper",
    description: "Gentle warm parchment cream with soothing sage green and zero blue-light strain.",
    icon: BookOpen,
    bgHex: "#fbf7ee",
    fgHex: "#22201b",
    accentHex: "#2d7350",
    borderHex: "rgba(180, 150, 110, 0.45)",
    gradientTone: "from-amber-100/40 via-amber-50/30 to-emerald-100/30",
  },
  {
    id: "nordic-frost",
    name: "Nordic Frost",
    category: "reading",
    badge: "Paper White",
    tagline: "Glacial Clarity",
    description: "Clean daylight paper slate with ice blue borders and crisp scholastic typography.",
    icon: Snowflake,
    bgHex: "#f8fafc",
    fgHex: "#0f172a",
    accentHex: "#0284c7",
    borderHex: "rgba(2, 132, 199, 0.35)",
    gradientTone: "from-sky-100/40 via-slate-50 to-blue-100/30",
  },
  {
    id: "light",
    name: "Daylight Crisp",
    category: "reading",
    badge: "Daylight",
    tagline: "Classic Clean Contrast",
    description: "High-clarity white background with balanced slate borders and primary green accents.",
    icon: Sun,
    bgHex: "#ffffff",
    fgHex: "#0f172a",
    accentHex: "#0d8a4a",
    borderHex: "rgba(203, 213, 225, 0.8)",
    gradientTone: "from-slate-100/60 via-white to-emerald-50/30",
  },
];

export const FloatingThemeSelector: React.FC = () => {
  const { mode, setMode, accent, setAccent } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"themes" | "accents">("themes");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "reading" | "night" | "vibrant">("all");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close floating popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const cycleNextTheme = useCallback(() => {
    const sequence: Mode[] = [
      "dark",
      "midnight-blue",
      "forest-emerald",
      "cyber-neon",
      "sunset-crimson",
      "high-contrast",
      "soft",
      "nordic-frost",
      "light",
    ];
    const currentIndex = sequence.indexOf(mode);
    const nextIndex = (currentIndex + 1) % sequence.length;
    setMode(sequence[nextIndex]);
  }, [mode, setMode]);

  // Keyboard shortcut: Press Ctrl+Shift+T or Alt+T to cycle theme
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "t") ||
        (e.altKey && e.key.toLowerCase() === "t")
      ) {
        e.preventDefault();
        cycleNextTheme();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cycleNextTheme]);

  const currentTheme = useMemo(
    () => THEME_OPTIONS.find((t) => t.id === mode) || THEME_OPTIONS[0],
    [mode]
  );
  const CurrentIcon = currentTheme.icon;

  const filteredThemes = useMemo(() => {
    if (categoryFilter === "all") return THEME_OPTIONS;
    return THEME_OPTIONS.filter((t) => t.category === categoryFilter);
  }, [categoryFilter]);

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 right-6 z-50 select-none print:hidden flex flex-col items-end gap-2.5"
    >
      {/* Expanded Theme Customizer Panel */}
      {isOpen && (
        <div
          className="w-[340px] sm:w-[390px] max-h-[85vh] overflow-y-auto p-4 rounded-3xl bg-card/95 backdrop-blur-2xl border-2 border-border shadow-2xl shadow-black/50 text-foreground animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-200 space-y-4"
          style={{
            boxShadow: `0 20px 50px -10px ${currentTheme.accentHex}40, 0 0 20px -5px ${currentTheme.accentHex}20`,
          }}
        >
          {/* Header Div with linear gradient */}
          <div
            className="p-3.5 rounded-2xl border border-border/80 flex items-center justify-between"
            style={{
              background: `linear-gradient(135deg, ${currentTheme.accentHex}20, transparent 70%)`,
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md"
                style={{ background: currentTheme.accentHex }}
              >
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm tracking-tight text-foreground flex items-center gap-1.5">
                  Reading Atmosphere &amp; Themes
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  9 custom palettes • Instant CSS property overrides
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors"
              title="Close panel"
              aria-label="Close theme panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Selector: Theme Palettes vs Accent Combos */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/60 rounded-2xl border border-border/60">
            <button
              type="button"
              onClick={() => setActiveTab("themes")}
              className={cn(
                "py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                activeTab === "themes"
                  ? "bg-background text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Theme Modes ({THEME_OPTIONS.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("accents")}
              className={cn(
                "py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                activeTab === "accents"
                  ? "bg-background text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Color Accents ({ACCENT_PRESETS.length})</span>
            </button>
          </div>

          {activeTab === "themes" ? (
            <div className="space-y-3">
              {/* Filter Pills for Theme Categories */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                {[
                  { id: "all", label: "All Modes" },
                  { id: "reading", label: "📖 Eye-Care / Paper" },
                  { id: "night", label: "🌌 Night Canvas" },
                  { id: "vibrant", label: "⚡ Expressive" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryFilter(cat.id as "all" | "night" | "reading" | "vibrant")}
                    className={cn(
                      "px-2.5 py-1 rounded-full font-semibold whitespace-nowrap transition-all border",
                      categoryFilter === cat.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/40 text-muted-foreground border-border hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Scrollable list of well-rounded, vibrant linear-gradient theme divs */}
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {filteredThemes.map((opt) => {
                  const active = mode === opt.id;
                  const Icon = opt.icon;

                  return (
                    <div
                      key={opt.id}
                      onClick={() => setMode(opt.id)}
                      className={cn(
                        "p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group text-left relative overflow-hidden",
                        active
                          ? "border-primary shadow-md"
                          : "border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-border"
                      )}
                      style={{
                        background: active
                          ? `linear-gradient(135deg, ${opt.accentHex}18, transparent 70%)`
                          : undefined,
                        borderColor: active ? opt.borderHex : undefined,
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Swatch div */}
                        <div
                          className="w-10 h-10 rounded-xl shrink-0 p-1 flex flex-col justify-between border shadow-inner transition-transform group-hover:scale-105"
                          style={{
                            backgroundColor: opt.bgHex,
                            borderColor: opt.borderHex,
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: opt.accentHex }}
                            />
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: opt.fgHex }}
                            />
                          </div>
                          <div
                            className="h-1.5 w-full rounded-sm opacity-90"
                            style={{ backgroundColor: opt.accentHex }}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-foreground">
                              {opt.name}
                            </span>
                            <span
                              className="text-[9px] uppercase font-extrabold tracking-wider px-1.5 py-0.2 rounded-md"
                              style={{
                                background: `${opt.accentHex}25`,
                                color: opt.accentHex,
                              }}
                            >
                              {opt.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            {opt.tagline} • {opt.description}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center justify-center">
                        {active ? (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white shadow-xs"
                            style={{ background: opt.accentHex }}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-border/80 group-hover:border-primary/50 transition-colors" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                Fine-tune primary highlighting, glow accents, and focus rings across the platform:
              </div>

              {/* Accent Color Preset Cards */}
              <div className="grid grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
                {ACCENT_PRESETS.map((p) => {
                  const isActive = accent === p.hex;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setAccent(p.hex)}
                      className={cn(
                        "p-2.5 rounded-2xl border text-left transition-all flex items-center gap-2.5 group relative overflow-hidden",
                        isActive
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border/60 bg-muted/20 hover:bg-muted/50 hover:border-border"
                      )}
                      style={{
                        borderColor: isActive ? p.hex : undefined,
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-xl shrink-0 flex items-center justify-center text-white shadow-xs"
                        style={{ background: p.hex }}
                      >
                        {isActive && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground truncate">{p.label}</div>
                        <div className="text-[10px] text-muted-foreground font-mono truncate">{p.hex}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Overrides Status Info Bar */}
          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground px-1">
            <span className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block animate-pulse"
                style={{ background: currentTheme.accentHex }}
              />
              Active: <strong className="text-foreground">{currentTheme.name}</strong>
            </span>

            <button
              type="button"
              onClick={cycleNextTheme}
              className="text-[10px] font-semibold text-primary hover:underline"
              title="Shortcut: Alt+T"
            >
              Cycle (Alt+T) ↻
            </button>
          </div>
        </div>
      )}

      {/* Floating Trigger Pill / Capsule Button with Linear Gradient */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "group flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border-2 backdrop-blur-xl",
          isOpen
            ? "bg-foreground text-background border-primary"
            : "bg-card/95 text-foreground border-border/80 hover:border-primary hover:bg-card shadow-lg"
        )}
        style={{
          boxShadow: `0 10px 30px -5px ${currentTheme.accentHex}50, 0 0 15px -3px ${currentTheme.accentHex}40`,
        }}
        title="Toggle Reading Mode & Vibrant Theme Engine (Alt+T)"
        aria-label="Toggle Theme & Reading Mode"
      >
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 transition-transform group-hover:rotate-12 shadow-xs"
          style={{ background: currentTheme.accentHex }}
        >
          <CurrentIcon className="w-3.5 h-3.5" />
        </div>

        <span className="text-xs font-bold tracking-tight">
          {currentTheme.name}
        </span>

        <span
          className="w-2 h-2 rounded-full shrink-0 animate-ping"
          style={{ background: currentTheme.accentHex }}
        />
      </button>
    </div>
  );
};

export default FloatingThemeSelector;
