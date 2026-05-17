import topics from './data/topics.json';
import utilities from './data/utilities.json';

export type Topic = '207' | '208' | '209' | '210' | '211' | '212';

export interface Question {
  id: string;
  tool: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
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
