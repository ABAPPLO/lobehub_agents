import { and, eq, sql } from 'drizzle-orm';
import type { Context } from 'hono';

import { getServerDB } from '@/database/core/db-adaptor';
import { agentOperations } from '@/database/schemas';
import type { A2AJsonRpcRequest } from '@/libs/mcp/a2a/types';

import { jsonRpcError, jsonRpcResult } from '../utils/jsonRpc';

export async function tasksCancel(c: Context, request: A2AJsonRpcRequest): Promise<Response> {
  const ownerUserId = c.get('ownerUserId');

  const params = request.params ?? {};
  const taskId = params.id;

  if (!taskId) {
    return c.json(jsonRpcError(request.id ?? null, -32602, 'Missing task id in params'));
  }

  const db = await getServerDB();

  // Find operation by A2A task ID
  const [operation] = await db
    .select()
    .from(agentOperations)
    .where(
      and(
        eq(agentOperations.userId, ownerUserId),
        sql`${agentOperations.metadata} @> ${JSON.stringify({ a2aTaskId: taskId })}::jsonb`,
      ),
    )
    .limit(1);

  if (!operation) {
    return c.json(jsonRpcError(request.id ?? null, -32004, 'Task not found'));
  }

  // Mark as interrupted
  await db
    .update(agentOperations)
    .set({
      completionReason: 'interrupted',
      completedAt: new Date(),
      interruption: {
        canResume: false,
        interruptedAt: new Date().toISOString(),
        reason: 'Canceled via A2A tasks/cancel',
      },
      status: 'interrupted',
    })
    .where(eq(agentOperations.id, operation.id));

  return c.json(
    jsonRpcResult(request.id ?? null, {
      id: taskId,
      status: {
        state: 'canceled',
        timestamp: new Date().toISOString(),
      },
    }),
  );
}
