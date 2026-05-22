# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Architecture: Data Flow

```
React UI → Zustand Store Actions → Client Service (SWR/TRPC) → lambdaClient (TRPC) → Lambda Router → Server Service → DB Model (Drizzle) → PostgreSQL
```

Client services (`src/services/`) are singleton classes calling TRPC or REST. Stores use SWR hooks (`useClientDataSWR`) for reads and call service methods + `refreshXxx()` for mutations. Never use `useEffect` for data fetching.

## Architecture: Zustand Stores

Stores in `src/store/` use a three-layer action pattern composed via `flattenActions`:
- **Public actions** (`createTopic`) — called by UI components
- **Internal actions** (`internal_createTopic`) — core business logic, optimistic updates
- **Dispatch methods** (`internal_dispatchTopic`) — pure state reducers using Immer

Migrating from plain `StateCreator` objects to **class-based action implementations** (`XxxActionImpl`) with `#private` fields. Use `StoreSetter<T>` for set.

Store data structures: simple arrays for lists (`xxxList`), `Record<string, Detail>` maps for detail data. Never let `List` extend `Detail` — they're separate shapes. Types come from `@lobechat/types`, never `@lobechat/database`.

## Architecture: Server (TRPC + Hono)

**TRPC routers** in `src/server/routers/lambda/` (~60 sub-routers). Always inject models into `ctx` via middleware — never `new Model()` inside procedures. Return `{ data, success: true }` for queries, `{ data?, message, success: true }` for mutations.

**Hono API** in `src/server/agent-hono/` for agent runtime HTTP endpoints (separate from TRPC).

**Server services** in `src/server/services/` — domain business logic called by routers. The `agentRuntime/` service is the most complex, handling the full completion lifecycle with hooks, abort, and streaming.

**Server modules** in `src/server/modules/` — reusable infra: `AgentRuntime/`, `Mecha/` (context engineering + agent tools), `KeyVaultsEncrypt/`, `S3/`.

## Architecture: Monorepo Packages

70+ packages under `packages/`. Key categories:
- **`database/`** — Drizzle ORM schemas, models, repositories
- **`agent-runtime/`** — Core agent execution runtime
- **`model-runtime/`** — AI model runtime (extends OpenAI SDK)
- **`context-engine/`** — Context pipeline processing
- **`builtin-tool-*`** (~25 packages) — Individual built-in tools (calculator, web-browsing, knowledge-base, etc.)
- **`chat-adapter-*`** — IM platform integrations (Feishu, LINE, QQ, WeChat)
- **`business/`** — Commercial/SaaS-specific packages (config, const, model-bank, model-runtime)

## Database (Drizzle ORM)

Schemas in `packages/database/schemas/`. **Always use `db.select()` builder API** — never `db.query.*` relational API (`findMany`, `findFirst`, `with:`) because it generates fragile lateral joins. For one-to-many, use two separate queries.

Conventions: plural snake_case table names, `...timestamps` spread, ID prefixes via `idGenerator('entity')`, array-return index definitions.

Generate migrations: `bun run db:generate`. Always rename auto-generated filenames to be meaningful. Always use idempotent SQL (`IF NOT EXISTS`, `IF EXISTS`).

## Styling

**Priority**: `createStaticStyles` + `cssVar.*` (zero-runtime) > inline `style` > `createStyles` + `token` (last resort). See `.cursor/docs/createStaticStyles_migration_guide.md` for migration guide.

**Component priority**: `src/components` > `@lobehub/ui/base-ui` > `@lobehub/ui` > custom. Use `react-router-dom` for SPA navigation, never `next/link`.

## Modal Pattern

Prefer **imperative** `createModal` / `confirmModal` from `@lobehub/ui/base-ui` over declarative `open` state + `<Modal />`. Requires `ModalHost` mounted near root. For i18n outside React (e.g. in `createModal` options), use `import { t } from 'i18next'`.

## Debugging

Uses `debug` npm package with namespaced loggers: `lobe-desktop:*`, `lobe-server:*`, `lobe-client:*`. Enable via `DEBUG=lobe-*` (Node) or `localStorage.debug = 'lobe-*'` (browser).

`agent-tracing` CLI (`@lobechat/agent-tracing`) inspects agent execution snapshots from `.agent-tracing/` directory.

## Local Development with Docker

```bash
# Start local infra (PostgreSQL, Redis, RustFS S3, SearXNG)
bun run dev:docker

# Reset everything (fresh DB + migrations)
bun run dev:docker:reset
```

## Key Conventions

- **TypeScript**: Separate type imports (`import type { ... }`). `interface` for objects, `type` for unions. `as const satisfies X`. `@ts-expect-error` over `@ts-ignore`. No silent `.catch(() => fallback)`.
- **Desktop router sync**: `desktopRouter.config.tsx` and `desktopRouter.config.desktop.tsx` must stay in sync — drift causes blank screens.
- **i18n**: Only edit `src/locales/default/` namespace files. Run `pnpm i18n` to propagate translations.
- **Testing**: `bunx vitest run --silent='passed-only' '[file-path]'` for single tests. Never run full suite. Prefer `vi.spyOn` over `vi.mock`.
- **PRs**: Always target `canary` branch. Commit messages prefixed with gitmoji.
