import { useCallback, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { useAuth } from '../lib/auth';
import { cloudEnabled, fetchAll, mergeHistories, pushRecords } from '../lib/api';

/**
 * Headless: runs a full two-way sync when a token is set and on reconnect, then
 * pushes newly-added answers as the history grows. Renders nothing.
 */
export function CloudSync() {
  const token = useAuth((s) => s.token);
  const enabled = cloudEnabled && !!token;
  const syncedToken = useRef<string | null>(null);
  const inFlight = useRef(false);
  const applyingRemote = useRef(false);

  const runSync = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const remote = await fetchAll();
      const { merged, delta } = mergeHistories(useStore.getState().history, remote);
      applyingRemote.current = true;
      useStore.getState().setHistory(merged);
      applyingRemote.current = false;
      await pushRecords(delta);
    } catch {
      // Offline / bad token: keep working locally, retry on reconnect.
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled || !token) {
      syncedToken.current = null;
      return;
    }
    if (syncedToken.current === token) return;
    syncedToken.current = token;
    void runSync();
  }, [enabled, token, runSync]);

  useEffect(() => {
    if (!enabled) return;
    const onOnline = () => void runSync();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [enabled, runSync]);

  useEffect(() => {
    if (!enabled) return;
    return useStore.subscribe((state, prev) => {
      if (applyingRemote.current || state.history === prev.history) return;
      // recordAnswer only appends; a shrink (reset) pushes nothing.
      const added =
        state.history.length > prev.history.length
          ? state.history.slice(prev.history.length)
          : [];
      if (added.length) void pushRecords(added).catch(() => {});
    });
  }, [enabled]);

  return null;
}
