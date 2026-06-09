import type { AnswerRecord } from '../types';

export interface Rating {
  /** 0–100 mastery; high = known and recently confirmed. */
  score: number;
  /** Day-buckets within the window that had activity (for display/tuning). */
  days: number;
  /** Signed sum of day contributions before clamping to 0–100. */
  raw: number;
}

// See docs/rating-formula.md for rationale.
const DAY_GAP = 20 * 3_600_000; // attempts ≥ this far apart are different "days"
const WINDOW_MS = 21 * 86_400_000; // forgetting window, measured from now
const DAY_VALUE = 20; // full value of one clean day ⇒ 5 clean days = 100

/** Mastery rating for one question from its attempt history. null when never asked. */
export function rateQuestion(attempts: AnswerRecord[], now: number): Rating | null {
  if (attempts.length === 0) return null;

  const recent = attempts
    .filter((a) => now - a.ts <= WINDOW_MS)
    .sort((a, b) => a.ts - b.ts); // oldest first

  let raw = 0;
  let days = 0;
  let v = 0; // correct in the current day-bucket
  let x = 0; // wrong in the current day-bucket
  let prevTs = -Infinity;

  // One day's signed share of the majority side: 20·sign(v−x)·max(v,x)/(v+x).
  const flush = () => {
    const n = v + x;
    if (n === 0) return;
    raw += DAY_VALUE * Math.sign(v - x) * (Math.max(v, x) / n);
    days++;
    v = 0;
    x = 0;
  };

  for (const a of recent) {
    if (a.ts - prevTs >= DAY_GAP) flush(); // ≥20h gap starts a new day
    if (a.correct) v++;
    else x++;
    prevTs = a.ts;
  }
  flush();

  const score = Math.round(Math.max(0, Math.min(100, raw)));
  return { score, days, raw };
}
