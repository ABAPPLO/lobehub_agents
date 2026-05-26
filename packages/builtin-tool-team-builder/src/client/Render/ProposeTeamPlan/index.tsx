import type { BuiltinRenderProps } from '@lobechat/types';
import { memo } from 'react';

interface MemberDef {
  avatar: string;
  rationale: string;
  systemRole: string;
  title: string;
  tools?: string[];
}

interface TaskDef {
  assigneeTitle: string;
  dependsOn?: string[];
  instruction: string;
  name: string;
  priority?: number;
  sortOrder: number;
}

interface CriterionDef {
  criterion: string;
  measurement: string;
  threshold: string;
  weight: number;
}

interface ProposeTeamPlanParams {
  analysis?: string;
  evaluationCriteria?: CriterionDef[];
  members?: MemberDef[];
  strategy?: string;
  tasks?: TaskDef[];
}

interface ProposeTeamPlanState {
  approved?: boolean;
  planStored?: boolean;
}

const priorityLabel = (p?: number) => {
  if (p === 1) return '🔴';
  if (p === 2) return '🟡';
  if (p === 3) return '🟢';
  return '⚪';
};

const ProposeTeamPlanRender: React.FC<
  BuiltinRenderProps<ProposeTeamPlanParams, ProposeTeamPlanState>
> = memo(({ args }) => {
  if (!args) return null;

  return (
    <div style={{ fontSize: 13, padding: '8px 0' }}>
      {/* Strategy */}
      {args.strategy && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Strategy</div>
          <div style={{ color: 'rgba(0,0,0,0.65)', lineHeight: 1.5 }}>{args.strategy}</div>
        </div>
      )}

      {/* Members */}
      {args.members && args.members.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            Team Members ({args.members.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {args.members.map((m, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(0,0,0,0.02)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  borderRadius: 8,
                  padding: '8px 12px',
                }}
              >
                <div style={{ alignItems: 'center', display: 'flex', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 18 }}>{m.avatar}</span>
                  <span style={{ fontWeight: 600 }}>{m.title}</span>
                </div>
                <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>{m.rationale}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks */}
      {args.tasks && args.tasks.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Tasks ({args.tasks.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {args.tasks
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((t, i) => (
                <div
                  key={i}
                  style={{
                    alignItems: 'center',
                    display: 'flex',
                    gap: 8,
                    padding: '4px 0',
                  }}
                >
                  <span>{priorityLabel(t.priority)}</span>
                  <span style={{ flex: 1 }}>{t.name}</span>
                  <span style={{ color: 'rgba(0,0,0,0.35)', fontSize: 12 }}>
                    → {t.assigneeTitle}
                  </span>
                  {t.dependsOn && t.dependsOn.length > 0 && (
                    <span style={{ color: 'rgba(0,0,0,0.25)', fontSize: 11 }}>
                      (depends: {t.dependsOn.join(', ')})
                    </span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Evaluation Criteria */}
      {args.evaluationCriteria && args.evaluationCriteria.length > 0 && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            Evaluation Criteria ({args.evaluationCriteria.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {args.evaluationCriteria.map((c, i) => (
              <div key={i} style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
                <span
                  style={{
                    background: 'rgba(0,0,0,0.06)',
                    borderRadius: 4,
                    fontSize: 11,
                    padding: '1px 6px',
                  }}
                >
                  {(c.weight * 100).toFixed(0)}%
                </span>
                <span>{c.criterion}</span>
                <span style={{ color: 'rgba(0,0,0,0.35)', fontSize: 12 }}>{c.threshold}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

ProposeTeamPlanRender.displayName = 'ProposeTeamPlanRender';

export default ProposeTeamPlanRender;
