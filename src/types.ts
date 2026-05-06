export type Topic =
  | 'domain-name-server'
  | 'web-services'
  | 'file-sharing'
  | 'network-client-management'
  | 'email-services'
  | 'system-security';

export interface Question {
  id: string;
  topic: Topic;
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
}

export const TOPIC_LABELS: Record<Topic, string> = {
  'domain-name-server': '207 — Domain Name Server',
  'web-services': '208 — Web Services',
  'file-sharing': '209 — File Sharing',
  'network-client-management': '210 — Network Client Management',
  'email-services': '211 — Email Services',
  'system-security': '212 — System Security',
};
