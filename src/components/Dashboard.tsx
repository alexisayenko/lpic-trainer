import { useMemo, useState } from 'react';
import { QUESTIONS } from '../data/questions/index';
import { useStore } from '../store';
import { useAuth } from '../lib/auth';
import { cloudEnabled } from '../lib/api';
import { daysBack, startOfLocalDay } from '../lib/dates';
import { STRIP_DAYS } from '../lib/mastery';
import { filterPool } from '../lib/select';
import { ALL_TOPICS, MASTERY_BUCKETS, MASTERY_TINTS, TOPIC_LABELS, UTILITIES, topicOf, type AnswerRecord, type Question, type Topic } from '../types';
import { Account } from './Account';
import { QuestionStats, SourceTag } from './QuestionStats';
import { FilterBar } from './FilterBar';
import { ToggleChip } from './ToggleChip';
import { LogoZoom } from './LogoZoom';
import { useDashboardStats } from './useDashboardStats';
import logo from '../assets/logo.png';

const PRESETS = [5, 6, 12, 24, 48, 60];

/** Unseen-first mastery segments for a stacked progress bar (shared by topic and tool rows). */
function masterySegments(total: number, buckets: Map<number, number> | undefined) {
  const segments: { key: string; n: number; cls: string; txt: string; score: number | null; title: string }[] =
    MASTERY_BUCKETS.map((score) => {
      const n = buckets?.get(score) ?? 0;
      const t = MASTERY_TINTS[score];
      return { key: `m${score}`, n, cls: t.bar, txt: t.on, score, title: `${n} × ${score}%` };
    });
  const unseen = total - segments.reduce((acc, seg) => acc + seg.n, 0);
  segments.unshift({ key: 'unseen', n: unseen, cls: 'bg-slate-500', txt: 'text-slate-200', score: null, title: `${unseen} unseen` });
  return segments;
}

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
      <div className="flex items-start gap-2 text-xs text-slate-500">
        <div className="flex-1">
          <span>
            {topicOf(q) ? `${topicOf(q)} ${TOPIC_LABELS[topicOf(q)!]} · ` : ''}
            {UTILITIES[q.tool]?.label ?? q.tool}
          </span>
          <div className="mt-2">
            <QuestionStats q={q} attempts={attempts} mastery={mastery} showSource={false} />
          </div>
        </div>
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          {q.origin && <SourceTag origin={q.origin} />}
          <span className="text-[10px]">[{q.id}]</span>
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-200 leading-snug">{q.prompt}</p>
      {rec && !rec.correct && yours !== undefined && (
        <p className="mt-2 text-xs text-[#a4434b]">You answered: {yours}</p>
      )}
      {correctText && <p className="mt-1 text-xs text-emerald-300">Correct: {correctText}</p>}
    </div>
  );
}

