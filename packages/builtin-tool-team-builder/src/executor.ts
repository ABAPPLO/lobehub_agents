import type { BuiltinToolContext, BuiltinToolResult } from '@lobechat/types';
import { BaseExecutor } from '@lobechat/types';

import { TeamBuilderExecutionRuntime } from './ExecutionRuntime';
import { type ProposeTeamPlanParams, TeamBuilderApiName, TeamBuilderIdentifier } from './types';

const runtime = new TeamBuilderExecutionRuntime();

class TeamBuilderExecutor extends BaseExecutor<typeof TeamBuilderApiName> {
  readonly identifier = TeamBuilderIdentifier;
  protected readonly apiEnum = TeamBuilderApiName;

  proposeTeamPlan = async (
    params: ProposeTeamPlanParams,
    _ctx: BuiltinToolContext,
  ): Promise<BuiltinToolResult> => {
    const result = await runtime.proposeTeamPlan(params);

    return {
      content: result.content,
      state: result.state,
      success: result.success,
    };
  };
}

export const teamBuilderExecutor = new TeamBuilderExecutor();
