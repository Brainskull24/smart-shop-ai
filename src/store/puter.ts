import { create } from "zustand";
import { persist } from "zustand/middleware";
import { HistoryItem } from "@/types/product";

interface PuterUser {
  username: string;
  email?: string;
  [key: string]: unknown;
}

interface PuterStore {
  puterReady: boolean;
  isLoading: boolean;
  error: string | null;
  user: PuterUser | null;
  isAuthenticated: boolean;
  history: HistoryItem[];
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  addToHistory: (item: HistoryItem) => Promise<void>;
  clearError: () => void;
  kv: {
    get: (key: string) => Promise<unknown | null>;
    set: (key: string, value: unknown) => Promise<boolean>;
    list: (prefix: string) => Promise<string[]>;
    delete: (key: string) => Promise<boolean>;
  };
  ai: {
    chat: (prompt: string, options: Record<string, unknown>) => Promise<unknown>;
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

      clearError: () => set({ error: null }),

      init: () => {
        const checkAuthStatus = async () => {
          if (!window.puter) {
            set({ 
              isLoading: false, 
              error: "Puter.js failed to load. Please refresh the page." 
            });
            return;
          }

          try {
            const signedIn = window.puter.auth.isSignedIn();
            if (signedIn) {
              const user = await window.puter.auth.getUser();
              set({ isAuthenticated: true, user, isLoading: false, error: null });
              // Fetch history from Puter KV
              await get().fetchHistory();
            } else {
              set({ isLoading: false, history: [], isAuthenticated: false });
            }
          } catch (error) {
            console.error("Auth check failed:", error);
            set({ 
              isLoading: false, 
              error: "Authentication check failed. Please try signing in again.",
              isAuthenticated: false,
              user: null
            });
          }
        };

        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait

        const interval = setInterval(() => {
          attempts++;
          
          if (window.puter) {
            clearInterval(interval);
            set({ puterReady: true });
            checkAuthStatus();
          } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            set({ 
              isLoading: false, 
              puterReady: false,
              error: "Failed to load Puter.js. Please check your internet connection and refresh." 
            });
          }
        }, 100);
      },

      signIn: async () => {
        if (!window.puter) {
          set({ error: "Puter.js is not available" });
          return;
        }
        set({ isLoading: true, error: null });
        try {
          await window.puter.auth.signIn();
          const user = await window.puter.auth.getUser();
          set({ isAuthenticated: true, user, isLoading: false, error: null });
          // Fetch history from Puter KV after sign in
          await get().fetchHistory();
        } catch (error) {
          console.error("Sign in failed:", error);
          
          // Handle popup blocked error specifically
          let errorMessage = "Sign in failed";
          if (error && typeof error === 'object' && 'error' in error) {
            const err = error as { error?: string; msg?: string };
            if (err.error === 'popup_blocked') {
              errorMessage = "Popup was blocked. Please click the popup blocker icon in your browser's address bar and allow popups, then try again. If the issue persists, try disabling your ad blocker or use a different browser.";
            } else if (err.msg) {
              errorMessage = err.msg;
            }
          } else if (error instanceof Error) {
            errorMessage = error.message;
          }
          
          set({ error: errorMessage, isLoading: false, isAuthenticated: false });
        }
      },

      signOut: async () => {
        if (!window.puter) {
          set({ error: "Puter.js is not available" });
          return;
        }
        set({ isLoading: true, error: null });
        try {
          await window.puter.auth.signOut();
          set({
            isAuthenticated: false,
            user: null,
            history: [],
            isLoading: false,
            error: null,
          });
        } catch (error) {
          console.error("Sign out failed:", error);
          const errorMessage = error instanceof Error ? error.message : "Sign out failed";
          set({ error: errorMessage, isLoading: false });
        }
      },

      fetchHistory: async () => {
        const state = get();
        if (!state.isAuthenticated || !window.puter) {
          set({ history: [] });
          return;
        }

        try {
          // Get all keys with values that start with 'sps_history_'
          // Using returnValues: true to get both keys and values in one call
          // @ts-expect-error - Puter API accepts options object but type definition is outdated
          const result: unknown = await window.puter.kv.list({
            pattern: "sps_history_*",
            returnValues: true
          });

          // Handle both paginated response (KVListPage) and array response
          const kvPairs = (result as { items?: unknown[] }).items || (result as unknown[]);

          if (kvPairs && Array.isArray(kvPairs) && kvPairs.length > 0) {
            const historyItems = [];

            // Process each key-value pair
            for (const kvPair of kvPairs) {
              try {
                // kvPair has { key, value } structure when returnValues is true
                const rawValue = (kvPair as { value?: unknown; key?: string }).value || kvPair;
                
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
                console.warn(`Failed to parse history item:`, itemError);
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

      addToHistory: async (item: HistoryItem) => {
        const state = get();
        if (!state.isAuthenticated || !window.puter) {
          console.warn("Cannot add to history: not authenticated or Puter not available");
          return;
        }

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
            set({ history: newHistory, error: null });
          } else {
            throw new Error("Failed to save to Puter KV");
          }
        } catch (error) {
          console.error("Error adding to history:", error);
          const errorMessage = error instanceof Error ? error.message : "Failed to save to history";
          set({ error: errorMessage });
        }
      },

      kv: {
        get: async (key: string) => {
          if (!window.puter) return null;
          try {
            const rawValue = await window.puter.kv.get(key);
            if (typeof rawValue === "string") {
              try {
                return JSON.parse(rawValue);
              } catch {
                return rawValue;
              }
            }
            return rawValue;
          } catch (error) {
            console.error("KV get error:", error);
            return null;
          }
        },

        set: async (key: string, value: unknown) => {
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

        list: async (prefix: string) => {
          if (!window.puter) return [];
          try {
            const result = await window.puter.kv.list(prefix);
            return Array.isArray(result) ? result : [];
          } catch (error) {
            console.error("KV list error:", error);
            return [];
          }
        },

        delete: async (key: string) => {
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
        chat: async (prompt: string, options: Record<string, unknown>) => {
          if (!window.puter) {
            throw new Error("Puter.js is not available. Please refresh the page.");
          }
          try {
            return await window.puter.ai.chat(prompt, options);
          } catch (error) {
            console.error("AI chat error:", error);
            throw new Error("AI processing failed. Please try again.");
          }
        },
      },
    }),
    {
      name: "smart-product-summary-storage",
      partialize: () => ({
        // Don't persist auth state - always check with Puter on init
        // This prevents stale auth issues
      }),
      onRehydrateStorage: () => () => {
        // Clear any stale data on rehydration
        // State will be refreshed on init
      },
    }
  )
);
