import { setupGameLaunchMock, setupSubscribedUser } from "../deviceAuthHelpers"
import { expect, test } from "../fixtures"
import {
    clickGameTileWithModalHandling,
    COMMON_EXPERIMENTS,
    SELECTORS,
    TIMEOUTS,
    waitForCarouselReady,
} from "../testHelpers"

test.describe("Game launch and exit", () => {
    test.beforeEach(async ({ page }) => {
        await setupSubscribedUser(page)
        await setupGameLaunchMock(page)
    })

    test("launches a game and exits back to hub", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })

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

        await clickGameTileWithModalHandling(
            page,
            page.locator(SELECTORS.gameTile).first()
        )

        const iframe = page.locator("iframe.game-iframe")
        await expect(iframe).toHaveCount(1)

        await page.waitForFunction(
            () =>
                !(
                    document.querySelector(
                        "iframe.game-iframe"
                    ) as HTMLIFrameElement
                )?.hidden
        )

        await page
            .frameLocator("iframe.game-iframe")
            .locator("#exitButton")
            .click()

        await expect(page.locator("iframe.game-iframe")).toHaveCount(0)

        await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()
        await expect(page.locator(SELECTORS.gameTile).first()).toBeVisible()
    })

    test("handles game launch API failure gracefully", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })

        await page.route("**/game-orchestration/games/*/launch", (route) => {
            void route.fulfill({
                status: 500,
                contentType: "application/json",
                body: JSON.stringify({ error: "Internal server error" }),
            })
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        const firstTile = page.locator(SELECTORS.gameTile).first()
        await firstTile.click()

        await expect(page.locator("iframe.game-iframe")).toHaveCount(0)

        await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()
        await expect(page.locator(SELECTORS.gameTile).first()).toBeVisible()
    })

    test("handles game that never sends ready event", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })

        const gameIframeHtml = `<!DOCTYPE html>
<html>
  <body>
    <h1>Loading Game...</h1>
    <script>
      // This game never sends a ready event
      console.log('Game loaded but never ready');
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

        const firstTile = page.locator(SELECTORS.gameTile).first()
        await firstTile.click()

        const iframe = page.locator("iframe.game-iframe")
        await expect(iframe).toHaveCount(1)

        await page.waitForTimeout(TIMEOUTS.videoAutoplay)

        const isHidden = await page.evaluate(
            () =>
                document
                    .querySelector("iframe.game-iframe")
                    ?.getAttribute("hidden") !== null
        )
        expect(isHidden).toBe(true)
    })

    test("launches multiple games in sequence", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })

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

        for (let i = 0; i < 2; i++) {
            const firstTile = page.locator(SELECTORS.gameTile).first()
            await clickGameTileWithModalHandling(page, firstTile)

            const iframe = page.locator("iframe.game-iframe")
            await expect(iframe).toHaveCount(1)

            await page.waitForFunction(
                () =>
                    !(
                        document.querySelector(
                            "iframe.game-iframe"
                        ) as HTMLIFrameElement
                    )?.hidden
            )

            await page
                .frameLocator("iframe.game-iframe")
                .locator("#exitButton")
                .click()

            await expect(page.locator("iframe.game-iframe")).toHaveCount(0)
            await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()
        }
    })

    test("handles network timeout during game launch", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })

        await page.route("**/game-orchestration/games/*/launch", (route) => {
            void route.abort("timedout")
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        const firstTile = page.locator(SELECTORS.gameTile).first()
        await firstTile.click()

        await page.waitForTimeout(TIMEOUTS.longWait)

        await expect(page.locator("iframe.game-iframe")).toHaveCount(0)
        await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()
        await expect(page.locator(SELECTORS.gameTile).first()).toBeVisible()
    })

    test("handles malformed API response", async ({ page, mockExperiment }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })

        await page.route("**/game-orchestration/games/*/launch", (route) => {
            void route.fulfill({
                status: 200,
                contentType: "application/json",
                body: "invalid json response {",
            })
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        const firstTile = page.locator(SELECTORS.gameTile).first()
        await firstTile.click()

        await expect(page.locator("iframe.game-iframe")).toHaveCount(0)
        await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()
        await expect(page.locator(SELECTORS.gameTile).first()).toBeVisible()
    })

    test("handles API response with missing URL", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })

        await page.route("**/game-orchestration/games/*/launch", (route) => {
            void route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({ message: "success" }),
            })
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        const firstTile = page.locator(SELECTORS.gameTile).first()
        await firstTile.click()

        await expect(page.locator("iframe.game-iframe")).toHaveCount(0)
        await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()
        await expect(page.locator(SELECTORS.gameTile).first()).toBeVisible()
    })

    test("handles game with malformed events", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })

        const gameIframeHtml = `<!DOCTYPE html>
