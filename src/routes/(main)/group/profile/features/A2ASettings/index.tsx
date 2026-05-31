'use client';

import { ApiOutlined, CopyOutlined, GlobalOutlined } from '@ant-design/icons';
import { isDesktop } from '@lobechat/const';
import { OFFICIAL_URL } from '@lobechat/const/url';
import { Block, Flexbox, Text } from '@lobehub/ui';
import { Button, Input, message, Select, Switch, Tag, Typography } from 'antd';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { lambdaClient } from '@/libs/trpc/client';
import { useAgentGroupStore } from '@/store/agentGroup';
import { agentGroupSelectors } from '@/store/agentGroup/selectors';
import { electronSyncSelectors } from '@/store/electron/selectors/sync';
import { getElectronStoreState } from '@/store/electron/store';

const { Paragraph } = Typography;

const STATUS_COLORS: Record<string, string> = {
  connected: 'green',
  connecting: 'blue',
  disconnected: 'default',
  error: 'red',
};

const A2ASettings = memo(() => {
  const { t } = useTranslation('setting');
  const groupId = useAgentGroupStore(agentGroupSelectors.activeGroupId);
  const currentGroup = useAgentGroupStore(agentGroupSelectors.currentGroup);
  const updateGroupConfig = useAgentGroupStore((s) => s.updateGroupConfig);

  const a2aConfig = (currentGroup?.config as any)?.a2a;
  const enabled = a2aConfig?.enabled ?? false;
  const skillMapping = a2aConfig?.skillMapping ?? 'group-as-one';
  const relayConfig = useMemo(() => a2aConfig?.relay ?? {}, [a2aConfig?.relay]);

  const [relayStatus, setRelayStatus] = useState<string>('disconnected');
  const [relayLoading, setRelayLoading] = useState(false);

  // Local state for relay inputs — only persist on blur
  const [localEndpoint, setLocalEndpoint] = useState(relayConfig.endpoint || '');
  const [localToken, setLocalToken] = useState(relayConfig.token || '');

  // Sync local state when store config changes externally
  const prevEndpoint = useRef(relayConfig.endpoint);
  const prevToken = useRef(relayConfig.token);
  useEffect(() => {
    if (relayConfig.endpoint !== prevEndpoint.current) {
      prevEndpoint.current = relayConfig.endpoint;
      setLocalEndpoint(relayConfig.endpoint || '');
    }
    if (relayConfig.token !== prevToken.current) {
      prevToken.current = relayConfig.token;
      setLocalToken(relayConfig.token || '');
    }
  }, [relayConfig.endpoint, relayConfig.token]);

  const serverOrigin = useMemo(() => {
    if (isDesktop) {
      const url = electronSyncSelectors.remoteServerUrl(getElectronStoreState());
      if (url) {
        try {
          return new URL(url).origin;
        } catch {
          // fallback to OFFICIAL_URL
        }
      }
      return OFFICIAL_URL;
    }
    return window.location.origin;
  }, []);

  const agentCardUrl = useMemo(
    () => (groupId ? `${serverOrigin}/a2a/${groupId}/.well-known/agent.json` : ''),
    [groupId, serverOrigin],
  );

  const endpointUrl = useMemo(
    () => (groupId ? `${serverOrigin}/a2a/${groupId}` : ''),
    [groupId, serverOrigin],
  );

  const handleToggle = useCallback(
    async (checked: boolean) => {
      await updateGroupConfig({
        a2a: { ...a2aConfig, enabled: checked, skillMapping },
      });
    },
    [updateGroupConfig, a2aConfig, skillMapping],
  );

  const handleSkillMappingChange = useCallback(
    async (value: 'group-as-one' | 'members-as-skills') => {
      await updateGroupConfig({
        a2a: { ...a2aConfig, enabled, skillMapping: value },
      });
    },
    [updateGroupConfig, a2aConfig, enabled],
  );

  // Persist relay field on blur
  const persistRelayField = useCallback(
    (field: string, value: string) => {
      updateGroupConfig({
        a2a: { ...a2aConfig, enabled, skillMapping, relay: { ...relayConfig, [field]: value } },
      });
    },
    [updateGroupConfig, a2aConfig, enabled, skillMapping, relayConfig],
  );

  const handleRelayStreamingChange = useCallback(
    async (checked: boolean) => {
      await updateGroupConfig({
        a2a: {
          ...a2aConfig,
          enabled,
          skillMapping,
          relay: { ...relayConfig, streamingEnabled: checked },
        },
      });
    },
    [updateGroupConfig, a2aConfig, enabled, skillMapping, relayConfig],
  );

  const handleRelayConnect = useCallback(async () => {
    if (!groupId) return;
    setRelayLoading(true);
    try {
      const result = await lambdaClient.aiAgent.agentRelayStart.mutate({ groupId });
      if (result.success && result.data) {
        setRelayStatus(result.data.status);
        if (result.data.agentId) {
          await updateGroupConfig({
            a2a: {
              ...a2aConfig,
              enabled,
              skillMapping,
              relay: { ...relayConfig, agentId: result.data.agentId },
            },
          });
        }
        message.success(t('groupA2A.relay.status.connected'));
      }
    } catch (err: any) {
      message.error(err.message || 'Connection failed');
      setRelayStatus('error');
    } finally {
      setRelayLoading(false);
    }
  }, [groupId, updateGroupConfig, a2aConfig, enabled, skillMapping, relayConfig, t]);

  const handleRelayDisconnect = useCallback(async () => {
    if (!groupId) return;
    setRelayLoading(true);
    try {
      await lambdaClient.aiAgent.agentRelayStop.mutate({ groupId });
      setRelayStatus('disconnected');
    } catch {
      // ignore
    } finally {
      setRelayLoading(false);
    }
  }, [groupId]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('Copied to clipboard');
    });
  }, []);

  if (!groupId) return null;

  const isConnected = relayStatus === 'connected';

  return (
    <Block style={{ marginTop: 16 }} variant="borderless">
      <Flexbox gap={16}>
        <Flexbox horizontal align="center" gap={8} justify="space-between">
          <Flexbox horizontal align="center" gap={8}>
            <GlobalOutlined />
            <Text strong>{t('groupA2A.title')}</Text>
          </Flexbox>
          <Switch checked={enabled} onChange={handleToggle} />
        </Flexbox>

        {enabled && (
          <>
            <Flexbox gap={4}>
              <Text type="secondary">{t('groupA2A.skillMapping.label')}</Text>
              <Select
                style={{ width: '100%' }}
                value={skillMapping}
                options={[
                  { label: t('groupA2A.skillMapping.groupAsOne'), value: 'group-as-one' },
                  { label: t('groupA2A.skillMapping.membersAsSkills'), value: 'members-as-skills' },
                ]}
                onChange={handleSkillMappingChange}
              />
            </Flexbox>

            <Flexbox gap={4}>
              <Text type="secondary">{t('groupA2A.agentCardUrl')}</Text>
              <Flexbox horizontal align="center" gap={4}>
                <Paragraph ellipsis copyable={false} style={{ flex: 1, margin: 0 }}>
                  {agentCardUrl}
                </Paragraph>
                <Button
                  icon={<CopyOutlined />}
                  size="small"
                  onClick={() => copyToClipboard(agentCardUrl)}
                />
              </Flexbox>
            </Flexbox>

            <Flexbox gap={4}>
              <Text type="secondary">{t('groupA2A.endpointUrl')}</Text>
              <Flexbox horizontal align="center" gap={4}>
                <Paragraph ellipsis copyable={false} style={{ flex: 1, margin: 0 }}>
                  {endpointUrl}
                </Paragraph>
                <Button
                  icon={<CopyOutlined />}
                  size="small"
                  onClick={() => copyToClipboard(endpointUrl)}
                />
              </Flexbox>
            </Flexbox>

            <Text style={{ fontSize: 12 }} type="secondary">
              {t('groupA2A.authHint')}
            </Text>

            {/* Relay Connection Section */}
            <Flexbox
              gap={12}
              style={{
                marginTop: 8,
                padding: 12,
                border: '1px solid',
                borderRadius: 8,
                borderColor: 'var(--color-border)',
              }}
            >
              <Flexbox horizontal align="center" gap={8}>
                <ApiOutlined />
                <Text strong>{t('groupA2A.relay.title')}</Text>
                <Tag color={STATUS_COLORS[relayStatus] || 'default'}>
                  {t(`groupA2A.relay.status.${relayStatus}` as any)}
                </Tag>
              </Flexbox>

              <Flexbox gap={4}>
                <Text type="secondary">{t('groupA2A.relay.endpoint')}</Text>
                <Input
                  disabled={isConnected}
                  placeholder="wss://platform.example.com/ws/relay"
                  value={localEndpoint}
                  onBlur={() => persistRelayField('endpoint', localEndpoint)}
                  onChange={(e) => setLocalEndpoint(e.target.value)}
                />
              </Flexbox>

              <Flexbox gap={4}>
                <Text type="secondary">{t('groupA2A.relay.token')}</Text>
                <Input.Password
                  disabled={isConnected}
                  placeholder="Platform auth token"
                  value={localToken}
                  onBlur={() => persistRelayField('token', localToken)}
                  onChange={(e) => setLocalToken(e.target.value)}
                />
              </Flexbox>

              <Flexbox horizontal align="center" gap={8} justify="space-between">
                <Flexbox horizontal align="center" gap={8}>
                  <Text type="secondary">{t('groupA2A.relay.streaming')}</Text>
                  <Switch
                    checked={relayConfig.streamingEnabled ?? false}
                    disabled={isConnected}
                    size="small"
                    onChange={handleRelayStreamingChange}
                  />
                </Flexbox>
                <Button
                  danger={isConnected}
                  loading={relayLoading}
                  size="small"
                  type={isConnected ? 'default' : 'primary'}
                  onClick={isConnected ? handleRelayDisconnect : handleRelayConnect}
                >
                  {isConnected ? t('groupA2A.relay.disconnect') : t('groupA2A.relay.connect')}
                </Button>
              </Flexbox>

              {relayConfig.agentId && (
                <Flexbox gap={4}>
                  <Text type="secondary">{t('groupA2A.relay.agentId')}</Text>
                  <Text code>{relayConfig.agentId}</Text>
                </Flexbox>
              )}
            </Flexbox>
          </>
        )}
      </Flexbox>
    </Block>
  );
});

export default A2ASettings;
