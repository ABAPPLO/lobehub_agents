import type { Context } from 'hono';

import { buildSingleAgentCard } from '../utils/buildSingleAgentCard';

export async function agentGetAgentCard(c: Context): Promise<Response> {
  const agent = c.get('agent');
  const agentId = c.get('agentId');

  const origin = new URL(c.req.url).origin;
  const baseUrl = `${origin}/a2a/agent/${agentId}`;

  const card = buildSingleAgentCard(agent, baseUrl);

  return c.json(card);
}
