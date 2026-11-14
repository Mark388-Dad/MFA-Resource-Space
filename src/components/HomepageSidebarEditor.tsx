import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Palette,
  Layout,
  Type,
  X,
  RotateCcw,
  CheckCircle,
  HelpCircle,
  Quote,
  TrendingUp,
  Trophy,
  BookOpen,
  Sliders,
  Send,
  Layers,
  Save,
  Compass,
  Crown,
  Lightbulb,
  ShieldCheck,
  Award,
  Heart,
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
import { HomepageThemeCustomizer } from '@/components/HomepageThemeCustomizer';

interface HomepageSidebarEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HomepageSidebarEditor: React.FC<HomepageSidebarEditorProps> = ({
  isOpen,
  onClose,
}) => {
  const { get, updateBlock, resetOverrides } = useSiteContent();

  const [blocks, setBlocks] = useState<HomepageCustomBlock[]>(() =>
    getHomepageCustomBlocks()
  );

  const [activeTab, setActiveTab] = useState<'text' | 'design' | 'blocks' | 'add'>('text');
  const [selectedSection, setSelectedSection] = useState<string>('hero');

  // Core Section Form State
  const [sectionForm, setSectionForm] = useState<Record<string, { title: string; content: string }>>({});

  const refreshForm = () => {
    const keys = [
      'school_badge_label', 'hero_kicker', 'hero_theme', 'hero_welcome',
      'hero_cta_dashboard', 'hero_cta_challenges', 'hero_cta_realms', 'hero_houses',
      'hero_daily_quote', 'hero_daily_quote_author', 'hero_stats_books', 'hero_stats_realms',
      'hero_stats_levels', 'hero_stats_ib', 'quicklinks', 'goals', 'points',
      'levels_header', 'levels_bronze', 'levels_silver', 'levels_gold',
      'realms_header', 'realms_list', 'reflections', 'ib_connections',
      'outcomes', 'footer_quote', 'footer_values', 'footer_note',
    ];
    const data: Record<string, { title: string; content: string }> = {};
    keys.forEach((k) => {
      const b = get(k);
      data[k] = { title: b.title, content: b.content };
    });
    setSectionForm(data);
  };

  useEffect(() => {
    refreshForm();
  }, [isOpen]);

  const handleFieldChange = (key: string, field: 'title' | 'content', val: string) => {
    setSectionForm((prev) => ({
      ...prev,
      [key]: {
        title: field === 'title' ? val : (prev[key]?.title || ''),
        content: field === 'content' ? val : (prev[key]?.content || ''),
      },
    }));
  };

  const handleSaveBlock = (key: string) => {
    const d = sectionForm[key];
    if (!d) return;
    updateBlock(key, d);
    toast.success(`Saved "${key.replace(/_/g, ' ')}" successfully!`, {
      description: 'Changes reflect live on the homepage.',
    });
  };

  // New block form state
  const [newType, setNewType] = useState<HomepageBlockType>('announcement');
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newBadge, setNewBadge] = useState('FEATURED');
  const [newTone, setNewTone] = useState<BlockTone>('lime');
  const [newLinkText, setNewLinkText] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  const refreshBlocks = () => {
    setBlocks(getHomepageCustomBlocks());
  };

  useEffect(() => {
    const handleUpdate = () => refreshBlocks();
    window.addEventListener('mfa_homepage_blocks_updated', handleUpdate);
    return () => window.removeEventListener('mfa_homepage_blocks_updated', handleUpdate);
  }, []);

  const handleCreateBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error('Please enter a title and content.');
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
      visible: true,
    });

    toast.success('New floating block added to homepage!');
    setNewTitle('');
    setNewSubtitle('');
    setNewContent('');
    setActiveTab('blocks');
  };

  const handleResetAll = () => {
    if (confirm('Reset entire homepage and custom blocks to defaults?')) {
      resetHomepageCustomBlocks();
      resetOverrides();
      refreshForm();
      toast.info('Homepage restored to defaults.');
    }
  };

  if (!isOpen) return null;

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] md:w-[520px] bg-slate-950 text-white shadow-2xl flex flex-col border-l border-white/10 animate-in slide-in-from-right duration-300"
      style={{
        boxShadow: '-10px 0 50px rgba(0, 0, 0, 0.7)',
      }}
    >
      {/* STUDIO HEADER */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/90 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-lime-400 text-slate-950 flex items-center justify-center font-black">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm text-white">Homepage Live Studio</h3>
            <p className="text-[10px] text-slate-400">Edit any part of the homepage in real time</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* TABS */}
      <div className="flex items-center p-2 border-b border-white/10 bg-slate-900/50 gap-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('text')}
          className={cn(
            'flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 whitespace-nowrap',
            activeTab === 'text'
              ? 'bg-lime-400 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          )}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Edit Text</span>
        </button>
        <button
          onClick={() => setActiveTab('design')}
          className={cn(
            'flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 whitespace-nowrap',
            activeTab === 'design'
              ? 'bg-lime-400 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          )}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Design &amp; Switches</span>
        </button>
        <button
          onClick={() => setActiveTab('blocks')}
          className={cn(
            'flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 whitespace-nowrap',
            activeTab === 'blocks'
              ? 'bg-lime-400 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          )}
        >
          <Layout className="w-3.5 h-3.5" />
          <span>Divs ({blocks.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('add')}
          className={cn(
            'flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 whitespace-nowrap',
            activeTab === 'add'
              ? 'bg-lime-400 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Add Div</span>
        </button>
      </div>

      {/* SCROLLABLE BODY */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 0: DESIGN, FONTS & SECTION SWITCHES */}
        {activeTab === 'design' && (
          <HomepageThemeCustomizer darkTheme={true} />
        )}

        {/* TAB 1: EDIT ENTIRE HOMEPAGE SECTIONS */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">Select Section to Edit:</Label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger className="bg-slate-900 border-white/20 text-xs text-white rounded-xl h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-white/20 text-white">
                  <SelectItem value="hero">1. Hero, Theme &amp; Action Buttons</SelectItem>
                  <SelectItem value="quote">2. Featured Daily Quote &amp; Stats</SelectItem>
                  <SelectItem value="goals">3. Challenge Goals</SelectItem>
                  <SelectItem value="points">4. Point Awards &amp; Leaderboard Rules</SelectItem>
                  <SelectItem value="levels">5. Achievement Levels (Bronze, Silver, Gold)</SelectItem>
                  <SelectItem value="realms">6. 15 Literary Realms Specifications</SelectItem>
                  <SelectItem value="reflections">7. Reflection Prompts</SelectItem>
                  <SelectItem value="ib">8. IB &amp; CBC Connections</SelectItem>
                  <SelectItem value="outcomes">9. What Will You Gain? (Outcomes)</SelectItem>
                  <SelectItem value="footer">10. Footer, CLAIRE Values &amp; Motto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* SECTION 1: HERO */}
            {selectedSection === 'hero' && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-bold text-lime-300">Hero Section Details</span>
                  <Button size="sm" onClick={() => { handleSaveBlock('hero_kicker'); handleSaveBlock('hero_theme'); handleSaveBlock('hero_welcome'); handleSaveBlock('hero_cta_dashboard'); handleSaveBlock('hero_cta_challenges'); handleSaveBlock('hero_cta_realms'); handleSaveBlock('hero_houses'); }} className="h-7 text-xs bg-lime-400 text-slate-950 font-bold hover:bg-lime-300 rounded-lg">Save Hero</Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Kicker Badge</Label>
                  <Input value={sectionForm['hero_kicker']?.title || ''} onChange={(e) => handleFieldChange('hero_kicker', 'title', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Theme Title</Label>
                  <Input value={sectionForm['hero_theme']?.title || ''} onChange={(e) => handleFieldChange('hero_theme', 'title', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Theme Motto / Subtitle</Label>
                  <Input value={sectionForm['hero_theme']?.content || ''} onChange={(e) => handleFieldChange('hero_theme', 'content', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Welcome Paragraph</Label>
                  <Textarea rows={3} value={sectionForm['hero_welcome']?.content || ''} onChange={(e) => handleFieldChange('hero_welcome', 'content', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-300">Dashboard Button</Label>
                    <Input value={sectionForm['hero_cta_dashboard']?.title || ''} onChange={(e) => handleFieldChange('hero_cta_dashboard', 'title', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-300">Challenges Button</Label>
                    <Input value={sectionForm['hero_cta_challenges']?.title || ''} onChange={(e) => handleFieldChange('hero_cta_challenges', 'title', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Explore Realms Button</Label>
                  <Input value={sectionForm['hero_cta_realms']?.title || ''} onChange={(e) => handleFieldChange('hero_cta_realms', 'title', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">4 Houses Text</Label>
                  <Input value={sectionForm['hero_houses']?.content || ''} onChange={(e) => handleFieldChange('hero_houses', 'content', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white" />
                </div>
              </div>
            )}

            {/* SECTION 2: QUOTE & STATS */}
            {selectedSection === 'quote' && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-bold text-lime-300">Daily Quote &amp; Stats</span>
                  <Button size="sm" onClick={() => { handleSaveBlock('hero_daily_quote'); handleSaveBlock('hero_daily_quote_author'); handleSaveBlock('hero_stats_books'); handleSaveBlock('hero_stats_realms'); handleSaveBlock('hero_stats_levels'); }} className="h-7 text-xs bg-lime-400 text-slate-950 font-bold hover:bg-lime-300 rounded-lg">Save Quote &amp; Stats</Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Daily Quote Text</Label>
                  <Textarea rows={2} value={sectionForm['hero_daily_quote']?.content || ''} onChange={(e) => handleFieldChange('hero_daily_quote', 'content', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Quote Author</Label>
                  <Input value={sectionForm['hero_daily_quote_author']?.content || ''} onChange={(e) => handleFieldChange('hero_daily_quote_author', 'content', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-300">Books Goal (Number)</Label>
                    <Input value={sectionForm['hero_stats_books']?.title || ''} onChange={(e) => handleFieldChange('hero_stats_books', 'title', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-300">Realms (Number)</Label>
                    <Input value={sectionForm['hero_stats_realms']?.title || ''} onChange={(e) => handleFieldChange('hero_stats_realms', 'title', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Achievement Chips (Bronze: 15 | Silver: 30 | Gold: 45)</Label>
                  <Input value={sectionForm['hero_stats_levels']?.content || ''} onChange={(e) => handleFieldChange('hero_stats_levels', 'content', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white" />
                </div>
              </div>
            )}

            {/* SECTION 3: GOALS */}
            {selectedSection === 'goals' && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-bold text-lime-300">Challenge Goals</span>
                  <Button size="sm" onClick={() => handleSaveBlock('goals')} className="h-7 text-xs bg-lime-400 text-slate-950 font-bold hover:bg-lime-300 rounded-lg">Save Goals</Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Heading</Label>
                  <Input value={sectionForm['goals']?.title || ''} onChange={(e) => handleFieldChange('goals', 'title', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Subtitle &amp; Goals Bullets</Label>
                  <Textarea rows={7} value={sectionForm['goals']?.content || ''} onChange={(e) => handleFieldChange('goals', 'content', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white font-mono" />
                </div>
              </div>
            )}

            {/* SECTION 4: POINTS */}
            {selectedSection === 'points' && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-bold text-lime-300">Point Awards</span>
                  <Button size="sm" onClick={() => handleSaveBlock('points')} className="h-7 text-xs bg-lime-400 text-slate-950 font-bold hover:bg-lime-300 rounded-lg">Save Points</Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Heading</Label>
                  <Input value={sectionForm['points']?.title || ''} onChange={(e) => handleFieldChange('points', 'title', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Description &amp; Awards Breakdown</Label>
                  <Textarea rows={7} value={sectionForm['points']?.content || ''} onChange={(e) => handleFieldChange('points', 'content', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white font-mono" />
                </div>
              </div>
            )}

            {/* SECTION 5: LEVELS */}
            {selectedSection === 'levels' && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-bold text-lime-300">Achievement Levels</span>
                  <Button size="sm" onClick={() => { handleSaveBlock('levels_header'); handleSaveBlock('levels_bronze'); handleSaveBlock('levels_silver'); handleSaveBlock('levels_gold'); }} className="h-7 text-xs bg-lime-400 text-slate-950 font-bold hover:bg-lime-300 rounded-lg">Save Levels</Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Heading</Label>
                  <Input value={sectionForm['levels_header']?.title || ''} onChange={(e) => handleFieldChange('levels_header', 'title', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Bronze Level Text</Label>
                  <Textarea rows={3} value={sectionForm['levels_bronze']?.content || ''} onChange={(e) => handleFieldChange('levels_bronze', 'content', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Silver Level Text</Label>
                  <Textarea rows={3} value={sectionForm['levels_silver']?.content || ''} onChange={(e) => handleFieldChange('levels_silver', 'content', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Gold Level Text</Label>
                  <Textarea rows={3} value={sectionForm['levels_gold']?.content || ''} onChange={(e) => handleFieldChange('levels_gold', 'content', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white" />
                </div>
              </div>
            )}

            {/* SECTION 6: 15 REALMS */}
            {selectedSection === 'realms' && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-bold text-lime-300">The 15 Literary Realms</span>
                  <Button size="sm" onClick={() => { handleSaveBlock('realms_header'); handleSaveBlock('realms_list'); }} className="h-7 text-xs bg-lime-400 text-slate-950 font-bold hover:bg-lime-300 rounded-lg">Save Realms</Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Heading</Label>
                  <Input value={sectionForm['realms_header']?.title || ''} onChange={(e) => handleFieldChange('realms_header', 'title', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Realms Specifications (Realm# | Title | Genre | Question | Max)</Label>
                  <Textarea rows={10} value={sectionForm['realms_list']?.content || ''} onChange={(e) => handleFieldChange('realms_list', 'content', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white font-mono" />
                </div>
              </div>
            )}

            {/* SECTION 7: REFLECTIONS */}
            {selectedSection === 'reflections' && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-bold text-lime-300">Reflection Prompts</span>
                  <Button size="sm" onClick={() => handleSaveBlock('reflections')} className="h-7 text-xs bg-lime-400 text-slate-950 font-bold hover:bg-lime-300 rounded-lg">Save Prompts</Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Heading</Label>
                  <Input value={sectionForm['reflections']?.title || ''} onChange={(e) => handleFieldChange('reflections', 'title', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">The 4 Prompts</Label>
                  <Textarea rows={6} value={sectionForm['reflections']?.content || ''} onChange={(e) => handleFieldChange('reflections', 'content', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white font-mono" />
                </div>
              </div>
            )}

            {/* SECTION 8: IB & CBC */}
            {selectedSection === 'ib' && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-bold text-lime-300">IB &amp; CBC Connections</span>
                  <Button size="sm" onClick={() => handleSaveBlock('ib_connections')} className="h-7 text-xs bg-lime-400 text-slate-950 font-bold hover:bg-lime-300 rounded-lg">Save IB &amp; CBC</Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Heading</Label>
                  <Input value={sectionForm['ib_connections']?.title || ''} onChange={(e) => handleFieldChange('ib_connections', 'title', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Structured Skills &amp; Competencies</Label>
                  <Textarea rows={10} value={sectionForm['ib_connections']?.content || ''} onChange={(e) => handleFieldChange('ib_connections', 'content', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white font-mono" />
                </div>
              </div>
            )}

            {/* SECTION 9: OUTCOMES */}
            {selectedSection === 'outcomes' && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-bold text-lime-300">Outcomes: What Will You Gain?</span>
                  <Button size="sm" onClick={() => handleSaveBlock('outcomes')} className="h-7 text-xs bg-lime-400 text-slate-950 font-bold hover:bg-lime-300 rounded-lg">Save Outcomes</Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Heading</Label>
                  <Input value={sectionForm['outcomes']?.title || ''} onChange={(e) => handleFieldChange('outcomes', 'title', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Outcomes Bullets</Label>
                  <Textarea rows={8} value={sectionForm['outcomes']?.content || ''} onChange={(e) => handleFieldChange('outcomes', 'content', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white font-mono" />
                </div>
              </div>
            )}

            {/* SECTION 10: FOOTER */}
            {selectedSection === 'footer' && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-bold text-lime-300">Footer &amp; Values</span>
                  <Button size="sm" onClick={() => { handleSaveBlock('footer_quote'); handleSaveBlock('footer_values'); handleSaveBlock('footer_note'); }} className="h-7 text-xs bg-lime-400 text-slate-950 font-bold hover:bg-lime-300 rounded-lg">Save Footer</Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Footer Headline</Label>
                  <Input value={sectionForm['footer_quote']?.title || ''} onChange={(e) => handleFieldChange('footer_quote', 'title', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Footer Narrative Quote</Label>
                  <Textarea rows={2} value={sectionForm['footer_quote']?.content || ''} onChange={(e) => handleFieldChange('footer_quote', 'content', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">CLAIRE Values (Pipe-separated)</Label>
                  <Input value={sectionForm['footer_values']?.content || ''} onChange={(e) => handleFieldChange('footer_values', 'content', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-300">Academy Name</Label>
                    <Input value={sectionForm['footer_note']?.title || ''} onChange={(e) => handleFieldChange('footer_note', 'title', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-300">Academy Motto</Label>
                    <Input value={sectionForm['footer_note']?.content || ''} onChange={(e) => handleFieldChange('footer_note', 'content', e.target.value)} className="text-xs bg-black/40 border-white/10 text-white" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ACTIVE BLOCKS LIST */}
        {activeTab === 'blocks' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Custom Floating Blocks ({blocks.length})</span>
              <Button size="sm" variant="outline" onClick={() => setActiveTab('add')} className="h-7 text-xs border-white/20 text-slate-200 hover:text-white">
                <Plus className="w-3 h-3 mr-1" /> Add Div
              </Button>
            </div>

            {blocks.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-white/20 text-center">
                <p className="text-xs text-slate-400">No custom blocks. Click <strong>+ Add Div</strong> to create one!</p>
              </div>
            ) : (
              blocks.map((block, index) => (
                <div
                  key={block.id}
                  className="p-3.5 rounded-2xl border border-white/10 bg-white/5 space-y-2 relative"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold text-lime-400 border-lime-400/40">
                        {block.badge || block.type}
                      </Badge>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">{block.tone}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button disabled={index === 0} onClick={() => moveHomepageCustomBlock(block.id, 'up')} className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30">
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button disabled={index === blocks.length - 1} onClick={() => moveHomepageCustomBlock(block.id, 'down')} className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30">
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button onClick={() => updateHomepageCustomBlock(block.id, { visible: !block.visible })} className="p-1 rounded text-slate-400 hover:text-white">
                        {block.visible ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
                      </button>
                      <button onClick={() => deleteHomepageCustomBlock(block.id)} className="p-1 rounded text-slate-400 hover:text-rose-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <Input
                    value={block.title}
                    onChange={(e) => updateHomepageCustomBlock(block.id, { title: e.target.value })}
                    className="text-xs font-bold bg-black/40 border-white/10 text-white h-8 rounded-lg"
                  />
                  <p className="text-[11px] text-slate-300 line-clamp-2">{block.content}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: ADD NEW FLOATING DIV */}
        {activeTab === 'add' && (
          <form onSubmit={handleCreateBlock} className="space-y-3 p-4 rounded-2xl bg-white/5 border border-white/10">
            <h4 className="text-xs font-bold text-lime-300">Create a New Floating Div</h4>

            <div className="space-y-1">
              <Label className="text-[11px] text-slate-300">Format</Label>
              <Select value={newType} onValueChange={(val) => setNewType(val as HomepageBlockType)}>
                <SelectTrigger className="bg-black/40 border-white/15 text-xs text-white rounded-xl h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/20 text-white">
                  <SelectItem value="announcement">Announcement Banner</SelectItem>
                  <SelectItem value="quote">Spotlight Quote</SelectItem>
                  <SelectItem value="metrics">Bento Metric Card</SelectItem>
                  <SelectItem value="challenge">Featured Challenge Spotlight</SelectItem>
                  <SelectItem value="recommendation">Book Recommendation</SelectItem>
                  <SelectItem value="richtext">Rich Text Div</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-slate-300">Color Gradient Tone</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['lime', 'indigo', 'amber', 'rose', 'cyan', 'emerald', 'violet'] as BlockTone[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewTone(t)}
                    className={cn(
                      'py-1 px-1.5 rounded-lg text-[10px] font-bold capitalize transition-all border text-center',
                      newTone === t ? 'border-lime-400 bg-lime-400/20 text-lime-300' : 'border-white/10 text-slate-400 hover:text-white'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-slate-300">Title</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Beyond the Pages Quest" className="bg-black/40 border-white/15 text-xs text-white rounded-xl h-8" />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-slate-300">Content</Label>
              <Textarea rows={3} value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="Enter details..." className="bg-black/40 border-white/15 text-xs text-white rounded-xl" />
            </div>

            <Button type="submit" className="w-full h-9 text-xs font-bold rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 mt-2">
              <Plus className="w-4 h-4 mr-1 text-slate-950" /> Add to Homepage
            </Button>
          </form>
        )}
      </div>

      {/* FOOTER ACTIONS */}
      <div className="p-3 border-t border-white/10 flex items-center justify-between gap-3 bg-slate-900/80">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleResetAll}
          className="text-xs h-8 border-white/15 text-slate-400 hover:text-white rounded-xl"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          Reset All
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onClose}
          className="text-xs h-8 px-4 font-bold bg-lime-400 hover:bg-lime-300 text-slate-950 rounded-xl"
        >
          Done Editing
        </Button>
      </div>
    </aside>
  );
};
