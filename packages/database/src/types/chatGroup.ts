import type { TeamConfig } from '@lobechat/types';

export interface A2AConfig {
  /** Authorized API key IDs — empty means all of the owner's keys */
  apiKeyIds?: string[];
  /** Master toggle for A2A server exposure */
  enabled?: boolean;
  /** How member agents map to A2A skills */
  skillMapping?: 'group-as-one' | 'members-as-skills';
}

export interface ChatGroupConfig {
  a2a?: A2AConfig;
  allowDM?: boolean;
  forkedFromIdentifier?: string;
  openingMessage?: string;
  openingQuestions?: string[];
  revealDM?: boolean;
  systemPrompt?: string;
  team?: TeamConfig;
}
