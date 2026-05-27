import type { A2AArtifact, A2APart, AgentCard, TaskState } from '@/libs/mcp/a2a/types';

// ============================================================
// Relay Protocol — Messages between LobeHub (client) and Platform (server)
// ============================================================

/** Messages sent from LobeHub to the Platform */
export type RelayClientMessage =
  | RelayRegister
  | RelayClientPing
  | RelayPong
  | RelayTaskAccepted
  | RelayStreamEvent
  | RelayTaskCompleted
  | RelayTaskFailed
  | RelayTaskCancelled
  | RelayError;

/** Messages sent from the Platform to LobeHub */
export type RelayServerMessage =
  | RelayServerPong
  | RelayRegistered
  | RelayTaskRequest
  | RelayTaskCancel
  | RelayTaskStatusQuery;

// --- Client -> Platform ---

export interface RelayRegister {
  agentCard: AgentCard;
  type: 'register';
}

export interface RelayClientPing {
  type: 'ping';
}

export interface RelayPong {
  type: 'pong';
}

export interface RelayTaskAccepted {
  state: 'working';
  taskId: string;
  type: 'task_accepted';
}

export interface RelayStreamEvent {
  event: {
    data: any;
    stepIndex: number;
    type: string;
  };
  taskId: string;
  type: 'stream_event';
}

export interface RelayTaskCompleted {
  artifacts?: A2AArtifact[];
  state: TaskState;
  taskId: string;
  type: 'task_completed';
}

export interface RelayTaskFailed {
  error: string;
  taskId: string;
  type: 'task_failed';
}

export interface RelayTaskCancelled {
  taskId: string;
  type: 'task_cancelled';
}

export interface RelayError {
  code: string;
  message: string;
  taskId?: string;
  type: 'error';
}

// --- Platform -> Client ---

export interface RelayServerPong {
  type: 'pong';
}

export interface RelayRegistered {
  agentId: string;
  type: 'registered';
}

export interface RelayTaskRequest {
  message: { parts: A2APart[] };
  taskId: string;
  type: 'task_request';
}

export interface RelayTaskCancel {
  taskId: string;
  type: 'task_cancel';
}

export interface RelayTaskStatusQuery {
  taskId: string;
  type: 'task_status';
}

// --- Helpers ---

export const parseRelayMessage = (raw: string): RelayServerMessage | null => {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.type === 'string') {
      return parsed as RelayServerMessage;
    }
    return null;
  } catch {
    return null;
  }
};

export const serializeRelayMessage = (msg: RelayClientMessage): string => {
  return JSON.stringify(msg);
};
