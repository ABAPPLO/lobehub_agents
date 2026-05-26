import { usePrevious, useUnmount } from 'ahooks';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { createStoreUpdater } from 'zustand-utils';

import { useQueryRoute } from '@/hooks/useQueryRoute';
import { useAgentGroupStore } from '@/store/agentGroup';
import { useChatStore } from '@/store/chat';

const TeamIdSync = () => {
  const useAgentGroupStoreUpdater = createStoreUpdater(useAgentGroupStore);
  const useChatStoreUpdater = createStoreUpdater(useChatStore);
  const params = useParams<{ gid?: string }>();
  const prevGroupId = usePrevious(params.gid);
  const router = useQueryRoute();

  useAgentGroupStoreUpdater('activeGroupId', params.gid);
  useChatStoreUpdater('activeGroupId', params.gid);
  useAgentGroupStoreUpdater('router', router);

  useEffect(() => {
    if (prevGroupId !== undefined && prevGroupId !== params.gid) {
      useChatStore.getState().switchTopic(null, { skipRefreshMessage: true });
    }
  }, [params.gid, prevGroupId]);

  useUnmount(() => {
    useAgentGroupStore.setState({ activeGroupId: undefined, router: undefined });
    useChatStore.setState({ activeGroupId: undefined, activeTopicId: undefined });
  });

  return null;
};

export default TeamIdSync;
