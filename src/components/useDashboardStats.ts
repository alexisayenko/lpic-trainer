import { useMemo } from 'react';
import { QUESTIONS } from '../data/questions/index';
import { lastByQuestion } from '../lib/select';
import { rateQuestion, type Rating } from '../lib/rating';
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

export interface TopicStats {
  topic: Topic;
  total: number;
  seen: number;
  correctNow: number;
  wrongNow: number;
  askedAccuracy: number | null;
  correctPct: number;
  wrongPct: number;
}

/** Derived dashboard aggregates: last record per question, full attempt log, and per-topic progress. */
export function useDashboardStats(history: AnswerRecord[]) {
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

  const perTopic = useMemo<TopicStats[]>(() => {
    // One pass over the latest record per question; orphaned ids (removed
    // questions) are skipped so they can't skew the bars.
    const seen = new Map<Topic, number>();
    const correct = new Map<Topic, number>();
    for (const rec of last.values()) {
      const q = byId.get(rec.questionId);
      const t = q && topicOf(q);
      if (!t) continue;
      seen.set(t, (seen.get(t) ?? 0) + 1);
      if (rec.correct) correct.set(t, (correct.get(t) ?? 0) + 1);
    }
    return ALL_TOPICS.map((t) => {
      const total = TOTALS.get(t) ?? 0;
      const seenN = seen.get(t) ?? 0;
      const correctNow = correct.get(t) ?? 0;
      const wrongNow = seenN - correctNow;
      return {
        topic: t,
        total,
        seen: seenN,
        correctNow,
        wrongNow,
        askedAccuracy: seenN ? Math.round((correctNow / seenN) * 100) : null,
        correctPct: total ? (correctNow / total) * 100 : 0,
        wrongPct: total ? (wrongNow / total) * 100 : 0,
      };
    });
  }, [last]);

  // One rating per question from its full attempt history, with a single `now`
  // snapshot so every row is consistent and it recomputes only when history changes.
  const ratingByQ = useMemo(() => {
    const now = Date.now();
    const m = new Map<string, Rating>();
    for (const [qid, atts] of attemptsByQ) {
      const r = rateQuestion(atts, now);
      if (r) m.set(qid, r);
    }
    return m;
  }, [attemptsByQ]);

  return { last, attemptsByQ, perTopic, ratingByQ };
}
