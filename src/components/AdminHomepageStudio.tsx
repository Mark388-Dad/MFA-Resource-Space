import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Layout,
  Type,
  ExternalLink,
  RotateCcw,
  CheckCircle,
  Quote,
  TrendingUp,
  Trophy,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Save,
  Compass,
  Star,
  Award,
  Crown,
  Lightbulb,
  Heart,
  Globe2,
  Sliders,
} from 'lucide-react';
import {
  HomepageCustomBlock,
  HomepageBlockType,
  BlockTone,
  getHomepageCustomBlocks,
  addHomepageCustomBlock,
  updateHomepageCustomBlock,
  deleteHomepageCustomBlock,
  moveHomepageCustomBlock,
  resetHomepageCustomBlocks,
} from '@/lib/homepageBlocksManager';
import { useSiteContent } from '@/hooks/useSiteContent';
import { HomepageThemeCustomizer } from '@/components/HomepageThemeCustomizer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const AdminHomepageStudio: React.FC = () => {
  const { get, updateBlock, resetOverrides } = useSiteContent();
  const [activeTab, setActiveTab] = useState<string>('hero');
  const [blocks, setBlocks] = useState<HomepageCustomBlock[]>(() =>
    getHomepageCustomBlocks()
  );

  // Core Section Content Getters
  const schoolBadge = get('school_badge_label');
  const heroKicker = get('hero_kicker');
  const heroTheme = get('hero_theme');
  const heroWelcome = get('hero_welcome');
  const ctaDashboard = get('hero_cta_dashboard');
  const ctaChallenges = get('hero_cta_challenges');
  const ctaRealms = get('hero_cta_realms');
  const heroHouses = get('hero_houses');
  const dailyQuote = get('hero_daily_quote');
  const dailyQuoteAuthor = get('hero_daily_quote_author');
  const statsBooks = get('hero_stats_books');
  const statsRealms = get('hero_stats_realms');
  const statsLevels = get('hero_stats_levels');
  const statsIb = get('hero_stats_ib');
  const quicklinks = get('quicklinks');
  const goals = get('goals');
  const points = get('points');
  const levelsHeader = get('levels_header');
  const levelsBronze = get('levels_bronze');
  const levelsSilver = get('levels_silver');
  const levelsGold = get('levels_gold');
  const realmsHeader = get('realms_header');
  const realmsList = get('realms_list');
  const reflections = get('reflections');
  const ibConnections = get('ib_connections');
  const outcomes = get('outcomes');
  const footerQuote = get('footer_quote');
  const footerValues = get('footer_values');
  const footerNote = get('footer_note');

  // Form states for core sections
  const [formState, setFormState] = useState<Record<string, { title: string; content: string }>>({});

  useEffect(() => {
    setFormState({
      school_badge_label: { title: schoolBadge.title, content: schoolBadge.content },
      hero_kicker: { title: heroKicker.title, content: heroKicker.content },
      hero_theme: { title: heroTheme.title, content: heroTheme.content },
      hero_welcome: { title: heroWelcome.title, content: heroWelcome.content },
      hero_cta_dashboard: { title: ctaDashboard.title, content: ctaDashboard.content },
      hero_cta_challenges: { title: ctaChallenges.title, content: ctaChallenges.content },
      hero_cta_realms: { title: ctaRealms.title, content: ctaRealms.content },
      hero_houses: { title: heroHouses.title, content: heroHouses.content },
      hero_daily_quote: { title: dailyQuote.title, content: dailyQuote.content },
      hero_daily_quote_author: { title: dailyQuoteAuthor.title, content: dailyQuoteAuthor.content },
      hero_stats_books: { title: statsBooks.title, content: statsBooks.content },
      hero_stats_realms: { title: statsRealms.title, content: statsRealms.content },
      hero_stats_levels: { title: statsLevels.title, content: statsLevels.content },
      hero_stats_ib: { title: statsIb.title, content: statsIb.content },
      quicklinks: { title: quicklinks.title, content: quicklinks.content },
      goals: { title: goals.title, content: goals.content },
      points: { title: points.title, content: points.content },
      levels_header: { title: levelsHeader.title, content: levelsHeader.content },
      levels_bronze: { title: levelsBronze.title, content: levelsBronze.content },
      levels_silver: { title: levelsSilver.title, content: levelsSilver.content },
      levels_gold: { title: levelsGold.title, content: levelsGold.content },
      realms_header: { title: realmsHeader.title, content: realmsHeader.content },
      realms_list: { title: realmsList.title, content: realmsList.content },
      reflections: { title: reflections.title, content: reflections.content },
      ib_connections: { title: ibConnections.title, content: ibConnections.content },
      outcomes: { title: outcomes.title, content: outcomes.content },
      footer_quote: { title: footerQuote.title, content: footerQuote.content },
      footer_values: { title: footerValues.title, content: footerValues.content },
      footer_note: { title: footerNote.title, content: footerNote.content },
    });
  }, [
    schoolBadge.title, schoolBadge.content,
    heroKicker.title, heroKicker.content,
    heroTheme.title, heroTheme.content,
    heroWelcome.content,
    ctaDashboard.title, ctaChallenges.title, ctaRealms.title,
    heroHouses.title, heroHouses.content,
    dailyQuote.content, dailyQuoteAuthor.content,
    statsBooks.title, statsBooks.content,
    statsRealms.title, statsRealms.content,
    statsLevels.content, statsIb.title, statsIb.content,
    quicklinks.content, goals.title, goals.content,
    points.title, points.content,
    levelsHeader.title, levelsHeader.content,
    levelsBronze.content, levelsSilver.content, levelsGold.content,
    realmsHeader.title, realmsHeader.content, realmsList.content,
    reflections.title, reflections.content,
    ibConnections.title, ibConnections.content,
    outcomes.title, outcomes.content,
    footerQuote.title, footerQuote.content,
    footerValues.content, footerNote.title, footerNote.content,
  ]);

  // Form for adding custom colorful blocks
  const [newType, setNewType] = useState<HomepageBlockType>('announcement');
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newBadge, setNewBadge] = useState('ACTIVE QUEST');
  const [newTone, setNewTone] = useState<BlockTone>('lime');
  const [newLinkText, setNewLinkText] = useState('Explore Challenge');
  const [newLinkUrl, setNewLinkUrl] = useState('/challenges');
  const [newAuthor, setNewAuthor] = useState('');
  const [newMetricVal, setNewMetricVal] = useState('45 Books');
  const [newMetricLabel, setNewMetricLabel] = useState('Academy Benchmark');
  const [newMetricTrend, setNewMetricTrend] = useState('+34% vs last year');

  const refreshBlocks = () => {
    setBlocks(getHomepageCustomBlocks());
  };

  useEffect(() => {
    const handleUpdate = () => refreshBlocks();
    window.addEventListener('mfa_homepage_blocks_updated', handleUpdate);
    return () => window.removeEventListener('mfa_homepage_blocks_updated', handleUpdate);
  }, []);

  const handleFieldChange = (key: string, field: 'title' | 'content', value: string) => {
    setFormState((prev) => ({
      ...prev,
      [key]: {
        title: field === 'title' ? value : (prev[key]?.title || ''),
        content: field === 'content' ? value : (prev[key]?.content || ''),
      },
    }));
  };

  const saveBlock = (key: string) => {
    const data = formState[key];
    if (!data) return;
    updateBlock(key, data);
    toast.success(`Saved "${key.replace(/_/g, ' ')}" successfully!`, {
      description: 'Your changes now reflect live across the entire homepage.',
    });
  };

  const handleCreateCustomBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error('Please enter a title and content for your block.');
      return;
    }

    addHomepageCustomBlock({
      type: newType,
      title: newTitle.trim(),
      subtitle: newSubtitle.trim() || undefined,
      content: newContent.trim(),
      badge: newBadge.trim() || 'FEATURED',
      tone: newTone,
      linkText: newLinkText.trim() || undefined,
      linkUrl: newLinkUrl.trim() || undefined,
      author: newAuthor.trim() || undefined,
      metricValue: newMetricVal.trim() || undefined,
      metricLabel: newMetricLabel.trim() || undefined,
      metricTrend: newMetricTrend.trim() || undefined,
      visible: true,
    });

    toast.success('New colorful custom block added to homepage!');
    setNewTitle('');
    setNewSubtitle('');
    setNewContent('');
    setNewBadge('FEATURED');
  };

  const handleResetAll = () => {
    if (confirm('Reset the entire homepage and all custom blocks to original Academy defaults?')) {
      resetHomepageCustomBlocks();
      resetOverrides();
      toast.info('Homepage restored to defaults.');
    }
  };

  const TABS = [
    { id: 'hero', label: '1. Hero & Branding', icon: Sparkles },
    { id: 'quote', label: '2. Quote & Stats', icon: Quote },
    { id: 'goals', label: '3. Goals', icon: Compass },
    { id: 'points', label: '4. Points & Awards', icon: Trophy },
    { id: 'levels', label: '5. Levels', icon: Crown },
    { id: 'realms', label: '6. 15 Realms', icon: BookOpen },
    { id: 'reflections', label: '7. Reflections', icon: Lightbulb },
    { id: 'ib', label: '8. IB & CBC', icon: ShieldCheck },
    { id: 'outcomes', label: '9. Outcomes', icon: Award },
    { id: 'footer', label: '10. Footer & Values', icon: Heart },
    { id: 'custom', label: '11. Custom Floating Blocks', icon: Layout },
    { id: 'design', label: '12. Fonts, Colors & Feature Switches', icon: Sliders },
  ];

  return (
    <div className="space-y-6 w-full max-w-none pb-16">
      {/* Top Banner Header */}
      <div
        className="rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-2xl border border-white/10"
        style={{
          background: 'linear-gradient(135deg, #090e1a 0%, #1e1b4b 50%, #064e3b 100%)',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Comprehensive Homepage Editor
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
              Edit the Entire Homepage
            </h2>
            <p className="text-sm text-slate-300/90 mt-1 max-w-2xl leading-relaxed">
              Customize every headline, quote, milestone, 15 literary realms, point values, reflection prompts, and floating blocks. All edits reflect live instantly on the homepage.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <Button asChild size="sm" className="bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold rounded-xl h-10 px-4 text-xs shadow-lg gap-2">
              <Link to="/" target="_blank">
                <ExternalLink className="w-4 h-4" />
                <span>View Live Homepage</span>
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetAll}
              className="rounded-xl h-10 px-4 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Reset to Defaults</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-border">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all',
                isActive
                  ? 'bg-foreground text-background shadow-md'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-border/70'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: HERO & BRANDING */}
      {activeTab === 'hero' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Hero Headline &amp; Theme
              </h3>
              <Button size="sm" onClick={() => { saveBlock('hero_kicker'); saveBlock('hero_theme'); saveBlock('hero_welcome'); }} className="h-8 text-xs font-bold gap-1 rounded-xl">
                <Save className="w-3.5 h-3.5" /> Save Hero Text
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Top Kicker Badge</Label>
              <Input
                value={formState['hero_kicker']?.title || ''}
                onChange={(e) => handleFieldChange('hero_kicker', 'title', e.target.value)}
                placeholder="45-BOOK READING CHALLENGE 2026/2027"
                className="text-xs font-semibold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Main Theme Title</Label>
              <Input
                value={formState['hero_theme']?.title || ''}
                onChange={(e) => handleFieldChange('hero_theme', 'title', e.target.value)}
                placeholder="Beyond the Pages - 26/27"
                className="text-sm font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Theme Motto / Sub-theme</Label>
              <Input
                value={formState['hero_theme']?.content || ''}
                onChange={(e) => handleFieldChange('hero_theme', 'content', e.target.value)}
                placeholder="📚 Read. 💡 Discover. ☀️ Become."
                className="text-xs font-medium"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Welcome Paragraph</Label>
              <Textarea
                rows={4}
                value={formState['hero_welcome']?.content || ''}
                onChange={(e) => handleFieldChange('hero_welcome', 'content', e.target.value)}
                placeholder="Welcome to the 45-Book Reading Challenge..."
                className="text-xs leading-relaxed"
              />
            </div>
          </div>

          <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Action Buttons &amp; 4 Houses
              </h3>
              <Button size="sm" onClick={() => { saveBlock('hero_cta_dashboard'); saveBlock('hero_cta_challenges'); saveBlock('hero_cta_realms'); saveBlock('hero_houses'); }} className="h-8 text-xs font-bold gap-1 rounded-xl">
                <Save className="w-3.5 h-3.5" /> Save Action Items
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Dashboard Button Label</Label>
              <Input
                value={formState['hero_cta_dashboard']?.title || ''}
                onChange={(e) => handleFieldChange('hero_cta_dashboard', 'title', e.target.value)}
                placeholder="Go to Dashboard"
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Browse Challenges Button Label</Label>
              <Input
                value={formState['hero_cta_challenges']?.title || ''}
                onChange={(e) => handleFieldChange('hero_cta_challenges', 'title', e.target.value)}
                placeholder="Browse Challenges"
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Explore Realms Button Label</Label>
              <Input
                value={formState['hero_cta_realms']?.title || ''}
                onChange={(e) => handleFieldChange('hero_cta_realms', 'title', e.target.value)}
                placeholder="Explore 15 literary realms"
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">4 Houses Social Proof Text</Label>
              <Input
                value={formState['hero_houses']?.content || ''}
                onChange={(e) => handleFieldChange('hero_houses', 'content', e.target.value)}
                placeholder="Kenya · Longonot · Menengai · Suswa competing live"
                className="text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: QUOTE & STATS */}
      {activeTab === 'quote' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                <Quote className="w-4 h-4 text-indigo-500" />
                Featured Daily Quote
              </h3>
              <Button size="sm" onClick={() => { saveBlock('hero_daily_quote'); saveBlock('hero_daily_quote_author'); }} className="h-8 text-xs font-bold gap-1 rounded-xl">
                <Save className="w-3.5 h-3.5" /> Save Quote
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Quote Badge Label</Label>
              <Input
                value={formState['hero_daily_quote']?.title || ''}
                onChange={(e) => handleFieldChange('hero_daily_quote', 'title', e.target.value)}
                placeholder="Daily quote"
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Quote Content</Label>
              <Textarea
                rows={3}
                value={formState['hero_daily_quote']?.content || ''}
                onChange={(e) => handleFieldChange('hero_daily_quote', 'content', e.target.value)}
                placeholder='"Every book you open is a door into a new world."'
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Author Attribution</Label>
              <Input
                value={formState['hero_daily_quote_author']?.content || ''}
                onChange={(e) => handleFieldChange('hero_daily_quote_author', 'content', e.target.value)}
                placeholder="— George R.R. Martin"
                className="text-xs"
              />
            </div>
          </div>

          <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Bento Stats &amp; Levels Chips
              </h3>
              <Button size="sm" onClick={() => { saveBlock('hero_stats_books'); saveBlock('hero_stats_realms'); saveBlock('hero_stats_levels'); saveBlock('hero_stats_ib'); }} className="h-8 text-xs font-bold gap-1 rounded-xl">
                <Save className="w-3.5 h-3.5" /> Save Stats
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Books Goal (Number)</Label>
                <Input
                  value={formState['hero_stats_books']?.title || ''}
                  onChange={(e) => handleFieldChange('hero_stats_books', 'title', e.target.value)}
                  placeholder="45"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Books Label</Label>
                <Input
                  value={formState['hero_stats_books']?.content || ''}
                  onChange={(e) => handleFieldChange('hero_stats_books', 'content', e.target.value)}
                  placeholder="Books goal"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Realms (Number)</Label>
                <Input
                  value={formState['hero_stats_realms']?.title || ''}
                  onChange={(e) => handleFieldChange('hero_stats_realms', 'title', e.target.value)}
                  placeholder="15"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Realms Label</Label>
                <Input
                  value={formState['hero_stats_realms']?.content || ''}
                  onChange={(e) => handleFieldChange('hero_stats_realms', 'content', e.target.value)}
                  placeholder="Literary realms"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Achievement Chips (Format: Bronze: 15 | Silver: 30 | Gold: 45)</Label>
              <Input
                value={formState['hero_stats_levels']?.content || ''}
                onChange={(e) => handleFieldChange('hero_stats_levels', 'content', e.target.value)}
                placeholder="Bronze: 15 books | Silver: 30 books | Gold: 45 books"
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Floating Badge (e.g. IB Learner / Profile aligned)</Label>
              <Input
                value={formState['hero_stats_ib']?.title || ''}
                onChange={(e) => handleFieldChange('hero_stats_ib', 'title', e.target.value)}
                placeholder="IB Learner"
                className="text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CHALLENGE GOALS */}
      {activeTab === 'goals' && (
        <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-500" />
                Challenge Goals Section
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                First line will be used as the subtitle; bullet points start with •
              </p>
            </div>
            <Button size="sm" onClick={() => saveBlock('goals')} className="h-8 text-xs font-bold gap-1 rounded-xl">
              <Save className="w-3.5 h-3.5" /> Save Goals
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold">Section Heading</Label>
            <Input
              value={formState['goals']?.title || ''}
              onChange={(e) => handleFieldChange('goals', 'title', e.target.value)}
              placeholder="Challenge Goals"
              className="text-xs font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold">Subtitle &amp; Goals Bullet Points</Label>
            <Textarea
              rows={8}
              value={formState['goals']?.content || ''}
              onChange={(e) => handleFieldChange('goals', 'content', e.target.value)}
              placeholder="Beyond the Pages turns every category into a Literary Realm...&#10;• Foster a lifelong love of reading.&#10;• Encourage exploration of diverse genres..."
              className="text-xs font-mono leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* TAB 4: POINTS & AWARDS */}
      {activeTab === 'points' && (
        <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Point Awards &amp; Leaderboard Rules
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Customize point explanations and milestone stacks
              </p>
            </div>
            <Button size="sm" onClick={() => saveBlock('points')} className="h-8 text-xs font-bold gap-1 rounded-xl">
              <Save className="w-3.5 h-3.5" /> Save Point Rules
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold">Section Heading</Label>
            <Input
              value={formState['points']?.title || ''}
              onChange={(e) => handleFieldChange('points', 'title', e.target.value)}
              placeholder="Point Awards"
              className="text-xs font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold">Description &amp; Action Items</Label>
            <Textarea
              rows={8}
              value={formState['points']?.content || ''}
              onChange={(e) => handleFieldChange('points', 'content', e.target.value)}
              placeholder="Bonus points stack on top of your book points...&#10;• Join the Challenge: 3 pts&#10;• Each book completed: 3 pts&#10;• Reach Bronze Level (15 books): 5 pts..."
              className="text-xs font-mono leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* TAB 5: ACHIEVEMENT LEVELS */}
      {activeTab === 'levels' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                <Crown className="w-4 h-4 text-gold" />
                Achievement Levels Header
              </h3>
              <Button size="sm" onClick={() => saveBlock('levels_header')} className="h-8 text-xs font-bold gap-1 rounded-xl">
                <Save className="w-3.5 h-3.5" /> Save Header
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Section Heading</Label>
                <Input
                  value={formState['levels_header']?.title || ''}
                  onChange={(e) => handleFieldChange('levels_header', 'title', e.target.value)}
                  placeholder="Achievement Levels"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Subtitle</Label>
                <Input
                  value={formState['levels_header']?.content || ''}
                  onChange={(e) => handleFieldChange('levels_header', 'content', e.target.value)}
                  placeholder="Select one book under each achievement level..."
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bronze */}
            <div className="p-5 rounded-3xl border border-amber-700/30 bg-amber-950/10 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-amber-700/20 text-amber-500 font-bold text-xs">Bronze Level</Badge>
                <Button size="sm" onClick={() => saveBlock('levels_bronze')} className="h-7 text-xs px-2.5 rounded-lg">Save</Button>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Level Title</Label>
                <Input
                  value={formState['levels_bronze']?.title || ''}
                  onChange={(e) => handleFieldChange('levels_bronze', 'title', e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Content (Line 1: Semester | Books, Line 2: Desc, Line 3: Focus)</Label>
                <Textarea
                  rows={5}
                  value={formState['levels_bronze']?.content || ''}
                  onChange={(e) => handleFieldChange('levels_bronze', 'content', e.target.value)}
                  className="text-xs leading-relaxed"
                />
              </div>
            </div>

            {/* Silver */}
            <div className="p-5 rounded-3xl border border-slate-500/30 bg-slate-950/10 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-slate-500/20 text-slate-300 font-bold text-xs">Silver Level</Badge>
                <Button size="sm" onClick={() => saveBlock('levels_silver')} className="h-7 text-xs px-2.5 rounded-lg">Save</Button>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Level Title</Label>
                <Input
                  value={formState['levels_silver']?.title || ''}
                  onChange={(e) => handleFieldChange('levels_silver', 'title', e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Content</Label>
                <Textarea
                  rows={5}
                  value={formState['levels_silver']?.content || ''}
                  onChange={(e) => handleFieldChange('levels_silver', 'content', e.target.value)}
                  className="text-xs leading-relaxed"
                />
              </div>
            </div>

            {/* Gold */}
            <div className="p-5 rounded-3xl border border-amber-500/30 bg-amber-500/5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-amber-500/20 text-amber-400 font-bold text-xs">Gold Level</Badge>
                <Button size="sm" onClick={() => saveBlock('levels_gold')} className="h-7 text-xs px-2.5 rounded-lg">Save</Button>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Level Title</Label>
                <Input
                  value={formState['levels_gold']?.title || ''}
                  onChange={(e) => handleFieldChange('levels_gold', 'title', e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Content</Label>
                <Textarea
                  rows={5}
                  value={formState['levels_gold']?.content || ''}
                  onChange={(e) => handleFieldChange('levels_gold', 'content', e.target.value)}
                  className="text-xs leading-relaxed"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: 15 LITERARY REALMS */}
      {activeTab === 'realms' && (
        <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                15 Literary Realms Specifications
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Each line formats as: <code>Realm# | Realm Title | Sub-Genre | Guiding Question | Max Books</code>
              </p>
            </div>
            <Button size="sm" onClick={() => { saveBlock('realms_header'); saveBlock('realms_list'); }} className="h-8 text-xs font-bold gap-1 rounded-xl">
              <Save className="w-3.5 h-3.5" /> Save 15 Realms
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold">Section Heading</Label>
            <Input
              value={formState['realms_header']?.title || ''}
              onChange={(e) => handleFieldChange('realms_header', 'title', e.target.value)}
              placeholder="The 15 Literary Realms"
              className="text-xs font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold">Realms Description &amp; Rule</Label>
            <Textarea
              rows={2}
              value={formState['realms_header']?.content || ''}
              onChange={(e) => handleFieldChange('realms_header', 'content', e.target.value)}
              placeholder="15 Literary Realms · 45 Books Journey&#10;Read one book from each realm..."
              className="text-xs leading-relaxed"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold">All 15 Realms Definitions (Pipe-Delimited)</Label>
            <Textarea
              rows={16}
              value={formState['realms_list']?.content || ''}
              onChange={(e) => handleFieldChange('realms_list', 'content', e.target.value)}
              className="text-xs font-mono leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* TAB 7: REFLECTION PROMPTS */}
      {activeTab === 'reflections' && (
        <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                Reflection Prompts Section
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Line 1: Subtitle. Following lines: <code>• Title: "Guiding Question"</code>
              </p>
            </div>
            <Button size="sm" onClick={() => saveBlock('reflections')} className="h-8 text-xs font-bold gap-1 rounded-xl">
              <Save className="w-3.5 h-3.5" /> Save Prompts
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold">Section Heading</Label>
            <Input
              value={formState['reflections']?.title || ''}
              onChange={(e) => handleFieldChange('reflections', 'title', e.target.value)}
              placeholder="Reflection Prompts"
              className="text-xs font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold">Subtitle &amp; The 4 Reflection Prompts</Label>
            <Textarea
              rows={8}
              value={formState['reflections']?.content || ''}
              onChange={(e) => handleFieldChange('reflections', 'content', e.target.value)}
              placeholder="Use these guiding prompts to deepen your reflections...&#10;• Titles That Speak: &quot;How does a title capture a story's message?&quot;&#10;• Moments That Change Everything: ..."
              className="text-xs font-mono leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* TAB 8: IB & CBC CONNECTIONS */}
      {activeTab === 'ib' && (
        <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                IB &amp; CBC Connections Section
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tag sections with [IB_ATL], [IB_PROFILE], [TOK], and [CBC]
              </p>
            </div>
            <Button size="sm" onClick={() => saveBlock('ib_connections')} className="h-8 text-xs font-bold gap-1 rounded-xl">
              <Save className="w-3.5 h-3.5" /> Save Frameworks
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold">Section Heading</Label>
            <Input
              value={formState['ib_connections']?.title || ''}
              onChange={(e) => handleFieldChange('ib_connections', 'title', e.target.value)}
              placeholder="IB & CBC Connections"
              className="text-xs font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold">Structured Content Blocks</Label>
            <Textarea
              rows={14}
              value={formState['ib_connections']?.content || ''}
              onChange={(e) => handleFieldChange('ib_connections', 'content', e.target.value)}
              className="text-xs font-mono leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* TAB 9: OUTCOMES */}
      {activeTab === 'outcomes' && (
        <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-500" />
                Outcomes: What Will You Gain?
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Line 1: Intro phrase. Following lines: bullet points with •
              </p>
            </div>
            <Button size="sm" onClick={() => saveBlock('outcomes')} className="h-8 text-xs font-bold gap-1 rounded-xl">
              <Save className="w-3.5 h-3.5" /> Save Outcomes
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold">Section Heading</Label>
            <Input
              value={formState['outcomes']?.title || ''}
              onChange={(e) => handleFieldChange('outcomes', 'title', e.target.value)}
              placeholder="What Will You Gain?"
              className="text-xs font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold">Intro &amp; Outcome Bullets</Label>
            <Textarea
              rows={10}
              value={formState['outcomes']?.content || ''}
              onChange={(e) => handleFieldChange('outcomes', 'content', e.target.value)}
              placeholder="By completing this journey, you will:&#10;• Read up to 45 books across a variety of genres.&#10;• Become a more confident and independent reader..."
              className="text-xs font-mono leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* TAB 10: FOOTER & VALUES */}
      {activeTab === 'footer' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                <Quote className="w-4 h-4 text-primary" />
                Footer Theme &amp; Reflection
              </h3>
              <Button size="sm" onClick={() => saveBlock('footer_quote')} className="h-8 text-xs font-bold gap-1 rounded-xl">
                <Save className="w-3.5 h-3.5" /> Save Footer Quote
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Footer Theme Headline</Label>
              <Input
                value={formState['footer_quote']?.title || ''}
                onChange={(e) => handleFieldChange('footer_quote', 'title', e.target.value)}
                placeholder="Beyond the Pages"
                className="text-xs font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Footer Narrative Quote</Label>
              <Textarea
                rows={4}
                value={formState['footer_quote']?.content || ''}
                onChange={(e) => handleFieldChange('footer_quote', 'content', e.target.value)}
                placeholder="Read 45 books across a variety of genres..."
                className="text-xs leading-relaxed"
              />
            </div>
          </div>

          <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" />
                CLAIRE Values &amp; Academy Motto
              </h3>
              <Button size="sm" onClick={() => { saveBlock('footer_values'); saveBlock('footer_note'); }} className="h-8 text-xs font-bold gap-1 rounded-xl">
                <Save className="w-3.5 h-3.5" /> Save Values &amp; Note
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">CLAIRE Values (Pipe-separated)</Label>
              <Input
                value={formState['footer_values']?.content || ''}
                onChange={(e) => handleFieldChange('footer_values', 'content', e.target.value)}
                placeholder="Curiosity | Leadership | Accountability | Innovation | Responsible Citizenship | Excellence"
                className="text-xs font-medium"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Academy Name</Label>
              <Input
                value={formState['footer_note']?.title || ''}
                onChange={(e) => handleFieldChange('footer_note', 'title', e.target.value)}
                placeholder="M-PESA Foundation Academy"
                className="text-xs font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Academy Motto</Label>
              <Input
                value={formState['footer_note']?.content || ''}
                onChange={(e) => handleFieldChange('footer_note', 'content', e.target.value)}
                placeholder="Thinkers. Doers. Leaders."
                className="text-xs font-semibold"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 11: CUSTOM FLOATING BLOCKS */}
      {activeTab === 'custom' && (
        <div className="space-y-8">
          {/* Active blocks list */}
          <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                  <Layout className="w-4 h-4 text-primary" />
                  Active Custom Floating Blocks ({blocks.length})
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  These well-rounded, colorful linear gradient divs appear right below the Hero on the homepage.
                </p>
              </div>
            </div>

            {blocks.length === 0 ? (
              <div className="text-center py-10 bg-muted/20 border border-dashed border-border rounded-2xl">
                <p className="text-xs text-muted-foreground">No custom blocks added yet. Use the form below to create your first one.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {blocks.map((block, idx) => (
                  <div
                    key={block.id}
                    className="p-4 rounded-2xl border border-border bg-card/60 flex items-center justify-between gap-4 transition-all hover:bg-card"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold truncate text-foreground">{block.title}</span>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">{block.type}</Badge>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize" style={{ background: `hsl(var(--v-${block.tone || 'lime'}) / 0.15)` }}>
                            {block.tone}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate max-w-md">{block.content}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          updateHomepageCustomBlock(block.id, { visible: !block.visible });
                          refreshBlocks();
                        }}
                        className="h-8 w-8 p-0 rounded-xl"
                        title={block.visible ? "Hide on homepage" : "Show on homepage"}
                      >
                        {block.visible ? <Eye className="w-3.5 h-3.5 text-emerald-500" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={idx === 0}
                        onClick={() => { moveHomepageCustomBlock(block.id, 'up'); refreshBlocks(); }}
                        className="h-8 w-8 p-0 rounded-xl"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={idx === blocks.length - 1}
                        onClick={() => { moveHomepageCustomBlock(block.id, 'down'); refreshBlocks(); }}
                        className="h-8 w-8 p-0 rounded-xl"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Delete block "${block.title}"?`)) {
                            deleteHomepageCustomBlock(block.id);
                            refreshBlocks();
                            toast.info('Block removed.');
                          }
                        }}
                        className="h-8 w-8 p-0 rounded-xl text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create new block form */}
          <form onSubmit={handleCreateCustomBlock} className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-4">
            <h4 className="font-display font-bold text-base text-foreground flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-500" />
              Add a New Floating Block
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Block Format</Label>
                <Select value={newType} onValueChange={(v) => setNewType(v as HomepageBlockType)}>
                  <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="announcement">Announcement Banner</SelectItem>
                    <SelectItem value="quote">Spotlight Quote</SelectItem>
                    <SelectItem value="metrics">Bento Metrics Grid</SelectItem>
                    <SelectItem value="challenge">Featured Challenge</SelectItem>
                    <SelectItem value="recommendation">Book Recommendation</SelectItem>
                    <SelectItem value="richtext">Rich Text Block</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Color Gradient Tone</Label>
                <Select value={newTone} onValueChange={(v) => setNewTone(v as BlockTone)}>
                  <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lime">Luxury Lime &amp; Emerald</SelectItem>
                    <SelectItem value="indigo">Vibrant Indigo &amp; Violet</SelectItem>
                    <SelectItem value="amber">Warm Amber &amp; Gold</SelectItem>
                    <SelectItem value="rose">Luminous Rose &amp; Magenta</SelectItem>
                    <SelectItem value="cyan">Electric Cyan &amp; Sky</SelectItem>
                    <SelectItem value="emerald">Deep Forest Emerald</SelectItem>
                    <SelectItem value="violet">Royal Purple &amp; Neon</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Badge Tag</Label>
                <Input
                  value={newBadge}
                  onChange={(e) => setNewBadge(e.target.value)}
                  placeholder="e.g. SPECIAL QUEST"
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Block Title</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Special Term 1 African Literature Marathon"
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Subtitle (Optional)</Label>
                <Input
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                  placeholder="e.g. 15 Titles across African prose"
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Content Narrative</Label>
              <Textarea
                rows={3}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Write the message, reflection prompts, or details that will appear inside this floating card..."
                className="text-xs leading-relaxed"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" size="sm" className="rounded-xl font-bold text-xs gap-1.5 h-9">
                <Plus className="w-3.5 h-3.5" />
                Publish Block to Homepage
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 12: THEME, FONTS & FEATURE SWITCHES */}
      {activeTab === 'design' && (
        <HomepageThemeCustomizer darkTheme={false} />
      )}
    </div>
  );
};
