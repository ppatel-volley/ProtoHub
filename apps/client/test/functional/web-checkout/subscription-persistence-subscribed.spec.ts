import { setupGameLaunchMock, setupSubscribedUser } from "../deviceAuthHelpers"
import { expect, test } from "../fixtures"
import {
    COMMON_EXPERIMENTS,
    SELECTORS,
    TIMEOUTS,
    waitForLoadingComplete,
} from "../testHelpers"

test.describe("Subscribed User - Subscription Persistence Across Relaunches", () => {
    test.beforeEach(async ({ page, mockExperiment }) => {
        await setupGameLaunchMock(page)
        await setupSubscribedUser(page)

        await mockExperiment({
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })
    })

    test("subscription status persists after reloading", async ({ page }) => {
        await page.goto("./")

        await waitForLoadingComplete(page)

        await page.waitForTimeout(TIMEOUTS.mediumWait)

        const modal = page.locator('[data-testid="web-checkout-modal"]')
        await expect(modal).not.toHaveClass(/modalVisible/)

        await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()

        await page.reload()

        await waitForLoadingComplete(page)

        await page.waitForTimeout(TIMEOUTS.mediumWait)

        await expect(modal).not.toHaveClass(/modalVisible/)
        await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()
    })

    test("subscribed user can launch games after relaunch without modal", async ({
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
        await expect(modal).not.toHaveClass(/modalVisible/)

        const iframe = page.locator("iframe.game-iframe")
        await expect(iframe).toHaveCount(1, {
            timeout: TIMEOUTS.extraLongWait,
        })
    })
})
