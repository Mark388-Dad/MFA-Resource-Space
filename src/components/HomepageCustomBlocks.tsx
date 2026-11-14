import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Quote,
  TrendingUp,
  BookOpen,
  Trophy,
  ArrowRight,
  Flame,
  Award,
  Bell,
  Layers,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import {
  HomepageCustomBlock,
  getHomepageCustomBlocks,
  BlockTone,
} from '@/lib/homepageBlocksManager';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const HomepageCustomBlocks: React.FC<{
  onOpenEditor?: () => void;
  canEdit?: boolean;
}> = ({ onOpenEditor, canEdit = true }) => {
  const [blocks, setBlocks] = useState<HomepageCustomBlock[]>(() =>
    getHomepageCustomBlocks().filter((b) => b.visible)
  );

  useEffect(() => {
    const handleUpdate = () => {
      setBlocks(getHomepageCustomBlocks().filter((b) => b.visible));
    };
    window.addEventListener('mfa_homepage_blocks_updated', handleUpdate);
    return () => window.removeEventListener('mfa_homepage_blocks_updated', handleUpdate);
  }, []);

  if (blocks.length === 0) return null;

  return (
    <section className="relative z-10 -mt-8 sm:-mt-12 mb-16 container mx-auto px-4 sm:px-6">
      {/* Kicker bar */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-bold uppercase tracking-widest text-foreground/70">
            Academy Spotlight &amp; Featured Notices
          </span>
          <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary border-primary/30">
            {blocks.length} Live {blocks.length === 1 ? 'Block' : 'Blocks'}
          </Badge>
        </div>

        {canEdit && onOpenEditor && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onOpenEditor}
            className="text-xs h-7 gap-1.5 text-primary hover:text-primary hover:bg-primary/10 rounded-xl"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Customize Blocks in Sidebar</span>
          </Button>
        )}
      </div>

      {/* Bento Grid of Well-Rounded Colorful Divs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {blocks.map((block) => (
          <BlockCard key={block.id} block={block} />
        ))}
      </div>
    </section>
  );
};

const BlockCard: React.FC<{ block: HomepageCustomBlock }> = ({ block }) => {
  const renderIcon = () => {
    switch (block.type) {
      case 'spotlight_quote':
        return <Quote className="w-5 h-5 shrink-0" />;
      case 'stat_metric':
        return <TrendingUp className="w-5 h-5 shrink-0" />;
      case 'featured_challenge':
        return <Trophy className="w-5 h-5 shrink-0" />;
      case 'book_recommendation':
        return <BookOpen className="w-5 h-5 shrink-0" />;
      default:
        return <Sparkles className="w-5 h-5 shrink-0" />;
    }
  };

  // Tone color styling presets for rich linear gradients and well rounded divs
  const getToneStyles = (tone: BlockTone) => {
    switch (tone) {
      case 'lime':
        return {
          wrapper:
            'bg-[#d9f99d] text-slate-950 border-2 border-black/80 shadow-[0_12px_32px_rgba(217,249,157,0.35)]',
          badge: 'bg-black text-[#d9f99d] border-0',
          accent: 'bg-black/10 text-slate-900',
          button: 'bg-black hover:bg-slate-800 text-white',
          borderAccent: 'border-dashed border-black/40',
        };
      case 'indigo':
        return {
          wrapper:
            'bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 text-white border-2 border-indigo-500/50 shadow-[0_12px_32px_rgba(79,70,229,0.3)]',
          badge: 'bg-[#d9f99d] text-slate-950 font-black border-0',
          accent: 'bg-white/10 text-indigo-200',
          button: 'bg-[#d9f99d] hover:bg-[#bef264] text-slate-950 font-bold',
          borderAccent: 'border-indigo-400/30',
        };
      case 'amber':
        return {
          wrapper:
            'bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-amber-950/20 text-foreground border-2 border-amber-500/60 shadow-[0_12px_32px_rgba(245,158,11,0.25)]',
          badge: 'bg-amber-500 text-black font-black border-0',
          accent: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
          button: 'bg-amber-500 hover:bg-amber-400 text-black font-bold',
          borderAccent: 'border-amber-500/30',
        };
      case 'rose':
        return {
          wrapper:
            'bg-gradient-to-br from-rose-500/20 via-pink-500/10 to-rose-950/20 text-foreground border-2 border-rose-500/60 shadow-[0_12px_32px_rgba(244,63,94,0.25)]',
          badge: 'bg-rose-500 text-white font-black border-0',
          accent: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
          button: 'bg-rose-500 hover:bg-rose-400 text-white font-bold',
          borderAccent: 'border-rose-500/30',
        };
      case 'cyan':
        return {
          wrapper:
            'bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-cyan-950/20 text-foreground border-2 border-cyan-500/60 shadow-[0_12px_32px_rgba(6,182,212,0.25)]',
          badge: 'bg-cyan-500 text-black font-black border-0',
          accent: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
          button: 'bg-cyan-500 hover:bg-cyan-400 text-black font-bold',
          borderAccent: 'border-cyan-500/30',
        };
      case 'violet':
        return {
          wrapper:
            'bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-violet-950/20 text-foreground border-2 border-violet-500/60 shadow-[0_12px_32px_rgba(139,92,246,0.25)]',
          badge: 'bg-violet-500 text-white font-black border-0',
          accent: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
          button: 'bg-violet-500 hover:bg-violet-400 text-white font-bold',
          borderAccent: 'border-violet-500/30',
        };
      case 'emerald':
      default:
        return {
          wrapper:
            'bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-emerald-950/20 text-foreground border-2 border-emerald-500/60 shadow-[0_12px_32px_rgba(16,185,129,0.25)]',
          badge: 'bg-emerald-500 text-black font-black border-0',
          accent: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
          button: 'bg-emerald-500 hover:bg-emerald-400 text-black font-bold',
          borderAccent: 'border-emerald-500/30',
        };
    }
  };

  const styles = getToneStyles(block.tone);

  return (
    <div
      className={cn(
        'relative rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between overflow-hidden',
        styles.wrapper
      )}
    >
      {/* Decorative ambient gradient orbs inside the div */}
      <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full blur-2xl opacity-20 bg-white pointer-events-none" />

      <div>
        {/* Top Header pill and tag */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <Badge className={cn('text-[10px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-lg', styles.badge)}>
            {block.badge || 'SPOTLIGHT'}
          </Badge>
          <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', styles.accent)}>
            {renderIcon()}
          </div>
        </div>

        {/* Title */}
        <h4 className="font-display font-bold text-lg sm:text-xl tracking-tight leading-snug mb-2">
          {block.title}
        </h4>

        {/* Subtitle / Description */}
        {block.subtitle && (
          <p className="text-xs font-semibold opacity-80 mb-2 leading-relaxed">
            {block.subtitle}
          </p>
        )}

        {/* Content body */}
        <p className="text-xs sm:text-sm opacity-90 leading-relaxed">
          {block.content}
        </p>

        {/* Author if quote */}
        {block.author && (
          <div className="mt-3 pt-2 border-t border-current/15 flex items-center gap-1.5 text-xs font-semibold opacity-85">
            <span>—</span>
            <span>{block.author}</span>
          </div>
        )}

        {/* Metric if stat block */}
        {block.metricValue && (
          <div className="mt-4 p-3 rounded-2xl bg-black/10 dark:bg-white/10 flex items-center justify-between">
            <div>
              <span className="block text-2xl font-black font-display tracking-tight">
                {block.metricValue}
              </span>
              <span className="text-[11px] font-medium opacity-75">
                {block.metricLabel || 'Benchmark'}
              </span>
            </div>
            {block.metricTrend && (
              <span className="text-xs font-bold px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                {block.metricTrend}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom CTA Link */}
      {block.linkUrl && (
        <div className="pt-4 mt-2">
          <Button
            asChild
            size="sm"
            className={cn('w-full text-xs font-bold rounded-xl gap-1.5 shadow-sm', styles.button)}
          >
            <Link to={block.linkUrl}>
              <span>{block.linkText || 'Learn More'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
};
