import { useMemo, useState } from 'react';
import { QUESTIONS } from '../data/questions/index';
import { useStore } from '../store';
import { useAuth } from '../lib/auth';
import { cloudEnabled } from '../lib/api';
import { MS_PER_DAY, daysBack, startOfLocalDay } from '../lib/dates';
import { STRIP_DAYS } from '../lib/mastery';
import { filterPool } from '../lib/select';
import { ALL_TOOLS, NOT_PRACTICED_MS, TOOLS_BY_TOPIC, TOPIC_SHORT_LABELS, UTILITIES, questionContext, topicOf, type Question } from '../types';
import { Account } from './Account';
import { FilterBar } from './FilterBar';
import { MasteryChip } from './QuestionCardHeader';
import { MasteryBar, MiniMasteryBar } from './MasteryBar';
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

  const [zoom, setZoom] = useState(false);

  const notPracticedMs = notPracticed ? NOT_PRACTICED_MS[notPracticed] : null;

  const { attemptsByQ, perTopic, masteryByQ, bucketsByTopic, perTool, bucketsByTool } =
    useDashboardStats(history);

  const available = useMemo(() => {
    const topicPool = QUESTIONS.filter((q) => topicOf(q) !== undefined);
    return filterPool(topicPool, attemptsByQ, resultFilter, sourceFilter, toolFilter, notPracticedMs, Date.now())
      .length;
  }, [resultFilter, sourceFilter, toolFilter, notPracticedMs, attemptsByQ]);

  const badgesByTool = useMemo(() => {
    const topicPool = QUESTIONS.filter((q) => topicOf(q) !== undefined);
    const pool = filterPool(topicPool, attemptsByQ, resultFilter, sourceFilter, ALL_TOOLS, notPracticedMs, Date.now());
    const byTool = new Map<string, Question[]>();
    for (const q of pool) {
      const arr = byTool.get(q.tool);
      if (arr) arr.push(q);
      else byTool.set(q.tool, [q]);
    }
    return new Map(
      ALL_TOOLS.map((tool) => [
        tool,
        { tool, label: UTILITIES[tool].label, questions: byTool.get(tool) ?? [] },
      ]),
    );
  }, [resultFilter, sourceFilter, notPracticedMs, attemptsByQ]);

  const totalAttempts = history.length;

  const setTopicTools = (topicTools: string[], on: boolean) => {
    const next = new Set(toolFilter);
    for (const t of topicTools) {
      if (on) next.add(t);
      else next.delete(t);
    }
    setToolFilter([...next]);
  };

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

      <hr className="border-slate-700" />

      <FilterBar
        resultFilter={resultFilter}
        toggleResultFilter={toggleResultFilter}
        sourceFilter={sourceFilter}
        toggleSourceFilter={toggleSourceFilter}
        setResultFilter={setResultFilter}
        setSourceFilter={setSourceFilter}
        notPracticed={notPracticed}
        setNotPracticed={setNotPracticed}
      />

      <hr className="border-slate-700" />

      <div className="space-y-6">
        {TOOLS_BY_TOPIC.map(({ topic, tools }) => {
          const allOn = tools.every((t) => toolFilter.includes(t));
          const noneOn = tools.every((t) => !toolFilter.includes(t));
          return (
            <div key={topic} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-slate-300">
                  <span className="text-slate-500">{topic}</span> {TOPIC_SHORT_LABELS[topic]}
                </span>
                <span className="flex items-center gap-2 text-xs text-slate-400">
                  <button
                    type="button"
                    onClick={() => setTopicTools(tools, true)}
                    disabled={allOn}
                    className="underline-offset-4 hover:text-slate-200 hover:underline disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:no-underline"
                  >
                    Select all
                  </button>
                  <span className="text-slate-600">·</span>
                  <button
                    type="button"
                    onClick={() => setTopicTools(tools, false)}
                    disabled={noneOn}
                    className="underline-offset-4 hover:text-slate-200 hover:underline disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:no-underline"
                  >
                    Clear
                  </button>
                </span>
              </div>
              <hr className="border-slate-700" />
              <MasteryBar total={perTopic.find((s) => s.topic === topic)?.total ?? 0} buckets={bucketsByTopic.get(topic)} />
              <div className="columns-2 gap-2 sm:columns-3">
              {tools.map((tool) => {
                const item = badgesByTool.get(tool);
                if (!item) return null;
                const { label, questions } = item;
                return (
                  <fieldset key={tool} className="mb-2 w-full break-inside-avoid rounded-md border border-slate-700 px-2 pb-2 pt-0.5">
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
                    <div className="mb-1.5 mt-0.5 flex">
                      <MiniMasteryBar total={perTool.get(tool)?.total ?? 0} buckets={bucketsByTool.get(tool)} />
                    </div>
                    {questions.length > 0 && (
                      <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-9">
                        {questions.map((q) => (
                          <span key={q.id} title={`${questionContext(q)} [${q.id}]`}>
                            <MasteryChip score={masteryByQ.get(q.id) ?? null} />
                          </span>
                        ))}
                      </div>
                    )}
                  </fieldset>
                );
              })}
              </div>
            </div>
          );
        })}
      </div>

      <hr className="border-slate-700" />

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
