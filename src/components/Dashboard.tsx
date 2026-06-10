import { useMemo, useState } from 'react';
import { QUESTIONS } from '../data/questions/index';
import { useStore } from '../store';
import { STRIP_DAYS } from '../lib/mastery';
import { filterPool } from '../lib/select';
import { ALL_TOPICS, TOPIC_LABELS, UTILITIES, topicOf, type AnswerRecord, type Question, type Topic } from '../types';
import { Account } from './Account';
import { MasteryChip, QuestionStats } from './QuestionStats';
import { FilterBar } from './FilterBar';
import { LogoZoom } from './LogoZoom';
import { useDashboardStats } from './useDashboardStats';
import logo from '../assets/logo.png';

const PRESETS = [5, 6, 12, 24, 48, 60];

const MASTERY_COLORS: [number, string][] = [
  [0, 'bg-red-500/60'],
  [20, 'bg-orange-500/60'],
  [40, 'bg-amber-400/60'],
  [60, 'bg-yellow-300/60'],
  [80, 'bg-lime-400/60'],
  [100, 'bg-emerald-500/60'],
];

function AnswerLine({
  q,
  rec,
  attempts,
  mastery,
}: {
  q: Question;
  rec?: AnswerRecord;
  attempts?: AnswerRecord[];
  mastery?: number | null;
}) {
  const correctText =
    q.type === 'fill'
      ? q.answer
      : q.type === 'multi'
        ? q.answerIndices.map((i) => q.choices[i]).join(', ')
        : q.choices[q.answerIndex];
  const yours =
    q.type === 'single' && rec?.pickedIndex != null ? q.choices[rec.pickedIndex] : undefined;
  return (
    <div className="p-3 rounded-md border border-slate-700 bg-slate-800/20">
      <QuestionStats q={q} attempts={attempts} mastery={mastery} />
      <p className="mt-2 text-xs text-slate-500">
        {UTILITIES[q.tool]?.label ?? q.tool}
        {topicOf(q) ? ` · ${TOPIC_LABELS[topicOf(q)!]} (${topicOf(q)})` : ''}
      </p>
      <p className="mt-1 text-sm text-slate-200 leading-snug">{q.prompt}</p>
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
  const resultFilter = useStore((s) => s.resultFilter);
  const setResultFilter = useStore((s) => s.setResultFilter);
  const sourceFilter = useStore((s) => s.sourceFilter);
  const setSourceFilter = useStore((s) => s.setSourceFilter);

  const [open, setOpen] = useState<Topic | null>(null);
  const [zoom, setZoom] = useState(false);

  const { last, attemptsByQ, perTopic, masteryByQ, bucketsByTopic } = useDashboardStats(history);

  const isOn = (t: Topic) => selected === null || selected.includes(t);
  const toggleTopic = (t: Topic) => {
    const current = selected ?? ALL_TOPICS;
    const next = current.includes(t) ? current.filter((x) => x !== t) : [...current, t];
    setTopics(next.length === ALL_TOPICS.length ? null : next);
  };

  const available = useMemo(() => {
    const topicPool = QUESTIONS.filter((q) => {
      const t = topicOf(q);
      return t !== undefined && (selected === null || selected.includes(t));
    });
    return filterPool(topicPool, attemptsByQ, resultFilter, sourceFilter, Date.now()).length;
  }, [selected, resultFilter, sourceFilter, attemptsByQ]);

  const questionRows = useMemo(() => {
    if (!open) return [];
    const pool = QUESTIONS.filter((q) => topicOf(q) === open);
    return filterPool(pool, attemptsByQ, resultFilter, sourceFilter, Date.now()).sort((a, b) => {
      const ra = last.get(a.id);
      const rb = last.get(b.id);
      if (ra && rb) return rb.ts - ra.ts;
      if (ra) return -1;
      if (rb) return 1;
      return a.id.localeCompare(b.id);
    });
  }, [open, resultFilter, sourceFilter, attemptsByQ, last]);

  const totalAttempts = history.length;
  const totalCorrect = history.filter((r) => r.correct).length;
  const overallPct = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  const dayCounts = useMemo(() => {
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const sets = Array.from({ length: STRIP_DAYS }, () => new Set<string>());
    for (const r of history) {
      const back = Math.round((todayStart - new Date(r.ts).setHours(0, 0, 0, 0)) / 86_400_000);
      if (back >= 0 && back < STRIP_DAYS) sets[STRIP_DAYS - 1 - back].add(r.questionId);
    }
    return sets.map((s, i) => ({
      n: s.size,
      date: new Date(todayStart - (STRIP_DAYS - 1 - i) * 86_400_000).toLocaleDateString(),
    }));
  }, [history]);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <header className="flex items-center gap-4">
        <button type="button" onClick={() => setZoom(true)} className="shrink-0">
          <img src={logo} alt="LPIC-2" className="h-14 w-14 rounded-md object-cover cursor-zoom-in" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-slate-100">LPIC-2 (202) Trainer</h1>
          <p className="text-sm text-slate-400">
            {totalAttempts > 0
              ? `Overall score: ${totalCorrect}/${totalAttempts} correct (${overallPct}%)`
              : 'No answers yet — tick topics and start a quiz.'}
          </p>
          <div
            className="mt-1 flex items-center gap-0.5 font-mono text-[10px]"
            aria-label={`Unique questions answered per day, last ${STRIP_DAYS} days`}
          >
            {dayCounts.map((d, i) => (
              <span
                key={i}
                title={`${d.date}: ${d.n} unique`}
                className={`min-w-4 text-center rounded px-0.5 ${
                  d.n ? 'bg-slate-700/60 text-slate-200' : 'text-slate-600'
                }`}
              >
                {d.n || '·'}
              </span>
            ))}
          </div>
        </div>
        <div className="shrink-0">
          <Account />
        </div>
      </header>

      <FilterBar
        resultFilter={resultFilter}
        setResultFilter={setResultFilter}
        sourceFilter={sourceFilter}
        setSourceFilter={setSourceFilter}
      />

      <ul className="space-y-2">
        {perTopic.map((s) => {
          const isOpen = open === s.topic;
          const buckets = bucketsByTopic.get(s.topic);
          const segments: { key: string; n: number; cls: string; score: number | null; title: string }[] =
            MASTERY_COLORS.flatMap(([score, cls]) => {
              const n = buckets?.get(score) ?? 0;
              return n > 0 ? [{ key: `m${score}`, n, cls, score, title: `${n} × ${score}%` }] : [];
            });
          const unseen = s.total - segments.reduce((acc, seg) => acc + seg.n, 0);
          if (unseen > 0)
            segments.unshift({ key: 'unseen', n: unseen, cls: 'bg-slate-700', score: null, title: `${unseen} unseen` });
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
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-700">
                    {segments.map((seg) => (
                      <div
                        key={seg.key}
                        className={seg.cls}
                        title={seg.title}
                        style={{ width: `${s.total ? (seg.n / s.total) * 100 : 0}%` }}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    {segments.map((seg) => (
                      <span key={seg.key} className="flex items-center gap-1">
                        {seg.score !== null ? (
                          <MasteryChip score={seg.score} />
                        ) : (
                          <span className="rounded border px-1.5 py-0.5 text-[10px] bg-slate-700/40 text-slate-500 border-slate-600">
                            unseen
                          </span>
                        )}
                        × {seg.n}
                      </span>
                    ))}
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
                        mastery={masteryByQ.get(q.id)}
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
          <button
            type="button"
            onClick={() => setQuizSize(null)}
            className={`px-4 py-2 rounded-md border text-sm transition-colors ${
              quizSize === null
                ? 'border-emerald-500 bg-emerald-900/40 text-emerald-100'
                : 'border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-800'
            }`}
          >
            All
          </button>
          {PRESETS.map((n) => (
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

      {zoom && <LogoZoom src={logo} alt="LPIC-2" onClose={() => setZoom(false)} />}
    </div>
  );
}
