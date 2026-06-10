import type { AnswerRecord } from '../types';

// See docs/mastery-formula.md for rationale.
const DAY_GAP = 21 * 3_600_000; // attempts ≥ this far apart AND on different local dates are different QuizDays
const WINDOW_MS = 21 * 86_400_000; // forgetting window, measured from now
const SLOTS = 5; // last N QuizDays scored; missing slots count as wrong

export const MASTERED = 80;
export const LEARNING = 50;

/** Days shown in the per-question strip (matches the mastery WINDOW_MS). */
export const STRIP_DAYS = 21;

export type DayStatus = 'none' | 'correct' | 'wrong';

/**
 * Aggregate attempts into the last STRIP_DAYS calendar-day buckets, oldest → newest.
 * A day with any wrong attempt is 'wrong'; only-correct is 'correct'; otherwise 'none'.
 */
export function dayCells(attempts: AnswerRecord[], now: number): DayStatus[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();
  const cells: DayStatus[] = Array(STRIP_DAYS).fill('none');
  for (const a of attempts) {
    const offset = Math.floor((todayMs - new Date(a.ts).setHours(0, 0, 0, 0)) / 86_400_000);
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
    const newDate = new Date(a.ts).setHours(0, 0, 0, 0) !== new Date(prevTs).setHours(0, 0, 0, 0);
    if (quizDays.length === 0 || (a.ts - prevTs >= DAY_GAP && newDate)) quizDays.push(true);
    if (!a.correct) quizDays[quizDays.length - 1] = false;
    prevTs = a.ts;
  }

  const last = quizDays.slice(-SLOTS);
  const correct = last.filter(Boolean).length;
  return Math.round((correct / SLOTS) * 100);
}
