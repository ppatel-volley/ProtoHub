import { setupDeviceAuthMock } from "../deviceAuthHelpers"
import { expect, test } from "../fixtures"
import {
    COMMON_EXPERIMENTS,
    SELECTORS,
    TIMEOUTS,
    waitForLoadingComplete,
} from "../testHelpers"

test.describe("Unsubscribed User - Subscription Persistence Across Relaunches", () => {
    test.beforeEach(async ({ page, mockExperiment }) => {
        await setupDeviceAuthMock(page)

        await mockExperiment({
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })
    })

    test("unsubscribed status persists after reloading", async ({ page }) => {
        await page.goto("./")

        await waitForLoadingComplete(page)

        await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()

        await page.reload()

        await waitForLoadingComplete(page)

        await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()
    })

    test("unsubscribed user still sees checkout modal on game selection after relaunch", async ({
        page,
    }) => {
        await page.goto("./")

        await waitForLoadingComplete(page)

        await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()

        await page.reload()

        await waitForLoadingComplete(page)

        await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()

        const gameTile = page.locator(SELECTORS.gameTile).first()
        await gameTile.click()

        await page.waitForTimeout(TIMEOUTS.mediumWait)

        const modal = page.locator('[data-testid="web-checkout-modal"]')
        await expect(modal).toHaveClass(/modalVisible/, {
            timeout: TIMEOUTS.longWait,
        })
    })
})
