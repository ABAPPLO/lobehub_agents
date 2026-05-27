import type { AgentGroupDetail } from '@lobechat/types';

import type { AgentCard, AgentSkill } from '@/libs/mcp/a2a/types';

export const buildSkills = (
  detail: AgentGroupDetail,
  skillMapping?: 'group-as-one' | 'members-as-skills',
): AgentSkill[] => {
  const mode = skillMapping || 'group-as-one';

  if (mode === 'group-as-one') {
    return [
      {
        description: detail.description || `Send a message to the ${detail.title} team`,
        id: 'team-task',
        name: detail.title || 'Team Task',
        tags: ['team', 'multi-agent'],
      },
    ];
  }

  return detail.agents
    .filter((a) => !a.isSupervisor)
    .map((agent) => ({
      description: agent.description || `Delegate a task to ${agent.title}`,
      id: agent.id,
      name: agent.title || 'Agent',
      tags: [],
    }));
};

export const buildAgentCard = (
  detail: AgentGroupDetail,
  baseUrl: string,
  skillMapping?: 'group-as-one' | 'members-as-skills',
): AgentCard => ({
  capabilities: { streaming: false },
  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],
  description: detail.description || `LobeHub Agent Team: ${detail.title}`,
  name: detail.title || 'Unnamed Team',
  provider: { organization: 'LobeHub' },
  security: [{ bearer: [] }],
  securitySchemes: {
    bearer: { scheme: 'bearer', type: 'http' },
  },
  skills: buildSkills(detail, skillMapping),
  url: baseUrl,
  version: '0.2',
});
