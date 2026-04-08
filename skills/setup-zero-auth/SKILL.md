---
name: setup-zero-auth
description: Set up authentication and viewer context for Zero. Use when choosing between cookie-forwarded auth and bearer-token auth, mapping authenticated identities to Zero `userID` and persisted database users, enforcing auth in Zero query or mutate routes, shaping query or mutator context, or debugging failed Zero websocket or auth handshakes.
---

# Setup Zero Auth

## Overview

Set up Zero auth by deciding how identity reaches Zero, how viewer context is derived on the server, and how that context is enforced in queries and mutators.

Read [references/auth-patterns.md](references/auth-patterns.md) when choosing between cookie-forwarded auth and bearer-token auth, or when debugging connection failures.

## Workflow

1. Choose the auth transport pattern.
2. Define the meaning of `userID` on the Zero client.
3. Define the server-side viewer context.
4. Enforce auth in Zero query and mutate routes.
5. Map session identity to persisted database identity.
6. Verify websocket, query, and mutation behavior end to end.

## Choose The Transport

Use one of two patterns:

- cookie-forwarded auth: good when the app already uses server sessions or secure cookies
- bearer-token auth: good when the client can mint and refresh an explicit token for Zero

Choose one path and keep it consistent across query, mutate, and websocket traffic.

## Define Identity Boundaries

Treat these as separate concerns:

- Zero `userID`: client-side storage partition and sync identity
- authenticated provider identity: session subject or token subject
- persisted application user: database row used for ownership and permissions

These may be the same value, but do not assume they must be.

## Shape Server Context

Build a small explicit context object for queries and mutators.

Include only what authorization decisions need, such as:

- viewer database id
- provider subject id
- organization or tenant id
- role list
- permission list

Resolve this once at the route boundary, then pass it into query and mutator execution.

## Enforce Auth In Routes

Keep Zero route handlers thin and strict.

- Reject unauthenticated requests early.
- Build viewer context before query or mutator dispatch.
- Do not let UI code define authorization rules.
- Keep permission checks in shared server code or mutators, not duplicated across route handlers.

## Map Session Users To Database Users

Prefer an explicit mapping layer between auth-provider users and app users.

- Keep a unique provider-user identifier in the database.
- Upsert or reconcile the app user record when the session is valid.
- Use the persisted app user id for ownership and permission checks.

Do not rely on display names, emails, or mutable profile fields as durable identity keys.

## Common Failure Modes

- Websocket connects as anonymous unexpectedly: client `userID` or auth value not populated when provider mounts.
- Query route returns `401`: route cannot parse the incoming cookie or token.
- Mutations fail but queries work: mutate endpoint is missing auth forwarding or context construction.
- Viewer sees wrong data: query filters use provider subject directly when the app expects a database user id.

## Finish By Verifying

Verify in this order:

1. unauthenticated requests fail cleanly
2. authenticated websocket connects
3. query route resolves the expected viewer
4. mutate route executes with the same viewer context
5. permissions block forbidden writes and allow valid ones
