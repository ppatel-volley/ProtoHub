import { expect, test } from "@playwright/test"

import { setupDeviceAuthMock } from "../functional/deviceAuthHelpers"
import {
    runAgentTest,
    setupTestEnvironment,
    waitForHubLoad,
} from "./testHelpers"

/**
 * Agentic tests for unsubscribed users - verify upsell flows.
 * Uses real authentication via storage state.
 */
test.describe("Hub Unsubscribed User (Agentic)", () => {
    test.beforeEach(async ({ page }) => {
        await setupTestEnvironment(page)
        await setupDeviceAuthMock(page)

        await page.route("https://api.lab.amplitude.com/**", (route) => {
            void route.fulfill({
                json: {},
                headers: { "Content-Type": "application/json" },
            })
        })
    })

    test("sees upsell modal", async ({ page }) => {
        await page.goto("./")
        await expect(page).toHaveTitle(/Volley|Weekend/)
        await waitForHubLoad(page)

        const result = await runAgentTest(page, {
            goal: `Verify unsubscribed user sees upsell modal.

Look for:
1. Visible modal with subscription content
2. Text about connecting account, subscribing, QR codes
3. Modal blocking the game carousel

After confirming upsell modal is visible, mark goalComplete=true.
Report what the modal contains.`,
            maxSteps: 5,
        })

        expect(result.success).toBe(true)
    })

    test("can interact with upsell modal", async ({ page }) => {
        await page.goto("./")
        await expect(page).toHaveTitle(/Volley|Weekend/)
        await waitForHubLoad(page)

        await runAgentTest(page, {
            goal: `Test upsell modal visibility and dismissal.

Tasks:
1. Confirm upsell modal is visible with QR code in the screenshot
2. Press Escape once to dismiss the modal
3. Confirm game tiles are now visible

SUCCESS = modal dismissed and game tiles visible.
Do not press Escape again - a second escape triggers the exit confirmation which is different.`,
            maxSteps: 5,
        })
    })

    test("explores upsell experience", async ({ page }) => {
        await page.goto("./")
        await expect(page).toHaveTitle(/Volley|Weekend/)
        await waitForHubLoad(page)

        await runAgentTest(page, {
            goal: `Explore the upsell experience. Navigate around, try keys, observe the UI.

After 8-10 actions, mark goalComplete=true with success=true and summarize what you saw.
Only set success=false if you find REAL bugs: broken layouts, visual glitches, stuck states.
"Modal doesn't have buttons" is NOT a bug - QR modals are scanned by phone.`,
            maxSteps: 12,
        })
    })
})
