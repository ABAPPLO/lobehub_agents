import { Users } from 'lucide-react';

import { type DynamicRouteMeta, routeMeta } from '@/spa/router/routeMeta';
import { useAgentGroupStore } from '@/store/agentGroup';

export const teamRouteMeta = routeMeta({
  icon: Users,
  titleKey: 'navigation.team',
  useDynamicMeta: (params): DynamicRouteMeta => {
    const group = useAgentGroupStore((s) => (params.gid ? s.groupMap[params.gid] : undefined));

    return {
      avatar: group?.avatar || undefined,
      backgroundColor: group?.backgroundColor || undefined,
      title: group?.title || undefined,
    };
  },
});
