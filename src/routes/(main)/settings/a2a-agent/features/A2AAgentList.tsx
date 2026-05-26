'use client';

import { Empty } from '@lobehub/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { useToolStore } from '@/store/tool';
import { pluginSelectors } from '@/store/tool/selectors';

import A2AAgentCard from './A2AAgentCard';

interface A2AAgentListProps {
  onDeleteSuccess: () => void;
  onEdit: (id: string) => void;
}

const A2AAgentList = memo<A2AAgentListProps>(({ onEdit, onDeleteSuccess }) => {
  const { t } = useTranslation('setting');

  const allPlugins = useToolStore(pluginSelectors.installedPlugins);
  const a2aAgents = allPlugins.filter(
    (p) => p.type === 'customPlugin' && p.customParams?.mcp?.type === 'a2a',
  );

  if (a2aAgents.length === 0) {
    return <Empty description={t('a2a.emptyDesc')} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {a2aAgents.map((agent) => (
        <A2AAgentCard
          agent={agent}
          key={agent.identifier}
          onDeleteSuccess={onDeleteSuccess}
          onEdit={() => onEdit(agent.identifier)}
        />
      ))}
    </div>
  );
});

export default A2AAgentList;
