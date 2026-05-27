import { safeParseJSON } from '@lobechat/utils';
import debug from 'debug';
import { v4 as uuidv4 } from 'uuid';

import {
  type A2AArtifact,
  type A2AJsonRpcResponse,
  type A2ATask,
  type TaskState,
} from '@/libs/mcp/a2a/types';

const log = debug('lobe-mcp:a2a-execution');

const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 120_000;

/**
 * Execute an A2A tool call via JSON-RPC `tasks/send`.
 * If the task enters `working` state, polls `tasks/get` until completion.
 */
export const executeA2AToolCall = async (options: {
  args: string;
  baseUrl: string;
  toolName: string;
}): Promise<{ content: string; success: boolean }> => {
  const { baseUrl, toolName, args } = options;
  const url = baseUrl.replace(/\/+$/, '');
  const taskId = uuidv4();

  // Parse args — may be JSON string or plain text
  const parsed = safeParseJSON(args);
  const messageText =
    typeof parsed === 'object' && parsed !== null && 'message' in parsed
      ? String(parsed.message)
      : typeof parsed === 'string'
        ? parsed
        : JSON.stringify(parsed ?? args);

  const sendRequest = {
    id: uuidv4(),
    jsonrpc: '2.0',
    method: 'tasks/send',
    params: {
      id: taskId,
      message: {
        messageId: uuidv4(),
        parts: [{ kind: 'text' as const, text: `[Skill: ${toolName}] ${messageText}` }],
        role: 'user' as const,
      },
    },
  };

  log('Sending A2A task: %s to %s (skill: %s)', taskId, url, toolName);

  const response = await fetch(url, {
    body: JSON.stringify(sendRequest),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`A2A task send failed: ${response.status} ${errorText}`);
  }

  const jsonRpcResult = (await response.json()) as A2AJsonRpcResponse<A2ATask>;

  if (jsonRpcResult.error) {
    throw new Error(
      `A2A JSON-RPC error: [${jsonRpcResult.error.code}] ${jsonRpcResult.error.message}`,
    );
  }

  const task = jsonRpcResult.result;

  // If task completed immediately, return result
  if (task?.status?.state === 'completed') {
    return extractTaskResult(task);
  }

  // If task is working, poll until done
  if (task?.status?.state === 'working') {
    const finalTask = await pollTaskUntilDone(url, taskId);
    return extractTaskResult(finalTask);
  }

  // Handle terminal states
  if (task?.status?.state === 'failed') {
    return {
      content:
        task.status.message?.parts
          ?.filter((p: any) => p.kind === 'text')
          .map((p: any) => p.text)
          .join('\n') || 'A2A task failed',
      success: false,
    };
  }

  // For other states (submitted, input-required, etc.), return status info
  return {
    content: `A2A task ${taskId} is in state: ${task?.status?.state ?? 'unknown'}`,
    success: false,
  };
};

const pollTaskUntilDone = async (url: string, taskId: string): Promise<A2ATask> => {
  const startTime = Date.now();

  while (Date.now() - startTime < POLL_TIMEOUT_MS) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const getRequest = {
      id: uuidv4(),
      jsonrpc: '2.0',
      method: 'tasks/get',
      params: { id: taskId },
    };

    const response = await fetch(url, {
      body: JSON.stringify(getRequest),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) continue;

    const jsonRpcResult = (await response.json()) as A2AJsonRpcResponse<A2ATask>;

    if (jsonRpcResult.error) {
      log('A2A poll error: %O', jsonRpcResult.error);
      continue;
    }

    const task = jsonRpcResult.result;
    const state = task?.status?.state as TaskState | undefined;

    if (
      state === 'completed' ||
      state === 'failed' ||
      state === 'canceled' ||
      state === 'rejected'
    ) {
      return task!;
    }

    log('A2A task %s still %s, polling...', taskId, state);
  }

  throw new Error(`A2A task ${taskId} timed out after ${POLL_TIMEOUT_MS / 1000}s`);
};

const extractTaskResult = (task: A2ATask): { content: string; success: boolean } => {
  // Prefer artifacts
  if (task.artifacts?.length) {
    const text = task.artifacts
      .flatMap((a: A2AArtifact) =>
        a.parts.filter((p: any) => p.kind === 'text').map((p: any) => p.text),
      )
      .filter(Boolean)
      .join('\n');

    if (text) return { content: text, success: true };
  }

  // Fall back to status message
  const statusText = task.status?.message?.parts
    ?.filter((p: any) => p.kind === 'text')
    .map((p: any) => p.text)
    .filter(Boolean)
    .join('\n');

  if (statusText) {
    return { content: statusText, success: task.status?.state === 'completed' };
  }

  return { content: `A2A task ${task.id} completed with no output`, success: true };
};
