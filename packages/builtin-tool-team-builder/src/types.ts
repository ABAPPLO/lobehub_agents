export const TeamBuilderIdentifier = 'lobe-team-builder' as const;

export const TeamBuilderApiName = {
  proposeTeamPlan: 'proposeTeamPlan',
} as const;

export type TeamBuilderApiNameType = (typeof TeamBuilderApiName)[keyof typeof TeamBuilderApiName];

export interface ProposeTeamPlanParams {
  /** Host agent's analysis of the requirement */
  analysis: string;
  /** Evaluation criteria for completion assessment */
  evaluationCriteria: Array<{
    criterion: string;
    measurement: string;
    threshold: string;
    weight: number;
  }>;
  /** Proposed team members */
  members: Array<{
    avatar: string;
    rationale: string;
    systemRole: string;
    title: string;
    tools?: string[];
  }>;
  /** Overall strategy description */
  strategy: string;
  /** Task breakdown */
  tasks: Array<{
    assigneeTitle: string;
    dependsOn?: string[];
    instruction: string;
    name: string;
    priority?: number;
    sortOrder: number;
  }>;
}

export interface ProposeTeamPlanState {
  /** Whether the plan has been approved by the user */
  approved: boolean;
  /** The stored plan ID for tracking */
  planStored: boolean;
}
