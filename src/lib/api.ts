import { useStore } from '../store';
import type { AnswerRecord } from '../types';
import { useAuth } from './auth';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');

/** Cloud sync is available only when an API base URL was built in. */
export const cloudEnabled = !!API_URL;

interface Row {
  id: string;
  question_id: string;
  picked_index: number | null;
  correct: boolean | number;
  ts: number;
}

function toRow(r: AnswerRecord): Row {
  return {
    id: r.id,
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
    correct: !!row.correct,
    ts: row.ts,
  };
}

function headers(): HeadersInit {
  const token = useAuth.getState().token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function req(path: string, init?: RequestInit): Promise<Response> {
  if (!API_URL) throw new Error('Sync is not configured.');
  const res = await fetch(API_URL + path, { ...init, headers: headers() });
  if (res.status === 401) throw new Error('Invalid sync token.');
  if (!res.ok) throw new Error(`Sync failed (${res.status}).`);
  return res;
}

/** Verify the current token by hitting an authenticated endpoint. */
export async function checkToken(): Promise<void> {
  await req('/answers');
}

/** Ids known to exist remotely, so we don't re-push them. */
const synced = new Set<string>();

async function fetchAll(): Promise<AnswerRecord[]> {
  const res = await req('/answers');
  const rows = (await res.json()) as Row[];
  return rows.map(fromRow);
}

async function upload(records: AnswerRecord[]): Promise<void> {
  if (!records.length) return;
  await req('/answers', { method: 'POST', body: JSON.stringify(records.map(toRow)) });
  records.forEach((r) => synced.add(r.id));
}

/** Pull remote, union with local by id, write back, then push what's missing. */
export async function fullSync(): Promise<void> {
  const local = useStore.getState().history;
  const remote = await fetchAll();

  const merged = new Map<string, AnswerRecord>();
  for (const r of [...remote, ...local]) merged.set(r.id, r);
  const mergedList = [...merged.values()].sort((a, b) => a.ts - b.ts);
  useStore.getState().setHistory(mergedList);

  remote.forEach((r) => synced.add(r.id));
  await upload(mergedList.filter((r) => !synced.has(r.id)));
}

/** Best-effort push of records created since the last sync. */
export async function pushNew(): Promise<void> {
  await upload(useStore.getState().history.filter((r) => !synced.has(r.id)));
}

/** Wipe remote stats (paired with the local reset). */
export async function deleteAll(): Promise<void> {
  await req('/answers', { method: 'DELETE' });
  synced.clear();
}
