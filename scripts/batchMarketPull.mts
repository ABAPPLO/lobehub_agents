/**
 * Pull ALL assistants from market via tRPC (using app's trusted client auth).
 * The app server handles Market API auth internally, so tRPC calls work without bearer tokens.
 *
 * Usage: NO_PROXY="*" bun run scripts/batchMarketPullV2.mts
 */

import 'dotenv/config';

import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import pg from 'pg';

import { agents } from '../packages/database/src/schemas/agent';
import { users } from '../packages/database/src/schemas/user';

const DATABASE_URL = process.env.DATABASE_URL!;
const APP_URL = process.env.APP_URL || 'http://localhost:3010';

// The app uses ENABLE_MOCK_DEV_USER for dev auth, so we can use it for API calls
const DEV_HEADER = 'lobe-auth-dev-backend-api: 1';

async function getUserId(db: ReturnType<typeof drizzle>): Promise<string> {
  if (process.env.USER_ID) return process.env.USER_ID;
  const result = await db.select({ id: users.id }).from(users).limit(1);
  if (!result.length) throw new Error('No users found.');
  return result[0].id;
}

interface AgentListItem {
  identifier: string;
  title: string;
  description: string;
  avatar: string;
  tags: string[];
  config: any;
  installCount?: number;
  category?: string;
}

interface AssistantListResponse {
  currentPage: number;
  items: AgentListItem[];
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

async function fetchTRPC<T>(path: string): Promise<T> {
  const url = `${APP_URL}${path}`;
  const res = await fetch(url, {
    headers: { [DEV_HEADER.split(':')[0].trim()]: DEV_HEADER.split(':')[1].trim() },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json() as any;
  return json.result?.data?.json ?? json;
}

async function pullAllAgents(db: ReturnType<typeof drizzle>, userId: string) {
  console.log('\n📦 Fetching total count from market...');

  const first = await fetchTRPC<AssistantListResponse>(
    `/trpc/lambda/market.getAssistantList?input=${encodeURIComponent(JSON.stringify({ json: { page: 1, pageSize: 1 } }))}`,
  );

  const totalCount = first.totalCount;
  const totalPages = Math.ceil(totalCount / 50);
  console.log(`   Total: ${totalCount} agents, ${totalPages} pages`);

  let added = 0;
  let skipped = 0;
  let failed = 0;

  for (let page = 1; page <= totalPages; page++) {
    try {
      const res = await fetchTRPC<AssistantListResponse>(
        `/trpc/lambda/market.getAssistantList?input=${encodeURIComponent(JSON.stringify({ json: { page, pageSize: 50 } }))}`,
      );

      if (!res.items?.length) {
        console.log(`   Page ${page}: empty`);
        continue;
      }

      for (const item of res.items) {
        try {
          // Check if exists
          const existing = await db
            .select({ id: agents.id })
            .from(agents)
            .where(and(eq(agents.userId, userId), eq(agents.marketIdentifier, item.identifier)))
            .limit(1);

          if (existing.length > 0) {
            skipped++;
            continue;
          }

          // The list response already includes config
          const config = item.config || {};

          await db.insert(agents).values({
            userId,
            title: item.title || item.identifier,
            description: item.description || '',
            avatar: item.avatar || '',
            tags: item.tags || [],
            marketIdentifier: item.identifier,
            systemRole: config.systemRole,
            model: typeof config.model === 'string' ? config.model : null,
            provider: config.provider,
            plugins: config.plugins,
            chatConfig: config.chatConfig,
            agencyConfig: config.agencyConfig,
            params: config.params || {},
            fewShots: config.fewShots,
            tts: config.tts,
            openingMessage: config.openingMessage,
            openingQuestions: config.openingQuestions || [],
          });

          added++;
        } catch (e: any) {
          failed++;
          console.error(`   ✗ ${item.identifier}: ${e.message?.slice(0, 60)}`);
        }
      }

      const progress = ((page / totalPages) * 100).toFixed(0);
      process.stdout.write(`   Page ${page}/${totalPages} (${progress}%) — +${added} added\n`);
    } catch (e: any) {
      console.error(`   Page ${page} failed: ${e.message?.slice(0, 80)}`);
    }
  }

  console.log(`\n📦 Done: ${added} added, ${skipped} skipped, ${failed} failed, ${totalCount} total`);
}

async function main() {
  console.log('🚀 LobeHub Market Pull v2 (via tRPC)');
  console.log(`   App: ${APP_URL}`);
  console.log(`   DB: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);

  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);
  const userId = await getUserId(db);
  console.log(`   User: ${userId}`);

  try {
    await pullAllAgents(db, userId);
    console.log('\n✅ All done!');
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
