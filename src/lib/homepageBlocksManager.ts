import { safeStorage } from '@/lib/safeStorage';

export type HomepageBlockType =
  | 'announcement'
  | 'text_card'
  | 'spotlight_quote'
  | 'featured_challenge'
  | 'stat_metric'
  | 'book_recommendation';

export type BlockTone =
  | 'lime'
  | 'indigo'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'emerald'
  | 'violet';

export interface HomepageCustomBlock {
  id: string;
  type: HomepageBlockType;
  title: string;
  subtitle?: string;
  content: string;
  badge?: string;
  tone: BlockTone;
  icon?: string;
  linkText?: string;
  linkUrl?: string;
  metricValue?: string;
  metricLabel?: string;
  metricTrend?: string;
  author?: string;
  visible: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'mfa_homepage_custom_blocks';

export const DEFAULT_HOMEPAGE_BLOCKS: HomepageCustomBlock[] = [
  {
    id: 'block-welcome-banner',
    type: 'announcement',
    title: 'Term 1 Reading Marathon: 45 Books Quest is Live!',
    subtitle: 'All scholars in Longonot, Kenya, Kilimanjaro & Elgon houses are now competing.',
    content: 'Log your finished books across the 15 Literary Realms to unlock badges and earn house points.',
    badge: 'ACTIVE QUEST',
    tone: 'lime',
    icon: 'Sparkles',
    linkText: 'Explore All Challenges',
    linkUrl: '/challenges',
    visible: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'block-librarian-quote',
    type: 'spotlight_quote',
    title: 'Scholar Word of Inspiration',
    content: '“A reader lives a thousand lives before he dies. The man who never reads lives only one.” — George R.R. Martin',
    author: 'Created By Tonny Odundo',
    badge: 'QUOTE OF THE WEEK',
    tone: 'indigo',
    icon: 'Quote',
    visible: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'block-reading-metric',
    type: 'stat_metric',
    title: 'Academy Reading Velocity',
    content: 'Over 4,200 reflections verified this term. 2.1 days average tutor review turnaround.',
    metricValue: '45 Books',
    metricLabel: 'Mastery Benchmark',
    metricTrend: '+34% vs last year',
    badge: 'MFA MILESTONE',
    tone: 'emerald',
    icon: 'TrendingUp',
    visible: true,
    createdAt: new Date().toISOString(),
  },
];

export function getHomepageCustomBlocks(): HomepageCustomBlock[] {
  const stored = safeStorage.getJSON<HomepageCustomBlock[]>(STORAGE_KEY, null as any);
  if (stored && Array.isArray(stored)) {
    return stored;
  }
  // Initialize with vibrant defaults
  safeStorage.setJSON(STORAGE_KEY, DEFAULT_HOMEPAGE_BLOCKS);
  return DEFAULT_HOMEPAGE_BLOCKS;
}

export function saveHomepageCustomBlocks(blocks: HomepageCustomBlock[]) {
  safeStorage.setJSON(STORAGE_KEY, blocks);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mfa_homepage_blocks_updated', { detail: blocks }));
  }
}

export function addHomepageCustomBlock(block: Omit<HomepageCustomBlock, 'id' | 'createdAt'>): HomepageCustomBlock {
  const current = getHomepageCustomBlocks();
  const newBlock: HomepageCustomBlock = {
    ...block,
    id: `block-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  const updated = [newBlock, ...current];
  saveHomepageCustomBlocks(updated);
  return newBlock;
}

export function updateHomepageCustomBlock(id: string, updates: Partial<HomepageCustomBlock>) {
  const current = getHomepageCustomBlocks();
  const updated = current.map((b) => (b.id === id ? { ...b, ...updates } : b));
  saveHomepageCustomBlocks(updated);
}

export function deleteHomepageCustomBlock(id: string) {
  const current = getHomepageCustomBlocks();
  const updated = current.filter((b) => b.id !== id);
  saveHomepageCustomBlocks(updated);
}

export function moveHomepageCustomBlock(id: string, direction: 'up' | 'down') {
  const current = [...getHomepageCustomBlocks()];
  const index = current.findIndex((b) => b.id === id);
  if (index === -1) return;
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= current.length) return;
  const temp = current[index];
  current[index] = current[targetIndex];
  current[targetIndex] = temp;
  saveHomepageCustomBlocks(current);
}

export function resetHomepageCustomBlocks() {
  saveHomepageCustomBlocks(DEFAULT_HOMEPAGE_BLOCKS);
}
