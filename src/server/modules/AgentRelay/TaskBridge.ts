import { eq, sql } from 'drizzle-orm';

import { getServerDB } from '@/database/core/db-adaptor';
import { AgentGroupRepository } from '@/database/repositories/agentGroup';
import { agentOperations } from '@/database/schemas';
import type { A2APart, A2ATextPart, TaskState } from '@/libs/mcp/a2a/types';
import type {
  StreamEvent,
  StreamEventManager,
} from '@/server/modules/AgentRuntime/StreamEventManager';
import { AiAgentService } from '@/server/services/aiAgent';

import type { AgentRelayConnection } from './AgentRelayConnection';

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

const TERMINAL_STATES = new Set(['completed', 'failed', 'canceled']);

export class TaskBridge {
  private activeTasks = new Map<string, AbortController>();
  private streamManager: StreamEventManager | null = null;

  constructor(
    private mode: 'agent' | 'group',
    private entityId: string,
    private ownerUserId: string,
    private connection: AgentRelayConnection,
    private streamingEnabled: boolean = false,
  ) {}

  /** @deprecated Use mode-based constructor instead. Kept for backward compat. */
  static forGroup(
    groupId: string,
    ownerUserId: string,
    connection: AgentRelayConnection,
    streamingEnabled: boolean = false,
  ): TaskBridge {
    return new TaskBridge('group', groupId, ownerUserId, connection, streamingEnabled);
  }

  static forAgent(
    agentId: string,
    ownerUserId: string,
    connection: AgentRelayConnection,
    streamingEnabled: boolean = false,
  ): TaskBridge {
    return new TaskBridge('agent', agentId, ownerUserId, connection, streamingEnabled);
  }

  setStreamManager(manager: StreamEventManager): void {
    this.streamManager = manager;
  }

  async executeTask(taskId: string, parts: A2APart[]): Promise<void> {
    const textContent = parts
      .filter((p): p is A2ATextPart => p.kind === 'text')
      .map((p) => p.text)
      .join('\n');

    if (!textContent) {
      this.connection.send({
        type: 'task_failed',
        taskId,
        error: 'No message content provided',
      });
      return;
    }

    try {
      const db = await getServerDB();
      const aiAgentService = new AiAgentService(db, this.ownerUserId);

      let operationId: string;
      let topicId: string | undefined;

      if (this.mode === 'agent') {
        const result = await aiAgentService.execAgent({
          agentId: this.entityId,
          autoStart: true,
          prompt: textContent,
        });

        if (!result.success) {
          this.connection.send({
            type: 'task_failed',
            taskId,
            error: 'Agent execution failed to start',
          });
          return;
        }

        operationId = result.operationId;
        topicId = result.topicId;
      } else {
        const repo = new AgentGroupRepository(db, this.ownerUserId);
        const detail = await repo.findByIdWithAgents(this.entityId);

        if (!detail?.supervisorAgentId) {
          this.connection.send({
            type: 'task_failed',
            taskId,
            error: 'No supervisor agent found for this group',
          });
          return;
        }

        const result = await aiAgentService.execGroupAgent({
          agentId: detail.supervisorAgentId,
          groupId: this.entityId,
          message: textContent,
          newTopic: { title: `Relay: ${textContent.slice(0, 50)}` },
        });

        if (!result.success) {
          this.connection.send({
            type: 'task_failed',
            taskId,
            error: 'Agent execution failed to start',
          });
          return;
        }

        operationId = result.operationId;
        topicId = result.topicId;
      }

      // Store A2A task ID in operation metadata
      await db
        .update(agentOperations)
        .set({
          metadata: sql`COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({ a2aTaskId: taskId })}::jsonb`,
        })
        .where(eq(agentOperations.id, operationId));

      // Send accepted
      this.connection.send({
        type: 'task_accepted',
        taskId,
        state: 'working',
      });

      // Track this task
      const abortController = new AbortController();
      this.activeTasks.set(taskId, abortController);

      // Subscribe to stream events if enabled
      if (this.streamingEnabled && this.streamManager) {
        this.subscribeToStreamEvents(taskId, operationId, abortController.signal);
      }

      // Subscribe to completion — use setImmediate to avoid blocking
      setImmediate(() => this.pollForCompletion(taskId, operationId, abortController.signal));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.connection.send({
        type: 'task_failed',
        taskId,
        error: message,
      });
    }
  }

