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

/** Fetch all remote records. */
export async function fetchAll(): Promise<AnswerRecord[]> {
  const res = await req('/answers');
  const rows = (await res.json()) as Row[];
  return rows.map(fromRow);
}

/** Upload is idempotent: the server upserts by id and keeps the record with the newer `ts`. */
export async function pushRecords(records: AnswerRecord[]): Promise<void> {
  if (!records.length) return;
  await req('/answers', { method: 'POST', body: JSON.stringify(records.map(toRow)) });
}

/** Wipe remote stats (paired with the local reset). */
export async function deleteAll(): Promise<void> {
  await req('/answers', { method: 'DELETE' });
}

/**
 * Pure merge of two record sets by id, keeping the newer `ts` on collision.
 * Returns the merged list (sorted by ts) plus the delta the remote lacks or
 * holds an older copy of. Orchestration (store reads/writes) lives in CloudSync.
 */
export function mergeHistories(
  local: AnswerRecord[],
  remote: AnswerRecord[],
): { merged: AnswerRecord[]; delta: AnswerRecord[] } {
  const remoteById = new Map(remote.map((r) => [r.id, r]));
  const merged = new Map<string, AnswerRecord>();
  for (const r of remote) merged.set(r.id, r);
  for (const r of local) {
    const prev = merged.get(r.id);
    if (!prev || r.ts >= prev.ts) merged.set(r.id, r);
  }
  const mergedList = [...merged.values()].sort((a, b) => a.ts - b.ts);
  const delta = mergedList.filter((r) => {
    const rem = remoteById.get(r.id);
    return !rem || r.ts > rem.ts;
  });
  return { merged: mergedList, delta };
}
