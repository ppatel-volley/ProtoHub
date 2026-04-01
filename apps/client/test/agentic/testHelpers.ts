import { type Page } from "@playwright/test"

import { type AgentResult, BrowserAgent } from "./agent"

export interface AgentTestOptions {
    goal: string
    maxSteps?: number
    verbose?: boolean
}

export interface AgentTestResult extends AgentResult {
    agent: BrowserAgent
}

/**
 * Formats agent result into a readable failure summary
 */
function formatFailureSummary(result: AgentResult, testName: string): string {
    const actionsSummary = result.actions
        .map(
            (a, i) =>
                `  ${i + 1}. ${a.type}${a.key ? ` "${a.key}"` : ""} - ${a.reason}`
        )
        .join("\n")

    const lastObservation =
        result.observations[result.observations.length - 1] ?? "No observations"

    return `
═══════════════════════════════════════════════════════════════
AGENTIC TEST FAILED: ${testName}
═══════════════════════════════════════════════════════════════

📋 FINAL ASSESSMENT:
${result.finalAssessment}

🎯 ACTIONS TAKEN (${result.actions.length}):
${actionsSummary || "  No actions taken"}

👁️ LAST OBSERVATION:
${lastObservation}

═══════════════════════════════════════════════════════════════
`
}

/**
 * Runs an agentic test with standardized success checking.
 *
 * @example
 * const result = await runAgentTest(page, {
 *     goal: "Verify the Hub loads correctly...",
 *     maxSteps: 5,
 * })
 */
export async function runAgentTest(
    page: Page,
    options: AgentTestOptions
): Promise<AgentTestResult> {
    const { goal, maxSteps = 10, verbose = true } = options

    const agent = new BrowserAgent({ maxSteps, verbose })
    const result = await agent.run(page, goal)

    if (!result.success) {
        throw new Error(
            `Agent found issues:\n` +
                formatFailureSummary(result, goal.slice(0, 50))
        )
    }

    return { ...result, agent }
}

/**
 * Common test setup for all agentic tests
 */
export async function setupTestEnvironment(page: Page): Promise<void> {
    await page.addInitScript(() => {
        ;(
            window as unknown as {
                __TEST_PLATFORM_OVERRIDES: { isFunctionalTest: boolean }
            }
        ).__TEST_PLATFORM_OVERRIDES = {
            isFunctionalTest: true,
        }
        ;(
            window as unknown as { APP_CONFIG: Record<string, string> }
        ).APP_CONFIG = {
            environment: "local",
            SEGMENT_WRITE_KEY: "test-key",
            AMPLITUDE_EXPERIMENT_KEY: "test-amplitude-key",
            DATADOG_APPLICATION_ID: "test-id",
            DATADOG_CLIENT_TOKEN: "test-token",
            VOLLEY_LOGO_DISPLAY_MILLIS: "100",
        }
    })

    await page.route("**/api.segment.io/**", (route) => {
        void route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true }),
        })
    })
}

/**
 * Waits for Hub to finish loading
 */
export async function waitForHubLoad(page: Page): Promise<void> {
    await page.waitForSelector('[data-testid="loading"]', {
        state: "detached",
        timeout: 15000,
    })
}

/**
 * Waits for game tiles to be visible
 */
export async function waitForGameTiles(page: Page): Promise<void> {
    await page.waitForSelector("[class*='gameTile']", { timeout: 10000 })
}
