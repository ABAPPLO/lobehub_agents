import { TeamBuilderApiName } from '../../types';
import ProposeTeamPlanInspector from './ProposeTeamPlan';

export const TeamBuilderInspectors: Record<string, any> = {
  [TeamBuilderApiName.proposeTeamPlan]: ProposeTeamPlanInspector,
};

export { ProposeTeamPlanInspector };
