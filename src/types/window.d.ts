// Global type definitions for window object extensions

interface PuterAuth {
  isSignedIn: () => boolean;
  getUser: () => Promise<PuterUser>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

interface PuterKV {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: string) => Promise<boolean>;
  list: (prefix: string) => Promise<string[]>;
  del: (key: string) => Promise<void>;
}

interface PuterAI {
  chat: (
    prompt: string,
    options: {
      model?: string;
      response_format?: { type: string };
      stream?: boolean;
    }
  ) => Promise<AsyncIterable<{ text?: string }> | { text: string }>;
}

interface PuterUser {
  username: string;
  email?: string;
  [key: string]: unknown;
}

interface Puter {
  auth: PuterAuth;
  kv: PuterKV;
  ai: PuterAI;
}

declare global {
  interface Window {
    puter?: Puter;
  }
}

export {};
