import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PuterStore {
  puterReady: boolean;
  isLoading: boolean;
  error: string | null;
  user: any | null;
  isAuthenticated: boolean;
  history: any[];
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  addToHistory: (item: any) => Promise<void>;
  kv: {
    get: (key: string) => Promise<any | null>;
    set: (key: string, value: any) => Promise<boolean>;
    list: (prefix: string) => Promise<string[]>;
    delete: (key: string) => Promise<boolean>;
  };
  ai: {
    chat: (prompt: string, options: any) => Promise<any>;
  };
  init: () => void;
}

// Create the Zustand store with persistence
export const usePuter = create<PuterStore>()(
  persist(
    (set, get) => ({
      puterReady: false,
      isLoading: true,
      error: null,
      user: null,
      isAuthenticated: false,
      history: [],

      init: () => {
        const checkAuthStatus = async () => {
          if (window.puter) {
            try {
              const signedIn = window.puter.auth.isSignedIn();
              if (signedIn) {
                const user = await window.puter.auth.getUser();
                set({ isAuthenticated: true, user, isLoading: false });
                // Always fetch from Puter KV on init
                await get().fetchHistory();
              } else {
                set({ isLoading: false, history: [] });
              }
            } catch (error) {
              set({ isLoading: false, error: "Authentication check failed" });
            }
          }
        };

        const interval = setInterval(() => {
          if (window.puter) {
            clearInterval(interval);
            set({ puterReady: true });
            checkAuthStatus();
          }
        }, 100);
      },

      signIn: async () => {
        if (!window.puter) return;
        set({ isLoading: true });
        try {
          await window.puter.auth.signIn();
          const user = await window.puter.auth.getUser();
          set({ isAuthenticated: true, user, isLoading: false });
          // Fetch history from Puter KV after sign in
          await get().fetchHistory();
        } catch (e: any) {
          set({ error: e.message, isLoading: false });
        }
      },

      signOut: async () => {
        if (!window.puter) return;
        set({ isLoading: true });
        try {
          await window.puter.auth.signOut();
          set({
            isAuthenticated: false,
            user: null,
            history: [],
            isLoading: false,
          });
        } catch (e: any) {
          set({ error: e.message, isLoading: false });
        }
      },

      fetchHistory: async () => {
        const state = get();
        if (!state.isAuthenticated || !window.puter) {
          set({ history: [] });
          return;
        }

        try {
          // Get all keys that start with 'sps_history_' (Smart Product Summary history)
          const keys = await window.puter.kv.list("sps_history_");

          if (keys && Array.isArray(keys) && keys.length > 0) {
            const historyItems = [];

            // Fetch each history item
            for (const key of keys) {
              try {
                const rawValue = await window.puter.kv.get(key);
                if (rawValue) {
                  let item;
                  if (typeof rawValue === "string") {
                    item = JSON.parse(rawValue);
                  } else {
                    item = rawValue;
                  }

                  // Validate the item has required structure
                  if (item && item.refinedData && item.refinedData.title) {
                    historyItems.push(item);
                  }
                }
              } catch (itemError) {
                console.warn(`Failed to parse history item ${key}:`, itemError);
              }
            }

            // Sort by scrapedAt date, newest first
            const sortedItems = historyItems.sort((a, b) => {
              const dateA = new Date(a.scrapedAt || 0).getTime();
              const dateB = new Date(b.scrapedAt || 0).getTime();
              return dateB - dateA;
            });

            set({ history: sortedItems, error: null });
          } else {
            set({ history: [] });
          }
        } catch (error) {
          console.error("Error fetching history from Puter KV:", error);
          set({ error: "Failed to load history" });
        }
      },

      addToHistory: async (item: any) => {
        const state = get();
        if (!state.isAuthenticated || !window.puter) return;

        try {
          // Create unique key with timestamp
          const timestamp = Date.now();
          const randomSuffix = Math.random().toString(36).substring(2, 9);
          const historyKey = `sps_history_${timestamp}_${randomSuffix}`;

          // Save to Puter KV storage
          const success = await window.puter.kv.set(
            historyKey,
            JSON.stringify(item)
          );

          if (success) {
            // Update local state immediately for better UX
            const currentHistory = state.history;
            const newHistory = [item, ...currentHistory];
            set({ history: newHistory });
          } else {
            throw new Error("Failed to save to Puter KV");
          }
        } catch (error) {
          console.error("Error adding to history:", error);
          set({ error: "Failed to save to history" });
        }
      },

      kv: {
        get: async (key) => {
          if (!window.puter) return null;
          try {
            const rawValue = await window.puter.kv.get(key);
            if (typeof rawValue === "string") {
              // Try to parse it as JSON. If it fails, return the raw string.
              try {
                return JSON.parse(rawValue);
              } catch (e) {
                return rawValue; // It's just a regular string, not JSON
              }
            }
            return rawValue;
          } catch (error) {
            console.error("KV get error:", error);
            return null;
          }
        },

        set: async (key, value) => {
          if (!window.puter) return false;
          try {
            const stringValue =
              typeof value === "string" ? value : JSON.stringify(value);
            const result = await window.puter.kv.set(key, stringValue);
            return result !== false;
          } catch (error) {
            console.error("KV set error:", error);
            return false;
          }
        },

        list: async (prefix) => {
          if (!window.puter) return [];
          try {
            const result = await window.puter.kv.list(prefix);
            return Array.isArray(result) ? result : [];
          } catch (error) {
            console.error("KV list error:", error);
            return [];
          }
        },

        delete: async (key) => {
          if (!window.puter) return false;
          try {
            await window.puter.kv.del(key);
            return true;
          } catch (error) {
            console.error("KV delete error:", error);
            return false;
          }
        },
      },

      ai: {
        chat: async (prompt, options) => {
          if (!window.puter) throw new Error("Puter.js not available.");
          return window.puter.ai.chat(prompt, options);
        },
      },
    }),
    {
      name: "smart-product-summary-storage",
      // Only persist certain non-sensitive data
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
      // Always fetch fresh history from Puter KV on hydration
      onRehydrateStorage: () => (state) => {
        if (state?.isAuthenticated) {
          // Give a small delay for Puter to initialize
          setTimeout(() => {
            state.fetchHistory();
          }, 1000);
        }
      },
    }
  )
);
