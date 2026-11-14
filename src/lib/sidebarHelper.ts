import { useState, useEffect } from "react";
import { safeStorage } from "@/lib/safeStorage";

const SIDEBAR_STORAGE_KEY = "mfa_main_sidebar_collapsed";
const SIDEBAR_EVENT_NAME = "mfa_toggle_main_sidebar";

export function isMainSidebarCollapsed(): boolean {
  return safeStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
}

export function toggleMainSidebar(force?: boolean): void {
  const current = isMainSidebarCollapsed();
  const next = force !== undefined ? force : !current;
  safeStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
  window.dispatchEvent(new CustomEvent(SIDEBAR_EVENT_NAME, { detail: { collapsed: next } }));
}

export function setMainSidebarCollapsed(collapsed: boolean): void {
  toggleMainSidebar(collapsed);
}

export function useMainSidebar() {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => isMainSidebarCollapsed());

  useEffect(() => {
    const handleEvent = (e: Event) => {
      const custom = e as CustomEvent<{ collapsed?: boolean }>;
      if (custom.detail?.collapsed !== undefined) {
        setIsCollapsed(Boolean(custom.detail.collapsed));
      } else {
        setIsCollapsed(isMainSidebarCollapsed());
      }
    };

    window.addEventListener(SIDEBAR_EVENT_NAME, handleEvent);
    return () => window.removeEventListener(SIDEBAR_EVENT_NAME, handleEvent);
  }, []);

  return {
    isCollapsed,
    toggle: () => toggleMainSidebar(),
    setCollapsed: (val: boolean) => setMainSidebarCollapsed(val),
  };
}
