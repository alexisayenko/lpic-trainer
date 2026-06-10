import { ORIGIN_LABELS, type AnswerRecord, type Origin, type Question } from '../types';
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

const MASTERY_RAMP: [number, string][] = [
  [0, 'bg-red-500/15 text-red-300 border-red-500/30'],
  [20, 'bg-orange-500/15 text-orange-300 border-orange-500/30'],
  [40, 'bg-amber-400/15 text-amber-300 border-amber-400/30'],
  [60, 'bg-yellow-300/15 text-yellow-300 border-yellow-300/30'],
  [80, 'bg-lime-400/15 text-lime-300 border-lime-400/30'],
  [100, 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'],
];

function MasteryChip({ score }: { score: number }) {
  const tone = (MASTERY_RAMP.find(([max]) => score <= max) ?? MASTERY_RAMP[5])[1];
  return (
    <span
      aria-label={`Mastery ${score} of 100`}
      className={`rounded border px-1.5 py-0.5 text-[10px] ${tone}`}
    >
      <span aria-hidden="true" className="inline-flex items-center gap-1">
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
          <path d="M9 2 7 8l3 2 2-8H9z" opacity=".6" />
          <path d="M15 2l2 6-3 2-2-8h3z" opacity=".8" />
          <circle cx="12" cy="15" r="5" />
        </svg>
        {score}
      </span>
    </span>
  );
}

const CELL_GLYPH: Record<DayStatus, string> = { none: '·', correct: '✓', wrong: '✗' };
const CELL_TONE: Record<DayStatus, string> = {
  none: 'text-slate-600',
  correct: 'text-emerald-400',
  wrong: 'text-rose-400',
};

function DayStrip({ cells }: { cells: DayStatus[] }) {
  return (
    <span
      aria-label={`Last ${STRIP_DAYS} days`}
      className="font-mono text-xs leading-none tracking-tight"
    >
      {cells.map((c, i) => (
        <span key={i} className={CELL_TONE[c]}>
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
}: {
  q: Question;
  attempts?: AnswerRecord[];
  mastery?: number | null;
}) {
  const cells = dayCells(attempts ?? [], Date.now());
  return (
    <div className="flex items-center gap-2 cursor-default">
      <DayStrip cells={cells} />
      {mastery != null && <MasteryChip score={mastery} />}
      <div className="ml-auto flex items-center gap-2">
        {q.origin && <SourceTag origin={q.origin} />}
        <span className="text-[10px] text-slate-500">[{q.id}]</span>
      </div>
    </div>
  );
}
