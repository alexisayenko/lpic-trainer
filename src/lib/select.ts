import type { Question } from '../types';
import type { AnswerRecord } from '../store';

/**
 * Order questions so studying targets weak spots first:
 *   unseen  >  last answer was wrong  >  previously answered correctly.
 * Ties are broken randomly so repeated quizzes vary.
 */
export function orderByWeakness(pool: Question[], history: AnswerRecord[]): Question[] {
  const lastById = new Map<string, AnswerRecord>();
  for (const rec of history) {
    const prev = lastById.get(rec.questionId);
    if (!prev || rec.ts >= prev.ts) lastById.set(rec.questionId, rec);
  }

  const weight = (q: Question): number => {
    const last = lastById.get(q.id);
    if (!last) return 3; // unseen
    return last.correct ? 1 : 2; // known correct vs. got it wrong last time
  };

  return [...pool]
    .map((q) => ({ q, score: weight(q) + Math.random() }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.q);
}

/** Take the first `size` questions, or all when `size` is null/too large. */
export function pickDeck(ordered: Question[], size: number | null): Question[] {
  if (size === null || size >= ordered.length) return ordered;
  return ordered.slice(0, Math.max(1, size));
}
