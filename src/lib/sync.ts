import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useStore, type AnswerRecord } from '../store';

const TABLE = 'answers';

interface Row {
  id: string;
  question_id: string;
  picked_index: number | null;
  correct: boolean;
  ts: number;
}

function toRow(r: AnswerRecord, userId: string) {
  return {
    id: r.id,
    user_id: userId,
    question_id: r.questionId,
    picked_index: r.pickedIndex ?? null,
    correct: r.correct,
    ts: r.ts,
  };
}

function fromRow(row: Row): AnswerRecord {
  return {
    id: row.id,
    questionId: row.question_id,
    pickedIndex: row.picked_index ?? undefined,
    correct: row.correct,
    ts: row.ts,
  };
}

/** Ids already known to exist remotely, so we don't re-push them. */
const synced = new Set<string>();

export function getSession(): Promise<Session | null> {
  if (!supabase) return Promise.resolve(null);
  return supabase.auth.getSession().then(({ data }) => data.session);
}

export function onAuthChange(cb: (session: Session | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_e, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

export async function signIn(email: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Cloud sync is not configured.' };
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + window.location.pathname },
  });
  return error ? { error: error.message } : {};
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
  synced.clear();
}

/**
 * Two-way merge: pull remote rows, union with local by id, write the merged
 * set back into the store, then push any rows the server is missing.
 */
export async function fullSync(userId: string): Promise<void> {
  if (!supabase) return;
  const local = useStore.getState().history;

  const { data, error } = await supabase.from(TABLE).select('*').eq('user_id', userId);
  if (error) throw error;
  const remote = (data ?? []).map((r) => fromRow(r as Row));

  const merged = new Map<string, AnswerRecord>();
  for (const r of [...remote, ...local]) merged.set(r.id, r);
  const mergedList = [...merged.values()].sort((a, b) => a.ts - b.ts);
  useStore.getState().setHistory(mergedList);

  remote.forEach((r) => synced.add(r.id));
  const toPush = mergedList.filter((r) => !synced.has(r.id));
  if (toPush.length) {
    const { error: upErr } = await supabase
      .from(TABLE)
      .upsert(toPush.map((r) => toRow(r, userId)), { onConflict: 'id' });
    if (upErr) throw upErr;
    toPush.forEach((r) => synced.add(r.id));
  }
}

/** Best-effort push of records created since the last sync (called on history change). */
export async function pushNew(userId: string): Promise<void> {
  if (!supabase) return;
  const toPush = useStore.getState().history.filter((r) => !synced.has(r.id));
  if (!toPush.length) return;
  const { error } = await supabase
    .from(TABLE)
    .upsert(toPush.map((r) => toRow(r, userId)), { onConflict: 'id' });
  if (!error) toPush.forEach((r) => synced.add(r.id));
}
