import type { AnswerRecord, Question, ResultFilter, SourceFilter } from '../types';

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
 * Narrow a pool by source origin and by last-answer result.
 * Used for the dashboard's "available" count, its per-question list, and the
 * quiz deck so all three agree on one predicate.
 */
export function filterPool(
  pool: Question[],
  last: Map<string, AnswerRecord>,
  result: ResultFilter,
  source: SourceFilter,
): Question[] {
  return pool.filter((q) => {
    if (source !== 'all' && q.origin !== source) return false;
    if (result === 'all') return true;
    const rec = last.get(q.id);
    if (result === 'unseen') return !rec;
    if (!rec) return false;
    return result === 'correct' ? rec.correct : !rec.correct;
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

/** Take the first `size` questions, or all when `size` is null/too large. */
export function pickDeck(ordered: Question[], size: number | null): Question[] {
  if (size === null || size >= ordered.length) return ordered;
  return ordered.slice(0, Math.max(1, size));
}
