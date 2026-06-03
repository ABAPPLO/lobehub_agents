import { Hono } from 'hono';

import { agentGetAgentCard } from './handlers/agentGetAgentCard';
import { agentHandleJsonRpc } from './handlers/agentHandleJsonRpc';
import { getAgentCard } from './handlers/getAgentCard';
import { handleJsonRpc } from './handlers/handleJsonRpc';
import { a2aAgentAuth } from './middlewares/a2aAgentAuth';
import { a2aAuth } from './middlewares/a2aAuth';

type GroupVariables = {
  group: any;
  groupId: string;
  ownerUserId: string;
};

type AgentVariables = {
  agent: any;
  agentId: string;
  ownerUserId: string;
};

type Variables = AgentVariables & GroupVariables;

const app = new Hono<{ Variables: Variables }>().basePath('/a2a');

// --- Individual Agent A2A routes (must be registered BEFORE group catch-all) ---

// GET /a2a/agent/:agentId/.well-known/agent.json — Agent Card discovery (public)
app.get(
  '/agent/:agentId/.well-known/agent.json',
  a2aAgentAuth({ requireAuth: false }),
  agentGetAgentCard,
);

// POST /a2a/agent/:agentId — JSON-RPC endpoint (requires API key auth)
app.post('/agent/:agentId', a2aAgentAuth({ requireAuth: true }), agentHandleJsonRpc);

// --- Group A2A routes ---

// GET /a2a/:groupId/.well-known/agent.json — Agent Card discovery (public)
app.get('/:groupId/.well-known/agent.json', a2aAuth({ requireAuth: false }), getAgentCard);

// POST /a2a/:groupId — JSON-RPC endpoint (requires API key auth)
app.post('/:groupId', a2aAuth({ requireAuth: true }), handleJsonRpc);

export default app;
