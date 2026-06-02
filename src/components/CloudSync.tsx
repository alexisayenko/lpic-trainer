import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { useAuth } from '../lib/auth';
import { cloudEnabled, fullSync, pushNew } from '../lib/api';

/**
 * Headless: runs a full two-way sync when a token is set, then pushes new
 * answers as the history grows. Renders nothing.
 */
export function CloudSync() {
  const token = useAuth((s) => s.token);
  const enabled = cloudEnabled && !!token;
  const synced = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !token) {
      synced.current = null;
      return;
    }
    if (synced.current === token) return;
    synced.current = token;
    fullSync().catch(() => {
      // Offline / bad token: keep working locally, retry on next change.
    });
  }, [enabled, token]);

  useEffect(() => {
    if (!enabled) return;
    return useStore.subscribe((state, prev) => {
      if (state.history !== prev.history) pushNew().catch(() => {});
    });
  }, [enabled]);

  return null;
}