export function Dashboard({ onStart }: { onStart: () => void }) {
  const token = useAuth((s) => s.token);
  const canQuiz = !cloudEnabled || !!token;
  const history = useStore((s) => s.history);
  const selected = useStore((s) => s.selectedTopics);
  const setTopics = useStore((s) => s.setTopics);
  const quizSize = useStore((s) => s.quizSize);
  const setQuizSize = useStore((s) => s.setQuizSize);
  const resultFilter = useStore((s) => s.resultFilter);
  const toggleResultFilter = useStore((s) => s.toggleResultFilter);
  const sourceFilter = useStore((s) => s.sourceFilter);
  const toggleSourceFilter = useStore((s) => s.toggleSourceFilter);
  const unseenToday = useStore((s) => s.unseenToday);
  const setUnseenToday = useStore((s) => s.setUnseenToday);

  const [open, setOpen] = useState<Topic | null>(null);
  const [zoom, setZoom] = useState(false);

  const { last, attemptsByQ, perTopic, masteryByQ, bucketsByTopic, perTool, bucketsByTool } =
    useDashboardStats(history);

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
    return filterPool(topicPool, attemptsByQ, resultFilter, sourceFilter, unseenToday, Date.now()).length;
  }, [selected, resultFilter, sourceFilter, unseenToday, attemptsByQ]);

  const questionRows = useMemo(() => {
    if (!open) return [];
    const pool = QUESTIONS.filter((q) => topicOf(q) === open);
    return filterPool(pool, attemptsByQ, resultFilter, sourceFilter, unseenToday, Date.now()).sort((a, b) => {
      const ra = last.get(a.id);
      const rb = last.get(b.id);
      if (ra && rb) return rb.ts - ra.ts;
      if (ra) return -1;
      if (rb) return 1;
      return a.id.localeCompare(b.id);
    });
  }, [open, resultFilter, sourceFilter, unseenToday, attemptsByQ, last]);

  const toolRows = useMemo(() => {
    if (!open) return [];
    return Object.entries(UTILITIES)
      .filter(([, info]) => info.topic === open)
      .map(([tool, info]) => ({ tool, label: info.label, stats: perTool.get(tool) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [open, perTool]);

  const totalAttempts = history.length;
  const totalCorrect = history.filter((r) => r.correct).length;
  const overallPct = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  const dayCounts = useMemo(() => {
    const now = Date.now();
    const todayStart = startOfLocalDay(now);
    const sets = Array.from({ length: STRIP_DAYS }, () => new Set<string>());
    for (const r of history) {
      const back = daysBack(r.ts, now);
      if (back >= 0 && back < STRIP_DAYS) sets[STRIP_DAYS - 1 - back].add(r.questionId);
    }
    return sets.map((s, i) => ({
      n: s.size,
      date: new Date(todayStart - (STRIP_DAYS - 1 - i) * 86_400_000).toLocaleDateString(),
    }));
  }, [history]);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <header className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={() => setZoom(true)} className="shrink-0">
          <img src={logo} alt="LPIC-2" className="h-14 w-14 rounded-md object-cover cursor-zoom-in" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-slate-100">LPIC-2 (Exam 202-450) Trainer</h1>
          <p className="text-sm text-slate-400">
            {totalAttempts > 0
              ? `Overall score: ${totalCorrect}/${totalAttempts} correct (${overallPct}%) · ${QUESTIONS.length} questions`
              : `No answers yet — tick topics and start a quiz. ${QUESTIONS.length} questions`}
          </p>
          <div
            className="mt-1 flex items-center gap-0.5 font-mono text-[10px]"
            aria-label={`Unique questions answered per day, last ${STRIP_DAYS} days`}
          >
            {dayCounts.map((d, i) => (
              <span
                key={i}
                title={`${d.date}: ${d.n} unique`}
                className={`text-center rounded px-0.5 ${
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
        toggleResultFilter={toggleResultFilter}
        sourceFilter={sourceFilter}
        toggleSourceFilter={toggleSourceFilter}
        unseenToday={unseenToday}
        setUnseenToday={setUnseenToday}
      />

      <ul className="space-y-2">
        {perTopic.map((s) => {
          const isOpen = open === s.topic;
          const segments = masterySegments(s.total, bucketsByTopic.get(s.topic));
          return (
            <li
              key={s.topic}
              className={`rounded-md border overflow-hidden ${
                isOn(s.topic) ? 'border-sky-500 bg-sky-900/10' : 'border-slate-700'
              }`}
            >
              <div
                role="button"
                tabIndex={0}
                aria-pressed={isOn(s.topic)}
                onClick={() => toggleTopic(s.topic)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleTopic(s.topic);
                  }
                }}
                className="p-3 bg-slate-800/60 hover:bg-slate-800 cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-200">
                    <span className="text-slate-500 mr-2">{s.topic}</span>
                    {TOPIC_LABELS[s.topic]}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-sm text-slate-400">
                      asked {s.seen}/{s.total}
                    </span>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-label={isOpen ? 'Hide questions' : 'Show questions'}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpen(isOpen ? null : s.topic);
                      }}
                      className="p-2 -m-2 text-slate-400 hover:text-slate-200"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  </span>
                </div>
                <div className="flex h-4 gap-px rounded overflow-hidden bg-slate-700 text-[10px] leading-none">
                  {segments.filter((seg) => seg.n > 0).map((seg) => {
                    const pct = s.total ? (seg.n / s.total) * 100 : 0;
                    return (
                      <div
                        key={seg.key}
                        className={`${seg.cls} ${seg.txt} flex items-center justify-center overflow-hidden`}
                        title={seg.title}
                        style={{ width: `${pct}%` }}
                      >
                        {pct >= String(seg.n).length * 2 && seg.n}
                      </div>
                    );
                  })}
                </div>
              </div>
              {isOpen && (
                <div className="p-3 space-y-2 bg-slate-900/40">
                  {toolRows.length > 0 && (
                    <div className="mb-3 space-y-1.5">
                      {toolRows.map(({ tool, label, stats }) => (
                        <div key={tool} className="flex items-center gap-3 text-xs">
                          <span className="w-44 truncate text-slate-300" title={label}>
                            {label}
                          </span>
                          <span className="w-14 shrink-0 text-right tabular-nums text-slate-500">
                            {stats ? `${stats.seen}/${stats.total}` : '0/0'}
                          </span>
                          <div className="flex h-1.5 flex-1 gap-px rounded-full overflow-hidden bg-slate-700">
                            {masterySegments(stats?.total ?? 0, bucketsByTool.get(tool)).filter((seg) => seg.n > 0).map((seg) => (
                              <div
                                key={seg.key}
                                className={seg.cls}
                                title={seg.title}
                                style={{ width: `${stats?.total ? (seg.n / stats.total) * 100 : 0}%` }}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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

      <div className="flex flex-wrap items-center gap-2">
        <span className="w-20 text-slate-300">Quiz size</span>
        {[null, ...PRESETS].map((n) => (
          <ToggleChip
            key={n ?? 'all'}
            on={quizSize === n}
            onClick={() => setQuizSize(n)}
            disabled={n !== null && n > available}
            className={n === null ? 'min-w-[4.75rem] text-center tabular-nums' : ''}
          >
            {n ?? `All (${available})`}
          </ToggleChip>
        ))}
      </div>

      {canQuiz && (
        <button
          type="button"
          onClick={onStart}
          disabled={available === 0}
          className="block mx-auto px-10 py-3 rounded-md bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors disabled:opacity-50"
        >
          Start quiz
        </button>
      )}

      <footer className="pt-4 pb-8 text-center text-xs text-slate-600">
        LPIC-2 (Exam 202-450) Trainer
      </footer>

      {zoom && <LogoZoom src={logo} alt="LPIC-2" onClose={() => setZoom(false)} />}
    </div>
  );
}
