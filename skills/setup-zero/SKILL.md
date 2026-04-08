---
name: setup-zero
description: Set up Zero in a web app or full-stack app. Use when adding Zero dependencies, defining a Zero schema, generating or maintaining the schema source of truth, wiring query and mutator registries, exposing Zero query and mutate endpoints, configuring zero-cache, or bootstrapping the Zero client/provider for realtime sync.
---

# Setup Zero

## Overview

Set up Zero from the schema outward. Define a stable schema source of truth, wire query and mutator registries, expose server endpoints, then connect the client to zero-cache.

## Workflow

1. Identify the data model source of truth.
2. Create or generate the Zero schema from that source.
3. Define query and mutator registries around the schema.
4. Expose server endpoints for query transform and mutate handling.
5. Bootstrap the Zero client/provider in the app shell.
6. Configure zero-cache and local runtime env.

## Pick The Schema Source

Prefer one canonical model and derive the Zero schema from it.

- Use an existing DB schema if the app already has one.
- Generate the Zero schema if a generator exists and is reliable in the repo.
- Hand-author the Zero schema only when there is no stronger source of truth.

Keep naming and relationships stable. Avoid parallel hand-maintained schema definitions if one can be generated from another.

## Define Queries And Mutators

Define named query and mutator registries close to the schema.

- Put read behavior in queries, not in UI components.
- Put write behavior in mutators, not in route handlers.
- Keep queries small and composable.
- Keep mutators focused on one transaction boundary.
- Pass IDs explicitly for created rows when the client must reconcile optimistic state.

## Wire Server Endpoints

Expose two server entrypoints:

- query endpoint: transform named queries into Zero query builders
- mutate endpoint: resolve named mutators and execute them transactionally

Use the Zero server helpers for both. Keep route handlers thin:

- parse auth/context
- select the query or mutator by name
- delegate to shared registry code
- return the Zero wire response

## Bootstrap The Client

Initialize Zero in a provider or app shell boundary.

- Set `cacheURL`
- set `userID`
- pass the schema
- pass mutators if custom mutators exist

Use a stable `userID` partition. Use an anonymous fallback only when no authenticated identity exists.

## Runtime Checklist

Confirm all of these before debugging app logic:

- app server is running
- database is reachable
- zero-cache is running
- `cacheURL` points to zero-cache
- query endpoint is reachable by zero-cache
- mutate endpoint is reachable by zero-cache
- schema on client and server matches

## Common Failure Modes

- WebSocket fails immediately: zero-cache is down, wrong `cacheURL`, or port not reachable.
- Queries never hydrate: query endpoint not configured or transform handler failing.
- Mutations apply locally then roll back: server mutator rejected the write or schema diverged.
- Type friction everywhere: schema source of truth is duplicated or generated artifacts are stale.

## Finish By Verifying

Verify in this order:

1. Zero client connects to zero-cache.
2. One simple query returns rows.
3. One simple mutator commits and syncs back.
4. A second client receives the update live.
