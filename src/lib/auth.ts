import { create } from 'zustand';

const KEY = 'lpic-sync-token';

/** The sync token (generated on the server, pasted in once per device). */
interface AuthState {
  token: string | null;
  setToken: (t: string | null) => void;
}

export const useAuth = create<AuthState>((set) => ({
  token: typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null,
  setToken: (t) => {
    try {
      if (t) localStorage.setItem(KEY, t);
      else localStorage.removeItem(KEY);
    } catch {
      // storage unavailable (private mode, quota) — keep the token in memory only
    }
    set({ token: t });
  },
}));
