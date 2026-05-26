'use client';

import { Modal } from '@lobehub/ui';
import { Form, Input, Select } from 'antd';
import { type FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useToolStore } from '@/store/tool';

interface CreateA2AAgentModalProps {
  onCancel: () => void;
  onSuccess: () => void;
  open: boolean;
}

const CreateA2AAgentModal: FC<CreateA2AAgentModalProps> = ({ open, onCancel, onSuccess }) => {
  const { t } = useTranslation('setting');
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const installCustomPlugin = useToolStore((s) => s.installCustomPlugin);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      await installCustomPlugin({
        customParams: {
          avatar: values.avatar,
          description: values.description,
          mcp: {
            capabilities: values.capabilities,
            type: 'a2a',
            url: values.endpoint,
          },
        },
        identifier: values.identifier,
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
      okText={t('a2a.add')}
      open={open}
      title={t('a2a.addTitle')}
      width={520}
      onCancel={handleCancel}
      onOk={handleSubmit}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          label={t('a2a.name.label')}
          name="identifier"
          rules={[
            { required: true, message: t('a2a.name.required') },
            { pattern: /^[\w-]+$/, message: t('a2a.name.invalid') },
          ]}
        >
          <Input placeholder={t('a2a.name.placeholder')} />
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

export default CreateA2AAgentModal;
