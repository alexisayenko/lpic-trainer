export const MS_PER_DAY = 86_400_000;

/** Midnight of the local calendar day containing `ts`, in ms. */
export function startOfLocalDay(ts: number): number {
  return new Date(ts).setHours(0, 0, 0, 0);
}

/** Calendar-day difference from `ts` back to `now` (Math.round absorbs DST hour shifts). */
export function daysBack(ts: number, now: number): number {
  return Math.round((startOfLocalDay(now) - startOfLocalDay(ts)) / MS_PER_DAY);
}
