import { TeamBuilderApiName } from '../../types';
import ProposeTeamPlanRender from './ProposeTeamPlan';

export const TeamBuilderRenders: Record<string, any> = {
  [TeamBuilderApiName.proposeTeamPlan]: ProposeTeamPlanRender,
};

export { ProposeTeamPlanRender };
