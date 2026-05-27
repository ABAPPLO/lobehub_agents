import { type SidebarAgentItem } from '@lobechat/types';
import type { IconProps } from '@lobehub/ui';
import { Flexbox, Icon } from '@lobehub/ui';
import { GroupBotSquareIcon } from '@lobehub/ui/icons';
import { MoreHorizontal, Users } from 'lucide-react';
import { type CSSProperties } from 'react';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import NavItem from '@/features/NavPanel/components/NavItem';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';
import { useHomeStore } from '@/store/home';
import { homeAgentListSelectors } from '@/store/home/selectors';
import { SessionDefaultGroup } from '@/types/session';

import { useCreateMenuItems } from '../../../hooks';
import CreateAgentButton from '../CreateAgentButton';
import GroupItem from './AgentGroupItem';
import AgentItem from './AgentItem';

const triggerMenuItemClick = (
  item:
    | ReturnType<typeof useCreateMenuItems>['createGroupChatMenuItem']
    | ReturnType<typeof useCreateMenuItems>['createTeamMenuItem'],
) => {
  const menuItem = item();
  if (menuItem && 'onClick' in menuItem && typeof menuItem.onClick === 'function') {
    menuItem.onClick({ domEvent: new MouseEvent('click') } as any);
  }
};

interface SessionListProps {
  dataSource: SidebarAgentItem[];
  groupId?: string;
  itemClassName?: string;
  itemStyle?: CSSProperties;
  onMoreClick?: () => void;
}

const List = memo<SessionListProps>(
  ({ onMoreClick, dataSource, groupId, itemStyle, itemClassName }) => {
    const { t } = useTranslation('chat');
    const { createGroupChatMenuItem, createTeamMenuItem } = useCreateMenuItems();

    // Early return for empty state
    const isEmpty = useMemo(() => dataSource.length === 0, [dataSource.length]);

    // Check if this is defaultList and if there are more agents
    const isDefaultList = groupId === SessionDefaultGroup.Default;
    const ungroupedAgentsCount = useHomeStore(homeAgentListSelectors.ungroupedAgentsCount);
    const agentPageSize = useGlobalStore(systemStatusSelectors.agentPageSize);
    const openAllAgentsDrawer = useHomeStore((s) => s.openAllAgentsDrawer);

    const hasMore = isDefaultList && ungroupedAgentsCount > agentPageSize;

    const showCreateButton = isEmpty ? groupId !== undefined : isDefaultList && !hasMore;

    const showExtraCreateEntries = isDefaultList;

    const renderGroupChatIcon = (props: IconProps) => <Icon {...props} icon={GroupBotSquareIcon} />;
    const renderTeamIcon = (props: IconProps) => <Icon {...props} icon={Users} />;

    if (isEmpty) {
      return showCreateButton ? (
        <Flexbox gap={1}>
          <CreateAgentButton className={itemClassName} groupId={groupId} />
          {showExtraCreateEntries && (
            <>
              <NavItem
                icon={renderGroupChatIcon}
                title={t('newGroupChat')}
                onClick={() => triggerMenuItemClick(createGroupChatMenuItem)}
              />
              <NavItem
                icon={renderTeamIcon}
                title={t('newTeam')}
                onClick={() => triggerMenuItemClick(createTeamMenuItem)}
              />
            </>
          )}
        </Flexbox>
      ) : null;
    }

    return (
      <Flexbox gap={1}>
        {dataSource.map((item) =>
          item.type === 'group' ? (
            <GroupItem className={itemClassName} item={item} key={item.id} style={itemStyle} />
          ) : (
            <AgentItem className={itemClassName} item={item} key={item.id} style={itemStyle} />
          ),
        )}
        {hasMore && (
          <NavItem
            icon={MoreHorizontal}
            title={t('input.more')}
            onClick={onMoreClick || openAllAgentsDrawer}
          />
        )}
        {showCreateButton && <CreateAgentButton className={itemClassName} groupId={groupId} />}
        {showExtraCreateEntries && (
          <>
            <NavItem
              icon={renderGroupChatIcon}
              title={t('newGroupChat')}
              onClick={() => triggerMenuItemClick(createGroupChatMenuItem)}
            />
            <NavItem
              icon={renderTeamIcon}
              title={t('newTeam')}
              onClick={() => triggerMenuItemClick(createTeamMenuItem)}
            />
          </>
        )}
      </Flexbox>
    );
  },
);

export default List;
