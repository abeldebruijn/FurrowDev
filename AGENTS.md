The root ./UBIQUITOUS_LANGUAGE.md indexes the split ubiquitous language glossary under ./docs/ubiquitous-language/.

## Develop

- vp env - Manage Node.js versions
- vp check - Run format, lint, and TypeScript type checks
- vp lint - Lint code
- vp fmt - Format code
- vp test - Run tests
- vp run - Run monorepo tasks
- vp build - Build for production

do not run `vp build` instead run `vp run build`. Assume `vp run dev` is already running.

## Common Pitfalls

- **Using the package manager directly:** Do not use pnpm directly. Vite+ can handle all package manager operations.
- **Import JavaScript modules from `vite-plus`:** Instead of importing from `vite` or `vitest`, all modules should be imported from the project's `vite-plus` dependency. For example, `import { defineConfig } from 'vite-plus';` or `import { expect, test, vi } from 'vite-plus/test';`. You must not install `vitest` to import test utilities.
- **Type-Aware Linting:** There is no need to install `oxlint-tsgolint`, `vp lint --type-aware` works out of the box.

## Review Checklist for Agents

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to validate changes.

<!-- ZERO -->

The project uses zero. Zero is a query-driven sync engine for TypeScript apps. It replicates Postgres into a SQLite replica inside `zero-cache`, then syncs subsets of rows to clients based on the queries your app runs. Client reads/writes hit local storage first (instant UI); `zero-cache` keeps clients up to date via logical replication.

Recommended reading order for wiring a Zero app: Install -> Schema -> Queries -> Auth -> Mutators -> ZQL -> Deployment/Config -> Debugging

## Key mental models

### Queries

- Clients do NOT send arbitrary queries to `zero-cache`.
- You define Queries and Mutators in code (`defineQueries`, `defineMutators`).
- The client runs its own ZQL optimistically against a local store (e.g. IDB), and `zero-cache` calls your server endpoints (`ZERO_QUERY_URL`) to resolve a name+args into ZQL/logic, where you also enforce permissions via `context`. `zero-cache` runs that returned ZQL against its SQLite replica, and returns the authoritative results to the client.
- Queries **must** be optimized, e.g. using `npx analyze-query`. The query plan commonly has `TEMP B-TREE` when it is not optimized. You should be cautious when adding complex/heavy queries that are not properly indexed in Postgres, since `zero-cache` derives indexes from upstream. See Slow Queries below.

### Mutators

- Mutators also run on the client optimistically first.
- The client can query the local store in a mutator, but a query must exist that is _active_ for the data to exist in the local store. See Reading Data for what "active" means.
- Mutations are then sent to `zero-cache`, which calls your server's `ZERO_MUTATE_URL` endpoint, where they run directly against Postgres upstream.

### Warnings/common pitfalls

- Zero types are registered globally with `declare module`.
- Treat query results as immutable (e.g. don't mutate returned objects from `useQuery`).
- Prefer client-generated random IDs passed into mutators over auto-increment IDs (e.g. using `uuidv7` or `nanoid`).
- Do not generate IDs inside mutators, since mutators run multiple times (sometimes twice on the client and once on the server).
- When auth errors occur, the client must reconnect manually using the Connection Status API.
- When developing locally, prefer creating migrations and executing them against the local database. Resetting the database during local development requires also deleting the SQLite replica and restarting `zero-cache`.

## Learning Zero

- [What is Sync?](https://zero.rocicorp.dev/docs/sync): A Slightly Opinionated Tour of the Space
- [When to Use](https://zero.rocicorp.dev/docs/when-to-use): And When Not To – A Quick Guide

## Using Zero

- [Schema](https://zero.rocicorp.dev/docs/schema)
- [Reading Data](https://zero.rocicorp.dev/docs/queries): Reading and Syncing Data
- [Writing Data](https://zero.rocicorp.dev/docs/mutators): Writing Data
- [ZQL Reference](https://zero.rocicorp.dev/docs/zql): Zero Query Language
- [ZQL on the Server](https://zero.rocicorp.dev/docs/server-zql)
- [Connection Status](https://zero.rocicorp.dev/docs/connection)
- [REST APIs](https://zero.rocicorp.dev/docs/rest): Creating REST APIs for Zero Applications

## Debugging

- [Inspector](https://zero.rocicorp.dev/docs/debug/inspector)
- [Slow Queries](https://zero.rocicorp.dev/docs/debug/slow-queries)
- [Replication](https://zero.rocicorp.dev/docs/debug/replication)
- [Query ASTs](https://zero.rocicorp.dev/docs/debug/query-asts)
- [OpenTelemetry](https://zero.rocicorp.dev/docs/debug/otel)
- [zero-out](https://zero.rocicorp.dev/docs/debug/zero-out)

# Updating files

- When creating new `**/+page.tsx` files update the `proxy.ts` with route configurations
