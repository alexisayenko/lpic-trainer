import { useMemo } from 'react';
import { QUESTIONS } from '../data/questions/index';
import { attemptsByQuestion, lastByQuestion } from '../lib/select';
import { masteryOf } from '../lib/mastery';
import { ALL_TOPICS, topicOf, type AnswerRecord, type Topic } from '../types';

const byId = new Map(QUESTIONS.map((q) => [q.id, q]));

/** Total questions per topic — static, computed once from the loaded bank. */
const TOTALS = (() => {
  const m = new Map<Topic, number>();
  for (const q of QUESTIONS) {
    const t = topicOf(q);
    if (t) m.set(t, (m.get(t) ?? 0) + 1);
  }
  return m;
})();

/** Total questions per tool slug — static, computed once from the loaded bank. */
const TOOL_TOTALS = (() => {
  const m = new Map<string, number>();
  for (const q of QUESTIONS) m.set(q.tool, (m.get(q.tool) ?? 0) + 1);
  return m;
})();

export interface TopicStats {
  topic: Topic;
  total: number;
  seen: number;
}

export interface ToolStats {
  tool: string;
  total: number;
  seen: number;
}

/** Derived dashboard aggregates: last record per question, full attempt log, and per-topic progress. */
export function useDashboardStats(history: AnswerRecord[]) {
  const last = useMemo(() => lastByQuestion(history), [history]);
  const attemptsByQ = useMemo(() => attemptsByQuestion(history), [history]);

  const perTopic = useMemo<TopicStats[]>(() => {
    // One pass over the latest record per question; orphaned ids (removed
    // questions) are skipped so they can't skew the bars.
    const seen = new Map<Topic, number>();
    for (const rec of last.values()) {
      const q = byId.get(rec.questionId);
      const t = q && topicOf(q);
      if (!t) continue;
      seen.set(t, (seen.get(t) ?? 0) + 1);
    }
    return ALL_TOPICS.map((t) => ({
      topic: t,
      total: TOTALS.get(t) ?? 0,
      seen: seen.get(t) ?? 0,
    }));
  }, [last]);

  // One mastery per question from its full attempt history, with a single `now`
  // snapshot so every row is consistent and it recomputes only when history changes.
  const masteryByQ = useMemo(() => {
    const now = Date.now();
    const m = new Map<string, number>();
    for (const [qid, atts] of attemptsByQ) {
      const r = masteryOf(atts, now);
      if (r != null) m.set(qid, r);
    }
    return m;
  }, [attemptsByQ]);

  const bucketsByTopic = useMemo(() => {
    const m = new Map<Topic, Map<number, number>>();
    for (const [qid, score] of masteryByQ) {
      const q = byId.get(qid);
      const t = q && topicOf(q);
      if (!t) continue;
      let b = m.get(t);
      if (!b) {
        b = new Map();
        m.set(t, b);
      }
      b.set(score, (b.get(score) ?? 0) + 1);
    }
    return m;
  }, [masteryByQ]);

  // Same aggregates one level finer, keyed by tool slug.
  const perTool = useMemo(() => {
    const seen = new Map<string, number>();
    for (const rec of last.values()) {
      const q = byId.get(rec.questionId);
      if (!q) continue;
      seen.set(q.tool, (seen.get(q.tool) ?? 0) + 1);
    }
    const m = new Map<string, ToolStats>();
    for (const [tool, total] of TOOL_TOTALS) m.set(tool, { tool, total, seen: seen.get(tool) ?? 0 });
    return m;
  }, [last]);

  const bucketsByTool = useMemo(() => {
    const m = new Map<string, Map<number, number>>();
    for (const [qid, score] of masteryByQ) {
      const q = byId.get(qid);
      if (!q) continue;
      let b = m.get(q.tool);
      if (!b) {
        b = new Map();
        m.set(q.tool, b);
      }
      b.set(score, (b.get(score) ?? 0) + 1);
    }
    return m;
  }, [masteryByQ]);

  return { last, attemptsByQ, perTopic, masteryByQ, bucketsByTopic, perTool, bucketsByTool };
}
