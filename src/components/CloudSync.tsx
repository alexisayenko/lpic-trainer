import { useCallback, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { useAuth } from '../lib/auth';
import { cloudEnabled, deleteAll, fetchAll, mergeHistories, pushRecords } from '../lib/api';

// Set while a reset is wiping both sides. Only one CloudSync is ever mounted, so
// a module flag is enough to keep a concurrent sync from resurrecting the stats:
// runSync re-checks it after its fetch, and the push subscription skips it.
let suppressed = false;

/**
 * Clear local history and (when connected) the remote table as one coordinated
 * step, so an in-flight or reconnect sync can't merge the old rows back in.
 * Awaits the remote delete so the caller can surface a failure.
 */
export async function clearAllStats(): Promise<void> {
  suppressed = true;
  try {
    useStore.getState().reset();
    if (cloudEnabled && useAuth.getState().token) await deleteAll();
  } finally {
    suppressed = false;
  }
}

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
    if (inFlight.current || suppressed) return;
    inFlight.current = true;
    try {
      const remote = await fetchAll();
      if (suppressed) return; // a reset started while we were fetching
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
      if (applyingRemote.current || suppressed || state.history === prev.history) return;
      // Push any record whose id wasn't present before; identity-based so it
      // survives reorders/inserts, and a shrink (reset) yields nothing.
      const prevIds = new Set(prev.history.map((r) => r.id));
      const added = state.history.filter((r) => !prevIds.has(r.id));
      if (added.length) void pushRecords(added).catch(() => {});
    });
  }, [enabled]);

  return null;
}
