import { and, eq, sql } from 'drizzle-orm';
import type { Context } from 'hono';

import { getServerDB } from '@/database/core/db-adaptor';
import { agentOperations } from '@/database/schemas';
import type { A2AJsonRpcRequest, TaskState } from '@/libs/mcp/a2a/types';

import { jsonRpcError, jsonRpcResult } from '../utils/jsonRpc';

const mapToA2AState = (status: string): TaskState => {
  switch (status) {
    case 'idle': {
      return 'submitted';
    }
    case 'running': {
      return 'working';
    }
    case 'waiting_for_human': {
      return 'input-required';
    }
    case 'done': {
      return 'completed';
    }
    case 'error': {
      return 'failed';
    }
    case 'interrupted': {
      return 'canceled';
    }
    default: {
      return 'working';
    }
  }
};

export async function tasksGet(c: Context, request: A2AJsonRpcRequest): Promise<Response> {
  const ownerUserId = c.get('ownerUserId');

  const params = request.params ?? {};
  const taskId = params.id;

  if (!taskId) {
    return c.json(jsonRpcError(request.id ?? null, -32602, 'Missing task id in params'));
  }

  const db = await getServerDB();

  // Find operation by A2A task ID stored in metadata (GIN index)
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

  const state = mapToA2AState(operation.status);

  const task: any = {
    id: taskId,
    status: {
      state,
      timestamp: operation.completedAt?.toISOString() || operation.updatedAt?.toISOString(),
    },
  };

  // If completed, fetch the assistant message to build artifacts
  if (state === 'completed' && operation.topicId) {
    try {
      const messages = await db.query.messages.findMany({
        limit: 1,
        orderBy: (m: any, { desc }: any) => [desc(m.createdAt)],
        where: (m: any, { and: andFn, eq: eqFn }: any) =>
          andFn(eqFn(m.topicId, operation.topicId), eqFn(m.role, 'assistant')),
      });

      if (messages.length > 0) {
        const msg = messages[0];
        task.artifacts = [
          {
            artifactId: msg.id,
            description: 'Agent response',
            name: 'Response',
            parts: [{ kind: 'text', text: msg.content }],
          },
        ];
      }
    } catch {
      // If message fetch fails, still return the task status without artifacts
    }
  }

  return c.json(jsonRpcResult(request.id ?? null, task));
}
