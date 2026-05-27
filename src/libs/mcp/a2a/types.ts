/**
 * A2A (Agent-to-Agent) Protocol Types
 * Based on Google A2A specification
 */

// --- Agent Card (Discovery) ---

export interface AgentCard {
  capabilities?: {
    pushNotifications?: boolean;
    streaming?: boolean;
  };
  defaultInputModes?: string[];
  defaultOutputModes?: string[];
  description?: string;
  name: string;
  provider?: {
    organization?: string;
    url?: string;
  };
  security?: Record<string, string[]>[];
  securitySchemes?: Record<string, SecurityScheme>;
  skills: AgentSkill[];
  url: string;
  version?: string;
}

export interface AgentSkill {
  description: string;
  examples?: string[];
  id: string;
  inputModes?: string[];
  name: string;
  outputModes?: string[];
  tags?: string[];
}

export interface SecurityScheme {
  flows?: Record<string, any>;
  in?: string;
  name?: string;
  openIdConnectUrl?: string;
  scheme?: string;
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
}

// --- Task Lifecycle ---

export type TaskState =
  | 'canceled'
  | 'completed'
  | 'failed'
  | 'input-required'
  | 'rejected'
  | 'submitted'
  | 'working';

export interface A2ATask {
  artifacts?: A2AArtifact[];
  history?: A2AMessage[];
  id: string;
  metadata?: Record<string, any>;
  sessionId?: string;
  status: {
    message?: A2AMessage;
    state: TaskState;
    timestamp?: string;
  };
}

export interface A2AArtifact {
  artifactId: string;
  description?: string;
  metadata?: Record<string, any>;
  name?: string;
  parts: A2APart[];
}

// --- Messages ---

export interface A2AMessage {
  messageId: string;
  metadata?: Record<string, any>;
  parts: A2APart[];
  referenceTaskIds?: string[];
  role: 'user' | 'agent';
  taskId?: string;
}

export type A2APart = A2ADataPart | A2AFilePart | A2ATextPart;

export interface A2ATextPart {
  kind: 'text';
  metadata?: Record<string, any>;
  text: string;
}

export interface A2AFilePart {
  file: {
    bytes?: string;
    mimeType?: string;
    name?: string;
    uri?: string;
  };
  kind: 'file';
  metadata?: Record<string, any>;
}

export interface A2ADataPart {
  data: Record<string, any>;
  kind: 'data';
  metadata?: Record<string, any>;
}

// --- JSON-RPC ---

export interface A2AJsonRpcRequest {
  id: string | number;
  jsonrpc: '2.0';
  method: string;
  params: Record<string, any>;
}

export interface A2AJsonRpcResponse<T = any> {
  error?: {
    code: number;
    data?: any;
    message: string;
  };
  id: string | number;
  jsonrpc: '2.0';
  result?: T;
}

// --- Constants ---

export const A2A_METHODS = {
  TASKS_CANCEL: 'tasks/cancel',
  TASKS_GET: 'tasks/get',
  TASKS_SEND: 'tasks/send',
} as const;

// --- Internal helpers ---

export interface A2ATaskMetadata {
  groupId: string;
  operationId: string;
  topicId?: string;
  userId: string;
}
