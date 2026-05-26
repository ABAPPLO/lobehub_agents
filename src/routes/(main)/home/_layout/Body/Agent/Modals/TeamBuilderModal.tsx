'use client';

import { Button, Flexbox, Icon, Modal, Text } from '@lobehub/ui';
import { cssVar } from 'antd-style';
import { BotIcon } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface TeamBuilderModalProps {
  onCancel: () => void;
  onSubmit: (requirement: string) => Promise<void>;
  open: boolean;
}

const TeamBuilderModal = memo<TeamBuilderModalProps>(({ open, onCancel, onSubmit }) => {
  const { t } = useTranslation('chat');
  const [requirement, setRequirement] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = requirement.trim().length >= 5;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await onSubmit(requirement.trim());
      setRequirement('');
    } finally {
      setLoading(false);
    }
  }, [requirement, canSubmit, onSubmit]);

  const handleCancel = useCallback(() => {
    setRequirement('');
    onCancel();
  }, [onCancel]);

  return (
    <Modal
      centered
      destroyOnHidden
      footer={null}
      open={open}
      title={t('team.builder.title')}
      width={680}
      onCancel={handleCancel}
    >
      <Flexbox gap={20} paddingBlock={8}>
        {/* Agent Builder Expert indicator */}
        <Flexbox
          horizontal
          align="center"
          gap={8}
          style={{
            padding: '10px 14px',
            borderRadius: cssVar.borderRadiusLG,
            background: cssVar.colorFillTertiary,
          }}
        >
          <Icon icon={BotIcon} size={18} style={{ color: cssVar.colorTextSecondary }} />
          <Text style={{ fontSize: 13, color: cssVar.colorTextSecondary }}>
            {t('team.builder.hostHint')}
          </Text>
        </Flexbox>

        {/* Requirement Input */}
        <Flexbox gap={8}>
          <Text style={{ fontSize: 14, fontWeight: 500 }}>
            {t('team.builder.requirementLabel')}
            <Text style={{ color: cssVar.colorError }}>*</Text>
          </Text>
          <textarea
            maxLength={2000}
            placeholder={t('team.builder.requirementPlaceholder')}
            rows={6}
            value={requirement}
            style={{
              border: `1px solid ${cssVar.colorBorderSecondary}`,
              borderRadius: cssVar.borderRadiusLG,
              padding: '10px 14px',
              fontSize: 14,
              lineHeight: '22px',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
              background: cssVar.colorBgContainer,
              color: cssVar.colorText,
            }}
            onChange={(e) => setRequirement(e.target.value)}
          />
        </Flexbox>

        {/* Actions */}
        <Flexbox horizontal gap={8} justify="flex-end">
          <Button onClick={handleCancel}>{t('team.builder.cancel')}</Button>
          <Button disabled={!canSubmit} loading={loading} type="primary" onClick={handleSubmit}>
            {t('team.builder.submit')}
          </Button>
        </Flexbox>
      </Flexbox>
    </Modal>
  );
});

export default TeamBuilderModal;
