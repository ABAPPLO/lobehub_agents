import { z } from 'zod';

import type { AgentItem } from '../agent';

// ============================================================
// Team Builder Types
// ============================================================

export type TeamStatus =
  | 'assembling'
  | 'completed'
  | 'draft'
  | 'evaluating'
  | 'executing'
  | 'failed'
  | 'plan_review';

export interface EvaluationCriterion {
  /** What to evaluate */
  criterion: string;
  /** How to measure */
  measurement: string;
  /** Pass threshold description */
  threshold: string;
  /** Weight (0-1) */
  weight: number;
}

export interface EvaluationResult {
  criterion: string;
  feedback: string;
  passed: boolean;
  score: number;
}

export interface TeamMemberPlan {
  /** The created agent ID (populated after assembly) */
  agentId?: string;
  /** Whether this member has been approved by user */
  approved: boolean;
  /** Suggested avatar emoji */
  avatar: string;
  /** Why this role is needed */
  rationale: string;
  /** Proposed system prompt */
  systemRole: string;
  /** Suggested role name */
  title: string;
  /** Suggested tools */
  tools?: string[];
}

export interface TeamTaskPlan {
  /** Which member should handle this (by title) */
  assigneeTitle: string;
  /** Dependencies on other tasks (by name) */
  dependsOn?: string[];
  /** Task instruction */
  instruction: string;
  /** Task name */
  name: string;
  /** Priority */
  priority?: number;
  /** Sort order */
  sortOrder: number;
}

export interface TeamPlan {
  /** Host agent's analysis of the requirement */
  analysis: string;
  /** Evaluation criteria defined by host agent */
  evaluationCriteria: EvaluationCriterion[];
  /** Proposed team members */
  members: TeamMemberPlan[];
  /** The user's original requirement text */
  requirement: string;
  /** Overall strategy description */
  strategy: string;
  /** Task breakdown */
  tasks: TeamTaskPlan[];
}

export interface TeamConfig {
  completedAt?: string;
  createdAt?: string;
  evaluationResults?: EvaluationResult[];
  /** ID of the host agent that created the team */
  hostAgentId?: string;
  plan?: TeamPlan;
  status: TeamStatus;
}

// ============================================================
// Chat Group Config
// ============================================================

export interface LobeChatGroupMetaConfig {
  avatar?: string;
  backgroundColor?: string;
  description: string;
  marketIdentifier?: string;
  title: string;
}

export interface A2ARelayConfig {
  /** Platform-assigned agent ID after registration */
  agentId?: string;
  /** Platform relay WebSocket endpoint URL */
  endpoint?: string;
  /** Whether to forward real-time stream events through relay */
  streamingEnabled?: boolean;
  /** Platform auth token */
  token?: string;
}

export interface A2AConfig {
  /** Authorized API key IDs — empty means all of the owner's keys */
  apiKeyIds?: string[];
  /** Master toggle for A2A server exposure */
  enabled?: boolean;
  /** Outbound relay configuration for NAT traversal */
  relay?: A2ARelayConfig;
  /** How member agents map to A2A skills */
  skillMapping?: 'group-as-one' | 'members-as-skills';
}

export interface LobeChatGroupChatConfig {
  a2a?: A2AConfig;
  allowDM?: boolean;
  forkedFromIdentifier?: string;
  openingMessage?: string;
  openingQuestions?: string[];
  revealDM?: boolean;
  systemPrompt?: string;
  /** Team-specific configuration for AI-driven team builder */
  team?: TeamConfig;
}

// Database config type (flat structure)
export type LobeChatGroupConfig = LobeChatGroupChatConfig;

const EvaluationCriterionSchema = z.object({
  criterion: z.string(),
  measurement: z.string(),
  threshold: z.string(),
  weight: z.number(),
});

const EvaluationResultSchema = z.object({
  criterion: z.string(),
  feedback: z.string(),
  passed: z.boolean(),
  score: z.number(),
});

const TeamMemberPlanSchema = z.object({
  agentId: z.string().optional(),
  approved: z.boolean(),
  avatar: z.string(),
  rationale: z.string(),
  systemRole: z.string(),
  title: z.string(),
  tools: z.array(z.string()).optional(),
});

const TeamTaskPlanSchema = z.object({
  assigneeTitle: z.string(),
  dependsOn: z.array(z.string()).optional(),
  instruction: z.string(),
  name: z.string(),
  priority: z.number().optional(),
  sortOrder: z.number(),
});

const TeamPlanSchema = z.object({
  analysis: z.string(),
  evaluationCriteria: z.array(EvaluationCriterionSchema),
  members: z.array(TeamMemberPlanSchema),
  requirement: z.string(),
  strategy: z.string(),
  tasks: z.array(TeamTaskPlanSchema),
});

