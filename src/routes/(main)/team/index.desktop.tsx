'use client';

import { Flexbox } from '@lobehub/ui';
import type { TabsProps } from 'antd';
import { Tabs } from 'antd';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { teamSelectors, useAgentGroupStore } from '@/store/agentGroup';
import { useChatStore } from '@/store/chat';

import Conversation from '../group/features/Conversation';
import TeamKanbanTab from './features/TeamKanbanTab';
import TeamTimelineTab from './features/TeamTimelineTab';

const TeamDetailPage = memo(() => {
  const { t } = useTranslation('chat');
  const activeGroupId = useChatStore((s) => s.activeGroupId);
  const teamDetailTab = useAgentGroupStore((s) => s.teamDetailTab);
  const setTeamDetailTab = useAgentGroupStore((s) => s.setTeamDetailTab);

  const teamStatus = useAgentGroupStore(
    activeGroupId ? teamSelectors.teamStatus(activeGroupId) : () => undefined,
  );

  const teamPlan = useAgentGroupStore(
    activeGroupId ? teamSelectors.teamPlan(activeGroupId) : () => undefined,
  );

  const tabItems: TabsProps['items'] = useMemo(
    () => [
      {
        children: (
          <Flexbox horizontal height={'100%'} style={{ overflow: 'hidden' }} width={'100%'}>
            <Conversation />
          </Flexbox>
        ),
        key: 'chat',
        label: t('team.tabs.chat'),
      },
      {
        children: <TeamKanbanTab groupId={activeGroupId} />,
        disabled: !teamPlan?.tasks?.length,
        key: 'kanban',
        label: t('team.tabs.kanban'),
      },
      {
        children: <TeamTimelineTab groupId={activeGroupId} />,
        disabled: !teamPlan?.tasks?.length,
        key: 'timeline',
        label: t('team.tabs.timeline'),
      },
    ],
    [t, teamStatus, teamPlan, activeGroupId],
  );

  return (
    <Flexbox height={'100%'} width={'100%'}>
      <Tabs
        activeKey={teamDetailTab}
        items={tabItems}
        style={{ height: '100%', paddingLeft: 16, paddingRight: 16 }}
        onChange={(key) => setTeamDetailTab(key as any)}
      />
    </Flexbox>
  );
});

export default TeamDetailPage;
