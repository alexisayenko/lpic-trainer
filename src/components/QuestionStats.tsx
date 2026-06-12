import type { ReactNode } from 'react';
import { MASTERY_BUCKETS, MASTERY_TINTS, ORIGIN_LABELS, type AnswerRecord, type Origin, type Question } from '../types';
import { STRIP_DAYS, dayCells, type DayStatus } from '../lib/mastery';

const ORIGIN_STYLES: Record<string, string> = {
  'linux-direct': 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  'ken-adams': 'bg-black/40 text-white border-purple-500/40',
  'gpt-deep-research': 'bg-white/15 text-white border-white/30',
  'claude-lpic2book': 'bg-orange-500/15 text-orange-300 border-orange-500/30',
};

export function SourceTag({ origin }: { origin?: Origin }) {
  if (!origin) return null;
  const label = ORIGIN_LABELS[origin] ?? origin;
  const style = ORIGIN_STYLES[origin] ?? 'bg-slate-700/40 text-slate-400 border-slate-600';
  return (
    <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] ${style}`}>{label}</span>
  );
}

export function MasteryChip({ score, count }: { score: number; count?: number }) {
  const tint = MASTERY_TINTS[MASTERY_BUCKETS.find((max) => score <= max) ?? 100];
  const filled = Math.round(score / 20);
  return (
    <span
      aria-label={count != null ? `Mastery ${score} of 100, ${count} questions` : `Mastery ${score} of 100`}
      className={`inline-flex items-center gap-0.5 text-xs ${tint.text}`}
    >
      <span aria-hidden="true" className="inline-flex flex-col items-center">
        {Array.from({ length: filled || 1 }, (_, i) => (
          <svg
            key={i}
            viewBox="0 0 24 24"
            className={`h-2.5 w-3 ${i > 0 ? '-mt-[7px]' : ''} ${filled === 0 ? 'opacity-30' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 8l8 8 8-8" />
          </svg>
        ))}
      </span>
      {count != null && <span className="text-slate-400">{count}</span>}
    </span>
  );
}

export function UnseenChip({ count }: { count: number }) {
  return (
    <span aria-label={`Unseen, ${count} questions`} className="inline-flex items-center text-xs text-slate-400">
      <span aria-hidden="true" className="inline-flex items-center gap-0.5 leading-none">
        <span className="text-slate-500">unseen</span>
        {count}
      </span>
    </span>
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
  wrong: 'text-[#a4434b]',
};

function DayStrip({ cells }: { cells: DayStatus[] }) {
  return (
    <span aria-label={`Last ${STRIP_DAYS} days`} className="inline-flex items-center text-[14px] leading-none">
      {cells.map((c, i) => (
        <span
          key={i}
          className={`flex h-[14px] w-[10px] items-center justify-center ${CELL_TONE[c]} ${c !== 'none' ? 'scale-[1.25]' : ''}`}
        >
          {CELL_GLYPH[c]}
        </span>
      ))}
    </span>
  );
}

/** Compact attempt history for one question: 21-day strip · mastery · source. */
export function QuestionStats({
  q,
  attempts,
  mastery,
  showSource = true,
}: {
  q: Question;
  attempts?: AnswerRecord[];
  mastery?: number | null;
  showSource?: boolean;
}) {
  const cells = dayCells(attempts ?? [], Date.now());
  return (
    <div className="flex items-center gap-2 cursor-default">
      <DayStrip cells={cells} />
      {mastery != null && <MasteryChip score={mastery} />}
      {showSource && (
        <div className="ml-auto flex flex-col items-end gap-0.5">
          {q.origin && <SourceTag origin={q.origin} />}
          <span className="text-[10px] text-slate-500">[{q.id}]</span>
        </div>
      )}
    </div>
  );
}
