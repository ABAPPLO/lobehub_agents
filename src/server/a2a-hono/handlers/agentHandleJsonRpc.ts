import type { Context } from 'hono';

import type { A2AJsonRpcRequest } from '@/libs/mcp/a2a/types';

import { jsonRpcError } from '../utils/jsonRpc';
import { agentTasksSend } from './agentTasksSend';
import { tasksCancel } from './tasksCancel';
import { tasksGet } from './tasksGet';

export async function agentHandleJsonRpc(c: Context): Promise<Response> {
  let body: A2AJsonRpcRequest;
  try {
    body = await c.req.json();
  } catch {
    return c.json(jsonRpcError(null, -32700, 'Parse error'));
  }

  if (!body || typeof body !== 'object') {
    return c.json(jsonRpcError(null, -32600, 'Invalid Request'));
  }

  const { jsonrpc, method, id } = body;

  if (jsonrpc !== '2.0' || !method) {
    return c.json(jsonRpcError(id ?? null, -32600, 'Invalid Request'));
  }

  switch (method) {
    case 'tasks/send': {
      return agentTasksSend(c, body);
    }
    case 'tasks/get': {
      return tasksGet(c, body);
    }
    case 'tasks/cancel': {
      return tasksCancel(c, body);
    }
    default: {
      return c.json(jsonRpcError(id ?? null, -32601, `Method not found: ${method}`));
    }
  }
}
