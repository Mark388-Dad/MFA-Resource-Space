export const MAX_BOOKS_PER_CATEGORY = 4;
export const TOTAL_BOOK_GOAL = 45;

/** Points model */
export const POINTS_PER_BOOK = 3;
export const POINTS_FOR_JOINING = 3;
export const MILESTONES = [
  { level: "Bronze", books: 15, bonus: 5 },
  { level: "Silver", books: 30, bonus: 10 },
  { level: "Gold", books: 45, bonus: 15 },
] as const;

/** Total points a reader has, given their number of counted books. */
export function computeTotalPoints(countedBooks: number) {
  const books = Math.min(Math.max(countedBooks, 0), TOTAL_BOOK_GOAL);
  if (books === 0) return 0;
  const bonus = MILESTONES.reduce((sum, m) => sum + (books >= m.books ? m.bonus : 0), 0);
  return POINTS_FOR_JOINING + books * POINTS_PER_BOOK + bonus;
}

export const READING_CATEGORIES = [
  { id: 1, name: "Adventure", realm: "Explorer's Frontier", prompt: "What made the journey gripping? Describe 3 moments of risk, discovery or courage that stood out." },
  { id: 2, name: "Fantasy", realm: "Realm of Wonders", prompt: "How convincing was the world-building? Share 3 magical or imagined elements you enjoyed most." },
  { id: 3, name: "Historical", realm: "Timekeeper's Vault", prompt: "What did you learn about the period? Mention 3 details that made the past feel real." },
  { id: 4, name: "Horror", realm: "Shadowlands", prompt: "What created the tension or fear? Discuss 3 techniques the author used to unsettle you." },
  { id: 5, name: "Romance", realm: "Heartlands", prompt: "How did the relationship develop? Reflect on 3 moments that shaped the connection between the characters." },
  { id: 6, name: "Science", realm: "Discovery Lab", prompt: "What scientific idea did the book explore? Explain 3 things you now understand better." },
  { id: 7, name: "Short Stories", realm: "Story Islands", prompt: "Which story stayed with you and why? Compare 3 stories in terms of theme, mood or style." },
  { id: 8, name: "Play", realm: "Grand Stage", prompt: "How did dialogue and stage directions shape the drama? Reflect on 3 scenes that carried the most weight." },
  { id: 9, name: "African Fiction", realm: "Motherland Voices", prompt: "How did the African setting and voice shape the story? Share 3 cultural or social insights you gained." },
  { id: 10, name: "Swahili", realm: "Pwani ya Lugha", prompt: "Eleza ulichojifunza kutokana na kitabu hiki. Taja mambo 3 yaliyokuvutia kuhusu lugha, wahusika au maudhui." },
  { id: 11, name: "Poetry", realm: "Verse Garden", prompt: "Reflect on the themes, emotions and imagery used by the poet. Did any poem resonate with you personally?" },
  { id: 12, name: "Mystery", realm: "Riddle Quarter", prompt: "How well was the puzzle built? Discuss 3 clues, red herrings or twists that shaped your reading." },
  { id: 13, name: "Realistic", realm: "Mirror City", prompt: "How true to life did the story feel? Share 3 situations or characters that mirrored real experiences." },
  { id: 14, name: "Biography", realm: "Hall of Lives", prompt: "How did this life story inspire or challenge you? What 3 lessons or perspectives did you gain?" },
  { id: 15, name: "Graphic Novels", realm: "Graphic Galaxy", prompt: "Did the artwork enhance the storytelling? Share 3 aspects of the visuals and narrative that you appreciated." },
];


export const HOUSES = ['Kenya', 'Longonot', 'Kilimanjaro', 'Elgon'] as const;

/**
 * Official House Colours:
 * - Kenya: Navy Blue
 * - Kilimanjaro: Red
 * - Longonot: Yellow
 * - Elgon: Green
 */
