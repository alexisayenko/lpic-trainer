import type { AnswerRecord } from '../types';

export interface Rating {
  /** 0–100 mastery; high = well known. */
  score: number;
  /** Sub-scores, each 0–1, for display/tuning. */
  accuracy: number;
  exposure: number;
  recency: number;
  streak: number;
}

// See docs/rating-formula.md for rationale.
const DECAY = 0.7; // each older attempt counts this fraction of the next-newer one
const ENOUGH = 5; // attempts beyond this add no further exposure confidence
const FRESH_DAYS = 30; // recency decays linearly to 0 over this many days
const STREAK_CAP = 5; // consecutive corrects past this give no extra bonus
const STREAK_BONUS = 0.1; // max additive bonus from a full streak

const W_ACCURACY = 0.5;
const W_RECENCY = 0.3;
const W_EXPOSURE = 0.2;

/** Mastery rating for one question from its attempt history. null when never asked. */
export function rateQuestion(attempts: AnswerRecord[], now: number): Rating | null {
  const n = attempts.length;
  if (n === 0) return null;

  const recent = [...attempts].sort((a, b) => b.ts - a.ts); // newest first

  // Recency-weighted accuracy: recent attempts dominate via geometric decay.
  let wSum = 0;
  let wHit = 0;
  let w = 1;
  for (const a of recent) {
    wSum += w;
    if (a.correct) wHit += w;
    w *= DECAY;
  }
  const accuracy = wHit / wSum;

  const exposure = Math.min(n, ENOUGH) / ENOUGH;

  const days = (now - recent[0].ts) / 86_400_000;
  const recency = Math.max(0, 1 - days / FRESH_DAYS);

  let run = 0;
  for (const a of recent) {
    if (!a.correct) break;
    run++;
  }
  const streak = Math.min(run, STREAK_CAP) / STREAK_CAP;

  const raw =
    W_ACCURACY * accuracy +
    W_RECENCY * recency +
    W_EXPOSURE * exposure +
    STREAK_BONUS * streak;

  return { score: Math.round(100 * Math.min(1, raw)), accuracy, exposure, recency, streak };
}
