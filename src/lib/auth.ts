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
    if (t) localStorage.setItem(KEY, t);
    else localStorage.removeItem(KEY);
    set({ token: t });
  },
}));
