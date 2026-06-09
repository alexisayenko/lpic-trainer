import topics from './data/topics.json';
import utilities from './data/utilities.json';

export type Topic = '207' | '208' | '209' | '210' | '211' | '212';

export type QuestionType = 'single' | 'multi' | 'fill';

export interface Question {
  id: string;
  tool: string;
  /** Defaults to 'single' when absent (older question files). */
  type?: QuestionType;
  prompt: string;
  /** Present for 'single' and 'multi'. */
  choices?: string[];
  /** Correct index for 'single'. */
  answerIndex?: number;
  /** Correct indices for 'multi'. */
  answerIndices?: number[];
  /** Accepted answer text for 'fill'. */
  answer?: string;
  explanation: string;
  /** Optional metadata carried from generated banks. */
  objective?: string;
  difficulty?: string;
  /** Authoritative reference URL for the answer. */
  source?: string;
  /** Provenance of the question set (auto-tagged at load from the file path). */
  origin?: string;
}

/** Provenance of a question set (auto-tagged at load from the file path). */
export type Origin = 'linux-direct' | 'ken-adams' | 'gpt-deep-research' | 'claude-lpic2book';

/** Quiz pool / dashboard filters. */
export type ResultFilter = 'all' | 'correct' | 'wrong' | 'unseen';
export type SourceFilter = 'all' | Origin;

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

export const UTILITIES: Record<string, UtilityInfo> = utilities as Record<string, UtilityInfo>;

export type Utility = keyof typeof utilities;

/** Resolve a question's topic from its tool slug via utilities.json. */
export function topicOf(question: Question): Topic | undefined {
  return UTILITIES[question.tool]?.topic;
}
