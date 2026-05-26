'use client';

import { Button, Icon } from '@lobehub/ui';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import SettingHeader from '@/routes/(main)/settings/features/SettingHeader';

import A2AAgentList from './features/A2AAgentList';
import CreateA2AAgentModal from './features/CreateA2AAgentModal';
import EditA2AAgentModal from './features/EditA2AAgentModal';

const Page = () => {
  const { t } = useTranslation('setting');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editAgentId, setEditAgentId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setCreateModalOpen(false);
    setEditAgentId(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <>
      <SettingHeader
        title={t('tab.a2aAgent')}
        extra={
          <Button icon={<Icon icon={Plus} />} size="large" onClick={() => setCreateModalOpen(true)}>
            {t('a2a.add')}
          </Button>
        }
      />
      <A2AAgentList
        key={refreshKey}
        onDeleteSuccess={() => setRefreshKey((k) => k + 1)}
        onEdit={(id) => setEditAgentId(id)}
      />
      <CreateA2AAgentModal
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onSuccess={handleSuccess}
      />
      <EditA2AAgentModal
        agentId={editAgentId}
        open={!!editAgentId}
        onCancel={() => setEditAgentId(null)}
        onSuccess={handleSuccess}
      />
    </>
  );
};

Page.displayName = 'A2AAgentSetting';

export default Page;
