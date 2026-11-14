export type CertificateLevel = "Gold" | "Silver" | "Bronze" | "Beginner" | "Not Started";

export type CertificateFontType =
  | "California"
  | "Great Vibes"
  | "Pinyon Script"
  | "Alex Brush"
  | "Dancing Script"
  | "Playfair Display"
  | "Cinzel"
  | "Germania One"
  | "Georgia";

export interface CertificateData {
  studentName: string;
  level: CertificateLevel;
  booksCount: number;
  signatoryName?: string;
  signatoryTitle?: string;
  dateAwarded?: string;
  verificationCode?: string;
  studentEmail?: string;
  challengeName?: string;
  // Admin custom name typography & styling
  nameFontSize?: number;
  nameFontColor?: string;
  nameFontType?: CertificateFontType | string;
  nameCase?: "capitalize" | "uppercase" | "as-is";
}

export const CERTIFICATE_FONT_OPTIONS: { id: CertificateFontType; label: string; family: string; preview: string }[] = [
  {
    id: "California",
    label: "California (Signature Calligraphy)",
    family: "'California', 'Alex Brush', 'Pinyon Script', 'Brush Script MT', cursive",
    preview: "California Elegant Script",
  },
  {
    id: "Great Vibes",
    label: "Great Vibes (Flourished Cursive)",
    family: "'Great Vibes', cursive",
    preview: "Great Vibes Flourish",
  },
  {
    id: "Pinyon Script",
    label: "Pinyon Script (Classic Royal)",
    family: "'Pinyon Script', cursive",
    preview: "Pinyon Script Royal",
  },
  {
    id: "Alex Brush",
    label: "Alex Brush (Flowing Ribbon)",
    family: "'Alex Brush', cursive",
    preview: "Alex Brush Script",
  },
  {
    id: "Dancing Script",
    label: "Dancing Script (Lively Modern)",
    family: "'Dancing Script', cursive",
    preview: "Dancing Script Cursive",
  },
  {
    id: "Playfair Display",
    label: "Playfair Display (Editorial Serif)",
    family: "'Playfair Display', serif",
    preview: "Playfair Display Serif",
  },
  {
    id: "Cinzel",
    label: "Cinzel (Imperial Roman)",
    family: "'Cinzel', serif",
    preview: "CINZEL IMPERIAL",
  },
  {
    id: "Germania One",
    label: "Germania One (Gothic Display)",
    family: "'Germania One', serif",
    preview: "Germania One Gothic",
  },
  {
    id: "Georgia",
    label: "Georgia (Traditional Academy)",
    family: "Georgia, serif",
    preview: "Georgia Traditional",
  },
];

export const CERTIFICATE_LEVEL_CONFIG: Record<
  CertificateLevel,
  {
    name: string;
    displayLevelName: string;
    badgeName: string;
    color: string;
    glow: string;
    medal: string;
    defaultBooks: number;
    sampleStudent: string;
    sampleCode: string;
  }
> = {
  Gold: {
    name: "Gold Level",
    displayLevelName: "Gold",
    badgeName: "Gold Level",
    color: "#D4AF37",
    glow: "rgba(212, 175, 55, 0.4)",
    medal: "🥇",
    defaultBooks: 45,
    sampleStudent: "ABIGAEL WANJIRU",
    sampleCode: "MFA-RC-2026-40248",
  },
  Silver: {
    name: "Silver Level",
    displayLevelName: "Silver",
    badgeName: "Silver Level",
    color: "#94a3b8",
    glow: "rgba(148, 163, 184, 0.4)",
    medal: "🥈",
    defaultBooks: 16,
    sampleStudent: "ANTONY MUUO",
    sampleCode: "MFA-RC-2026-82447",
  },
  Bronze: {
    name: "Bronze Level",
    displayLevelName: "Bronze",
    badgeName: "Bronze Level",
    color: "#CD7F32",
    glow: "rgba(205, 127, 50, 0.4)",
    medal: "🥉",
    defaultBooks: 9,
    sampleStudent: "AMINA MBETSA",
    sampleCode: "MFA-RC-2026-59215",
  },
  Beginner: {
    name: "Beginner Level",
    displayLevelName: "Beginner",
    badgeName: "Beginner Level",
    color: "#16a34a",
    glow: "rgba(22, 163, 74, 0.4)",
    medal: "🏅",
    defaultBooks: 1,
    sampleStudent: "ABDULLAHI ADAN",
    sampleCode: "MFA-RC-2026-42013",
  },
  "Not Started": {
    name: "Not Started",
    displayLevelName: "Not Started",
    badgeName: "Not Started",
    color: "#6366F1",
    glow: "rgba(99, 102, 241, 0.4)",
    medal: "⏱️",
    defaultBooks: 0,
    sampleStudent: "ALEX ODHIAMBO",
    sampleCode: "MFA-RC-2026-93621",
  },
};

export function getVerificationCode(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `MFA-RC-2026-${Math.abs(hash).toString().substring(0, 5).padStart(5, "0")}`;
}

export function computeStudentLevel(
  booksCount: number,
  challengeOrGoal?: number | { target_books?: number; level_milestones?: { bronze?: number; silver?: number; gold?: number } } | null
): CertificateLevel {
  if (booksCount <= 0) return "Not Started";

  if (typeof challengeOrGoal === "object" && challengeOrGoal !== null) {
    const milestones = challengeOrGoal.level_milestones;
    const target = challengeOrGoal.target_books || 45;
    const goldReq = milestones?.gold ?? target;
    const silverReq = milestones?.silver ?? Math.max(2, Math.round(target * 0.6));
    const bronzeReq = milestones?.bronze ?? Math.max(1, Math.round(target * 0.3));

    if (booksCount >= goldReq) return "Gold";
    if (booksCount >= silverReq) return "Silver";
    if (booksCount >= bronzeReq) return "Bronze";
    return "Beginner";
  }

  if (typeof challengeOrGoal === "number" && challengeOrGoal > 0 && challengeOrGoal !== 45) {
    const goldReq = challengeOrGoal;
    const silverReq = Math.max(2, Math.round(challengeOrGoal * 0.6));
    const bronzeReq = Math.max(1, Math.round(challengeOrGoal * 0.3));

    if (booksCount >= goldReq) return "Gold";
    if (booksCount >= silverReq) return "Silver";
    if (booksCount >= bronzeReq) return "Bronze";
    return "Beginner";
  }

  // Default master 45-book challenge
  if (booksCount >= 45) return "Gold";
  if (booksCount >= 16) return "Silver";
  if (booksCount >= 6) return "Bronze";
  if (booksCount >= 1) return "Beginner";
  return "Not Started";
}
