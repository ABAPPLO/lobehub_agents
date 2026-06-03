import { validateApiKeyFormat } from '@lobechat/utils/apiKey';
import { hashApiKey } from '@lobechat/utils/server';
import { eq } from 'drizzle-orm';
import type { MiddlewareHandler } from 'hono';

import { getServerDB } from '@/database/core/db-adaptor';
import { agents, apiKeys } from '@/database/schemas';

import { jsonRpcError } from '../utils/jsonRpc';

type AgentVariables = {
  agent: any;
  agentId: string;
  ownerUserId: string;
};

const loadAgent = async (agentId: string) => {
  const db = await getServerDB();
  return db.query.agents.findFirst({
    where: eq(agents.id, agentId),
  });
};

const findApiKeyByHash = async (keyHash: string) => {
  const db = await getServerDB();
  return db.query.apiKeys.findFirst({
    where: eq(apiKeys.keyHash, keyHash),
  });
};

const extractBearerToken = (authHeader: string | undefined): string | null => {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim() || null;
};

export const a2aAgentAuth =
  (options: { requireAuth: boolean }): MiddlewareHandler<{ Variables: AgentVariables }> =>
  async (c, next) => {
    const agentId = c.req.param('agentId');
    if (!agentId) {
      return c.json({ error: 'Missing agentId' }, 400);
    }

    const agent = await loadAgent(agentId);
    if (!agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }

    const agencyConfig = agent.agencyConfig as any;
    const a2aConfig: { apiKeyIds?: string[]; enabled?: boolean } | undefined = agencyConfig?.a2a;

    if (!a2aConfig?.enabled) {
      return c.json({ error: 'A2A not enabled for this agent' }, 403);
    }

    c.set('agent', agent);
    c.set('agentId', agentId);
    c.set('ownerUserId', agent.userId);

    if (!options.requireAuth) {
      return next();
    }

    const token = extractBearerToken(c.req.header('Authorization'));
    if (!token) {
      return c.json(jsonRpcError(null, -32001, 'Missing Authorization header'));
    }

    if (!validateApiKeyFormat(token)) {
      return c.json(jsonRpcError(null, -32001, 'Invalid API key format'));
    }

    const keyHash = hashApiKey(token);
    const apiKeyRecord = await findApiKeyByHash(keyHash);

    if (!apiKeyRecord) {
      return c.json(jsonRpcError(null, -32001, 'Invalid API key'));
    }

    if (!apiKeyRecord.enabled) {
      return c.json(jsonRpcError(null, -32001, 'API key is disabled'));
    }

    if (apiKeyRecord.expiresAt && new Date(String(apiKeyRecord.expiresAt)) < new Date()) {
      return c.json(jsonRpcError(null, -32001, 'API key has expired'));
    }

    if (apiKeyRecord.userId !== agent.userId) {
      return c.json(jsonRpcError(null, -32003, 'API key does not have access to this agent'));
    }

    if (a2aConfig.apiKeyIds?.length && !a2aConfig.apiKeyIds.includes(apiKeyRecord.id)) {
      return c.json(jsonRpcError(null, -32003, 'API key not authorized for A2A access'));
    }

    return next();
  };
