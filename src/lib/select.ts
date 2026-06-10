import type { AnswerRecord, MasteryBucket, Question, ResultSelection, SourceSelection } from '../types';
import { startOfLocalDay } from './dates';
import { masteryOf } from './mastery';

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
 * Narrow a pool by source origin and by current mastery bucket (both are
 * multi-selections — a question matches any selected option; an empty
 * selection matches nothing), and optionally to questions not yet attempted
 * today (`unseenToday`, ANDed with the rest). Used for the dashboard's
 * "available" count, its per-question list, and the quiz deck so all three
 * agree on one predicate. `now` is one shared snapshot so every question's
 * mastery is computed against the same clock.
 */
export function filterPool(
  pool: Question[],
  attempts: Map<string, AnswerRecord[]>,
  result: ResultSelection,
  source: SourceSelection,
  unseenToday: boolean,
  now: number,
): Question[] {
  const todayStart = startOfLocalDay(now);
  return pool.filter((q) => {
    if (!q.origin || !source.includes(q.origin)) return false;
    const atts = attempts.get(q.id);
    if (unseenToday && atts && atts.some((a) => a.ts >= todayStart)) return false;
    if (!atts || atts.length === 0) return result.includes('unseen');
    const mastery = masteryOf(atts, now);
    return mastery !== null && result.includes(mastery as MasteryBucket);
  });
}

/**
 * Order questions so studying targets weak spots first:
 *   unseen  >  last answer was wrong  >  previously answered correctly.
 * Ties are broken randomly so repeated quizzes vary.
 */
export function orderByWeakness(
  pool: Question[],
  last: Map<string, AnswerRecord>,
  rng: () => number = Math.random,
): Question[] {
  const weight = (q: Question): number => {
    const rec = last.get(q.id);
    if (!rec) return 3; // unseen
    return rec.correct ? 1 : 2; // known correct vs. got it wrong last time
  };

  return [...pool]
    .map((q) => ({ q, score: weight(q) + rng() }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.q);
}

/** Fisher–Yates shuffled copy of `0..n-1`, used to randomise choice display order. */
export function shuffledIndices(n: number, rng: () => number = Math.random): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Take the first `size` questions, or all when `size` is null/too large. */
export function pickDeck(ordered: Question[], size: number | null): Question[] {
  if (size === null || size >= ordered.length) return ordered;
  return ordered.slice(0, Math.max(1, size));
}
