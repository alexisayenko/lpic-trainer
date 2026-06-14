import type { ReactNode } from 'react';
import { MASTERY_BUCKETS, MASTERY_TINTS, ORIGIN_LABELS, questionContext, type AnswerRecord, type Origin, type Question } from '../types';
import { STRIP_DAYS, dayCells, type DayStatus } from '../lib/mastery';

export function SourceTag({ origin }: Readonly<{ origin?: Origin }>) {
  if (!origin) return null;
  return (
    <span className="text-[10px] text-slate-500">[{ORIGIN_LABELS[origin] ?? origin}]</span>
  );
}

/** Pennant-shaped badge: one chevron per 20 mastery points, × at 0, empty when unanswered. */
export function MasteryChip({ score }: Readonly<{ score: number | null }>) {
  const unseen = score == null;
  const tone = unseen
    ? 'text-slate-500'
    : MASTERY_TINTS[MASTERY_BUCKETS.find((max) => score <= max) ?? 100].text;
  const filled = unseen ? null : Math.round(score / 20);
  return (
    <span
      aria-label={unseen ? 'Unanswered' : `Mastery ${score} of 100`}
      className={`inline-flex items-center text-xs ${tone}`}
    >
      <svg aria-hidden="true" viewBox="0 0 16 30" className="h-[30px] w-4">
        <path
          d="M0.5 0.5 H15.5 V25 L8 29.5 L0.5 25 Z"
          fill="currentColor"
          fillOpacity="0.2"
          stroke="currentColor"
          strokeWidth="1"
        />
        <ChipGlyph filled={filled} />
      </svg>
    </span>
  );
}

/** Chip interior: nothing when unanswered, × at 0, otherwise a centred chevron stack. */
function ChipGlyph({ filled }: Readonly<{ filled: number | null }>) {
  if (filled == null) return null;
  if (filled === 0) {
    return (
      <path
        d="M5 10 l6 6 M11 10 l-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    );
  }
  return (
    <>
      {Array.from({ length: filled }, (_, i) => (
        <path
          key={i}
          d={`M4 ${5 + ((5 - filled) * 4) / 2 + i * 4} l4 3.5 4 -3.5`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </>
  );
}

const BULLET = (
  <svg viewBox="0 0 24 24" className="h-[0.7em] w-[0.7em]" fill="currentColor">
    <circle cx="12" cy="12" r="7" />
  </svg>
);

const CELL_GLYPH: Record<DayStatus, ReactNode> = {
  none: '·',
  correct: BULLET,
  wrong: BULLET,
};
const CELL_TONE: Record<DayStatus, string> = {
  none: 'text-slate-600',
  correct: 'text-emerald-400',
  wrong: MASTERY_TINTS[0].text,
};

function DayStrip({ cells }: Readonly<{ cells: DayStatus[] }>) {
  return (
    <span aria-label={`Last ${STRIP_DAYS} days`} className="inline-flex items-center text-[14px] leading-none">
      {cells.map((c, i) => (
        <span
          key={i}
          className={`flex h-[14px] w-[10px] items-center justify-center ${CELL_TONE[c]} ${c === 'none' ? '' : 'scale-[1.25]'}`}
        >
          {CELL_GLYPH[c]}
        </span>
      ))}
    </span>
  );
}

/** Question-card header: context line, source + id on the left; day strip and mastery chip on the right. */
export function QuestionCardHeader({
  q,
  attempts,
  mastery,
  titleClassName,
}: Readonly<{
  q: Question;
  attempts?: AnswerRecord[];
  mastery?: number | null;
  titleClassName: string;
}>) {
  const cells = dayCells(attempts ?? [], Date.now());
  return (
    <div className="relative flex cursor-default flex-col gap-1 pr-6 sm:flex-row sm:items-start sm:gap-2 sm:pr-0">
      <div className="flex-1">
        <div className={titleClassName}>{questionContext(q)}</div>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
          {q.origin && <SourceTag origin={q.origin} />}
          <span>[{q.id}]</span>
        </div>
      </div>
      <DayStrip cells={cells} />
      <span className="absolute right-0 top-0 sm:static sm:shrink-0">
        <MasteryChip score={mastery ?? null} />
      </span>
    </div>
  );
}
