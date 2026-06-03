import type { AgentCard, AgentSkill } from '@/libs/mcp/a2a/types';

interface AgentRecord {
  description?: string | null;
  title?: string | null;
}

export const buildSingleAgentSkill = (agent: AgentRecord): AgentSkill => ({
  description: agent.description || `Send a message to ${agent.title || 'Agent'}`,
  id: 'agent-task',
  name: agent.title || 'Agent Task',
  tags: ['agent'],
});

export const buildSingleAgentCard = (agent: AgentRecord, baseUrl: string): AgentCard => ({
  capabilities: { streaming: false },
  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],
  description: agent.description || `LobeHub Agent: ${agent.title}`,
  name: agent.title || 'Unnamed Agent',
  provider: { organization: 'LobeHub' },
  security: [{ bearer: [] }],
  securitySchemes: {
    bearer: { scheme: 'bearer', type: 'http' },
  },
  skills: [buildSingleAgentSkill(agent)],
  url: baseUrl,
  version: '0.2',
});
