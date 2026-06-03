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
  source?: string;
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
