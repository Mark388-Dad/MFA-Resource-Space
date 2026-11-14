import React from 'react';
import {
  useHomepageTheme,
  HomepageThemeConfig,
  DEFAULT_HOMEPAGE_THEME_CONFIG,
} from '@/hooks/useSiteContent';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Type,
  Palette,
  Sliders,
  RotateCcw,
  Sparkles,
  Eye,
  EyeOff,
  Check,
  Layout,
  Compass,
  Trophy,
  Crown,
  BookOpen,
  Lightbulb,
  ShieldCheck,
  Award,
  Heart,
  Quote,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface HomepageThemeCustomizerProps {
  darkTheme?: boolean;
}

export const HomepageThemeCustomizer: React.FC<HomepageThemeCustomizerProps> = ({
  darkTheme = false,
}) => {
  const { theme, updateTheme, toggleSection, resetTheme } = useHomepageTheme();

  const handleReset = () => {
    resetTheme();
    toast.info('Theme, typography, and section switches restored to academy defaults.');
  };

  const FONT_OPTIONS: Array<{
    id: HomepageThemeConfig['fontFamily'];
    label: string;
    description: string;
    fontClass: string;
    sample: string;
  }> = [
    {
      id: 'sans',
      label: 'Clean Modern Sans',
      description: 'Ultra-legible, modern school interface',
      fontClass: 'font-sans',
      sample: 'Beyond the Pages 2026/2027',
    },
    {
      id: 'serif',
      label: 'Literary Editorial Serif',
      description: 'Elegant literary books and classic novels',
      fontClass: 'font-serif',
      sample: 'Beyond the Pages 2026/2027',
    },
    {
      id: 'cinzel',
      label: 'Academy Honors Serif (Cinzel)',
      description: 'Classical institutional typography used in certificates',
      fontClass: 'font-serif tracking-wider font-extrabold',
      sample: 'M-PESA FOUNDATION ACADEMY',
    },
    {
      id: 'playfair',
      label: 'Luxury Display (Playfair)',
      description: 'Sophisticated literary serif with delicate contrasts',
      fontClass: 'font-serif italic',
      sample: 'Thinkers · Doers · Leaders',
    },
    {
      id: 'california',
      label: 'Script Parchment (California)',
      description: 'Distinguished calligraphic styling for certificates',
      fontClass: 'font-serif',
      sample: 'Honors Literacy Quest',
    },
    {
      id: 'display',
      label: 'Bold Display Heading',
      description: 'Punchy titles with high visual impact',
      fontClass: 'font-display',
      sample: 'Beyond the Pages 2026/2027',
    },
    {
      id: 'mono',
      label: 'Tech Monospace',
      description: 'Structured precision and modern code aesthetic',
      fontClass: 'font-mono',
      sample: 'Beyond the Pages 2026/2027',
    },
  ];

  const SCALE_OPTIONS: Array<{
    id: HomepageThemeConfig['fontSizeScale'];
    label: string;
    scalePercent: string;
    description: string;
  }> = [
    { id: 'compact', label: 'Compact', scalePercent: '90%', description: 'Tighter information density' },
    { id: 'normal', label: 'Standard', scalePercent: '100%', description: 'Balanced reading scale' },
    { id: 'large', label: 'Large', scalePercent: '110%', description: 'Enhanced readability & emphasis' },
    { id: 'xl', label: 'Extra Large', scalePercent: '120%', description: 'Prominent impactful typography' },
    { id: 'expressive', label: 'Expressive', scalePercent: '130%', description: 'Max impact for wall displays' },
  ];

  const GRADIENT_PALETTES: Array<{
    id: HomepageThemeConfig['gradientTheme'];
    name: string;
    gradient: string;
    accent: string;
    border: string;
  }> = [
    {
      id: 'school-navy',
      name: 'Academy Navy & Gold (#0B192C)',
      gradient: 'linear-gradient(135deg, #0B192C 0%, #1D4ED8 50%, #D4AF37 100%)',
      accent: '#D4AF37',
      border: 'border-amber-400/40',
    },
    {
      id: 'gold-leaf',
      name: 'Imperial Gold & Emerald',
      gradient: 'linear-gradient(135deg, #D4AF37 0%, #16A34A 100%)',
      accent: '#16A34A',
      border: 'border-emerald-400/40',
    },
    {
      id: 'lime-glow',
      name: 'Luxury Lime & Slate',
      gradient: 'linear-gradient(135deg, #d9f99d 0%, #a3e635 100%)',
      accent: '#a3e635',
      border: 'border-lime-400/40',
    },
    {
      id: 'royal-indigo',
      name: 'Royal Indigo & Violet',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
      accent: '#818cf8',
      border: 'border-indigo-400/40',
    },
    {
      id: 'warm-amber',
      name: 'Sunset Amber & Gold',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      accent: '#fbbf24',
      border: 'border-amber-400/40',
    },
    {
      id: 'emerald-forest',
      name: 'Forest Emerald & Mint',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      accent: '#34d399',
      border: 'border-emerald-400/40',
    },
    {
      id: 'ruby-rose',
      name: 'Luminous Rose & Fuchsia',
      gradient: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
      accent: '#fb7185',
      border: 'border-rose-400/40',
    },
    {
      id: 'ocean-cyan',
      name: 'Electric Ocean Cyan',
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
      accent: '#38bdf8',
      border: 'border-cyan-400/40',
    },
    {
      id: 'midnight-luxe',
      name: 'Midnight Luxe Platinum',
      gradient: 'linear-gradient(135deg, #334155 0%, #0f172a 100%)',
      accent: '#cbd5e1',
      border: 'border-slate-400/40',
    },
  ];

  const SECTION_SWITCH_ITEMS: Array<{
    key: keyof HomepageThemeConfig['sectionSwitches'];
    label: string;
    description: string;
    icon: any;
    color: string;
  }> = [
    {
      key: 'hero',
      label: 'Hero & Welcome Banner',
      description: 'Header, school badge, welcome letter, action buttons',
      icon: Sparkles,
      color: 'text-lime-400',
    },
    {
      key: 'quote',
      label: 'Daily Quote & Inspiration',
      description: 'George R.R. Martin daily reading quote card',
      icon: Quote,
      color: 'text-amber-400',
    },
    {
      key: 'houses',
      label: '4 Houses Live Standings',
      description: 'Kenya, Longonot, Menengai, Suswa competition banner',
      icon: Trophy,
      color: 'text-indigo-400',
    },
    {
      key: 'stats',
      label: 'Fast Bento Metrics (45 Books, 15 Realms)',
      description: 'High-level metric badges and milestones',
      icon: Layout,
      color: 'text-emerald-400',
    },
    {
      key: 'quicklinks',
      label: 'Jump To Navigation Bar',
      description: 'Fast anchor links to page sections',
      icon: Compass,
      color: 'text-cyan-400',
    },
    {
      key: 'customBlocks',
      label: 'Floating Custom Div Blocks',
      description: 'Custom banners, reading quotes, and highlights added by librarian',
      icon: Layout,
      color: 'text-fuchsia-400',
    },
    {
      key: 'goals',
      label: 'Challenge Goals & Mission',
      description: 'Five core goals of Beyond the Pages',
      icon: Compass,
      color: 'text-green-400',
    },
    {
      key: 'points',
      label: 'Point Awards & Rules',
      description: 'Points calculation guide and bonuses',
      icon: Trophy,
      color: 'text-yellow-400',
    },
    {
      key: 'levels',
      label: 'Achievement Levels (Bronze, Silver, Gold)',
      description: 'Semester & full-year reading levels with reflection details',
      icon: Crown,
      color: 'text-orange-400',
    },
    {
      key: 'realms',
      label: '15 Literary Realms Grid',
      description: 'Explorer Frontier, Realm of Wonders, and all 15 genres',
      icon: BookOpen,
      color: 'text-teal-400',
    },
    {
      key: 'reflections',
      label: 'Reflection Prompts & Prompts Matrix',
      description: 'Questions and thinking prompts for submissions',
      icon: Lightbulb,
      color: 'text-amber-400',
    },
    {
      key: 'ib',
      label: 'IB & CBC Connections',
      description: 'Inquirer, Reflective, Thinker, and Caring curriculum links',
      icon: ShieldCheck,
      color: 'text-blue-400',
    },
    {
      key: 'outcomes',
      label: 'Reading Outcomes & Impact',
      description: 'Lifelong learning, empathy, and vocabulary expansion',
      icon: Award,
      color: 'text-rose-400',
    },
    {
      key: 'footer',
      label: 'Academy Footer & CLAIRE Values',
      description: 'Academy motto, values, and copyright notice',
      icon: Heart,
      color: 'text-pink-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Controls Banner */}
      <div
        className={cn(
          'p-5 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md',
          darkTheme ? 'bg-white/5 border-white/10' : 'bg-card border-border'
        )}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" />
            <span className={cn('text-sm font-bold', darkTheme ? 'text-white' : 'text-foreground')}>
              Homepage Design &amp; Section Visibility Controls
            </span>
          </div>
          <p className={cn('text-xs', darkTheme ? 'text-slate-400' : 'text-muted-foreground')}>
            Toggle features on or off, customize typography fonts, font sizes, and select linear-gradient color themes.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleReset}
          className={cn(
            'h-8 text-xs font-semibold gap-1.5 shrink-0 rounded-xl',
            darkTheme ? 'border-white/20 bg-white/5 text-white hover:bg-white/10' : ''
          )}
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
          <span>Reset Defaults</span>
        </Button>
      </div>

      {/* 1. TYPOGRAPHY & FONT SELECTION */}
      <div
        className={cn(
          'p-5 rounded-3xl border space-y-4 shadow-sm',
          darkTheme ? 'bg-white/5 border-white/10' : 'bg-card border-border'
        )}
      >
        <div className="flex items-center justify-between border-b pb-3 border-border/40">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-primary" />
            <span className={cn('text-sm font-bold', darkTheme ? 'text-white' : 'text-foreground')}>
              Homepage Typography &amp; Font Family
            </span>
          </div>
          <Badge variant="outline" className="text-xs font-mono uppercase">
            Active: {theme.fontFamily}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FONT_OPTIONS.map((opt) => {
            const isSelected = theme.fontFamily === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  updateTheme({ fontFamily: opt.id });
                  toast.success(`Font family set to ${opt.label}`);
                }}
                className={cn(
                  'p-3.5 rounded-2xl border text-left transition-all duration-200 relative',
                  isSelected
                    ? darkTheme
                      ? 'border-lime-400 bg-lime-400/10 shadow-lg'
                      : 'border-primary bg-primary/5 shadow-md ring-1 ring-primary'
                    : darkTheme
                    ? 'border-white/10 bg-black/20 hover:border-white/30'
                    : 'border-border bg-background hover:border-border/80'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn('text-xs font-bold', darkTheme ? 'text-white' : 'text-foreground')}>
                    {opt.label}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-emerald-500" />}
                </div>
                <div className={cn('text-[11px] mb-2', darkTheme ? 'text-slate-400' : 'text-muted-foreground')}>
                  {opt.description}
                </div>
                <div
                  className={cn(
                    'text-xs p-2 rounded-xl border truncate',
                    opt.fontClass,
                    darkTheme ? 'bg-black/40 border-white/10 text-lime-300' : 'bg-muted/40 border-border text-primary'
                  )}
                >
                  {opt.sample}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. FONT SIZE SCALING */}
      <div
        className={cn(
          'p-5 rounded-3xl border space-y-4 shadow-sm',
          darkTheme ? 'bg-white/5 border-white/10' : 'bg-card border-border'
        )}
      >
        <div className="flex items-center justify-between border-b pb-3 border-border/40">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" />
            <span className={cn('text-sm font-bold', darkTheme ? 'text-white' : 'text-foreground')}>
              Font Scale &amp; Text Proportions
            </span>
          </div>
          <Badge variant="outline" className="text-xs font-mono uppercase">
            Scale: {theme.fontSizeScale}
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {SCALE_OPTIONS.map((scale) => {
            const isSelected = theme.fontSizeScale === scale.id;
            return (
              <button
                key={scale.id}
                type="button"
                onClick={() => {
                  updateTheme({ fontSizeScale: scale.id });
                  toast.success(`Font scale updated to ${scale.label}`);
                }}
                className={cn(
                  'p-3 rounded-2xl border text-center transition-all',
                  isSelected
                    ? darkTheme
                      ? 'border-lime-400 bg-lime-400/10 shadow-md font-bold'
                      : 'border-primary bg-primary/10 shadow-sm font-bold text-primary'
                    : darkTheme
                    ? 'border-white/10 bg-black/20 text-slate-300 hover:border-white/30'
                    : 'border-border bg-background text-foreground hover:border-border/80'
                )}
              >
                <div className="text-xs font-bold">{scale.label}</div>
                <div className="text-[11px] font-mono text-muted-foreground mt-0.5">{scale.scalePercent}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. LINEAR GRADIENT COLOR THEMES */}
      <div
        className={cn(
          'p-5 rounded-3xl border space-y-4 shadow-sm',
          darkTheme ? 'bg-white/5 border-white/10' : 'bg-card border-border'
        )}
      >
        <div className="flex items-center justify-between border-b pb-3 border-border/40">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            <span className={cn('text-sm font-bold', darkTheme ? 'text-white' : 'text-foreground')}>
              Linear Gradient Color Accents
            </span>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {theme.gradientTheme}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {GRADIENT_PALETTES.map((pal) => {
            const isSelected = theme.gradientTheme === pal.id;
            return (
              <button
                key={pal.id}
                type="button"
                onClick={() => {
                  updateTheme({ gradientTheme: pal.id });
                  toast.success(`Gradient theme set to ${pal.name}`);
                }}
                className={cn(
                  'p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group',
                  isSelected
                    ? 'ring-2 ring-primary border-primary shadow-lg'
                    : darkTheme
                    ? 'border-white/10 bg-black/20 hover:border-white/30'
                    : 'border-border bg-background hover:border-border/80'
                )}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span className={cn('text-xs font-bold', darkTheme ? 'text-white' : 'text-foreground')}>
                    {pal.name}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-emerald-500" />}
                </div>

                {/* Linear gradient preview bar */}
                <div
                  className="h-5 w-full rounded-xl shadow-xs border border-white/20"
                  style={{ background: pal.gradient }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. BRAND COLORS & CUSTOM THEME PALETTE */}
      <div
        className={cn(
          'p-5 rounded-3xl border space-y-4 shadow-sm',
          darkTheme ? 'bg-white/5 border-white/10' : 'bg-card border-border'
        )}
      >
        <div className="flex items-center justify-between border-b pb-3 border-border/40">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            <span className={cn('text-sm font-bold', darkTheme ? 'text-white' : 'text-foreground')}>
              Brand Colors &amp; Custom School Palette
            </span>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {theme.primaryColor || '#0B192C'} / {theme.accentColor || '#16A34A'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Primary Color */}
          <div className="space-y-2.5 p-3.5 rounded-2xl bg-muted/30 border border-border">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">Primary Institutional Color</Label>
              <div
                className="w-5 h-5 rounded-full border border-border shadow-xs"
                style={{ backgroundColor: theme.primaryColor || '#0B192C' }}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={theme.primaryColor || '#0B192C'}
                onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                className="w-9 h-9 rounded-lg border border-border cursor-pointer p-0.5 bg-background shrink-0"
              />
              <input
                type="text"
                value={theme.primaryColor || '#0B192C'}
                onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                className="h-9 px-3 text-xs font-mono rounded-xl border border-border bg-background w-full"
                placeholder="#0B192C"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
              <span className="text-muted-foreground text-[10px]">Presets:</span>
              <button
                type="button"
                onClick={() => updateTheme({ primaryColor: '#0B192C' })}
                className="px-2 py-0.5 rounded-md bg-[#0B192C] text-white font-bold text-[10px]"
              >
                School Navy
              </button>
              <button
                type="button"
                onClick={() => updateTheme({ primaryColor: '#1D4ED8' })}
                className="px-2 py-0.5 rounded-md bg-[#1D4ED8] text-white font-bold text-[10px]"
              >
                Royal Blue
              </button>
              <button
                type="button"
                onClick={() => updateTheme({ primaryColor: '#16A34A' })}
                className="px-2 py-0.5 rounded-md bg-[#16A34A] text-white font-bold text-[10px]"
              >
                Forest Green
              </button>
            </div>
          </div>

          {/* Accent Color */}
          <div className="space-y-2.5 p-3.5 rounded-2xl bg-muted/30 border border-border">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">Highlight &amp; Accent Color</Label>
              <div
                className="w-5 h-5 rounded-full border border-border shadow-xs"
                style={{ backgroundColor: theme.accentColor || '#16A34A' }}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={theme.accentColor || '#16A34A'}
                onChange={(e) => updateTheme({ accentColor: e.target.value })}
                className="w-9 h-9 rounded-lg border border-border cursor-pointer p-0.5 bg-background shrink-0"
              />
              <input
                type="text"
                value={theme.accentColor || '#16A34A'}
                onChange={(e) => updateTheme({ accentColor: e.target.value })}
                className="h-9 px-3 text-xs font-mono rounded-xl border border-border bg-background w-full"
                placeholder="#16A34A"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
              <span className="text-muted-foreground text-[10px]">Presets:</span>
              <button
                type="button"
                onClick={() => updateTheme({ accentColor: '#D4AF37' })}
                className="px-2 py-0.5 rounded-md bg-[#D4AF37] text-slate-950 font-bold text-[10px]"
              >
                Imperial Gold
              </button>
              <button
                type="button"
                onClick={() => updateTheme({ accentColor: '#16A34A' })}
                className="px-2 py-0.5 rounded-md bg-[#16A34A] text-white font-bold text-[10px]"
              >
                Emerald Green
              </button>
              <button
                type="button"
                onClick={() => updateTheme({ accentColor: '#06B6D4' })}
                className="px-2 py-0.5 rounded-md bg-[#06B6D4] text-slate-950 font-bold text-[10px]"
              >
                Cyan Glow
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. VISUAL EFFECTS & CARD STYLING */}
      <div
        className={cn(
          'p-5 rounded-3xl border space-y-4 shadow-sm',
          darkTheme ? 'bg-white/5 border-white/10' : 'bg-card border-border'
        )}
      >
        <div className="flex items-center justify-between border-b pb-3 border-border/40">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className={cn('text-sm font-bold', darkTheme ? 'text-white' : 'text-foreground')}>
              Visual Effects, Radiance &amp; Card Styling
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card Glow Effect */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-muted/30 border border-border">
            <Label className="text-xs font-bold text-foreground">Card Radiance / Glow</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'none', label: 'None' },
                { id: 'subtle', label: 'Subtle' },
                { id: 'radiant', label: 'Radiant Green' },
                { id: 'luxury', label: 'Gold Luxury' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateTheme({ cardGlowEffect: opt.id as any })}
                  className={cn(
                    'p-2 rounded-xl text-xs font-semibold border transition-all text-center',
                    theme.cardGlowEffect === opt.id
                      ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                      : 'bg-background hover:bg-muted text-muted-foreground'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Border Radius Style */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-muted/30 border border-border">
            <Label className="text-xs font-bold text-foreground">Card Corner Styling</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'sharp', label: 'Sharp Square' },
                { id: 'rounded', label: 'Standard 2XL' },
                { id: 'extra-rounded', label: 'Luxe 3XL' },
                { id: 'pill', label: 'Pill Curvature' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateTheme({ borderRadiusStyle: opt.id as any })}
                  className={cn(
                    'p-2 rounded-xl text-xs font-semibold border transition-all text-center',
                    theme.borderRadiusStyle === opt.id
                      ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                      : 'bg-background hover:bg-muted text-muted-foreground'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Glassmorphism Frosted Blur */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-muted/30 border border-border flex flex-col justify-between">
            <div>
              <Label className="text-xs font-bold text-foreground">Glassmorphism Frosted Blur</Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Enable backdrop blur filter on cards and topbars.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-medium">Frosted Glass Effect</span>
              <Switch
                checked={theme.glassmorphism ?? true}
                onCheckedChange={(val) => updateTheme({ glassmorphism: val })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 6. FEATURE SWITCHES: TURN OFF / ON HOMEPAGE SECTIONS */}
      <div
        className={cn(
          'p-5 rounded-3xl border space-y-4 shadow-sm',
          darkTheme ? 'bg-white/5 border-white/10' : 'bg-card border-border'
        )}
      >
        <div className="flex items-center justify-between border-b pb-3 border-border/40">
          <div className="space-y-0.5">
            <span className={cn('text-sm font-bold flex items-center gap-2', darkTheme ? 'text-white' : 'text-foreground')}>
              <Sliders className="w-4 h-4 text-primary" />
              Homepage Feature Switches (Turn Sections Off or On)
            </span>
            <p className={cn('text-xs', darkTheme ? 'text-slate-400' : 'text-muted-foreground')}>
              Toggle any section of the homepage to completely hide or display it.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {Object.values(theme.sectionSwitches).filter(Boolean).length} / {SECTION_SWITCH_ITEMS.length} Visible
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SECTION_SWITCH_ITEMS.map((item) => {
            const isVisible = theme.sectionSwitches[item.key] ?? true;
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                className={cn(
                  'p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all',
                  isVisible
                    ? darkTheme
                      ? 'border-white/20 bg-white/5'
                      : 'border-border bg-background shadow-xs'
                    : darkTheme
                    ? 'border-white/5 bg-black/40 opacity-60'
                    : 'border-border/50 bg-muted/40 opacity-60'
                )}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                      isVisible ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs font-bold truncate', darkTheme ? 'text-white' : 'text-foreground')}>
                        {item.label}
                      </span>
                    </div>
                    <p className={cn('text-[11px] truncate mt-0.5', darkTheme ? 'text-slate-400' : 'text-muted-foreground')}>
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={isVisible}
                    onCheckedChange={() => {
                      toggleSection(item.key);
                      toast.success(
                        `${item.label} is now ${!isVisible ? 'visible' : 'hidden'} on the homepage.`
                      );
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default HomepageThemeCustomizer;
