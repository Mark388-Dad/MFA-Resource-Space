import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { safeStorage } from "@/lib/safeStorage";

export interface SystemLinksConfig {
  portal_base_url: string;
  email_cta_url: string;
  certificate_verification_url: string;
  certificate_download_url: string;
  book_submission_url: string;
  leaderboard_url: string;
  progress_dashboard_url: string;
  certificate_studio_url: string;
  challenge_workspace_url: string;
  support_email: string;
  custom_redirects?: Record<string, string>;
}

export const DEFAULT_PORTAL_ORIGIN =
  typeof window !== "undefined" && window.location?.origin && !window.location.origin.includes("localhost")
    ? window.location.origin
    : "https://mfareadingchallenge.netlify.app";

export const DEFAULT_SYSTEM_LINKS: SystemLinksConfig = {
  portal_base_url: DEFAULT_PORTAL_ORIGIN,
  email_cta_url: `${DEFAULT_PORTAL_ORIGIN}/dashboard`,
  certificate_verification_url: `${DEFAULT_PORTAL_ORIGIN}/verify-certificate/{code}`,
  certificate_download_url: `${DEFAULT_PORTAL_ORIGIN}/verify-certificate/{code}?download=true`,
  book_submission_url: `${DEFAULT_PORTAL_ORIGIN}/submit`,
  leaderboard_url: `${DEFAULT_PORTAL_ORIGIN}/leaderboard`,
  progress_dashboard_url: `${DEFAULT_PORTAL_ORIGIN}/progress`,
  certificate_studio_url: `${DEFAULT_PORTAL_ORIGIN}/certificates`,
  challenge_workspace_url: `${DEFAULT_PORTAL_ORIGIN}/challenges`,
  support_email: "directorate@mpesafoundationacademy.ac.ke",
  custom_redirects: {},
};

const STORAGE_KEY = "mfa_system_links_config_v1";
const SYSTEM_LINKS_EVENT = "mfa_system_links_updated";

/**
 * Get cached or default system links synchronously
 */
export function getSystemLinks(): SystemLinksConfig {
  try {
    const raw = safeStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SYSTEM_LINKS,
        ...parsed,
        custom_redirects: {
          ...(DEFAULT_SYSTEM_LINKS.custom_redirects || {}),
          ...(parsed.custom_redirects || {}),
        },
      };
    }
  } catch (err) {
    console.warn("Could not read cached system links:", err);
  }
  return DEFAULT_SYSTEM_LINKS;
}

/**
 * Resolve a system link template replacing {portal_base_url}, {code}, {student}
 */
export function resolveSystemLink(
  key: keyof SystemLinksConfig | string,
  params?: { code?: string; student?: string }
): string {
  const links = getSystemLinks();
  let rawUrl = (links as any)[key] || links.custom_redirects?.[key] || links.portal_base_url;

  if (!rawUrl) rawUrl = links.portal_base_url;

  // Normalize base placeholder
  rawUrl = rawUrl.replace(/{portal_base_url}/g, links.portal_base_url);

  if (params?.code) {
    rawUrl = rawUrl.replace(/{code}/g, encodeURIComponent(params.code));
  } else {
    rawUrl = rawUrl.replace(/{code}/g, "");
  }

  if (params?.student) {
    rawUrl = rawUrl.replace(/{student}/g, encodeURIComponent(params.student));
  } else {
    rawUrl = rawUrl.replace(/{student}/g, "");
  }

  return rawUrl;
}

/**
 * Save all system links to database (system_settings table) and cache in localStorage
 */
