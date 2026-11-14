import { supabase } from "@/integrations/supabase/client";

export interface CustomAuthField {
  id: string;
  label: string;
  placeholder: string;
  type: "text" | "select" | "number";
  options?: string[]; // for select type
  required: boolean;
  enabled: boolean;
  roleScope: "all" | "student" | "staff";
}

export interface AuthPageConfig {
  portalTitle: string;
  tagline: string;
  welcomeHeading: string;
  welcomeDescription: string;
  themeColor: string;
  gradientPreset: string;
  loginNotice: string;
  classesList: string[];
  yearGroupsList: string[];
  housesList: string[];
  customFields: CustomAuthField[];
  allowQuickAccessCodes: boolean;
  updatedAt?: string;
}

export const DEFAULT_AUTH_CONFIG: AuthPageConfig = {
  portalTitle: "M-PESA Foundation Academy",
  tagline: "Thinkers. Doers. Leaders. · 45-Book Reading Challenge",
  welcomeHeading: "Beyond the Pages",
  welcomeDescription: "Log in or register to track your reading journey, earn house points, and unlock prestigious literary realm certificates.",
  themeColor: "#00205B",
  gradientPreset: "linear-gradient(135deg, hsl(var(--v-green)), hsl(var(--v-orange)))",
  loginNotice: "",
  classesList: ["Swara", "Chui", "Duma", "Nyati", "Twiga", "Kifaru"],
  yearGroupsList: ["Grade 12", "Grade 11", "Grade 10", "DP2", "DP1", "G10"],
  housesList: ["Kenya", "Longonot", "Kilimanjaro", "Elgon"],
  customFields: [
    {
      id: "admission_number",
      label: "Admission Number / Student ID",
      placeholder: "e.g. MFA-2024-042",
      type: "text",
      required: false,
      enabled: true,
      roleScope: "student",
    },
  ],
  allowQuickAccessCodes: true,
};

const STORAGE_KEY = "mfa_auth_page_config";

export function getAuthPageConfig(): AuthPageConfig {
  if (typeof window === "undefined") return DEFAULT_AUTH_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AUTH_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_AUTH_CONFIG,
      ...parsed,
      classesList: Array.isArray(parsed.classesList) && parsed.classesList.length > 0 ? parsed.classesList : DEFAULT_AUTH_CONFIG.classesList,
      yearGroupsList: Array.from(new Set(["Grade 12", "Grade 11", ...(Array.isArray(parsed.yearGroupsList) && parsed.yearGroupsList.length > 0 ? parsed.yearGroupsList : DEFAULT_AUTH_CONFIG.yearGroupsList)])),
      housesList: Array.isArray(parsed.housesList) && parsed.housesList.length > 0 ? parsed.housesList : DEFAULT_AUTH_CONFIG.housesList,
      customFields: Array.isArray(parsed.customFields) ? parsed.customFields : DEFAULT_AUTH_CONFIG.customFields,
    };
  } catch {
    return DEFAULT_AUTH_CONFIG;
  }
}

export async function saveAuthPageConfig(cfg: AuthPageConfig): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const toSave: AuthPageConfig = {
      ...cfg,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    window.dispatchEvent(new CustomEvent("mfa-auth-config-updated", { detail: toSave }));

    // Sync to Supabase site_content for persistence across devices
    try {
      await supabase.from("site_content").upsert({
        section_key: "auth_page_config",
        title: toSave.portalTitle,
        content: JSON.stringify(toSave),
        visible: true,
      });
    } catch {
      // non-blocking
    }

    return true;
  } catch (err) {
    console.error("Could not save auth page config:", err);
    return false;
  }
}

export async function fetchRemoteAuthPageConfig(): Promise<AuthPageConfig> {
  try {
    const { data } = await supabase
      .from("site_content")
      .select("content")
      .eq("section_key", "auth_page_config")
      .maybeSingle();

    if (data?.content) {
      const parsed = JSON.parse(data.content);
      const merged: AuthPageConfig = {
        ...DEFAULT_AUTH_CONFIG,
        ...parsed,
      };
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent("mfa-auth-config-updated", { detail: merged }));
      }
      return merged;
    }
  } catch {
    // fallback
  }
  return getAuthPageConfig();
}