<html>
  <body>
    <h1>Malformed Game</h1>
    <button id="exitButton">Exit</button>
    <script>
      window.addEventListener('DOMContentLoaded', () => {
        // Send malformed ready event (missing required fields)
        window.parent.postMessage({ type: 'ready' }, '*');

        document.getElementById('exitButton').addEventListener('click', () => {
          // Send malformed close event (wrong source)
          window.parent.postMessage({ source: 'wrong-source', type: 'close', args: [] }, '*');
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

        const firstTile = page.locator(SELECTORS.gameTile).first()
        await firstTile.click()

        const iframe = page.locator("iframe.game-iframe")
        await expect(iframe).toHaveCount(1)

        await page.waitForTimeout(TIMEOUTS.videoAutoplay)

        const isHidden = await page.evaluate(
            () =>
                document
                    .querySelector("iframe.game-iframe")
                    ?.getAttribute("hidden") !== null
        )
        expect(isHidden).toBe(true)
    })

    test("handles iframe loading failure", async ({ page, mockExperiment }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })

        await page.route("**/game-orchestration/games/*/launch", (route) => {
            void route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    url: "https://invalid-game-url.example/nonexistent",
                }),
            })
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        const firstTile = page.locator(SELECTORS.gameTile).first()
        await firstTile.click()

        const iframe = page.locator("iframe.game-iframe")
        await expect(iframe).toHaveCount(1)

        await page.waitForTimeout(TIMEOUTS.loadingPhase)

        const isHidden = await page.evaluate(
            () =>
                document
                    .querySelector("iframe.game-iframe")
                    ?.getAttribute("hidden") !== null
        )
        expect(isHidden).toBe(true)
    })

    test("user remains on same tile after launching and exiting game", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        const gameTiles = page.locator(SELECTORS.gameTile)
        const tileCount = await gameTiles.count()

        if (tileCount < 2) {
            test.skip()
            return
        }

        await page.keyboard.press("ArrowRight")
        await page.waitForTimeout(TIMEOUTS.navigation)

        const secondTile = gameTiles.nth(1)
        await expect(secondTile).toHaveAttribute("data-focused", "true")

        const secondTileIndex = await secondTile.getAttribute("data-index")

        await clickGameTileWithModalHandling(page, secondTile)

        const iframe = page.locator("iframe.game-iframe")
        await expect(iframe).toHaveCount(1)

        await page.waitForFunction(
            () =>
                !(
                    document.querySelector(
                        "iframe.game-iframe"
                    ) as HTMLIFrameElement
                )?.hidden
        )

        await page
            .frameLocator("iframe.game-iframe")
            .locator("#exitButton")
            .click()

        await expect(page.locator("iframe.game-iframe")).toHaveCount(0)

        await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()

        const focusedTile = page.locator(
            `${SELECTORS.gameTile}[data-focused="true"]`
        )
        await expect(focusedTile).toBeVisible()

        const focusedTileIndex = await focusedTile.getAttribute("data-index")
        expect(focusedTileIndex).toBe(secondTileIndex)
    })
})
