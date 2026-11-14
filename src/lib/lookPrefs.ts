import { safeStorage } from "@/lib/safeStorage";

export type TextSize = "sm" | "md" | "lg" | "xl";
export interface LookPrefs {
  textSize: TextSize;
  reducedMotion: boolean;
  compact: boolean;
}
const KEY = "mfa-look-prefs";
const SIZES: Record<TextSize, string> = { sm: "14px", md: "16px", lg: "18px", xl: "20px" };

export function getLookPrefs(): LookPrefs {
  return safeStorage.getJSON<LookPrefs>(KEY, { textSize: "md", reducedMotion: false, compact: false });
}

export function applyLookPrefs(p: LookPrefs = getLookPrefs()) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.fontSize = SIZES[p.textSize] || SIZES.md;
  root.classList.toggle("reduce-motion", p.reducedMotion);
  root.classList.toggle("compact-ui", p.compact);
}

export function saveLookPrefs(p: LookPrefs) {
  safeStorage.setJSON(KEY, p);
  applyLookPrefs(p);
}
