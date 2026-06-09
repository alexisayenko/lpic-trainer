import { useMemo, useState } from 'react';
import { QUESTIONS } from '../data/questions/index';
import { useStore, type AnswerRecord } from '../store';
import { TOPIC_LABELS, topicOf, type Question, type Topic } from '../types';
import { Account } from './Account';
import logo from '../assets/logo.png';

const ALL_TOPICS = Object.keys(TOPIC_LABELS) as Topic[];

type Filter = 'all' | 'correct' | 'wrong' | 'unseen';

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
      className={`cursor-default text-sm leading-none ${correct ? 'text-emerald-400' : 'text-rose-400'}`}
    >
      {correct ? '✓' : '✗'}
    </span>
  );
}

const ORIGIN_LABELS: Record<string, string> = {
  'linux-direct': 'Linux Direct',
  'ken-adams': 'Ken Adams',
  'gpt-deep-research': 'GPT',
  'claude-lpic2book': 'Claude',
};

const ORIGIN_STYLES: Record<string, string> = {
  'linux-direct': 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  'ken-adams': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'gpt-deep-research': 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  'claude-lpic2book': 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
};

function SourceTag({ origin }: { origin?: string }) {
  if (!origin) return null;
  const label = ORIGIN_LABELS[origin] ?? origin;
  const style = ORIGIN_STYLES[origin] ?? 'bg-slate-700/40 text-slate-400 border-slate-600';
  return (
    <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] ${style}`}>{label}</span>
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
  rec?: AnswerRecord;
  attempts?: AnswerRecord[];
}) {
  const type = q.type ?? 'single';
  const correctText =
    type === 'fill'
      ? q.answer
      : type === 'multi'
        ? (q.answerIndices ?? []).map((i) => q.choices?.[i]).join(', ')
        : q.choices?.[q.answerIndex ?? -1];
  const yours =
    type === 'single' && rec?.pickedIndex != null ? q.choices?.[rec.pickedIndex] : undefined;
  const badges = attempts && attempts.length ? attempts : rec ? [rec] : [];
  const right = badges.filter((a) => a.correct).length;
  const wrong = badges.length - right;
  const pct = badges.length ? Math.round((right / badges.length) * 100) : null;
  const border = !rec
    ? 'border-slate-700 bg-slate-800/20'
    : rec.correct
      ? 'border-emerald-700 bg-emerald-900/20'
      : 'border-rose-700 bg-rose-900/20';
  return (
    <div className={`p-3 rounded-md border ${border}`}>
      <div className="flex items-center gap-2 cursor-default">
        {q.origin && <SourceTag origin={q.origin} />}
        <div className="ml-auto flex items-center gap-2">
          {badges.length > 0 && (
            <span className="flex items-center gap-1">
              {badges.map((a, i) => (
                <ResultBadge key={`${a.ts}-${i}`} correct={a.correct} ts={a.ts} />
              ))}
              {pct !== null && (
                <span className="text-xs">
                  <span className="text-slate-500"> | </span>
                  <span className="text-rose-400">{wrong}</span>
                  <span className="text-slate-500">/</span>
                  <span className="text-emerald-400">{right} ({pct}%)</span>
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
      <p className="mt-2 text-sm text-slate-200 leading-snug">{q.prompt}</p>
      {rec && !rec.correct && yours !== undefined && (
        <p className="mt-2 text-xs text-rose-300">You answered: {yours}</p>
      )}
      {correctText && <p className="mt-1 text-xs text-emerald-300">Correct: {correctText}</p>}
    </div>
  );
}

export function Dashboard({ onStart }: { onStart: () => void }) {
  const history = useStore((s) => s.history);
  const selected = useStore((s) => s.selectedTopics);
  const setTopics = useStore((s) => s.setTopics);
  const quizSize = useStore((s) => s.quizSize);
  const setQuizSize = useStore((s) => s.setQuizSize);

  const [filter, setFilter] = useState<Filter>('all');
  const [source, setSource] = useState<string>('all');
  const [open, setOpen] = useState<Topic | null>(null);

  const isOn = (t: Topic) => selected === null || selected.includes(t);
  const toggleTopic = (t: Topic) => {
    const current = selected ?? ALL_TOPICS;
    const next = current.includes(t) ? current.filter((x) => x !== t) : [...current, t];
    setTopics(next.length === ALL_TOPICS.length ? null : next);
  };

  const available = useMemo(
    () => QUESTIONS.filter((q) => { const t = topicOf(q); return t !== undefined && isOn(t); }).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected],
  );

  const last = useMemo(() => lastByQuestion(history), [history]);

  const attemptsByQ = useMemo(() => {
    const m = new Map<string, AnswerRecord[]>();
    for (const r of [...history].sort((a, b) => a.ts - b.ts)) {
      const arr = m.get(r.questionId) ?? [];
      arr.push(r);
      m.set(r.questionId, arr);
    }
    return m;
  }, [history]);

  const perTopic = useMemo(() => {
    const totals = new Map<Topic, number>();
    for (const q of QUESTIONS) {
      const t = topicOf(q);
      if (t) totals.set(t, (totals.get(t) ?? 0) + 1);
    }
    return ALL_TOPICS.map((t) => {
      const seen = new Set(
        history.filter((r) => topicOf(byId.get(r.questionId) as Question) === t).map((r) => r.questionId),
      ).size;
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

  const questionRows = useMemo(() => {
    if (!open) return [];
    return QUESTIONS.filter((q) => topicOf(q) === open)
      .filter((q) => source === 'all' || q.origin === source)
      .filter((q) => {
        const r = last.get(q.id);
        if (filter === 'all') return true;
        if (filter === 'unseen') return !r;
        if (!r) return false;
        return filter === 'correct' ? r.correct : !r.correct;
      })
      .sort((a, b) => {
        const ra = last.get(a.id);
        const rb = last.get(b.id);
        if (ra && rb) return rb.ts - ra.ts;
        if (ra) return -1;
        if (rb) return 1;
        return a.id.localeCompare(b.id);
      });
  }, [open, filter, source, last]);

  const totalAttempts = history.length;
  const totalCorrect = history.filter((r) => r.correct).length;
  const overallPct = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  const presets = [5, 6, 12, 24, 48, 60];

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <header className="flex items-center gap-4">
        <img src={logo} alt="LPIC-2" className="h-14 w-14 rounded-md object-cover" />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-slate-100">LPIC-2 (202) Trainer</h1>
          <p className="text-sm text-slate-400">
            {totalAttempts > 0
              ? `${totalCorrect}/${totalAttempts} answers correct (${overallPct}%)`
              : 'No answers yet — tick topics and start a quiz.'}
          </p>
        </div>
        <div className="shrink-0">
          <Account />
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="flex rounded-md overflow-hidden border border-slate-700 w-fit">
          {(['all', 'correct', 'wrong', 'unseen'] as Filter[]).map((f) => (
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
        <div className="flex flex-wrap rounded-md overflow-hidden border border-slate-700 w-fit">
          {(['all', 'linux-direct', 'ken-adams', 'gpt-deep-research', 'claude-lpic2book'] as const).map(
            (sKey) => (
              <button
                key={sKey}
                type="button"
                onClick={() => setSource(sKey)}
                className={`px-3 py-1.5 ${
                  source === sKey ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {sKey === 'all' ? 'All' : ORIGIN_LABELS[sKey]}
              </button>
            ),
          )}
        </div>
      </div>

      <ul className="space-y-2">
        {perTopic.map((s) => {
          const isOpen = open === s.topic;
          return (
            <li key={s.topic} className="rounded-md border border-slate-700 overflow-hidden">
              <div className="flex items-stretch bg-slate-800/60">
                <label className="flex items-center px-3 cursor-pointer hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={isOn(s.topic)}
                    onChange={() => toggleTopic(s.topic)}
                    className="h-4 w-4 accent-emerald-500"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : s.topic)}
                  className="flex-1 p-3 hover:bg-slate-800 text-left space-y-2"
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
              </div>
              {isOpen && (
                <div className="p-3 space-y-2 bg-slate-900/40">
                  {questionRows.length === 0 ? (
                    <p className="text-sm text-slate-500">No matching questions.</p>
                  ) : (
                    questionRows.map((q) => (
                      <AnswerLine
                        key={q.id}
                        q={q}
                        rec={last.get(q.id)}
                        attempts={attemptsByQ.get(q.id)}
                      />
                    ))
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Quiz launcher */}
      <div className="space-y-3 p-4 rounded-md bg-slate-800/60 border border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-slate-300">Questions per quiz</span>
          <span className="text-sm text-slate-500">{available} available</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {presets.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setQuizSize(n)}
              className={`px-4 py-2 rounded-md border text-sm transition-colors ${
                quizSize === n
                  ? 'border-emerald-500 bg-emerald-900/40 text-emerald-100'
                  : 'border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-800'
              }`}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={onStart}
            disabled={available === 0}
            className="ml-auto px-6 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50"
          >
            Start quiz
          </button>
        </div>
      </div>
    </div>
  );
}
