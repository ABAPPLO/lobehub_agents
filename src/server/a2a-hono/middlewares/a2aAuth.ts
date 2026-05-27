import { validateApiKeyFormat } from '@lobechat/utils/apiKey';
import { hashApiKey } from '@lobechat/utils/server';
import { eq } from 'drizzle-orm';
import type { MiddlewareHandler } from 'hono';

import { getServerDB } from '@/database/core/db-adaptor';
import { apiKeys, chatGroups } from '@/database/schemas';

import { jsonRpcError } from '../utils/jsonRpc';

type GroupVariables = {
  group: any;
  groupId: string;
  ownerUserId: string;
};

const loadGroup = async (groupId: string) => {
  const db = await getServerDB();
  return db.query.chatGroups.findFirst({
    where: eq(chatGroups.id, groupId),
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

export const a2aAuth =
  (options: { requireAuth: boolean }): MiddlewareHandler<{ Variables: GroupVariables }> =>
  async (c, next) => {
    const groupId = c.req.param('groupId');
    if (!groupId) {
      return c.json({ error: 'Missing groupId' }, 400);
    }

    const group = await loadGroup(groupId);
    if (!group) {
      return c.json({ error: 'Group not found' }, 404);
    }

    const config = group.config as any;
    const a2aConfig: { apiKeyIds?: string[]; enabled?: boolean } | undefined = config?.a2a;

    if (!a2aConfig?.enabled) {
      return c.json({ error: 'A2A not enabled for this group' }, 403);
    }

    c.set('group', group);
    c.set('groupId', groupId);
    c.set('ownerUserId', group.userId);

    if (!options.requireAuth) {
      return next();
    }

    // Validate API key
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

    // Ownership check
    if (apiKeyRecord.userId !== group.userId) {
      return c.json(jsonRpcError(null, -32003, 'API key does not have access to this group'));
    }

    // Optional: restrict to specific API key IDs
    if (a2aConfig.apiKeyIds?.length && !a2aConfig.apiKeyIds.includes(apiKeyRecord.id)) {
      return c.json(jsonRpcError(null, -32003, 'API key not authorized for A2A access'));
    }

    return next();
  };
