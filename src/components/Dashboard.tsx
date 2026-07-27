import { useMemo, useState } from 'react';
import { QUESTIONS } from '../data/questions/index';
import { useStore } from '../store';
import { useAuth } from '../lib/auth';
import { cloudEnabled } from '../lib/api';
import { MS_PER_DAY, daysBack, startOfLocalDay } from '../lib/dates';
import { STRIP_DAYS } from '../lib/mastery';
import { filterPool } from '../lib/select';
import {
  ALL_OBJECTIVES,
  ALL_TOOLS,
  NOT_PRACTICED_MS,
  OBJECTIVES,
  OBJECTIVES_BY_TOPIC,
  TOOLS_BY_TOPIC,
  TOPIC_SHORT_LABELS,
  UTILITIES,
  questionContext,
  topicOf,
  type Question,
} from '../types';
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

/** Hanging-weight outline icon shown before an objective's LPI weight (inherits text color). */
function WeightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      role="img"
      aria-label="weight"
      className="inline-block h-3.5 w-3.5 align-[-2px]"
    >
      <circle cx="12" cy="6" r="2.5" />
      <path d="M9.7 8.2 5.2 19a1.7 1.7 0 0 0 1.6 2.3h10.4a1.7 1.7 0 0 0 1.6-2.3L14.3 8.2" />
    </svg>
  );
}

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
  const objectiveFilter = useStore((s) => s.objectiveFilter);
  const toggleObjectiveFilter = useStore((s) => s.toggleObjectiveFilter);
  const dashboardView = useStore((s) => s.dashboardView);
  const setDashboardView = useStore((s) => s.setDashboardView);
  const setResultFilter = useStore((s) => s.setResultFilter);
  const setSourceFilter = useStore((s) => s.setSourceFilter);
  const setToolFilter = useStore((s) => s.setToolFilter);
  const setObjectiveFilter = useStore((s) => s.setObjectiveFilter);
  const notPracticed = useStore((s) => s.notPracticed);
  const setNotPracticed = useStore((s) => s.setNotPracticed);

  const [zoom, setZoom] = useState(false);

  const notPracticedMs = notPracticed ? NOT_PRACTICED_MS[notPracticed] : null;

  const {
    attemptsByQ,
    perTopic,
    masteryByQ,
    bucketsByTopic,
    perTool,
    bucketsByTool,
    perObjective,
    bucketsByObjective,
  } = useDashboardStats(history);

  const available = useMemo(() => {
    const topicPool = QUESTIONS.filter((q) => topicOf(q) !== undefined);
    const scope =
      dashboardView === 'objective'
        ? ({ by: 'objective', objectives: objectiveFilter } as const)
        : ({ by: 'tool', tools: toolFilter } as const);
    return filterPool(topicPool, attemptsByQ, resultFilter, sourceFilter, scope, notPracticedMs, Date.now())
      .length;
  }, [resultFilter, sourceFilter, toolFilter, objectiveFilter, dashboardView, notPracticedMs, attemptsByQ]);

  const badgesByTool = useMemo(() => {
    const topicPool = QUESTIONS.filter((q) => topicOf(q) !== undefined);
    const pool = filterPool(
      topicPool,
      attemptsByQ,
      resultFilter,
      sourceFilter,
      { by: 'tool', tools: ALL_TOOLS },
      notPracticedMs,
      Date.now(),
    );
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

  const badgesByObjective = useMemo(() => {
    const pool = filterPool(
      QUESTIONS,
      attemptsByQ,
      resultFilter,
      sourceFilter,
      { by: 'objective', objectives: ALL_OBJECTIVES },
      notPracticedMs,
      Date.now(),
    );
    const byObjective = new Map<string, Question[]>();
    for (const q of pool) {
      if (!q.objective) continue;
      const arr = byObjective.get(q.objective);
      if (arr) arr.push(q);
      else byObjective.set(q.objective, [q]);
    }
    return new Map(
      ALL_OBJECTIVES.map((code) => [code, { code, questions: byObjective.get(code) ?? [] }]),
    );
  }, [resultFilter, sourceFilter, notPracticedMs, attemptsByQ]);

  // Topic-level progress for the objective view, aggregated over the topic's
  // objectives (differs slightly from the tool-based perTopic: a few questions
  // carry an objective from another topic than their tool's).
  const objectiveTopicStats = useMemo(() => {
    const m = new Map<string, { total: number; buckets: Map<number, number> }>();
    for (const { topic, objectives } of OBJECTIVES_BY_TOPIC) {
      let total = 0;
      const buckets = new Map<number, number>();
      for (const code of objectives) {
        total += perObjective.get(code)?.total ?? 0;
        for (const [score, n] of bucketsByObjective.get(code) ?? []) {
          buckets.set(score, (buckets.get(score) ?? 0) + n);
        }
      }
      m.set(topic, { total, buckets });
    }
    return m;
  }, [perObjective, bucketsByObjective]);

  const totalAttempts = history.length;

  const setTopicTools = (topicTools: string[], on: boolean) => {
    const next = new Set(toolFilter);
    for (const t of topicTools) {
      if (on) next.add(t);
      else next.delete(t);
    }
    setToolFilter([...next]);
  };

  const setTopicObjectives = (topicObjectives: string[], on: boolean) => {
    const next = new Set(objectiveFilter);
    for (const o of topicObjectives) {
      if (on) next.add(o);
      else next.delete(o);
    }
    setObjectiveFilter([...next]);
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

      <div className="flex flex-wrap items-center gap-2">
        <span className="w-20 shrink-0 text-slate-300">Group by</span>
        <div className="flex flex-wrap gap-1">
          <ToggleChip on={dashboardView === 'tool'} onClick={() => setDashboardView('tool')}>
            Tools
          </ToggleChip>
          <ToggleChip
            on={dashboardView === 'objective'}
            onClick={() => setDashboardView('objective')}
          >
            Objectives
          </ToggleChip>
        </div>
      </div>

      {dashboardView === 'tool' && (
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
                        className="max-w-44 whitespace-normal text-center leading-tight"
                      >
                        {label}{' '}
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
      )}

      {dashboardView === 'objective' && (
      <div className="space-y-6">
        {OBJECTIVES_BY_TOPIC.map(({ topic, objectives }) => {
          const allOn = objectives.every((o) => objectiveFilter.includes(o));
          const noneOn = objectives.every((o) => !objectiveFilter.includes(o));
          const topicStats = objectiveTopicStats.get(topic);
          return (
            <div key={topic} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-slate-300">
                  <span className="text-slate-500">{topic}</span> {TOPIC_SHORT_LABELS[topic]}
                </span>
                <span className="flex items-center gap-2 text-xs text-slate-400">
                  <button
                    type="button"
                    onClick={() => setTopicObjectives(objectives, true)}
                    disabled={allOn}
                    className="underline-offset-4 hover:text-slate-200 hover:underline disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:no-underline"
                  >
                    Select all
                  </button>
                  <span className="text-slate-600">·</span>
                  <button
                    type="button"
                    onClick={() => setTopicObjectives(objectives, false)}
                    disabled={noneOn}
                    className="underline-offset-4 hover:text-slate-200 hover:underline disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:no-underline"
                  >
                    Clear
                  </button>
                </span>
              </div>
              <hr className="border-slate-700" />
              <MasteryBar total={topicStats?.total ?? 0} buckets={topicStats?.buckets} />
              {/* Objective captions are long — half the columns of the tool view so each card is ~1.5-2x wider. */}
              <div className="columns-1 gap-2 sm:columns-2">
              {objectives.map((code) => {
                const item = badgesByObjective.get(code);
                if (!item) return null;
                const { questions } = item;
                const { title, weight } = OBJECTIVES[code];
                return (
                  <fieldset key={code} className="mb-2 w-full break-inside-avoid rounded-md border border-slate-700 px-2 pb-2 pt-0.5">
                    <legend className="mx-auto">
                      <ToggleChip
                        on={objectiveFilter.includes(code)}
                        onClick={() => toggleObjectiveFilter(code)}
                        className="max-w-80 whitespace-normal text-center leading-tight"
                      >
                        <span className="text-slate-400">{code}</span> {title}{' '}
                        <span className="whitespace-nowrap text-slate-400">
                          <WeightIcon /> {weight}
                        </span>{' '}
                        <span className="text-sky-400">{questions.length}</span>
                      </ToggleChip>
                    </legend>
                    <div className="mb-1.5 mt-0.5 flex">
                      <MiniMasteryBar total={perObjective.get(code)?.total ?? 0} buckets={bucketsByObjective.get(code)} />
                    </div>
                    {questions.length > 0 && (
                      <div className="grid grid-cols-10 gap-1.5 sm:grid-cols-14">
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
      )}

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
              className={n === null ? 'min-w-19 text-center tabular-nums' : ''}
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
