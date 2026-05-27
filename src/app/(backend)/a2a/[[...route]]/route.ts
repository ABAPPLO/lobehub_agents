import app from '@/server/a2a-hono';

const handler = (request: Request) => app.fetch(request);

export const GET = handler;
export const POST = handler;
