import { MASTERY_BUCKETS, MASTERY_TINTS, type AnswerRecord } from '../types';
import { daysBack, startOfLocalDay } from './dates';

// See docs/mastery-formula.md for rationale.
export const DAY_GAP = 21 * 3_600_000; // attempts ≥ this far apart AND on different local dates are different QuizDays
const WINDOW_MS = 21 * 86_400_000; // forgetting window, measured from now
const SLOTS = 5; // last N QuizDays scored; missing slots count as wrong

/** Days shown in the per-question strip (matches the mastery WINDOW_MS). */
export const STRIP_DAYS = 21;

export type DayStatus = 'none' | 'correct' | 'wrong';

/**
 * Aggregate attempts into the last STRIP_DAYS calendar-day buckets, oldest → newest.
 * A day with any wrong attempt is 'wrong'; only-correct is 'correct'; otherwise 'none'.
 */
export function dayCells(attempts: AnswerRecord[], now: number): DayStatus[] {
  const cells: DayStatus[] = new Array(STRIP_DAYS).fill('none');
  for (const a of attempts) {
    const offset = daysBack(a.ts, now);
    if (offset < 0 || offset >= STRIP_DAYS) continue;
    const i = STRIP_DAYS - 1 - offset;
    if (cells[i] === 'wrong') continue;
    cells[i] = a.correct ? 'correct' : 'wrong';
  }
  return cells;
}

/** 0–100 mastery for one question from its attempt history. null when never asked. */
export function masteryOf(attempts: AnswerRecord[], now: number): number | null {
  if (attempts.length === 0) return null;

  const recent = attempts
    .filter((a) => now - a.ts <= WINDOW_MS)
    .sort((a, b) => a.ts - b.ts);

  // Collapse attempts into QuizDays: any wrong attempt makes the whole day wrong.
  const quizDays: boolean[] = [];
  let prevTs = -Infinity;
  for (const a of recent) {
    const newDate = startOfLocalDay(a.ts) !== startOfLocalDay(prevTs);
    if (quizDays.length === 0 || (a.ts - prevTs >= DAY_GAP && newDate)) quizDays.push(true);
    if (!a.correct) quizDays[quizDays.length - 1] = false;
    prevTs = a.ts;
  }

  const last = quizDays.slice(-SLOTS);
  const correct = last.filter(Boolean).length;
  return Math.round((correct / SLOTS) * 100);
}

export interface MasterySegment {
  key: string;
  n: number;
  cls: string;
  txt: string;
  score: number | null;
  title: string;
}

/** Unanswered-first segments for a stacked mastery bar (overall, topic and tool rows). */
export function masterySegments(total: number, buckets: Map<number, number> | undefined): MasterySegment[] {
  const segments: MasterySegment[] = MASTERY_BUCKETS.map((score) => {
    const n = buckets?.get(score) ?? 0;
    const t = MASTERY_TINTS[score];
    return { key: `m${score}`, n, cls: t.bar, txt: t.on, score, title: `${n} × ${score}%` };
  });
  const unseen = total - segments.reduce((acc, seg) => acc + seg.n, 0);
  segments.unshift({
    key: 'unseen',
    n: unseen,
    cls: 'border border-slate-400 bg-slate-400/25',
    txt: 'text-slate-200',
    score: null,
    title: `${unseen} unanswered`,
  });
  return segments;
}
