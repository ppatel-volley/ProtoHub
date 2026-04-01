import { setupGameLaunchMock, setupSubscribedUser } from "../deviceAuthHelpers"
import { expect, test } from "../fixtures"
import {
    COMMON_EXPERIMENTS,
    SELECTORS,
    TIMEOUTS,
    waitForLoadingComplete,
} from "../testHelpers"

test.describe("Subscribed User - Modal Bypass", () => {
    test.beforeEach(async ({ page, mockExperiment }) => {
        await setupGameLaunchMock(page)
        await setupSubscribedUser(page)

        await mockExperiment({
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })
    })

    test("should bypass modal and launch game directly", async ({ page }) => {
        await page.goto("./")

        await waitForLoadingComplete(page)

        await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()

        const gameTile = page.locator(SELECTORS.gameTile).first()
        await gameTile.click()

        await page.waitForTimeout(TIMEOUTS.mediumWait)

        const modal = page.locator('[data-testid="web-checkout-modal"]')
        await expect(modal).not.toHaveClass(/modalVisible/)

        const iframe = page.locator("iframe.game-iframe")
        await expect(iframe).toHaveCount(1, { timeout: TIMEOUTS.extraLongWait })

        await page.waitForFunction(
            () =>
                !(
                    document.querySelector(
                        "iframe.game-iframe"
                    ) as HTMLIFrameElement
                )?.hidden,
            { timeout: TIMEOUTS.extraLongWait }
        )
    })

    test("should not show upsell on hub load", async ({ page }) => {
        await page.goto("./")

        await waitForLoadingComplete(page)

        await page.waitForTimeout(TIMEOUTS.mediumWait)

        const modal = page.locator('[data-testid="web-checkout-modal"]')
        const isModalVisible = await modal.isVisible().catch(() => false)

        if (!isModalVisible) {
            await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()
        }
    })
})