export async function saveSystemLinks(
  config: Partial<SystemLinksConfig>,
  userEmail?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const current = getSystemLinks();
    const updated: SystemLinksConfig = {
      ...current,
      ...config,
      custom_redirects: {
        ...(current.custom_redirects || {}),
        ...(config.custom_redirects || {}),
      },
    };

    // 1. Save to local storage for immediate synchronous availability
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // 2. Dispatch custom event for real-time reactivity in the active UI
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(SYSTEM_LINKS_EVENT, { detail: updated }));
    }

    // 3. Persist to Supabase database `system_settings` table
    try {
      const rows = Object.entries(updated).map(([key, value]) => ({
        setting_key: `link_${key}`,
        setting_value: typeof value === "object" ? JSON.stringify(value) : String(value),
        description: `Redirect URL configuration for ${key.replace(/_/g, " ")}`,
        updated_at: new Date().toISOString(),
        updated_by: userEmail || "administrator",
      }));

      // Upsert rows into system_settings table
      for (const row of rows) {
        await supabase
          .from("system_settings")
          .upsert(row, { onConflict: "setting_key" });
      }
    } catch (dbErr) {
      console.warn("Could not persist to system_settings in Supabase (cached in localStorage):", dbErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error("Failed to save system links:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
}

/**
 * Fetch latest system links from Supabase database and update cache
 */
export async function syncSystemLinksFromDatabase(): Promise<SystemLinksConfig> {
  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("setting_key, setting_value")
      .like("setting_key", "link_%");

    if (!error && data && data.length > 0) {
      const remoteLinks: Partial<SystemLinksConfig> = {};
      data.forEach((row) => {
        const key = row.setting_key.replace(/^link_/, "") as keyof SystemLinksConfig;
        if (key === "custom_redirects") {
          try {
            remoteLinks.custom_redirects = JSON.parse(row.setting_value);
          } catch {}
        } else {
          (remoteLinks as any)[key] = row.setting_value;
        }
      });

      const current = getSystemLinks();
      const merged: SystemLinksConfig = {
        ...current,
        ...remoteLinks,
      };

      safeStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(SYSTEM_LINKS_EVENT, { detail: merged }));
      }
      return merged;
    }
  } catch (err) {
    console.warn("Could not sync system links from Supabase:", err);
  }
  return getSystemLinks();
}

/**
 * React hook to consume and update system links with reactive updates
 */
export function useSystemLinks() {
  const [links, setLinks] = useState<SystemLinksConfig>(getSystemLinks);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Initial fetch from DB
    setIsLoading(true);
    syncSystemLinksFromDatabase().then((res) => {
      setLinks(res);
      setIsLoading(false);
    });

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<SystemLinksConfig>;
      if (customEvent.detail) {
        setLinks(customEvent.detail);
      } else {
        setLinks(getSystemLinks());
      }
    };

    window.addEventListener(SYSTEM_LINKS_EVENT, handler);
    return () => window.removeEventListener(SYSTEM_LINKS_EVENT, handler);
  }, []);

  const updateLink = async (key: keyof SystemLinksConfig | string, value: string, userEmail?: string) => {
    setIsSaving(true);
    const partial: any = {};
    if (key in links) {
      partial[key] = value;
    } else {
      partial.custom_redirects = {
        ...(links.custom_redirects || {}),
        [key]: value,
      };
    }
    const res = await saveSystemLinks(partial, userEmail);
    setIsSaving(false);
    return res;
  };

  const saveAll = async (newLinks: Partial<SystemLinksConfig>, userEmail?: string) => {
    setIsSaving(true);
    const res = await saveSystemLinks(newLinks, userEmail);
    setIsSaving(false);
    return res;
  };

  const resetDefaults = async () => {
    setIsSaving(true);
    safeStorage.removeItem(STORAGE_KEY);
    const res = await saveSystemLinks(DEFAULT_SYSTEM_LINKS);
    setIsSaving(false);
    return res;
  };

  return {
    links,
    isLoading,
    isSaving,
    updateLink,
    saveAll,
    resetDefaults,
    resolveLink: (key: keyof SystemLinksConfig | string, params?: { code?: string; student?: string }) =>
      resolveSystemLink(key, params),
  };
}
