import { expect, test } from "../fixtures"
import {
    COMMON_EXPERIMENTS,
    exitGame,
    launchGame,
    SELECTORS,
    TIMEOUTS,
    waitForCarouselReady,
} from "../testHelpers"

test.describe("Focus Indicator - Rapid Navigation After Game Exit", () => {
    test.beforeEach(async ({ mockExperiment }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })
    })

    // TODO: Skip - requires game launch which is blocked by unauthenticated user modal
    test.skip("focus indicator should remain visible when spamming navigation after game exit", async ({
        page,
    }) => {
        const gameIframeHtml = `<!DOCTYPE html>
<html>
  <body>
    <h1>Test Game</h1>
    <button id="exitButton">Exit</button>
    <script>
      window.addEventListener('DOMContentLoaded', () => {
        window.parent.postMessage({ source: 'platform-sdk-iframe', type: 'ready', args: [] }, '*');
        document.getElementById('exitButton').addEventListener('click', () => {
          window.parent.postMessage({ source: 'platform-sdk-iframe', type: 'close', args: [] }, '*');
        });
      });
    </script>
  </body>
</html>`

        const dataUrl = `data:text/html,${encodeURIComponent(gameIframeHtml)}`

        await page.route("**/game-orchestration/games/*/launch", (route) => {
            void route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({ url: dataUrl }),
            })
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        // Verify focus indicator is visible initially
        const focusIndicator = page.locator('[class*="focusIndicator"]')
        await expect(focusIndicator).toBeVisible()
        const initialOpacity = await focusIndicator.evaluate(
            (el) => window.getComputedStyle(el).opacity
        )
        expect(parseFloat(initialOpacity)).toBeGreaterThan(0)

        await launchGame(page, page.locator(SELECTORS.gameTile).first())
        await exitGame(page)

        // Immediately spam directional buttons (simulate the reported issue)
        // This simulates rapid user input on FireTV, Samsung, and LG
        const navigationKeys = [
            "ArrowRight",
            "ArrowRight",
            "ArrowLeft",
            "ArrowRight",
            "ArrowLeft",
            "ArrowRight",
        ]

        for (const key of navigationKeys) {
            await page.keyboard.press(key)
            // Very short delay to simulate rapid button presses
            await page.waitForTimeout(Math.floor(TIMEOUTS.focusProcessing / 2))
        }

        // Wait a moment for any pending updates
        await page.waitForTimeout(TIMEOUTS.quickWait)

        // Verify focus indicator is still visible
        await expect(focusIndicator).toBeVisible()
        const finalOpacity = await focusIndicator.evaluate(
            (el) => window.getComputedStyle(el).opacity
        )
        expect(parseFloat(finalOpacity)).toBeGreaterThan(0)

        // Verify a tile has focus
        const focusedTile = page.locator(
            '[class*="gameTile"][class*="focused"]'
        )
        await expect(focusedTile).toHaveCount(1)
    })

    test("focus indicator should not disappear when navigation keys are pressed during exit transition", async ({
        page,
    }) => {
        await page.goto("./")
        await waitForCarouselReady(page)

        const focusIndicator = page.locator('[class*="focusIndicator"]')

        // Navigate through tiles rapidly
        for (let i = 0; i < 5; i++) {
            await page.keyboard.press("ArrowRight")
            await page.waitForTimeout(Math.floor(TIMEOUTS.focusProcessing / 3))

            // Check that focus indicator remains visible throughout
            const opacity = await focusIndicator.evaluate(
                (el) => window.getComputedStyle(el).opacity
            )
            expect(parseFloat(opacity)).toBeGreaterThan(0)
        }

        // Try to trigger exit modal and cancel rapidly
        await page.keyboard.press("Escape")
        await page.waitForTimeout(TIMEOUTS.focusProcessing)
        await page.keyboard.press("Escape")

        // Spam navigation immediately after canceling
        for (let i = 0; i < 3; i++) {
            await page.keyboard.press("ArrowLeft")
            await page.waitForTimeout(Math.floor(TIMEOUTS.focusProcessing / 3))
        }

        await page.waitForTimeout(TIMEOUTS.quickWait)

        // Focus indicator should still be visible
        await expect(focusIndicator).toBeVisible()
        const opacity = await focusIndicator.evaluate(
            (el) => window.getComputedStyle(el).opacity
        )
        expect(parseFloat(opacity)).toBeGreaterThan(0)
    })
})
