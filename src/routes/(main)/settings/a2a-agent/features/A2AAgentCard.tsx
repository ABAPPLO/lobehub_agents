'use client';

import type { LobeTool } from '@lobechat/types';
import { Avatar, Button, DropdownMenu, Flexbox, Icon, stopPropagation, Tag } from '@lobehub/ui';
import { App } from 'antd';
import { MoreHorizontalIcon, Pencil, Trash2 } from 'lucide-react';
import { type FC, memo } from 'react';
import { useTranslation } from 'react-i18next';

import { useToolStore } from '@/store/tool';

interface A2AAgentCardProps {
  agent: LobeTool;
  onDeleteSuccess: () => void;
  onEdit: () => void;
}

const A2AAgentCard: FC<A2AAgentCardProps> = memo(({ agent, onEdit, onDeleteSuccess }) => {
  const { t } = useTranslation('setting');
  const { modal } = App.useApp();
  const uninstallPlugin = useToolStore((s) => s.uninstallCustomPlugin);

  const meta = agent.manifest?.meta;
  const params = agent.customParams?.mcp;
  const capabilities = params?.capabilities || [];

  const handleDelete = () => {
    modal.confirm({
      centered: true,
      content: t('a2a.deleteConfirm'),
      okButtonProps: { danger: true },
      okText: t('a2a.delete'),
      onOk: async () => {
        await uninstallPlugin(agent.identifier);
        onDeleteSuccess();
      },
      title: t('a2a.deleteTitle'),
      type: 'error',
    });
  };

  const menuItems = [
    {
      icon: <Icon icon={Pencil} />,
      key: 'edit',
      label: t('a2a.edit'),
      onClick: onEdit,
    },
    {
      danger: true,
      icon: <Icon icon={Trash2} />,
      key: 'delete',
      label: t('a2a.delete'),
      onClick: handleDelete,
    },
  ];

  return (
    <Flexbox
      horizontal
      align="center"
      gap={16}
      style={{
        padding: '12px 16px',
        border: '1px solid var(--lobe-color-border-secondary)',
        borderRadius: 'var(--lobe-border-radius-lg)',
      }}
    >
      <Flexbox horizontal align="center" gap={16} style={{ flex: 1, overflow: 'hidden' }}>
        <Avatar avatar={meta?.avatar} size={40} style={{ flexShrink: 0 }}>
          {meta?.title?.[0] || '?'}
        </Avatar>
        <Flexbox gap={4} style={{ overflow: 'hidden' }}>
          <Flexbox horizontal align="center" gap={8}>
            <span style={{ fontWeight: 500 }}>{meta?.title || agent.identifier}</span>
            <Tag color="blue">A2A</Tag>
          </Flexbox>
          <code style={{ fontSize: 12, color: 'var(--lobe-color-text-tertiary)' }}>
            {params?.url || '-'}
          </code>
          {capabilities.length > 0 && (
            <Flexbox horizontal align="center" gap={4} style={{ flexWrap: 'wrap', marginTop: 2 }}>
              {capabilities.map((cap) => (
                <Tag
                  key={cap}
                  style={{ fontSize: 11, margin: 0, paddingInline: 6, lineHeight: '20px' }}
                >
                  {cap}
                </Tag>
              ))}
            </Flexbox>
          )}
          {meta?.description && (
            <span style={{ fontSize: 12, color: 'var(--lobe-color-text-tertiary)' }}>
              {meta.description}
            </span>
          )}
        </Flexbox>
      </Flexbox>
      <Flexbox horizontal align="center" gap={8} onClick={stopPropagation}>
        <DropdownMenu items={menuItems} placement="bottomRight">
          <Button icon={MoreHorizontalIcon} />
        </DropdownMenu>
      </Flexbox>
    </Flexbox>
  );
});

A2AAgentCard.displayName = 'A2AAgentCard';

export default A2AAgentCard;
