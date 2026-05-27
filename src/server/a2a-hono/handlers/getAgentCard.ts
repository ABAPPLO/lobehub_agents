import type { Context } from 'hono';

import { getServerDB } from '@/database/core/db-adaptor';
import { AgentGroupRepository } from '@/database/repositories/agentGroup';

import { buildAgentCard } from '../utils/buildSkills';

export async function getAgentCard(c: Context): Promise<Response> {
  const groupId = c.get('groupId');
  const group = c.get('group');
  const ownerUserId = c.get('ownerUserId');

  const db = await getServerDB();
  const repo = new AgentGroupRepository(db, ownerUserId);
  const detail = await repo.findByIdWithAgents(groupId);

  if (!detail) {
    return c.json({ error: 'Group not found' }, 404);
  }

  const config = group.config as any;
  const skillMapping = config?.a2a?.skillMapping as
    | 'group-as-one'
    | 'members-as-skills'
    | undefined;
  const origin = new URL(c.req.url).origin;
  const baseUrl = `${origin}/a2a/${groupId}`;

  const card = buildAgentCard(detail, baseUrl, skillMapping);

  return c.json(card);
}