const TeamConfigSchema = z.object({
  completedAt: z.string().optional(),
  createdAt: z.string().optional(),
  evaluationResults: z.array(EvaluationResultSchema).optional(),
  hostAgentId: z.string().optional(),
  plan: TeamPlanSchema.optional(),
  status: z.enum([
    'assembling',
    'completed',
    'draft',
    'evaluating',
    'executing',
    'failed',
    'plan_review',
  ]),
});

// Zod schema for ChatGroupConfig (database insert)
export const ChatGroupConfigSchema = z.object({
  a2a: z
    .object({
      apiKeyIds: z.array(z.string()).optional(),
      enabled: z.boolean().optional(),
      relay: z
        .object({
          agentId: z.string().optional(),
          endpoint: z.string().optional(),
          streamingEnabled: z.boolean().optional(),
          token: z.string().optional(),
        })
        .optional(),
      skillMapping: z.enum(['group-as-one', 'members-as-skills']).optional(),
    })
    .optional(),
  allowDM: z.boolean().optional(),
  forkedFromIdentifier: z.string().optional(),
  openingMessage: z.string().optional(),
  openingQuestions: z.array(z.string()).optional(),
  revealDM: z.boolean().optional(),
  systemPrompt: z.string().optional(),
  team: TeamConfigSchema.optional(),
});

// Zod schema for inserting ChatGroup
export const InsertChatGroupSchema = z.object({
  avatar: z.string().optional().nullable(),
  backgroundColor: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  config: ChatGroupConfigSchema.optional().nullable(),
  content: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  editorData: z.record(z.string(), z.any()).optional().nullable(),
  groupId: z.string().optional().nullable(),
  id: z.string().optional(),
  marketIdentifier: z.string().optional().nullable(),
  pinned: z.boolean().optional().nullable(),
  title: z.string().optional().nullable(),
});

export type InsertChatGroup = z.infer<typeof InsertChatGroupSchema>;

// Full group type with nested structure for UI components
export interface LobeChatGroupFullConfig {
  chat: LobeChatGroupChatConfig;
  meta: LobeChatGroupMetaConfig;
}

// Chat Group Agent types (independent from schema)
export interface ChatGroupAgent {
  agentId: string;
  chatGroupId: string;
  createdAt: Date;
  enabled?: boolean;
  order?: number;
  role?: string;
  updatedAt: Date;
  userId: string;
}

export interface NewChatGroupAgent {
  agentId: string;
  chatGroupId: string;
  enabled?: boolean;
  order?: number;
  role?: string;
  userId: string;
}

// New Chat Group type for creating groups (independent from schema)
export interface NewChatGroup {
  avatar?: string | null;
  backgroundColor?: string | null;
  clientId?: string | null;
  config?: LobeChatGroupConfig | null;
  description?: string | null;
  groupId?: string | null;
  id?: string;
  marketIdentifier?: string | null;
  pinned?: boolean | null;
  title?: string | null;
  userId: string;
}

// Chat Group Item type (independent from schema)
export interface ChatGroupItem {
  accessedAt?: Date;
  avatar?: string | null;
  backgroundColor?: string | null;
  clientId?: string | null;
  config?: LobeChatGroupConfig | null;
  content?: string | null;
  createdAt: Date;
  description?: string | null;
  editorData?: Record<string, any> | null;
  groupId?: string | null;
  id: string;
  marketIdentifier?: string | null;
  pinned?: boolean | null;
  title?: string | null;
  updatedAt: Date;
  userId: string;
}

// Agent item with group role info
export type AgentGroupMember = AgentItem & {
  /**
   * Whether this agent is the supervisor of the group
   */
  isSupervisor: boolean;
};

// Agent Group Detail - extends ChatGroupItem with agents
export interface AgentGroupDetail extends ChatGroupItem {
  agents: AgentGroupMember[];
  /**
   * The supervisor agent ID, if exists
   */
  supervisorAgentId?: string;
}

// Re-export agent execution types for backwards compatibility
export type {
  ExecAgentAppContext,
  ExecAgentParams,
  ExecAgentResult,
  ExecGroupAgentNewTopicOptions,
  ExecGroupAgentParams,
  ExecGroupAgentResponse,
  ExecGroupAgentResult,
  ExecGroupSubAgentTaskParams,
  ExecGroupSubAgentTaskResult,
  ExecSubAgentTaskParams,
  ExecSubAgentTaskResult,
  TaskCurrentActivity,
  TaskStatusResult,
} from '../agentExecution';
