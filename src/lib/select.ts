import { OBJECTIVES } from '../types';
import type {
  AnswerRecord,
  MasteryBucket,
  ObjectiveSelection,
  Question,
  ResultSelection,
  SourceSelection,
  ToolSelection,
  WeightSelection,
} from '../types';
import { masteryOf } from './mastery';

/**
 * The dashboard-view-dependent half of the pool predicate: the tool view
 * narrows by tool slug, the objective view by the question's exam objective
 * AND by the objective's LPI weight. Either way an empty selection matches
 * nothing.
 */
export type ScopeSelection =
  | { by: 'tool'; tools: ToolSelection }
  | { by: 'objective'; objectives: ObjectiveSelection; weights: WeightSelection };

function inScope(q: Question, scope: ScopeSelection): boolean {
  if (scope.by === 'tool') return scope.tools.includes(q.tool);
  if (q.objective === undefined || !scope.objectives.includes(q.objective)) return false;
  const weight = OBJECTIVES[q.objective]?.weight;
  return weight !== undefined && scope.weights.includes(weight);
}

/** Latest answer record per question id (last write wins on ties). */
export function lastByQuestion(history: AnswerRecord[]): Map<string, AnswerRecord> {
  const m = new Map<string, AnswerRecord>();
  for (const rec of history) {
    const prev = m.get(rec.questionId);
    if (!prev || rec.ts >= prev.ts) m.set(rec.questionId, rec);
  }
  return m;
}

/** All attempts grouped by question id, each bucket sorted oldest → newest. */
export function attemptsByQuestion(history: AnswerRecord[]): Map<string, AnswerRecord[]> {
  const m = new Map<string, AnswerRecord[]>();
  for (const r of history) {
    const arr = m.get(r.questionId);
    if (arr) arr.push(r);
    else m.set(r.questionId, [r]);
  }
  for (const arr of m.values()) arr.sort((a, b) => a.ts - b.ts);
  return m;
}

/** Attempts for a single question, sorted oldest → newest. */
export function attemptsFor(history: AnswerRecord[], questionId: string): AnswerRecord[] {
  return history.filter((r) => r.questionId === questionId).sort((a, b) => a.ts - b.ts);
}

/**
 * Narrow a pool by source origin, by scope (tool or exam objective, depending
 * on the dashboard view), and by current mastery bucket (each is a
 * multi-selection — a question matches any selected option; an empty
 * selection matches nothing), and optionally to questions not practiced within
 * the last `notPracticedMs` milliseconds (ANDed with the rest; null = no such
 * restriction). Used for the dashboard's "available" count, its per-question
 * list, and the quiz deck so all three agree on one predicate. `now` is one
 * shared snapshot so every question's mastery is computed against the same clock.
 */
export function filterPool(
  pool: Question[],
  attempts: Map<string, AnswerRecord[]>,
  result: ResultSelection,
  source: SourceSelection,
  scope: ScopeSelection,
  notPracticedMs: number | null,
  now: number,
): Question[] {
  return pool.filter((q) => {
    if (!q.origin || !source.includes(q.origin)) return false;
    if (!inScope(q, scope)) return false;
    const atts = attempts.get(q.id);
    if (notPracticedMs !== null && atts?.some((a) => now - a.ts < notPracticedMs)) return false;
    if (!atts || atts.length === 0) return result.includes('unseen');
    const mastery = masteryOf(atts, now);
    return mastery !== null && result.includes(mastery as MasteryBucket);
  });
}

/** Fisher–Yates shuffled copy of `arr`. The deck draws from a filtered pool with
 *  this alone, so question selection and order depend only on the user's filters. */
export function shuffle<T>(arr: readonly T[], rng: () => number = Math.random): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Fisher–Yates shuffled copy of `0..n-1`, used to randomise choice display order. */
export function shuffledIndices(n: number, rng: () => number = Math.random): number[] {
  return shuffle(Array.from({ length: n }, (_, i) => i), rng);
}

/**
 * Sample `size` items balanced across the group each one belongs to, then return
 * them in random order. Groups are drawn round-robin (random group order, random
 * within each group), so the deck spreads as evenly as possible over the groups
 * present in `items`:
 *   - `size` < group count → that many distinct groups, one item each;
 *   - `size` ≥ group count → an equal share per group (±1), with slots from
 *     exhausted groups redistributed to the rest;
 *   - `size` null or ≥ item count → every item.
 */
export function balancedSample<T>(
  items: readonly T[],
  size: number | null,
  groupOf: (item: T) => string,
  rng: () => number = Math.random,
): T[] {
  const groups = new Map<string, T[]>();
  for (const it of items) {
    const arr = groups.get(groupOf(it));
    if (arr) arr.push(it);
    else groups.set(groupOf(it), [it]);
  }
  const buckets = shuffle([...groups.values()], rng).map((g) => shuffle(g, rng));
  const target = size === null ? items.length : Math.min(Math.max(1, size), items.length);

  const out: T[] = [];
  for (let cursor = 0; out.length < target; cursor++) {
    let drew = false;
    for (const bucket of buckets) {
      if (cursor >= bucket.length) continue;
      out.push(bucket[cursor]);
      drew = true;
      if (out.length >= target) break;
    }
    if (!drew) break; // every bucket exhausted
  }
  return shuffle(out, rng);
}
