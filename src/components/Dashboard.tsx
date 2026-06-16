import { useMemo, useState } from 'react';
import { QUESTIONS } from '../data/questions/index';
import { useStore } from '../store';
import { useAuth } from '../lib/auth';
import { cloudEnabled } from '../lib/api';
import { MS_PER_DAY, daysBack, startOfLocalDay } from '../lib/dates';
import { STRIP_DAYS } from '../lib/mastery';
import { filterPool } from '../lib/select';
import { ALL_TOOLS, CARD_VIEWS, NOT_PRACTICED_MS, UTILITIES, questionContext, topicOf, type Question, type Topic } from '../types';
import { Account } from './Account';
import { AnswerLine } from './AnswerLine';
import { FilterBar } from './FilterBar';
import { MasteryChip } from './QuestionCardHeader';
import { MasteryBar, MiniMasteryBar } from './MasteryBar';
import { TopicCard } from './TopicCard';
import { ToggleChip } from './ToggleChip';
import { LogoZoom } from './LogoZoom';
import { InfoMenu } from './InfoMenu';
import { useDashboardStats } from './useDashboardStats';
import logo from '../assets/logo.png';

const PRESETS = [5, 6, 12, 24, 48, 60];

export function Dashboard({ onStart }: Readonly<{ onStart: () => void }>) {
  const token = useAuth((s) => s.token);
  const canQuiz = !cloudEnabled || !!token;
  const history = useStore((s) => s.history);
  const quizSize = useStore((s) => s.quizSize);
  const setQuizSize = useStore((s) => s.setQuizSize);
  const resultFilter = useStore((s) => s.resultFilter);
  const toggleResultFilter = useStore((s) => s.toggleResultFilter);
  const sourceFilter = useStore((s) => s.sourceFilter);
  const toggleSourceFilter = useStore((s) => s.toggleSourceFilter);
  const toolFilter = useStore((s) => s.toolFilter);
  const toggleToolFilter = useStore((s) => s.toggleToolFilter);
  const setResultFilter = useStore((s) => s.setResultFilter);
  const setSourceFilter = useStore((s) => s.setSourceFilter);
  const setToolFilter = useStore((s) => s.setToolFilter);
  const notPracticed = useStore((s) => s.notPracticed);
  const setNotPracticed = useStore((s) => s.setNotPracticed);
  const cardView = useStore((s) => s.cardView);
  const setCardView = useStore((s) => s.setCardView);

  const [open, setOpen] = useState<Topic | null>(null);
  const [zoom, setZoom] = useState(false);

  const notPracticedMs = notPracticed ? NOT_PRACTICED_MS[notPracticed] : null;

  const { last, attemptsByQ, perTopic, masteryByQ, bucketsByTopic, perTool, bucketsByTool } =
    useDashboardStats(history);

  const available = useMemo(() => {
    const topicPool = QUESTIONS.filter((q) => topicOf(q) !== undefined);
    return filterPool(topicPool, attemptsByQ, resultFilter, sourceFilter, toolFilter, notPracticedMs, Date.now())
      .length;
  }, [resultFilter, sourceFilter, toolFilter, notPracticedMs, attemptsByQ]);

  const questionRows = useMemo(() => {
    if (!open) return [];
    const pool = QUESTIONS.filter((q) => topicOf(q) === open);
    return filterPool(pool, attemptsByQ, resultFilter, sourceFilter, toolFilter, notPracticedMs, Date.now()).sort(
      (a, b) => {
        const ra = last.get(a.id);
        const rb = last.get(b.id);
        if (ra && rb) return rb.ts - ra.ts;
        if (ra) return -1;
        if (rb) return 1;
        return a.id.localeCompare(b.id);
      },
    );
  }, [open, resultFilter, sourceFilter, toolFilter, notPracticedMs, attemptsByQ, last]);

  const toolRows = useMemo(() => {
    if (!open) return [];
    return Object.entries(UTILITIES)
      .filter(([, info]) => info.topic === open)
      .map(([tool, info]) => ({ tool, label: info.label, stats: perTool.get(tool) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [open, perTool]);

  const badgesByTool = useMemo(() => {
    const topicPool = QUESTIONS.filter((q) => topicOf(q) !== undefined);
    const pool = filterPool(topicPool, attemptsByQ, resultFilter, sourceFilter, ALL_TOOLS, notPracticedMs, Date.now());
    const byTool = new Map<string, Question[]>();
    for (const q of pool) {
      const arr = byTool.get(q.tool);
      if (arr) arr.push(q);
      else byTool.set(q.tool, [q]);
    }
    return ALL_TOOLS.map((tool) => ({
      tool,
      label: UTILITIES[tool].label,
      questions: byTool.get(tool) ?? [],
    }));
  }, [resultFilter, sourceFilter, notPracticedMs, attemptsByQ]);

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
    <div className="max-w-2xl mx-auto px-3 py-6 space-y-6">
      <div className="space-y-2">
        <header className="flex items-start gap-4">
          <button type="button" onClick={() => setZoom(true)} className="shrink-0">
            <img src={logo} alt="LPIC-2" className="h-14 w-14 rounded-md object-cover cursor-zoom-in" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold text-slate-100">
              LPIC-2 (Exam 202-450) Trainer
              <span className="float-right ml-3 mt-2 whitespace-nowrap text-sm font-normal text-slate-400">
                answered {overall.seen}/{overall.total}
              </span>
            </h1>
            {totalAttempts === 0 && (
              <p className="text-sm text-slate-400">
                No answers yet — tick topics and start a quiz. {QUESTIONS.length} questions
              </p>
            )}
          </div>
        </header>
        {totalAttempts > 0 && <MasteryBar total={overall.total} buckets={overall.buckets} />}
        <div
          className="flex items-center gap-0.5 font-mono text-[10px]"
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
      </div>

      <FilterBar
        resultFilter={resultFilter}
        toggleResultFilter={toggleResultFilter}
        sourceFilter={sourceFilter}
        toggleSourceFilter={toggleSourceFilter}
        setResultFilter={setResultFilter}
        setSourceFilter={setSourceFilter}
        toolFilter={toolFilter}
        toggleToolFilter={toggleToolFilter}
        setToolFilter={setToolFilter}
        notPracticed={notPracticed}
        setNotPracticed={setNotPracticed}
      />

      <hr className="border-slate-700" />

      <div className="flex items-start gap-2">
        {[0, 1, 2].map((col) => (
          <div key={col} className="flex flex-1 flex-col items-start gap-2">
            {badgesByTool
              .filter((_, i) => i % 3 === col)
              .map(({ tool, label, questions }) => (
                <fieldset key={tool} className="w-max min-w-[13rem] rounded-md border border-slate-700 px-2 pb-2">
                  <legend className="mx-auto">
                    <ToggleChip
                      on={toolFilter.includes(tool)}
                      onClick={() => toggleToolFilter(tool)}
                      className="max-w-[11rem] whitespace-normal text-center leading-tight"
                    >
                      {label.includes(' (')
                        ? [label.slice(0, label.indexOf(' (')), label.slice(label.indexOf(' (') + 1)].map((line) => (
                            <span key={line} className="block">
                              {line}
                            </span>
                          ))
                        : label}{' '}
                      <span className="text-sky-400">{questions.length}</span>
                    </ToggleChip>
                  </legend>
                  {questions.length > 0 && (
                    <div className="grid grid-cols-9 gap-1.5">
                      {questions.map((q) => (
                        <span key={q.id} title={`${questionContext(q)} [${q.id}]`}>
                          <MasteryChip score={masteryByQ.get(q.id) ?? null} />
                        </span>
                      ))}
                    </div>
                  )}
                </fieldset>
              ))}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="w-20 shrink-0 text-slate-300">Quiz size</span>
        <div className="flex flex-wrap gap-1">
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
            className="ml-auto shrink-0 px-6 py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors disabled:opacity-50"
          >
            Start quiz
          </button>
        )}
      </div>

      <hr className="border-slate-700" />

      <div className="flex flex-wrap items-center gap-2">
        <span className="w-20 shrink-0 text-slate-300">Cards</span>
        <div className="flex flex-wrap gap-1">
          {CARD_VIEWS.map(({ key, label }) => (
            <ToggleChip key={key} on={cardView === key} onClick={() => setCardView(key)}>
              {label}
            </ToggleChip>
          ))}
        </div>
      </div>

      <ul className="space-y-2">
        {perTopic.map((s) => (
          <TopicCard
            key={s.topic}
            topic={s.topic}
            seen={s.seen}
            total={s.total}
            buckets={bucketsByTopic.get(s.topic)}
            isOpen={open === s.topic}
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
            {cardView === 'none' ? null : questionRows.length === 0 ? (
              <p className="text-sm text-slate-500">No matching questions.</p>
            ) : cardView === 'badges' ? (
              <div className="flex flex-wrap gap-1.5">
                {questionRows.map((q) => (
                  <span key={q.id} title={`${questionContext(q)} [${q.id}]`}>
                    <MasteryChip score={masteryByQ.get(q.id) ?? null} />
                  </span>
                ))}
              </div>
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

      <footer className="space-y-2 pt-4 pb-8 text-xs text-slate-600">
        <div className="flex items-start justify-between gap-4">
          <InfoMenu />
          <Account />
        </div>
        <p className="text-center">LPIC-2 (Exam 202-450) Trainer</p>
      </footer>

      {zoom && <LogoZoom src={logo} alt="LPIC-2" onClose={() => setZoom(false)} />}
    </div>
  );
}
