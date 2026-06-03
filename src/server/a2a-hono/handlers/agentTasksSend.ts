import { eq, sql } from 'drizzle-orm';
import type { Context } from 'hono';
import { v4 as uuidv4 } from 'uuid';

import { getServerDB } from '@/database/core/db-adaptor';
import { agentOperations } from '@/database/schemas';
import type { A2AJsonRpcRequest, A2ATextPart } from '@/libs/mcp/a2a/types';
import { AiAgentService } from '@/server/services/aiAgent';

import { jsonRpcError, jsonRpcResult } from '../utils/jsonRpc';

export async function agentTasksSend(c: Context, request: A2AJsonRpcRequest): Promise<Response> {
  const agentId = c.get('agentId');
  const ownerUserId = c.get('ownerUserId');

  const params = request.params ?? {};
  const taskId = params.id || uuidv4();

  const messageParts = params.message?.parts || [];
  const textContent = messageParts
    .filter((p: any) => p.kind === 'text')
    .map((p: A2ATextPart) => p.text)
    .join('\n');

  if (!textContent) {
    return c.json(
      jsonRpcResult(request.id ?? null, {
        id: taskId,
        status: {
          message: {
            messageId: uuidv4(),
            parts: [{ kind: 'text', text: 'No message content provided' }],
            role: 'agent',
          },
          state: 'rejected',
          timestamp: new Date().toISOString(),
        },
      }),
    );
  }

  try {
    const db = await getServerDB();
    const aiAgentService = new AiAgentService(db, ownerUserId);
    const result = await aiAgentService.execAgent({
      agentId,
      autoStart: true,
      prompt: textContent,
    });

    if (!result.success) {
      return c.json(
        jsonRpcResult(request.id ?? null, {
          id: taskId,
          status: {
            state: 'failed',
            timestamp: new Date().toISOString(),
          },
        }),
      );
    }

    await db
      .update(agentOperations)
      .set({
        metadata: sql`COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({ a2aTaskId: taskId })}::jsonb`,
      })
      .where(eq(agentOperations.id, result.operationId));

    return c.json(
      jsonRpcResult(request.id ?? null, {
        id: taskId,
        sessionId: result.topicId,
        status: {
          state: 'working',
          timestamp: new Date().toISOString(),
        },
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json(jsonRpcError(request.id ?? null, -32603, `Execution error: ${message}`));
  }
}
