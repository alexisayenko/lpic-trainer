import { useMemo, useState } from 'react';
import { QUESTIONS } from '../data/questions/index';
import { useStore } from '../store';
import { useAuth } from '../lib/auth';
import { cloudEnabled } from '../lib/api';
import { MS_PER_DAY, daysBack, startOfLocalDay } from '../lib/dates';
import { STRIP_DAYS } from '../lib/mastery';
import { filterPool } from '../lib/select';
import { ALL_TOPICS, UTILITIES, topicOf, type Topic } from '../types';
import { Account } from './Account';
import { AnswerLine } from './AnswerLine';
import { FilterBar } from './FilterBar';
import { MasteryBar, MiniMasteryBar } from './MasteryBar';
import { TopicCard } from './TopicCard';
import { ToggleChip } from './ToggleChip';
import { LogoZoom } from './LogoZoom';
import { useDashboardStats } from './useDashboardStats';
import logo from '../assets/logo.png';

const PRESETS = [5, 6, 12, 24, 48, 60];

export function Dashboard({ onStart }: Readonly<{ onStart: () => void }>) {
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

  const overall = useMemo(() => {
    const buckets = new Map<number, number>();
    let total = 0;
    let seen = 0;
    for (const s of perTopic) {
      total += s.total;
      seen += s.seen;
    }
    for (const b of bucketsByTopic.values()) {
      for (const [score, n] of b) buckets.set(score, (buckets.get(score) ?? 0) + n);
    }
    return { total, seen, buckets };
  }, [perTopic, bucketsByTopic]);

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
      date: new Date(todayStart - (STRIP_DAYS - 1 - i) * MS_PER_DAY).toLocaleDateString(),
    }));
  }, [history]);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <header className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={() => setZoom(true)} className="shrink-0">
            <img src={logo} alt="LPIC-2" className="h-14 w-14 rounded-md object-cover cursor-zoom-in" />
          </button>
          <div className="flex-1">
            <div
              className="mb-1 flex items-center gap-0.5 font-mono text-[10px]"
              aria-label={`Unique questions answered per day, last ${STRIP_DAYS} days`}
            >
              {dayCounts.map((d) => (
                <span
                  key={d.date}
                  title={`${d.date}: ${d.n} unique`}
                  className={`text-center rounded px-0.5 ${
                    d.n ? 'bg-slate-700/60 text-slate-200' : 'text-slate-600'
                  }`}
                >
                  {d.n || '·'}
                </span>
              ))}
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <h1 className="text-2xl font-semibold text-slate-100">LPIC-2 (Exam 202-450) Trainer</h1>
              <span className="text-sm text-slate-400">
                answered {overall.seen}/{overall.total}
              </span>
            </div>
            {totalAttempts === 0 && (
              <p className="text-sm text-slate-400">
                No answers yet — tick topics and start a quiz. {QUESTIONS.length} questions
              </p>
            )}
          </div>
        </header>
        {totalAttempts > 0 && <MasteryBar total={overall.total} buckets={overall.buckets} />}
      </div>

      <FilterBar
        resultFilter={resultFilter}
        toggleResultFilter={toggleResultFilter}
        sourceFilter={sourceFilter}
        toggleSourceFilter={toggleSourceFilter}
        unseenToday={unseenToday}
        setUnseenToday={setUnseenToday}
      />

      <ul className="space-y-2">
        {perTopic.map((s) => (
          <TopicCard
            key={s.topic}
            topic={s.topic}
            seen={s.seen}
            total={s.total}
            buckets={bucketsByTopic.get(s.topic)}
            selected={isOn(s.topic)}
            isOpen={open === s.topic}
            onToggleSelect={() => toggleTopic(s.topic)}
            onToggleOpen={() => setOpen(open === s.topic ? null : s.topic)}
          >
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
                    <MiniMasteryBar total={stats?.total ?? 0} buckets={bucketsByTool.get(tool)} />
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
          </TopicCard>
        ))}
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

      <footer className="relative pt-4 pb-8 text-center text-xs text-slate-600">
        <span>LPIC-2 (Exam 202-450) Trainer</span>
        <span className="absolute bottom-8 right-0">
          <Account />
        </span>
      </footer>

      {zoom && <LogoZoom src={logo} alt="LPIC-2" onClose={() => setZoom(false)} />}
    </div>
  );
}
