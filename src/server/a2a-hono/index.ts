import { Hono } from 'hono';

import { getAgentCard } from './handlers/getAgentCard';
import { handleJsonRpc } from './handlers/handleJsonRpc';
import { a2aAuth } from './middlewares/a2aAuth';

type GroupVariables = {
  group: any;
  groupId: string;
  ownerUserId: string;
};

const app = new Hono<{ Variables: GroupVariables }>().basePath('/a2a');

// GET /a2a/:groupId/.well-known/agent.json — Agent Card discovery (public)
app.get('/:groupId/.well-known/agent.json', a2aAuth({ requireAuth: false }), getAgentCard);

// POST /a2a/:groupId — JSON-RPC endpoint (requires API key auth)
app.post('/:groupId', a2aAuth({ requireAuth: true }), handleJsonRpc);

export default app;
