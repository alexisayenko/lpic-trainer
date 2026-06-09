import { ORIGIN_LABELS, type AnswerRecord, type Origin, type Question } from '../types';
import type { Rating } from '../lib/rating';

export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Relative time, e.g. "today", "3 days ago", "2 mo ago". */
export function fmtRel(ts: number): string {
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} mo ago`;
  return `${Math.floor(days / 365)} yr ago`;
}

const ORIGIN_STYLES: Record<string, string> = {
  'linux-direct': 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  'ken-adams': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'gpt-deep-research': 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  'claude-lpic2book': 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
};

export function SourceTag({ origin }: { origin?: Origin }) {
  if (!origin) return null;
  const label = ORIGIN_LABELS[origin] ?? origin;
  const style = ORIGIN_STYLES[origin] ?? 'bg-slate-700/40 text-slate-400 border-slate-600';
  return (
    <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] ${style}`}>{label}</span>
  );
}

const MASTERED = 80;
const LEARNING = 50;

function MasteryChip({ score }: { score: number }) {
  const tone =
    score >= MASTERED
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : score >= LEARNING
        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
        : 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  return (
    <span
      aria-label={`Mastery ${score} of 100`}
      className={`rounded border px-1.5 py-0.5 text-[10px] ${tone}`}
    >
      <span aria-hidden="true">★ {score}</span>
    </span>
  );
}

function ResultBadge({ correct, ts }: { correct: boolean; ts: number }) {
  return (
    <span
      title={fmtDate(ts)}
      className={`cursor-default text-sm leading-none ${correct ? 'text-emerald-400' : 'text-rose-400'}`}
    >
      {correct ? '✓' : '✗'}
    </span>
  );
}

/** Compact attempt history for one question: source · mastery · ✓/✗ badges · wrong/right(%) · when. */
export function QuestionStats({
  q,
  rec,
  attempts,
  rating,
}: {
  q: Question;
  rec?: AnswerRecord;
  attempts?: AnswerRecord[];
  rating?: Rating | null;
}) {
  const badges = attempts && attempts.length ? attempts : rec ? [rec] : [];
  const right = badges.filter((a) => a.correct).length;
  const wrong = badges.length - right;
  const pct = badges.length ? Math.round((right / badges.length) * 100) : null;
  return (
    <div className="flex items-center gap-2 cursor-default">
      {q.origin && <SourceTag origin={q.origin} />}
      <div className="ml-auto flex items-center gap-2">
        {rating && <MasteryChip score={rating.score} />}
        {badges.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="text-slate-500">[</span>
            {badges.map((a, i) => (
              <ResultBadge key={`${a.ts}-${i}`} correct={a.correct} ts={a.ts} />
            ))}
            <span className="text-slate-500">]</span>
            {pct !== null && (
              <span className="text-xs">
                <span className="text-rose-400">{wrong}</span>
                <span className="text-slate-500">/</span>
                <span className="text-emerald-400">
                  {right} ({pct}%)
                </span>
              </span>
            )}
          </span>
        )}
        {rec ? (
          <span className="text-xs text-slate-500" title={fmtDate(rec.ts)}>
            {fmtRel(rec.ts)}
          </span>
        ) : (
          <span className="text-xs text-slate-600 italic">not asked yet</span>
        )}
      </div>
    </div>
  );
}
