# Testing

Hub uses three layers of testing: unit tests (Jest), functional tests (Playwright), and agentic tests (Playwright + GPT-4o-mini).

## Test Types

| Type | Framework | Location | Command |
|------|-----------|----------|---------|
| Unit | Jest + React Testing Library | Colocated with source (`*.test.ts`, `*.test.tsx`) | `pnpm test:unit` |
| Functional | Playwright | `test/functional/` | `pnpm test:functional` |
| Agentic | Playwright + OpenAI | `test/agentic/` | `pnpm test:agentic` |

### Unit Tests

Standard Jest tests colocated next to the code they test. Use React Testing Library for component tests. Run with `pnpm test:unit` (includes coverage).

### Functional Tests

Playwright browser tests that run against a built preview server. Test real user flows end-to-end.

### Agentic Tests

AI-powered tests that use GPT-4o-mini to navigate the UI and verify goals. See [`test/agentic/README.md`](../test/agentic/README.md) for full details.

**Current status:** These are fairly hit or miss — the LLM-driven navigation is non-deterministic, so tests can flake on timing, element detection, or simply the model making a wrong decision. Useful for catching broad regressions but don't treat a red agentic run as a hard blocker without inspecting the failure.

## Playwright Project Structure

Functional tests are organized into Playwright projects that control authentication state:

| Project | What it tests | Auth state |
|---------|--------------|------------|
| `auth-subscribed` | Setup only — authenticates and saves subscribed session | Creates `playwright-cache/.auth/subscribed.json` |
| `auth-unsubscribed` | Setup only — authenticates and saves unsubscribed session | Creates `playwright-cache/.auth/unsubscribed.json` |
| `subscribed` | Tests that need a subscribed user (hub-home, hub-launch, game-launch, bypass) | Uses saved subscribed session |
| `unsubscribed` | Tests that need an unsubscribed user (upsell UI, game selection, tracking) | Uses saved unsubscribed session |
| `mocked` | Tests with mocked platform SDK (no real auth) | No stored auth |
| `examples` | Sample/template tests | No stored auth |

The `auth-*` projects run first as dependencies. Other projects inherit the saved auth state via `storageState`.

## Test Directories

```
test/functional/
  ├── hub-home/           # Main menu, carousel, focus, hero assets, exit modal
  ├── hub-launch/         # App launch, platform validation, PNG detection, loading screen
  ├── game-launch/        # Game orchestration, Jeopardy reload
  ├── web-checkout/       # Upsell flows, subscription persistence, QR codes
  ├── tracking/           # Analytics event verification
  └── examples/           # Sample test template
```

## Running Tests Locally

```bash
# Unit tests (with coverage)
pnpm test:unit

# Functional tests (builds first, then runs Playwright)
pnpm test:functional

# Functional tests (skip build, use existing build)
pnpm test:functional:nobuild

# Functional tests with Playwright UI (interactive debugging)
pnpm test:functional:ui

# Functional tests with debugger
pnpm test:functional:debug

# Agentic tests (requires OPENAI_API_KEY in .env)
pnpm test:agentic

# Headed mode (watch the browser)
pnpm test:agentic:headed
```

## Running Against Staging

```bash
# Functional tests against staging
pnpm test:functional:staging

# Agentic tests against staging
pnpm test:agentic:staging
```

These use `TEST_ENVIRONMENT=staging` and `TEST_BASE_URL=https://game-clients-staging.volley.tv/hub/`.

Staging tests have 3x timeout multipliers to account for network latency.

## CI Integration

| Workflow | When | What |
|----------|------|------|
| `lint-build-test.yml` | Every PR | Runs `pnpm test:unit` |
| `playwright-functional.yml` | PRs to main, merge groups | Builds preview server, runs functional tests with dynamic sharding |
| `playwright-agentic.yml` | PRs with changes to `src/**` or `test/agentic/**` | Builds preview server, runs agentic tests with sharding |
| `staging-functional-tests.yml` | After staging deploy (via orchestrator) | Runs functional tests against staging URL |
| `staging-agentic-tests.yml` | After staging deploy (via orchestrator) | Runs agentic tests against staging URL |

Staging deploys trigger tests indirectly through the `workflow-dispatch-orchestrator`. See the [CI/CD docs](../../../docs/ci-cd.md#post-deploy-testing) for the full orchestration flow.

### Sharding

CI runs use dynamic sharding to parallelize Playwright tests. The number of shards is calculated from the test count:
- Functional tests: `ceil(test_count / TESTS_PER_SHARD)`, capped at a maximum
- Agentic tests: Fixed 3-shard matrix

### Artifacts

On failure, CI uploads:
- Screenshots (`only-on-failure`)
- Traces (`on-first-retry`)
- Playwright HTML report

## Test Helpers

`test/functional/testHelpers.ts` provides common utilities:
- Experiment mocking (set experiment variants for a test)
- Amplitude mocking
- Game tile interaction helpers
- Modal interaction helpers
- Session/auth helpers

## Debugging Failed Tests

1. **Check the Playwright report** — download the HTML report from CI artifacts
2. **Look at screenshots** — captured on failure, in the artifacts
3. **Look at traces** — captured on first retry, viewable in Playwright Trace Viewer (`npx playwright show-trace trace.zip`)
4. **Run locally** — reproduce with `pnpm test:functional:debug` for step-through debugging
5. **Check staging URL** — for staging test failures, verify the staging site is accessible and up to date
