import type { A2ARelayConfig } from '@lobechat/types';
import debug from 'debug';
import { eq } from 'drizzle-orm';

import { getServerDB } from '@/database/core/db-adaptor';
import { AgentGroupRepository } from '@/database/repositories/agentGroup';
import { agents } from '@/database/schemas';
import { buildSingleAgentCard } from '@/server/a2a-hono/utils/buildSingleAgentCard';
import { buildAgentCard } from '@/server/a2a-hono/utils/buildSkills';
import { StreamEventManager } from '@/server/modules/AgentRuntime/StreamEventManager';

import type { RelayConnectionStatus } from './AgentRelayConnection';
import { AgentRelayConnection } from './AgentRelayConnection';
import type { RelayServerMessage } from './protocol';
import { TaskBridge } from './TaskBridge';

const log = debug('lobe-server:agent-relay:manager');

export interface RelayStatus {
  agentId?: string;
  error?: string;
  status: RelayConnectionStatus;
}

interface ManagedConnection {
  bridge: TaskBridge;
  connection: AgentRelayConnection;
}

/**
 * Singleton manager for all active relay connections.
 * Each group can have at most one active relay connection.
 */
class AgentRelayManager {
  private connections = new Map<string, ManagedConnection>();

  async startRelay(groupId: string, userId: string): Promise<RelayStatus> {
    log('startRelay called for group %s', groupId);
    // Stop existing connection if any
    await this.stopRelay(groupId);

    const db = await getServerDB();
    const repo = new AgentGroupRepository(db, userId);
    const detail = await repo.findByIdWithAgents(groupId);

    if (!detail) {
      throw new Error('Group not found');
    }

    const config = (detail.config as any)?.a2a as
      | { relay?: A2ARelayConfig; skillMapping?: string }
      | undefined;
    const relayConfig = config?.relay;

    if (!relayConfig?.endpoint) {
      throw new Error('Relay endpoint not configured');
    }

    // Build agent card for registration
    const baseUrl = relayConfig.endpoint.replace(/\/ws.*$/, '');
    const agentCard = buildAgentCard(detail, baseUrl, config?.skillMapping as any);

    // Register with platform
    let registeredAgentId = relayConfig.agentId;
    if (!registeredAgentId) {
      try {
        const registerResponse = await fetch(`${baseUrl}/api/v1/agents/register`, {
          body: JSON.stringify({ agentCard }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        });

        if (registerResponse.ok) {
          const data = await registerResponse.json();
          registeredAgentId = data.agentId;
          log('Registered with platform, agentId=%s', registeredAgentId);
        } else {
          log('Registration failed: %d %s', registerResponse.status, await registerResponse.text());
        }
      } catch (err) {
        log('Registration request failed: %O', err);
      }
    }

    // Late-binding message handler — reads bridge from the connections map
    // so it always uses the properly-wired instance.
    const onMessage = (msg: RelayServerMessage) => {
      const managed = this.connections.get(groupId);
      if (managed) {
        this.handleMessage(groupId, managed.bridge, msg);
      } else {
        log('Received message for %s but no managed connection found', groupId);
      }
    };

    // Create connection (uses onMessage which late-binds to the bridge)
    const connection = new AgentRelayConnection(
      groupId,
      relayConfig,
      {
        onMessage,
        onStatusChange: (status: RelayConnectionStatus) => {
          log('Relay status changed for %s: %s', groupId, status);
        },
      },
      (...args: any[]) => log('Relay [%s]:', groupId, ...args),
    );

    // Create bridge with proper connection reference
    const bridge = TaskBridge.forGroup(
      groupId,
      detail.userId,
      connection,
      relayConfig.streamingEnabled ?? false,
    );

    try {
      const streamManager = new StreamEventManager();
      bridge.setStreamManager(streamManager);
    } catch {
      log('StreamEventManager not available — streaming disabled');
    }

    this.connections.set(groupId, { bridge, connection });

    // Connect
    await connection.connect();

    // Send registration through WebSocket
    if (!registeredAgentId) {
      connection.send({ type: 'register', agentCard });
    }

    return {
      agentId: registeredAgentId,
      status: connection.getStatus(),
    };
  }

  async stopRelay(groupId: string): Promise<void> {
    const managed = this.connections.get(groupId);
    if (managed) {
      managed.bridge.cleanup();
      managed.connection.disconnect();
      this.connections.delete(groupId);
      log('Relay stopped for group %s', groupId);
    }
  }

  getStatus(groupId: string): RelayStatus | undefined {
    const managed = this.connections.get(groupId);
    if (!managed) return undefined;
    return {
      status: managed.connection.getStatus(),
    };
  }

  // ---------- Agent Relay ----------

  async startAgentRelay(agentId: string, userId: string): Promise<RelayStatus> {
    log('startAgentRelay called for agent %s', agentId);
    const connectionKey = `agent:${agentId}`;

    await this.stopAgentRelay(agentId);

    const db = await getServerDB();
    const agent = await db.query.agents.findFirst({
      where: eq(agents.id, agentId),
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    const agencyConfig = agent.agencyConfig as any;
    const a2aConfig = agencyConfig?.a2a as { relay?: A2ARelayConfig } | undefined;
    const relayConfig = a2aConfig?.relay;

    if (!relayConfig?.endpoint) {
      throw new Error('Relay endpoint not configured');
    }

    const baseUrl = relayConfig.endpoint.replace(/\/ws.*$/, '');
    const agentCard = buildSingleAgentCard(agent, baseUrl);

    let registeredAgentId = relayConfig.agentId;
    if (!registeredAgentId) {
      try {
        const registerResponse = await fetch(`${baseUrl}/api/v1/agents/register`, {
          body: JSON.stringify({ agentCard }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        });

        if (registerResponse.ok) {
          const data = await registerResponse.json();
          registeredAgentId = data.agentId;
          log('Registered agent with platform, agentId=%s', registeredAgentId);
        } else {
          log(
            'Agent registration failed: %d %s',
            registerResponse.status,
            await registerResponse.text(),
          );
        }
      } catch (err) {
        log('Agent registration request failed: %O', err);
      }
    }

    const onMessage = (msg: RelayServerMessage) => {
      const managed = this.connections.get(connectionKey);
      if (managed) {
        this.handleMessage(connectionKey, managed.bridge, msg);
      } else {
        log('Received message for agent %s but no managed connection found', agentId);
      }
    };

    const connection = new AgentRelayConnection(
      connectionKey,
      relayConfig,
      {
        onMessage,
        onStatusChange: (status: RelayConnectionStatus) => {
          log('Agent relay status changed for %s: %s', agentId, status);
        },
      },
      (...args: any[]) => log('AgentRelay [%s]:', agentId, ...args),
    );

    const bridge = TaskBridge.forAgent(
      agentId,
      agent.userId,
      connection,
      relayConfig.streamingEnabled ?? false,
    );

    try {
      const streamManager = new StreamEventManager();
      bridge.setStreamManager(streamManager);
    } catch {
      log('StreamEventManager not available — streaming disabled');
    }

    this.connections.set(connectionKey, { bridge, connection });

    await connection.connect();

    if (!registeredAgentId) {
      connection.send({ type: 'register', agentCard });
    }

    return {
      agentId: registeredAgentId,
      status: connection.getStatus(),
    };
  }

  async stopAgentRelay(agentId: string): Promise<void> {
    const connectionKey = `agent:${agentId}`;
    const managed = this.connections.get(connectionKey);
    if (managed) {
      managed.bridge.cleanup();
      managed.connection.disconnect();
      this.connections.delete(connectionKey);
      log('Agent relay stopped for %s', agentId);
    }
  }

  getAgentRelayStatus(agentId: string): RelayStatus | undefined {
    const connectionKey = `agent:${agentId}`;
    const managed = this.connections.get(connectionKey);
    if (!managed) return undefined;
    return {
      status: managed.connection.getStatus(),
    };
  }

  // ---------- Message Handling ----------

  private handleMessage(groupId: string, bridge: TaskBridge, msg: RelayServerMessage): void {
    switch (msg.type) {
      case 'task_request': {
        bridge.executeTask(msg.taskId, msg.message.parts).catch((err) => {
          log('Task execution error for %s: %O', msg.taskId, err);
        });
        break;
      }
      case 'task_cancel': {
        bridge.cancelTask(msg.taskId).catch((err) => {
          log('Task cancel error for %s: %O', msg.taskId, err);
        });
        break;
      }
      case 'task_status': {
        bridge.queryStatus(msg.taskId).catch((err) => {
          log('Task status error for %s: %O', msg.taskId, err);
        });
        break;
      }
      default: {
        log('Unhandled relay message type: %s', (msg as any).type);
      }
    }
  }
}

export const agentRelayManager = new AgentRelayManager();
