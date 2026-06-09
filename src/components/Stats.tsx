import { useMemo, useState } from 'react';
import { QUESTIONS } from '../data/questions/index';
import { useStore, type AnswerRecord } from '../store';
import { TOPIC_LABELS, topicOf, type Question, type Topic } from '../types';
import { Account } from './Account';

const ALL_TOPICS = Object.keys(TOPIC_LABELS) as Topic[];

type Mode = 'question' | 'timeline';
type Filter = 'all' | 'correct' | 'wrong';

const byId = new Map(QUESTIONS.map((q) => [q.id, q]));

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Relative time, e.g. "today", "3 days ago", "2 mo ago". */
function fmtRel(ts: number): string {
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} mo ago`;
  return `${Math.floor(days / 365)} yr ago`;
}

function ResultBadge({ correct, ts }: { correct: boolean; ts: number }) {
  return (
    <span
      title={fmtDate(ts)}
      className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded px-1 text-[11px] font-bold text-white ${
        correct ? 'bg-emerald-600' : 'bg-rose-600'
      }`}
    >
      {correct ? '✓' : '✗'}
    </span>
  );
}

/** Latest record per question id. */
function lastByQuestion(history: AnswerRecord[]): Map<string, AnswerRecord> {
  const m = new Map<string, AnswerRecord>();
  for (const r of history) {
    const prev = m.get(r.questionId);
    if (!prev || r.ts >= prev.ts) m.set(r.questionId, r);
  }
  return m;
}

