import {
    completeDeviceAuthFlow,
    setupDeviceAuthMock,
    simulateSuccessfulPayment,
    verifyFocusRestored,
    verifyModalClosed,
    waitForQrCode,
    waitForSuccessAnimation,
} from "../deviceAuthHelpers"
import { expect, test } from "../fixtures"
import { SELECTORS, TIMEOUTS, waitForLoadingComplete } from "../testHelpers"

test.describe("Device Auth - Immediate Upsell (Payment Simulation)", () => {
    test.beforeEach(async ({ page, mockExperiment }) => {
        await setupDeviceAuthMock(page)

        await mockExperiment({})

        await page.addInitScript(() => {
            sessionStorage.removeItem("hasSuccessfulPayment")
        })
    })

    test("should complete auth flow and return to hub", async ({ page }) => {
        await page.goto("./")

        await waitForLoadingComplete(page, TIMEOUTS.loadingPhase)

        const modal = page.locator('[data-testid="web-checkout-modal"]')
        await expect(modal).toHaveClass(/modalVisible/, {
            timeout: TIMEOUTS.longWait,
        })

        await waitForQrCode(page)

        await simulateSuccessfulPayment(page, 1000)

        await waitForSuccessAnimation(page)

        await verifyModalClosed(page, modal)

        await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()
    })

    test("should show success animation before closing modal", async ({
        page,
    }) => {
        await page.goto("./")

        await waitForLoadingComplete(page, TIMEOUTS.loadingPhase)

        const modal = page.locator('[data-testid="web-checkout-modal"]')
        await expect(modal).toHaveClass(/modalVisible/)

        await waitForQrCode(page)

        await simulateSuccessfulPayment(page, 500)

        const successIndicator = await waitForSuccessAnimation(page)
        if (successIndicator) {
            await expect(successIndicator).toBeVisible()
        }

        await page.waitForTimeout(TIMEOUTS.modalTransition)

        await verifyModalClosed(page, modal)
    })

    test("should restore focus to carousel after successful auth", async ({
        page,
    }) => {
        await page.goto("./")

        await waitForLoadingComplete(page, TIMEOUTS.loadingPhase)

        await completeDeviceAuthFlow(page, 1000)

        await verifyFocusRestored(page)

        const carousel = page.locator(SELECTORS.gamesCarousel)
        await expect(carousel).toBeVisible()
    })

    test("should handle rapid payment success", async ({ page }) => {
        await page.goto("./")

        await waitForLoadingComplete(page, TIMEOUTS.loadingPhase)

        const modal = page.locator('[data-testid="web-checkout-modal"]')
        await expect(modal).toHaveClass(/modalVisible/)

        await waitForQrCode(page)

        await simulateSuccessfulPayment(page, 100)

        await waitForSuccessAnimation(page)

        await verifyModalClosed(page, modal)

        await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()
    })
})
