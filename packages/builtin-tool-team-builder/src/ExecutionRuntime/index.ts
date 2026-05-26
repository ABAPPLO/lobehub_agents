import type { ProposeTeamPlanParams, ProposeTeamPlanState } from '../types';

export class TeamBuilderExecutionRuntime {
  proposeTeamPlan = async (
    params: ProposeTeamPlanParams,
  ): Promise<{ content: string; state: ProposeTeamPlanState; success: boolean }> => {
    const memberCount = params.members.length;
    const taskCount = params.tasks.length;

    const memberSummary = params.members.map((m) => `- ${m.title} (${m.avatar})`).join('\n');
    const taskSummary = params.tasks.map((t) => `- ${t.name} → ${t.assigneeTitle}`).join('\n');

    const content = `## Team Plan Proposed

**Strategy**: ${params.strategy}

**Members** (${memberCount}):
${memberSummary}

**Tasks** (${taskCount}):
${taskSummary}

**Evaluation Criteria**: ${params.evaluationCriteria.length} criteria defined

The plan is waiting for user review and approval.`;

    return {
      content,
      state: { approved: false, planStored: true },
      success: true,
    };
  };
}

export const teamBuilderExecutionRuntime = new TeamBuilderExecutionRuntime();
