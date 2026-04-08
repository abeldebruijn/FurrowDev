---
name: read-zero-data
description: Read and sync data with Zero queries. Use when defining Zero queries, choosing query arguments and validators, structuring a top-level `queries.ts` registry, wiring the Zero query endpoint, calling `zero.run`, `useQuery`, or `preload`, or debugging query hydration, partial results, and server-side filters.
---

# Read Zero Data

## Overview

Read data in Zero with named queries, not ad-hoc UI fetches. Define query logic once, register it once, then use the same registry on the client and server.

## Define Queries

Use `defineQuery` for one query definition and `defineQueries` once at the top level for the registry.

- Return ZQL from each query.
- Add a validator whenever the query accepts client arguments.
- Use `ctx` for trusted server-derived values such as viewer identity or tenant scope.
- Keep `args` for user-controlled filters and sorting only.

Prefer this shape:

1. define a query with `defineQuery`
2. group it in a top-level `defineQueries` registry
3. export the registry from `queries.ts`

Do not call `defineQueries` repeatedly in nested files. Build sub-objects in other files, then compose them once at the top level so query names stay stable.

## Choose Query Inputs Carefully

Separate untrusted inputs from trusted context.

- Put filter params in `args`
- put authorization fields in `ctx`
- validate `args` with Zod or another Standard Schema validator

If the server must enforce permissions, add those filters in the shared query or in the server-side implementation of the query.

## Wire The Query Endpoint

For syncing to work, expose a query endpoint that zero-cache can call.

Implement the endpoint with:

- `handleQueryRequest`
- `mustGetQuery`

Keep the route thin:

1. build auth or viewer context
2. look up the named query
3. invoke `query.fn({args, ctx})`
4. return the serialized Zero response

Set `ZERO_QUERY_URL` so zero-cache knows where the endpoint lives.

## Use Queries In The App

Use the right read path for the job:

- `useQuery` for reactive UI
- `zero.run()` for one-off reads
- `zero.preload()` for warming large result sets before navigation

Remember that Zero returns local data first and server data later. Do not show "not found" too early. Only commit to 404-style UI when the result is known to be complete.

## Debug Query Behavior

If query behavior looks wrong, check in this order:

1. query name in the client matches the server registry
2. validator accepts the provided arguments
3. query endpoint is reachable from zero-cache
4. server implementation adds the expected permission filters
5. client is not mistaking partial local data for a complete result

## Finish By Verifying

Verify one simple path end to end:

1. define a query
2. run it with `zero.run`
3. use it with `useQuery`
4. confirm server hydration updates the client result
