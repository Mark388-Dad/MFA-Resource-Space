// Memory fallback storage in case browser security policies, cross-origin iframes,
// or private browsing modes block access to window.localStorage.

const memoryStorage: Record<string, string> = {};

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // access denied or partitioned storage
    }
    return memoryStorage[key] ?? null;
  },

  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {
      // access denied
    }
    memoryStorage[key] = value;
  },

  removeItem: (key: string): void => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // access denied
    }
    delete memoryStorage[key];
  },

  getJSON: <T>(key: string, fallback: T): T => {
    try {
      const raw = safeStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  setJSON: (key: string, value: unknown): void => {
    try {
      safeStorage.setItem(key, JSON.stringify(value));
    } catch {
      // silent
    }
  },
};

export const safeAuthStorage = {
  getItem: (key: string): string | null => safeStorage.getItem(key),
  setItem: (key: string, value: string): void => safeStorage.setItem(key, value),
  removeItem: (key: string): void => safeStorage.removeItem(key),
};