function AnswerLine({
  q,
  rec,
  attempts,
}: {
  q: Question;
  rec: AnswerRecord;
  attempts?: AnswerRecord[];
}) {
  const type = q.type ?? 'single';
  const correctText =
    type === 'fill'
      ? q.answer
      : type === 'multi'
        ? (q.answerIndices ?? []).map((i) => q.choices?.[i]).join(', ')
        : q.choices?.[q.answerIndex ?? -1];
  const yours = type === 'single' && rec.pickedIndex != null ? q.choices?.[rec.pickedIndex] : undefined;
  // In by-question mode `attempts` holds the full history (oldest→newest); in
  // timeline mode it's absent and we show just this single attempt's result.
  const badges = attempts && attempts.length ? attempts : [rec];
  return (
    <div
      className={`p-3 rounded-md border ${
        rec.correct ? 'border-emerald-700 bg-emerald-900/20' : 'border-rose-700 bg-rose-900/20'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-200 leading-snug">{q.prompt}</p>
        <span className="shrink-0 text-xs text-slate-500" title={fmtDate(rec.ts)}>
          {fmtRel(rec.ts)}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {badges.map((a, i) => (
          <ResultBadge key={`${a.ts}-${i}`} correct={a.correct} ts={a.ts} />
        ))}
      </div>
      {!rec.correct && yours !== undefined && (
        <p className="mt-2 text-xs text-rose-300">You answered: {yours}</p>
      )}
      {correctText && <p className="mt-1 text-xs text-emerald-300">Correct: {correctText}</p>}
    </div>
  );
}

export function Stats({ onExit }: { onExit: () => void }) {
  const history = useStore((s) => s.history);

  const [mode, setMode] = useState<Mode>('question');
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<Topic | null>(null);

  const last = useMemo(() => lastByQuestion(history), [history]);

  // All attempts per question, oldest→newest, for the by-question history strip.
  const attemptsByQ = useMemo(() => {
    const m = new Map<string, AnswerRecord[]>();
    for (const r of [...history].sort((a, b) => a.ts - b.ts)) {
      const arr = m.get(r.questionId) ?? [];
      arr.push(r);
      m.set(r.questionId, arr);
    }
    return m;
  }, [history]);

  // Per-topic aggregates.
  const perTopic = useMemo(() => {
    const totals = new Map<Topic, number>();
    for (const q of QUESTIONS) {
      const t = topicOf(q);
      if (t) totals.set(t, (totals.get(t) ?? 0) + 1);
    }
    return ALL_TOPICS.map((t) => {
      const attempts = history.filter((r) => {
        const q = byId.get(r.questionId);
        return q && topicOf(q) === t;
      });
      const seen = new Set(attempts.map((r) => r.questionId)).size;
      const correctNow = [...last.values()].filter((r) => {
        const q = byId.get(r.questionId);
        return q && topicOf(q) === t && r.correct;
      }).length;
      const total = totals.get(t) ?? 0;
      const wrongNow = seen - correctNow;
      return {
        topic: t,
        total,
        seen,
        correctNow,
        wrongNow,
        askedAccuracy: seen ? Math.round((correctNow / seen) * 100) : null,
        correctPct: total ? (correctNow / total) * 100 : 0,
        wrongPct: total ? (wrongNow / total) * 100 : 0,
      };
    });
  }, [history, last]);

  // Rows for the currently-open topic, respecting mode + filter.
  const rows = useMemo(() => {
    if (!open) return [];
    const inTopic = (qid: string) => {
      const q = byId.get(qid);
      return q && topicOf(q) === open;
    };
    if (mode === 'question') {
      return [...last.values()]
        .filter((r) => inTopic(r.questionId))
        .filter((r) => (filter === 'all' ? true : filter === 'correct' ? r.correct : !r.correct))
        .sort((a, b) => b.ts - a.ts);
    }
    return history
      .filter((r) => inTopic(r.questionId))
      .filter((r) => (filter === 'all' ? true : filter === 'correct' ? r.correct : !r.correct))
      .sort((a, b) => b.ts - a.ts);
  }, [open, mode, filter, last, history]);

  const totalAttempts = history.length;
  const totalCorrect = history.filter((r) => r.correct).length;
  const overallPct = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-100">Statistics</h1>
        <button
          type="button"
          onClick={onExit}
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          ← Back
        </button>
      </header>

      <div className="p-4 rounded-md bg-slate-800/40 border border-slate-700">
        <Account />
      </div>

      {totalAttempts === 0 ? (
        <p className="text-slate-400">No answers recorded yet. Take a quiz first.</p>
      ) : (
        <>
          <div className="p-4 rounded-md bg-slate-800/60 border border-slate-700">
            <p className="text-slate-300">
              <span className="text-slate-100 font-medium">{totalCorrect}</span> /{' '}
              {totalAttempts} answers correct
              <span className="text-slate-400"> ({overallPct}%)</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <div className="flex rounded-md overflow-hidden border border-slate-700">
              {(['question', 'timeline'] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`px-3 py-1.5 ${
                    mode === m ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {m === 'question' ? 'By question' : 'Timeline'}
                </button>
              ))}
            </div>
            <div className="flex rounded-md overflow-hidden border border-slate-700">
              {(['all', 'correct', 'wrong'] as Filter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 capitalize ${
                    filter === f ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <ul className="space-y-2">
            {perTopic.map((s) => {
              const isOpen = open === s.topic;
              return (
                <li key={s.topic} className="rounded-md border border-slate-700 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : s.topic)}
                    className="w-full p-3 bg-slate-800/60 hover:bg-slate-800 text-left space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-200">
                        <span className="text-slate-500 mr-2">{s.topic}</span>
                        {TOPIC_LABELS[s.topic]}
                      </span>
                      <span className="shrink-0 text-sm text-slate-400">
                        asked {s.seen}/{s.total}
                      </span>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden bg-slate-700">
                      <div className="bg-emerald-500" style={{ width: `${s.correctPct}%` }} />
                      <div className="bg-rose-500" style={{ width: `${s.wrongPct}%` }} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="text-rose-400">✗ {s.wrongNow} wrong</span>
                      <span className="text-emerald-400">
                        ✓ {s.correctNow} correct
                        {s.askedAccuracy !== null && ` (${s.askedAccuracy}%)`}
                      </span>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="p-3 space-y-2 bg-slate-900/40">
                      {rows.length === 0 ? (
                        <p className="text-sm text-slate-500">No matching answers.</p>
                      ) : (
                        rows.map((r, i) => {
                          const q = byId.get(r.questionId);
                          return q ? (
                            <AnswerLine
                              key={`${r.questionId}-${r.ts}-${i}`}
                              q={q}
                              rec={r}
                              attempts={mode === 'question' ? attemptsByQ.get(r.questionId) : undefined}
                            />
                          ) : null;
                        })
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

        </>
      )}
    </div>
  );
}
