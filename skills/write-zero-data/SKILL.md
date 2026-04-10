---
name: write-zero-data
description: Write data with Zero mutators. Use when defining Zero mutators, choosing mutator validators, structuring a top-level `mutators.ts` registry, wiring the Zero mutate endpoint, designing optimistic writes with `tx.mutate`, reading inside mutators with `tx.run`, or debugging rollback, permissions, and server mutation handling.
---

# Write Zero Data

## Overview

Write data in Zero with named mutators. Define the mutation once, register it once, let it run optimistically on the client, then let the server apply it transactionally.

## Define Mutators

Use `defineMutator` for one mutator definition and `defineMutators` once at the top level for the registry.

- Make mutators `async`
- validate client-supplied args
- use `ctx` for trusted identity and authorization inputs
- keep one transaction boundary per mutator

Use `tx.mutate.<table>.insert`, `upsert`, `update`, and `delete` for writes.

Always `await` writes inside mutators. Do not fire-and-forget writes or the transaction can commit early and fail later.

## Read Inside Mutators

Use `tx.run(zql...)` when a write depends on current state.

- read current rows first
- enforce invariants and permissions
- write only after the checks pass

Remember:

- client-side mutators read only what is already cached locally
- server-side mutators can read the full database state

Do not depend on a client mutator read being globally complete.

## Register Mutators Correctly

Register mutators with Zero so sync and rebase can replay them correctly.

- export a top-level `mutators.ts`
- call `defineMutators` once
- compose nested groups under that top-level call

Do not scatter multiple top-level `defineMutators` calls across files if you want stable mutator names like `posts.create` or `issue.update`.

## Wire The Mutate Endpoint

For syncing to work, expose a mutate endpoint that zero-cache can call.

Implement the endpoint with:

- `handleMutateRequest`
- `mustGetMutator`

Keep the route thin:

1. build auth or viewer context
2. resolve the named mutator
3. execute it through the configured db provider
4. return the Zero push response

Set `ZERO_MUTATE_URL` so zero-cache knows where the endpoint lives.

## Design For Optimistic Writes

Assume the client runs first and may later roll back.

- generate stable IDs when the client must see the new row immediately
- keep mutators deterministic where possible
- avoid depending on hidden server-only side effects for client correctness
- put permission checks on the server path even if the client path also checks

If a server mutator throws, the optimistic client change is reverted. Treat that as a normal path, not a surprise.

## Debug Mutation Problems

If writes look wrong, check in this order:

1. mutator is registered with the client Zero instance
2. mutator name matches the server registry
3. mutate endpoint is reachable from zero-cache
4. server auth or context is present
5. server mutator is throwing and causing rollback
6. local optimistic read depended on uncached data

Also watch for HTTP behavior:

- `401` or `403` pushes the client into needs-auth
- other non-200 responses disconnect the client into an error state

## Finish By Verifying

Verify one simple path end to end:

1. run a mutator from the client
2. confirm optimistic UI updates immediately
3. confirm the server applies the write
4. confirm replication returns the authoritative result without drift
