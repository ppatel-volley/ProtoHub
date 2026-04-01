import { expect, test } from "@playwright/test"

import {
    runAgentTest,
    setupTestEnvironment,
    waitForGameTiles,
    waitForHubLoad,
} from "./testHelpers"

/**
 * Agentic tests for subscribed users.
 * Uses real authentication via storage state.
 */
test.describe("Hub Subscribed User (Agentic)", () => {
    test.beforeEach(async ({ page }) => {
        await setupTestEnvironment(page)

        await page.route("https://api.lab.amplitude.com/**", (route) => {
            void route.fulfill({
                json: { "suppress-immediate-upsell": { value: "on" } },
                headers: { "Content-Type": "application/json" },
            })
        })
    })

    test("verifies Hub loads with game tiles and hero section", async ({
        page,
    }) => {
        await page.goto("./")
        await expect(page).toHaveTitle(/Volley|Weekend/)
        await waitForHubLoad(page)

        const result = await runAgentTest(page, {
            goal: `Verify the Hub has loaded. Check for:
1. At least one game tile visible (class containing "gameTile")
2. A hero section visible (class containing "heroSection")

After confirming both exist, immediately mark goalComplete=true.`,
            maxSteps: 5,
        })

        expect(result.success).toBe(true)
        const tileCount = await page.locator("[class*='gameTile']").count()
        expect(tileCount).toBeGreaterThan(0)
    })

    test("navigates carousel with arrow keys", async ({ page }) => {
        await page.goto("./")
        await expect(page).toHaveTitle(/Volley|Weekend/)
        await waitForHubLoad(page)
        await waitForGameTiles(page)

        await runAgentTest(page, {
            goal: `Navigate the carousel with exactly 3 actions:
1. Press ArrowRight once
2. Press ArrowRight again
3. Press ArrowLeft once

After these 3 presses, mark goalComplete=true.
Report if you saw the highlighted tile move in the screenshot.`,
            maxSteps: 6,
        })
    })

    test("opens and closes exit modal", async ({ page }) => {
        await page.goto("./")
        await expect(page).toHaveTitle(/Volley|Weekend/)
        await waitForHubLoad(page)
        await waitForGameTiles(page)

        await runAgentTest(page, {
            goal: `Test exit modal flow:
1. Press Escape - exit modal should appear with "Are you sure you want to exit?"
2. Press Enter (on "No" button) to close it

SUCCESS = You saw the modal appear, then close. Mark goalComplete=true with success=true.`,
            maxSteps: 5,
        })
    })

    test("explores Hub UI and reports findings", async ({ page }) => {
        await page.goto("./")
        await expect(page).toHaveTitle(/Volley|Weekend/)
        await waitForHubLoad(page)
        await waitForGameTiles(page)

        await runAgentTest(page, {
            goal: `Explore the Hub UI. Navigate tiles, press Enter on one, try Escape, look around.

After 8-10 actions, mark goalComplete=true with success=true and summarize what you saw.
Only set success=false if you find REAL bugs: broken layouts, visual glitches, stuck states.
Navigation working, modals opening/closing, highlights moving = everything is fine.`,
            maxSteps: 12,
        })
    })
})
