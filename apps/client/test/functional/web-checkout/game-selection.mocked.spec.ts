import {
    completeDeviceAuthFlow,
    setupDeviceAuthMock,
    setupGameLaunchMock,
    waitForGameIframe,
} from "../deviceAuthHelpers"
import { expect, test } from "../fixtures"
import {
    COMMON_EXPERIMENTS,
    SELECTORS,
    TIMEOUTS,
    waitForLoadingComplete,
} from "../testHelpers"

test.describe("Device Auth - Game Selection (Payment Simulation)", () => {
    test.beforeEach(async ({ page, mockExperiment }) => {
        await setupDeviceAuthMock(page)
        await setupGameLaunchMock(page)

        await mockExperiment({
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })

        await page.addInitScript(() => {
            sessionStorage.removeItem("hasSuccessfulPayment")
        })
    })

    test("should complete auth and launch game", async ({ page }) => {
        await page.goto("./")

        await waitForLoadingComplete(page, TIMEOUTS.loadingPhase)

        await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()

        const gameTile = page.locator(SELECTORS.gameTile).first()
        await gameTile.click()

        const modal = page.locator('[data-testid="web-checkout-modal"]')
        await expect(modal).toHaveClass(/modalVisible/)

        await completeDeviceAuthFlow(page, 1000)

        await page.waitForTimeout(TIMEOUTS.modalTransition)

        const iframe = await waitForGameIframe(page)
        await expect(iframe).toBeVisible()
    })

    test("should launch game immediately after successful auth", async ({
        page,
    }) => {
        await page.goto("./")

        await waitForLoadingComplete(page, TIMEOUTS.loadingPhase)

        const gameTile = page.locator(SELECTORS.gameTile).first()
        await gameTile.click()

        await completeDeviceAuthFlow(page, 500)

        await page.waitForTimeout(TIMEOUTS.navigation)

        const iframe = page.locator("iframe.game-iframe")
        await expect(iframe).toHaveCount(1, { timeout: TIMEOUTS.longWait })
    })

    test("should handle game launch after auth completion", async ({
        page,
    }) => {
        await page.goto("./")

        await waitForLoadingComplete(page, TIMEOUTS.loadingPhase)

        const gameTile = page.locator(SELECTORS.gameTile).first()
        await gameTile.click()

        const modal = page.locator('[data-testid="web-checkout-modal"]')
        await expect(modal).toHaveClass(/modalVisible/)

        await completeDeviceAuthFlow(page, 1000)

        await page.waitForTimeout(TIMEOUTS.mediumWait)

        const iframe = await waitForGameIframe(page)
        await expect(iframe).toBeVisible()

        await page
            .frameLocator("iframe.game-iframe")
            .locator("#exitButton")
            .click()

        await expect(iframe).toHaveCount(0)

        await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()
    })

    test("should allow multiple games to be played after single auth", async ({
        page,
    }) => {
        await page.goto("./")

        await waitForLoadingComplete(page, TIMEOUTS.loadingPhase)

        const firstTile = page.locator(SELECTORS.gameTile).first()
        await firstTile.click()

        await completeDeviceAuthFlow(page, 1000)

        await page.waitForTimeout(TIMEOUTS.navigation)

        let iframe = await waitForGameIframe(page)
        await expect(iframe).toBeVisible()

        await page
            .frameLocator("iframe.game-iframe")
            .locator("#exitButton")
            .click()

        await expect(iframe).toHaveCount(0)

        await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()

        const secondTile = page.locator(SELECTORS.gameTile).nth(1)
        await secondTile.click()

        iframe = page.locator("iframe.game-iframe")
        await expect(iframe).toHaveCount(1, { timeout: TIMEOUTS.longWait })

        const modal = page.locator('[data-testid="web-checkout-modal"]')
        await expect(modal).not.toHaveClass(/modalVisible/)
    })
})
