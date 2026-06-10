import topics from './data/topics.json';
import utilities from './data/utilities.json';

export type Topic = '207' | '208' | '209' | '210' | '211' | '212';

export type QuestionType = 'single' | 'multi' | 'fill';

interface QuestionBase {
  id: string;
  tool: string;
  prompt: string;
  explanation: string;
  /** Optional metadata carried from generated banks. */
  objective?: string;
  difficulty?: string;
  /** Authoritative reference URL for the answer. */
  source?: string;
  /** Provenance of the question set (auto-tagged at load from the file path). */
  origin?: Origin;
}

/** `type` is normalised to a concrete value at load (older files default to 'single'). */
export interface SingleQuestion extends QuestionBase {
  type: 'single';
  choices: string[];
  answerIndex: number;
}
export interface MultiQuestion extends QuestionBase {
  type: 'multi';
  choices: string[];
  answerIndices: number[];
}
export interface FillQuestion extends QuestionBase {
  type: 'fill';
  answer: string;
}
export type Question = SingleQuestion | MultiQuestion | FillQuestion;

/** Provenance of a question set (auto-tagged at load from the file path). */
export type Origin = 'linux-direct' | 'ken-adams' | 'gpt-deep-research' | 'claude-lpic2book';

/** All origins, in display order — the single source for filter lists and migrations. */
export const ORIGINS: Origin[] = ['linux-direct', 'ken-adams', 'gpt-deep-research', 'claude-lpic2book'];

/** Human labels for each origin (used by the source filter and per-question tag). */
export const ORIGIN_LABELS: Record<Origin, string> = {
  'linux-direct': 'Linux Direct',
  'ken-adams': 'Ken Adams',
  'gpt-deep-research': 'GPT',
  'claude-lpic2book': 'Claude',
};

/** Quiz pool / dashboard filters. */
export type ResultFilter = 'all' | 'correct' | 'wrong' | 'unseen';
export type SourceFilter = 'all' | Origin;

export const RESULT_FILTERS: ResultFilter[] = ['all', 'correct', 'wrong', 'unseen'];
export const SOURCE_FILTERS: SourceFilter[] = ['all', ...ORIGINS];

export interface AnswerRecord {
  /** Stable client-generated id; used to dedupe when syncing across devices. */
  id: string;
  questionId: string;
  /** Index of the choice the user picked. Optional for records saved before this was tracked. */
  pickedIndex?: number;
  correct: boolean;
  ts: number;
}

export interface UtilityInfo {
  topic: Topic;
  label: string;
}

export const TOPIC_LABELS: Record<Topic, string> = topics as Record<Topic, string>;

export const ALL_TOPICS = Object.keys(TOPIC_LABELS) as Topic[];

export const UTILITIES: Record<string, UtilityInfo> = utilities as Record<string, UtilityInfo>;

/** Resolve a question's topic from its tool slug via utilities.json. */
export function topicOf(question: Question): Topic | undefined {
  return UTILITIES[question.tool]?.topic;
}
