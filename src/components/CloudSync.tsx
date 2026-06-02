import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { useSession } from '../lib/useSession';
import { fullSync, pushNew } from '../lib/sync';

/**
 * Headless: runs a full two-way sync on sign-in, then pushes new answers as the
 * history grows. Renders nothing.
 */
export function CloudSync() {
  const session = useSession();
  const userId = session?.user.id ?? null;
  const synced = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) {
      synced.current = null;
      return;
    }
    if (synced.current === userId) return;
    synced.current = userId;
    fullSync(userId).catch(() => {
      // Offline or transient error: keep working locally, retry on next sign-in.
    });
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    return useStore.subscribe((state, prev) => {
      if (state.history !== prev.history) pushNew(userId).catch(() => {});
    });
  }, [userId]);

  return null;
}
