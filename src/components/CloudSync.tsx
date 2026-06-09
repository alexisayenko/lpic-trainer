import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { useAuth } from '../lib/auth';
import { cloudEnabled, fullSync, pushRecords } from '../lib/api';

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
      // Offline / bad token: keep working locally, retry on reconnect or next change.
    });
  }, [enabled, token]);

  // Reconcile when connectivity returns, recovering any pushes dropped while offline.
  useEffect(() => {
    if (!enabled) return;
    const onOnline = () => fullSync().catch(() => {});
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    return useStore.subscribe((state, prev) => {
      if (state.history === prev.history) return;
      const prevIds = new Set(prev.history.map((r) => r.id));
      const added = state.history.filter((r) => !prevIds.has(r.id));
      if (added.length) pushRecords(added).catch(() => {});
    });
  }, [enabled]);

  return null;
}
