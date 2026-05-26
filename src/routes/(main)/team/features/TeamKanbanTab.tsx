import { Flexbox } from '@lobehub/ui';
import { Badge } from 'antd';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

interface TeamKanbanTabProps {
  groupId?: string;
}

const STATUS_COLORS: Record<string, string> = {
  backlog: 'default',
  canceled: 'default',
  completed: 'success',
  failed: 'error',
  running: 'processing',
};

const TeamKanbanTab = memo<TeamKanbanTabProps>(({ groupId }) => {
  const { t } = useTranslation('chat');

  return (
    <Flexbox height={'100%'} padding={16} style={{ overflow: 'auto' }}>
      <Flexbox horizontal gap={16} style={{ minHeight: '100%' }}>
        {(['backlog', 'running', 'completed', 'failed'] as const).map((status) => (
          <Flexbox
            key={status}
            style={{
              background: 'rgba(0,0,0,0.02)',
              borderRadius: 8,
              flex: 1,
              minWidth: 200,
              padding: 12,
            }}
          >
            <Flexbox horizontal align={'center'} gap={8} style={{ marginBottom: 12 }}>
              <Badge status={STATUS_COLORS[status] as any} />
              <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{status}</span>
            </Flexbox>
            <Flexbox gap={8}>
              <div
                style={{
                  color: 'rgba(0,0,0,0.25)',
                  fontSize: 13,
                  textAlign: 'center',
                }}
              >
                {t('team.kanban.noTasks')}
              </div>
            </Flexbox>
          </Flexbox>
        ))}
      </Flexbox>
    </Flexbox>
  );
});

TeamKanbanTab.displayName = 'TeamKanbanTab';

export default TeamKanbanTab;
