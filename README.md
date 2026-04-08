# FurrowDev

Next 16 app with WorkOS auth, Drizzle/Postgres, and Zero sync plumbing.

## Env

Copy `.env.example` to `.env.local` and fill in WorkOS values.

App env:

- `DATABASE_URL`
- `NEXT_PUBLIC_ZERO_CACHE_URL`
- `WORKOS_API_KEY`
- `WORKOS_CLIENT_ID`
- `WORKOS_CLAIM_TOKEN`
- `WORKOS_COOKIE_PASSWORD`
- `NEXT_PUBLIC_WORKOS_REDIRECT_URI`

Zero-cache env:

- `ZERO_UPSTREAM_DB`
- `ZERO_QUERY_URL`
- `ZERO_MUTATE_URL`
- `ZERO_QUERY_FORWARD_COOKIES=true`
- `ZERO_MUTATE_FORWARD_COOKIES=true`

## Local dev

Use 3 terminals.

Terminal 1: start Postgres with Docker and logical replication enabled:

```bash
docker run -d \
  --name furrow-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=postgres \
  -p 5432:5432 \
  docker.io/library/postgres:16-alpine \
  postgres -c wal_level=logical
```

Terminal 2: install deps, generate artifacts, then run Next:

```bash
vp install
vp run zero:schema
vp run db:generate
vp run dev
```

Terminal 3: start zero-cache:

```bash
vp run zero:cache-dev
```

Terminal 4: open Drizzle Studio:

```bash
vp exec db:studio
```

Verify:

- app: `http://localhost:3000`
- zero-cache: `http://localhost:4848`
- postgres: `localhost:5432`

Quick checks:

```bash
curl http://localhost:4848
podman logs furrow-postgres
```

If Zero shows websocket failures in the browser:

- make sure `vp run zero:cache-dev` is still running
- make sure Postgres is reachable on `5432`
- make sure `NEXT_PUBLIC_ZERO_CACHE_URL=http://localhost:4848`
- make sure `ZERO_QUERY_URL` and `ZERO_MUTATE_URL` point at the Next app on port `3000`

`vp run zero:cache-dev` loads `.env.local` and `.env`, then falls back to:

- `ZERO_UPSTREAM_DB=$DATABASE_URL`
- `ZERO_QUERY_URL=http://localhost:3000/api/zero/query`
- `ZERO_MUTATE_URL=http://localhost:3000/api/zero/mutate`
- `ZERO_QUERY_FORWARD_COOKIES=true`
- `ZERO_MUTATE_FORWARD_COOKIES=true`

## Common issues

### Zero says tables are not replicated

If the browser shows `SchemaVersionNotSupported` and errors like:

- `The "users" table does not exist or is not one of the replicated tables`

but the tables do exist in Postgres, Zero is usually using a stale local replica.

Fix:

1. stop `vp run zero:cache-dev`
2. remove the local replica files
3. start Zero again
4. hard refresh the browser

```bash
rm -f zero.db zero.db-shm zero.db-wal
vp run zero:cache-dev
```

If you set `ZERO_REPLICA_FILE` yourself, remove that file instead.

## Database

Drizzle schema lives at `drizzle/schema.ts`.

Commands:

- `vp run db:generate`
- `vp run db:migrate`
- `vp run zero:schema`

## Validation

- `vp check`
- `vp test`

## Docker

`Dockerfile` builds the Next app only.
Postgres and zero-cache stay separate services.
