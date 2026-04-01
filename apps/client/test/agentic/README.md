# Agentic Tests

AI-powered browser testing for Hub using OpenAI's GPT-4o-mini.

## Overview

These tests use an AI agent to navigate the Hub UI and verify functionality. Unlike traditional Playwright tests that use hard-coded selectors and assertions, agentic tests:

- Observe page state (visible elements, focus, page title)
- Use an LLM to reason about what to do next
- Execute actions and verify goals are met
- **Report issues they discover** (agent sets `success: false` if it finds bugs)

This approach is particularly useful for:

- Testing complex navigation flows
- Verifying UI behavior that's hard to assert programmatically
- Exploratory testing that catches unexpected regressions
- Getting qualitative feedback on UX

## Setup

1. Copy the environment template:

```bash
cp .env.example .env
```

2. Add your OpenAI API key to `.env`:

```
OPENAI_API_KEY=sk-your-key-here
```

## Running Tests

```bash
# Run all agentic tests (builds first)
pnpm test:agentic

# Run without rebuilding
pnpm test:agentic:nobuild

# Run with visible browser (headed mode)
pnpm test:agentic:headed
```

## Test Structure

```
test/agentic/
├── agent.ts                    # Browser agent (LLM-powered)
├── testHelpers.ts              # runAgentTest helper
├── auth.subscribed.setup.ts    # Auth for subscribed user
├── auth.unsubscribed.setup.ts  # Auth for unsubscribed user
├── subscribed.spec.ts          # Subscribed user tests
└── unsubscribed.spec.ts        # Unsubscribed user tests
```

## Writing Tests

Use `runAgentTest` for a clean interface:

```typescript
import { expect, test } from "@playwright/test"
import { runAgentTest, setupTestEnvironment, waitForHubLoad } from "./testHelpers"

test("verifies feature X works", async ({ page }) => {
    await setupTestEnvironment(page)
    await page.goto("./")
    await waitForHubLoad(page)

    const result = await runAgentTest(page, {
        goal: `Verify feature X:
1. Check element A is visible
2. Press Enter and verify response
After confirming, mark goalComplete=true.`,
        maxSteps: 5,
    })

    expect(result.success).toBe(true)
})
```

## runAgentTest Options

| Option | Default | Description |
|--------|---------|-------------|
| `goal` | required | Task description for the agent |
| `maxSteps` | 10 | Maximum actions before forced completion |
| `verbose` | true | Log observations and actions |

The test fails if `success: false` (agent found issues). If the agent runs out of steps without completing, a retrospective evaluation reviews the full history to determine success.

## How the Agent Reports Issues

The agent is instructed to set `success: false` when it observes:

- UI glitches or visual bugs
- Unresponsive or broken interactions
- Missing elements that should be present
- Confusing or unclear UX patterns

When `success: false`, the `finalAssessment` contains details about what went wrong.

## Agent Actions

The agent simulates TV remote input:

- `press` - Press a key (ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Enter, Escape)
- `done` - Signal goal completion

## Debugging

Tests include trace, screenshot, and video recording. After a test run:

```bash
open apps/client/playwright-report-agentic/index.html
```

Set `verbose: true` (default) to see detailed logs of observations and reasoning.
