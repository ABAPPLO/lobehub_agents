import {
  type CustomPluginMetadata,
  type LobeChatPluginApi,
  type ToolManifest,
} from '@lobechat/types';
import debug from 'debug';

import { type AgentCard, type AgentSkill } from '@/libs/mcp/a2a/types';

const log = debug('lobe-mcp:a2a-discovery');

/**
 * Fetch the Agent Card from a remote A2A agent endpoint.
 * The card is located at `{baseUrl}/.well-known/agent.json`.
 */
export const fetchAgentCard = async (baseUrl: string): Promise<AgentCard> => {
  const url = baseUrl.replace(/\/+$/, '');
  const cardUrl = `${url}/.well-known/agent.json`;

  log('Fetching Agent Card from: %s', cardUrl);

  const response = await fetch(cardUrl, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Agent Card: ${response.status} ${response.statusText}`);
  }

  const card = (await response.json()) as AgentCard;

  if (!card.name || !Array.isArray(card.skills)) {
    throw new Error('Invalid Agent Card: missing required fields (name, skills)');
  }

  log('Agent Card fetched: %s (%d skills)', card.name, card.skills.length);
  return card;
};

/**
 * Convert an A2A AgentSkill to a LobeChatPluginApi function schema.
 * A2A skills don't define JSON Schema for inputs, so we generate a
 * generic `{ message: string }` parameter per skill.
 */
export const agentSkillToLobePluginApi = (skill: AgentSkill): LobeChatPluginApi => ({
  description: skill.description || skill.name,
  name: skill.id,
  parameters: {
    properties: {
      message: { description: `Message to send to the ${skill.name} skill`, type: 'string' },
    },
    required: ['message'],
    type: 'object',
  },
});

/**
 * Build a full ToolManifest from an A2A Agent Card.
 * This manifest is stored in the plugin record and used by the LLM
 * to discover available A2A tools.
 */
export const buildA2AManifest = (
  agentCard: AgentCard,
  identifier: string,
  baseUrl: string,
  metadata?: CustomPluginMetadata,
): ToolManifest => {
  const api = agentCard.skills.map(agentSkillToLobePluginApi);

  return {
    api,
    identifier,
    meta: {
      avatar: metadata?.avatar || '🤖',
      description:
        metadata?.description || agentCard.description || `A2A Agent with ${api.length} skill(s)`,
      title: metadata?.name || agentCard.name,
    },
    // @ts-expect-error — mcpParams is stored alongside standard manifest fields
    mcpParams: {
      capabilities: agentCard.skills.flatMap((s) => s.tags ?? []),
      name: identifier,
      type: 'a2a',
      url: baseUrl,
    },
    type: 'mcp' as any,
  };
};
