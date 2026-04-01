import { expect, test } from "../fixtures"
import {
    COMMON_EXPERIMENTS,
    SELECTORS,
    TIMEOUTS,
    waitForLoadingComplete,
} from "../testHelpers"

test.describe("Game Selection Upsell UI - Unsubscribed User", () => {
    test.beforeEach(async ({ mockExperiment }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })
    })

    test("should show upsell modal when clicking game tile without subscription", async ({
        page,
    }) => {
        await page.goto("./")

        await waitForLoadingComplete(page)

        await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()

        const gameTile = page.locator(SELECTORS.gameTile).first()
        await expect(gameTile).toBeVisible()

        await gameTile.click()

        const modal = page.locator('[data-testid="web-checkout-modal"]')
        await expect(modal).toHaveClass(/modalVisible/, {
            timeout: TIMEOUTS.extraLongWait,
        })

        const qrSection = page.locator('[class*="qrSectionContainer"]')
        await expect(qrSection).toBeVisible({ timeout: TIMEOUTS.extraLongWait })
    })

    test("should show modal and block game launch when dismissed", async ({
        page,
    }) => {
        await page.goto("./")

        await waitForLoadingComplete(page)

        await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()

        const gameTile = page.locator(SELECTORS.gameTile).first()
        await gameTile.click()

        const modal = page.locator('[data-testid="web-checkout-modal"]')
        await expect(modal).toHaveClass(/modalVisible/, {
            timeout: TIMEOUTS.extraLongWait,
        })

        const qrSection = page.locator('[class*="qrSectionContainer"]')
        await expect(qrSection).toBeVisible({ timeout: TIMEOUTS.extraLongWait })

        await page.keyboard.press("Escape")
        await page.waitForTimeout(TIMEOUTS.modalTransition)

        await expect(modal).toHaveClass(/modalHidden/, {
            timeout: TIMEOUTS.longWait,
        })

        const iframe = page.locator("iframe.game-iframe")
        await expect(iframe).toHaveCount(0)

        await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()
    })

    test("should show modal again after dismissal for new game", async ({
        page,
    }) => {
        await page.goto("./")

        await waitForLoadingComplete(page)

        await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()

        const firstTile = page.locator(SELECTORS.gameTile).first()
        await firstTile.click()

        const modal = page.locator('[data-testid="web-checkout-modal"]')
        await expect(modal).toHaveClass(/modalVisible/, {
            timeout: TIMEOUTS.extraLongWait,
        })

        await page.keyboard.press("Escape")
        await page.waitForTimeout(TIMEOUTS.modalTransition)

        await expect(modal).toHaveClass(/modalHidden/, {
            timeout: TIMEOUTS.longWait,
        })

        await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()

        const secondTile = page.locator(SELECTORS.gameTile).nth(1)
        await secondTile.click()

        await expect(modal).toHaveClass(/modalVisible/, {
            timeout: TIMEOUTS.extraLongWait,
        })
    })

    test("should return to hub if modal is dismissed", async ({ page }) => {
        await page.goto("./")

        await waitForLoadingComplete(page)

        const gameTile = page.locator(SELECTORS.gameTile).first()
        await gameTile.click()

        const modal = page.locator('[data-testid="web-checkout-modal"]')
        await expect(modal).toHaveClass(/modalVisible/, {
            timeout: TIMEOUTS.extraLongWait,
        })

        const qrSection = page.locator('[class*="qrSectionContainer"]')
        await expect(qrSection).toBeVisible({ timeout: TIMEOUTS.extraLongWait })

        await page.keyboard.press("Escape")
        await page.waitForTimeout(TIMEOUTS.modalTransition)

        await expect(modal).toHaveClass(/modalHidden/, {
            timeout: TIMEOUTS.longWait,
        })
        await expect(modal).not.toHaveClass(/modalVisible/)

        await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()

        const iframe = page.locator("iframe.game-iframe")
        await expect(iframe).toHaveCount(0)
    })
})
