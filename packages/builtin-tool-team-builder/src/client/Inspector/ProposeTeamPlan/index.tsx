import type { BuiltinInspectorProps } from '@lobechat/types';
import { memo } from 'react';

interface ProposeTeamPlanParams {
  analysis?: string;
  evaluationCriteria?: Array<{
    criterion: string;
    measurement: string;
    threshold: string;
    weight: number;
  }>;
  members?: Array<{ avatar: string; rationale: string; systemRole: string; title: string }>;
  strategy?: string;
  tasks?: Array<{ assigneeTitle: string; instruction: string; name: string; sortOrder: number }>;
}

interface ProposeTeamPlanState {
  approved?: boolean;
  planStored?: boolean;
}

const ProposeTeamPlanInspector: React.FC<
  BuiltinInspectorProps<ProposeTeamPlanParams, ProposeTeamPlanState>
> = memo(({ args, isLoading }) => {
  if (isLoading) {
    return <div>Generating team plan...</div>;
  }

  if (!args) return null;

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>
        Team Plan: {args.members?.length || 0} members, {args.tasks?.length || 0} tasks
      </div>
      {args.strategy && (
        <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 13, marginBottom: 8 }}>
          {args.strategy}
        </div>
      )}
    </div>
  );
});

ProposeTeamPlanInspector.displayName = 'ProposeTeamPlanInspector';

export default ProposeTeamPlanInspector;
