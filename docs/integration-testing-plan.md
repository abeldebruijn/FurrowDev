# Integration Testing Setup Plan

## Current State

- Test suite currently uses `vite-plus/test` for unit and route-level tests under `test/`.
- Runtime stack: Next.js app + Drizzle/Postgres + Zero (`@rocicorp/zero`).
- Local dev already assumes multiple processes (Next app + Postgres + zero-cache).

## Goals

1. Validate full request/response behavior across app routes and data layer.
2. Validate auth + permission boundaries in realistic flows.
3. Validate Zero query/mutator behavior with a real Postgres and zero-cache.
4. Keep test execution deterministic in local and CI environments.

## Candidate Library Options

### Option A — Playwright (Recommended)

**What it is**

- Browser-level integration/E2E runner with strong debugging and tracing.

**Pros**

- Verifies real user flows (UI + network + browser state).
- Excellent debugging tooling (trace viewer, screenshots, video).
- Can run against local app + real services (Postgres, zero-cache).
- Works well for auth redirects and websocket/real-time behavior.

**Cons**

- Slower than API-only integration tests.
- Requires managing app/service lifecycle for tests.
- Test data setup/teardown needs discipline.

**How to integrate here**

1. Add Playwright config and `test/integration/` directory.
2. Use `webServer` in Playwright config to start app for tests (or reuse existing dev server in CI with explicit ports).
3. Run Postgres + zero-cache in test mode (ephemeral DB or isolated schema per run).
4. Add seed/reset helpers for deterministic fixtures.
5. Add CI job that runs integration tests separately from `vp test`.

### Option B — Vitest Integration Layer (`vite-plus/test`) + MSW + Supertest/undici

**What it is**

- Keep everything in the existing test runner, adding integration suites that call route handlers or live HTTP endpoints.

**Pros**

- Lowest cognitive overhead (same assertion/mocking APIs).
- Fast feedback loop.
- Good for service-to-service integration without browser complexity.

**Cons**

- Less confidence in real browser behavior.
- Harder to validate auth redirect UX, hydration, and websocket UI state.
- Can drift toward mocked behavior if not carefully scoped.

**How to integrate here**

1. Create `test/integration/` suites using `vite-plus/test` imports.
2. Start app in test mode and hit real HTTP endpoints.
3. Use MSW only for external dependencies (not internal DB/Zero paths).
4. Run against isolated test database and zero-cache.

### Option C — Cypress

**What it is**

- Browser E2E/integration runner with rich interactive UI.

**Pros**

- Friendly interactive developer experience.
- Good ecosystem/plugins for workflows and debugging.

**Cons**

- Typically more custom setup for modern SSR/streaming edge cases than Playwright.
- Parallelization and CI ergonomics can be costlier depending on setup.
- Team would add a second testing stack distinct from current toolchain.

**How to integrate here**

- Similar to Playwright path, but with Cypress-specific server orchestration and fixtures.

## Recommendation

Use a **hybrid strategy**:

- **Primary integration/E2E:** Playwright.
- **Secondary integration (API-focused):** `vite-plus/test` suites for fast backend route coverage.

This balances confidence and speed while reusing existing test patterns.

## Proposed Rollout Phases

### Phase 1: Foundations

1. Choose test environment strategy:
   - Dockerized Postgres per run, or
   - shared Postgres with per-run schema namespace.
2. Add test env file (`.env.integration`) and explicit service ports.
3. Add DB reset + seed scripts.
4. Add zero-cache startup wrapper for test mode.

### Phase 2: Playwright Bootstrapping

1. Add Playwright and base config.
2. Add global setup that:
   - ensures DB migrated,
   - seeds baseline data,
   - ensures zero-cache is reachable.
3. Add first smoke tests:
   - unauthenticated user path,
   - authenticated project page read,
   - one mutator-driven update flow.

### Phase 3: API Integration Expansion

1. Add `test/integration/api/` suites with `vite-plus/test`.
2. Cover high-risk routes:
   - project idea/task/vision update routes,
   - ownership/permissions checks,
   - ubiquitous-language CRUD paths.

### Phase 4: CI and Quality Gates

1. Split CI stages:
   - lint/type/unit (`vp check`, `vp test`),
   - integration (`vp run test:integration`).
2. Persist Playwright traces/screenshots on failure.
3. Add flaky-test triage policy and retries only for known transient classes.

## Practical Repository Integration Notes

- Keep imports for test utilities from `vite-plus/test` in non-Playwright tests.
- Do not replace current unit/route tests; layer integration coverage on top.
- Prefer deterministic IDs in fixtures to align with Zero mutator replay behavior.
- Include replica cleanup in reset scripts when needed (`zero.db*`) to avoid stale schema state.

## Example Commands to Add

- `vp run test:integration` → full Playwright suite
- `vp run test:integration:api` → API integration subset
- `vp run test:integration:ui` → browser subset

## Success Criteria

- Green run from clean environment with one command.
- Reproducible local + CI results.
- Critical project creation/editing and auth flows covered.
- Failures provide actionable diagnostics (trace/log/screenshot).
