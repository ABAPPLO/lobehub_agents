import { Flexbox } from '@lobehub/ui';
import { Timeline } from 'antd';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

interface TeamTimelineTabProps {
  groupId?: string;
}

const TeamTimelineTab = memo<TeamTimelineTabProps>(({ groupId }) => {
  const { t } = useTranslation('chat');

  return (
    <Flexbox height={'100%'} padding={16} style={{ overflow: 'auto' }}>
      <Timeline
        items={[
          {
            children: (
              <Flexbox gap={4}>
                <div style={{ color: 'rgba(0,0,0,0.25)', fontSize: 13 }}>
                  {t('team.timeline.noEvents')}
                </div>
              </Flexbox>
            ),
            color: 'gray',
          },
        ]}
      />
    </Flexbox>
  );
});

TeamTimelineTab.displayName = 'TeamTimelineTab';

export default TeamTimelineTab;