  async cancelTask(taskId: string): Promise<void> {
    const abortController = this.activeTasks.get(taskId);
    if (abortController) {
      abortController.abort();
      this.activeTasks.delete(taskId);
    }

    try {
      const db = await getServerDB();
      const [operation] = await db
        .select()
        .from(agentOperations)
        .where(sql`${agentOperations.metadata} @> ${JSON.stringify({ a2aTaskId: taskId })}::jsonb`)
        .limit(1);

      if (operation) {
        await db
          .update(agentOperations)
          .set({ status: 'interrupted' })
          .where(eq(agentOperations.id, operation.id));
      }
    } catch {
      // Best effort
    }

    this.connection.send({
      type: 'task_cancelled',
      taskId,
    });
  }

  async queryStatus(taskId: string): Promise<void> {
    try {
      const db = await getServerDB();
      const [operation] = await db
        .select()
        .from(agentOperations)
        .where(sql`${agentOperations.metadata} @> ${JSON.stringify({ a2aTaskId: taskId })}::jsonb`)
        .limit(1);

      if (!operation) {
        // Not found — still being created
        this.connection.send({
          type: 'task_accepted',
          taskId,
          state: 'working',
        });
        return;
      }

      const state = mapToA2AState(operation.status);
      if (TERMINAL_STATES.has(state)) {
        await this.sendTaskResult(taskId, state, operation.topicId ?? undefined);
      } else {
        // Still working — send accepted (not cached as terminal by relay)
        this.connection.send({
          type: 'task_accepted',
          taskId,
          state: 'working',
        });
      }
    } catch {
      // On DB error, send accepted (won't be cached as terminal)
      this.connection.send({
        type: 'task_accepted',
        taskId,
        state: 'working',
      });
    }
  }

  cleanup(): void {
    for (const [, controller] of this.activeTasks) {
      controller.abort();
    }
    this.activeTasks.clear();
  }

  // ---------- Private ----------

  private subscribeToStreamEvents(taskId: string, operationId: string, signal: AbortSignal): void {
    if (!this.streamManager) return;

    this.streamManager
      .subscribeStreamEvents(
        operationId,
        '0',
        (events: StreamEvent[]) => {
          for (const event of events) {
            this.connection.send({
              type: 'stream_event',
              taskId,
              event: {
                data: event.data,
                stepIndex: event.stepIndex,
                type: event.type,
              },
            });

            // Check for runtime end event
            if (event.type === 'agent_runtime_end') {
              const abortController = this.activeTasks.get(taskId);
              if (abortController) {
                abortController.abort();
                this.activeTasks.delete(taskId);
              }
            }
          }
        },
        signal,
      )
      .catch(() => {
        // Subscription ended or errored
      });
  }

  private pollForCompletion(taskId: string, operationId: string, signal: AbortSignal): void {
    let done = false;

    const stop = () => {
      if (!done) {
        done = true;
        clearInterval(timer);
      }
    };

    // Stop on abort
    signal.addEventListener('abort', stop, { once: true });

    // Safety: max poll time 5 minutes
    const maxTimer = setTimeout(stop, 5 * 60 * 1000);

    const check = async () => {
      if (done || signal.aborted) return;

      try {
        const db = await getServerDB();
        const [operation] = await db
          .select()
          .from(agentOperations)
          .where(eq(agentOperations.id, operationId))
          .limit(1);

        if (!operation) {
          stop();
          return;
        }

        const state = mapToA2AState(operation.status);
        if (TERMINAL_STATES.has(state)) {
          stop();
          clearTimeout(maxTimer);
          await this.sendTaskResult(taskId, state, operation.topicId ?? undefined);
          this.activeTasks.delete(taskId);
        }
      } catch {
        // Continue polling — setInterval will retry
      }
    };

    const timer = setInterval(check, 3000);
  }

  private async sendTaskResult(taskId: string, state: TaskState, topicId?: string): Promise<void> {
    if (state === 'completed' && topicId) {
      try {
        const db = await getServerDB();
        const messages = await db.query.messages.findMany({
          limit: 1,
          orderBy: (m: any, { desc }: any) => [desc(m.createdAt)],
          where: (m: any, { and: andFn, eq: eqFn }: any) =>
            andFn(eqFn(m.topicId, topicId), eqFn(m.role, 'assistant')),
        });

        if (messages.length > 0) {
          const msg = messages[0];
          this.connection.send({
            type: 'task_completed',
            taskId,
            state,
            artifacts: [
              {
                artifactId: msg.id,
                description: 'Agent response',
                name: 'Response',
                parts: [{ kind: 'text', text: msg.content }],
              },
            ],
          });
          return;
        }
      } catch {
        // Fall through to send without artifacts
      }
    }

    if (state === 'failed') {
      this.connection.send({
        type: 'task_failed',
        taskId,
        error: `Task ended with state: ${state}`,
      });
    } else {
      this.connection.send({
        type: 'task_completed',
        taskId,
        state,
      });
    }
  }
}
