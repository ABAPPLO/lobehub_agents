'use client';

import type { LobeTool } from '@lobechat/types';
import { Modal } from '@lobehub/ui';
import { Form, Input, Select } from 'antd';
import { type FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useToolStore } from '@/store/tool';
import { pluginSelectors } from '@/store/tool/selectors';

interface EditA2AAgentModalProps {
  agentId: string | null;
  onCancel: () => void;
  onSuccess: () => void;
  open: boolean;
}

const EditA2AAgentModal: FC<EditA2AAgentModalProps> = ({ agentId, open, onCancel, onSuccess }) => {
  const { t } = useTranslation('setting');
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const updateCustomPlugin = useToolStore((s) => s.updateCustomPlugin);
  const plugin = useToolStore((s) =>
    agentId ? pluginSelectors.getCustomPluginById(agentId)(s) : undefined,
  ) as LobeTool | undefined;

  useEffect(() => {
    if (open && plugin) {
      const params = plugin.customParams?.mcp;
      form.setFieldsValue({
        avatar: plugin.customParams?.avatar,
        capabilities: params?.capabilities || [],
        description: plugin.customParams?.description,
        endpoint: params?.url || '',
      });
    }
  }, [open, plugin, form]);

  const handleSubmit = async () => {
    if (!agentId || !plugin) return;

    try {
      const values = await form.validateFields();
      setLoading(true);

      await updateCustomPlugin(agentId, {
        customParams: {
          ...plugin.customParams,
          avatar: values.avatar,
          description: values.description,
          mcp: {
            capabilities: values.capabilities,
            type: 'a2a',
            url: values.endpoint,
          },
        },
        identifier: agentId,
        type: 'customPlugin',
      });

      form.resetFields();
      onSuccess();
    } catch {
      // validation error
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      centered
      destroyOnHidden
      confirmLoading={loading}
      okText={t('a2a.save')}
      open={open}
      title={t('a2a.editTitle')}
      width={520}
      onCancel={handleCancel}
      onOk={handleSubmit}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item label={t('a2a.name.label')}>
          <Input disabled value={agentId || ''} />
        </Form.Item>
        <Form.Item label={t('a2a.avatar.label')} name="avatar">
          <Input placeholder={t('a2a.avatar.placeholder')} />
        </Form.Item>
        <Form.Item
          label={t('a2a.endpoint.label')}
          name="endpoint"
          rules={[
            { required: true, message: t('a2a.endpoint.required') },
            {
              validator: async (_, value) => {
                if (value) new URL(value);
              },
              message: t('a2a.endpoint.invalid'),
            },
          ]}
        >
          <Input placeholder={t('a2a.endpoint.placeholder')} />
        </Form.Item>
        <Form.Item
          extra={t('a2a.capabilities.desc')}
          label={t('a2a.capabilities.label')}
          name="capabilities"
          rules={[{ required: true, message: t('a2a.capabilities.required') }]}
        >
          <Select
            mode="tags"
            open={false}
            placeholder={t('a2a.capabilities.placeholder')}
            tokenSeparators={[',']}
          />
        </Form.Item>
        <Form.Item label={t('a2a.description.label')} name="description">
          <Input.TextArea placeholder={t('a2a.description.placeholder')} rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditA2AAgentModal;