export const HOUSE_COLORS: Record<string, {
  name: string;
  colorName: string;
  hex: string;
  hsl: string;
  bgLight: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  badgeClass: string;
  gradient: string;
}> = {
  Kenya: {
    name: 'Kenya',
    colorName: 'Navy Blue',
    hex: '#00205B',
    hsl: '222 100% 18%',
    bgLight: 'hsl(222 100% 18% / 0.12)',
    bgClass: 'bg-[#00205B]',
    borderClass: 'border-[#00205B]/40',
    textClass: 'text-[#1e3a8a] dark:text-[#93c5fd]',
    badgeClass: 'bg-[#00205B] text-white hover:bg-[#001740]',
    gradient: 'linear-gradient(135deg, #00205B, #0A2540)',
  },
  Kilimanjaro: {
    name: 'Kilimanjaro',
    colorName: 'Red',
    hex: '#D32F2F',
    hsl: '0 80% 50%',
    bgLight: 'hsl(0 80% 50% / 0.12)',
    bgClass: 'bg-[#D32F2F]',
    borderClass: 'border-[#D32F2F]/40',
    textClass: 'text-[#dc2626] dark:text-[#f87171]',
    badgeClass: 'bg-[#D32F2F] text-white hover:bg-[#b71c1c]',
    gradient: 'linear-gradient(135deg, #D32F2F, #B71C1C)',
  },
  Longonot: {
    name: 'Longonot',
    colorName: 'Yellow',
    hex: '#EAB308',
    hsl: '48 96% 48%',
    bgLight: 'hsl(48 96% 48% / 0.15)',
    bgClass: 'bg-[#EAB308]',
    borderClass: 'border-[#EAB308]/40',
    textClass: 'text-[#a16207] dark:text-[#fde047]',
    badgeClass: 'bg-[#EAB308] text-black font-bold hover:bg-[#ca8a04]',
    gradient: 'linear-gradient(135deg, #EAB308, #CA8A04)',
  },
  Elgon: {
    name: 'Elgon',
    colorName: 'Green',
    hex: '#2E7D32',
    hsl: '142 70% 36%',
    bgLight: 'hsl(142 70% 36% / 0.12)',
    bgClass: 'bg-[#2E7D32]',
    borderClass: 'border-[#2E7D32]/40',
    textClass: 'text-[#15803d] dark:text-[#86efac]',
    badgeClass: 'bg-[#2E7D32] text-white hover:bg-[#1b5e20]',
    gradient: 'linear-gradient(135deg, #2E7D32, #1B5E20)',
  },
};

export const getHouseColor = (houseName?: string | null) => {
  if (!houseName) return HOUSE_COLORS.Kenya;
  const match = Object.keys(HOUSE_COLORS).find(
    (k) => k.toLowerCase() === houseName.toLowerCase()
  );
  return match ? HOUSE_COLORS[match] : HOUSE_COLORS.Kenya;
};

export const YEAR_GROUPS = ['DP2', 'DP1', 'G10'] as const;

export const ALL_YEAR_GROUPS = ['DP2', 'DP1', 'G10'] as const;

export const YEAR_GROUP_DISPLAY: Record<string, string> = {
  DP2: 'DP2 (Senior Diploma)',
  DP1: 'DP1 (Junior Diploma)',
  G10: 'G10 (Pre-IB)',
  'Grade 12': 'DP2 (Senior Diploma)',
  'Grade 11': 'DP1 (Junior Diploma)',
  'Grade 10': 'G10 (Pre-IB)',
  G12: 'DP2',
  G11: 'DP1',
};

export const normalizeYearGroup = (val?: string | null): string => {
  if (!val) return '';
  const s = val.trim();
  const lower = s.toLowerCase();
  const upper = s.toUpperCase();
  if (upper === 'DP2' || lower === 'grade 12' || upper === 'G12') return 'DP2';
  if (upper === 'DP1' || lower === 'grade 11' || upper === 'G11') return 'DP1';
  if (upper === 'G10' || lower === 'grade 10' || upper === 'MYP5' || upper === 'MYP') return 'G10';
  return s;
};

export const isYearGroupMatch = (a?: string | null, b?: string | null): boolean => {
  if (!a || !b) return false;
  if (b === 'all' || b === 'ALL') return true;
  if (a === b) return true;
  if (a.toLowerCase() === b.toLowerCase()) return true;
  return normalizeYearGroup(a).toLowerCase() === normalizeYearGroup(b).toLowerCase();
};

export const CLASSES = ['Swara', 'Chui', 'Duma', 'Nyati', 'Twiga', 'Kifaru'] as const;

export const USER_ROLES = [
  { value: 'student', label: 'Student' },
  { value: 'admin', label: 'Academy Administrator' },
  { value: 'librarian', label: 'Librarian Staff' },
  { value: 'homeroom_tutor', label: 'Homeroom Tutor' },
  { value: 'head_of_year', label: 'Head of Year' },
  { value: 'house_patron', label: 'House Patron' },
  { value: 'staff', label: 'Other Staff' },
] as const;

export type House = typeof HOUSES[number];
export type YearGroup = typeof YEAR_GROUPS[number];
export type ClassName = typeof CLASSES[number];
export type UserRole = typeof USER_ROLES[number]['value'];
