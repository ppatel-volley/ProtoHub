import { expect, test } from "../fixtures"
import { SELECTORS, TIMEOUTS, waitForLoadingComplete } from "../testHelpers"

test.describe("Upsell UI - Unsubscribed User", () => {
    test("should display QR code when upsell modal opens", async ({ page }) => {
        await page.goto("./")

        await waitForLoadingComplete(page)

        const modal = page.locator('[data-testid="web-checkout-modal"]')
        await expect(modal).toHaveClass(/modalVisible/, {
            timeout: TIMEOUTS.extraLongWait,
        })

        const qrSection = page.locator('[class*="qrSectionContainer"]')
        await expect(qrSection).toBeVisible({ timeout: TIMEOUTS.extraLongWait })
    })

    test("should allow dismissing modal with back button", async ({ page }) => {
        await page.goto("./")

        await waitForLoadingComplete(page)

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
    })

    test("QR code section appears when modal opens", async ({ page }) => {
        await page.goto("./")

        await waitForLoadingComplete(page)

        const modalRoot = page.locator('[data-testid="web-checkout-modal"]')
        await modalRoot.waitFor({
            state: "attached",
            timeout: TIMEOUTS.extraLongWait,
        })

        await expect(modalRoot).toHaveClass(/modalVisible/, {
            timeout: TIMEOUTS.extraLongWait,
        })

        const qrSection = page.locator('[class*="qrSectionContainer"]')
        await expect(qrSection).toBeVisible({ timeout: TIMEOUTS.extraLongWait })
    })

    test("QR code element renders after device auth loads", async ({
        page,
    }) => {
        await page.goto("./")

        await waitForLoadingComplete(page)

        const modalRoot = page.locator('[data-testid="web-checkout-modal"]')
        await expect(modalRoot).toHaveClass(/modalVisible/, {
            timeout: TIMEOUTS.extraLongWait,
        })

        const qrSection = page.locator('[class*="qrSectionContainer"]')
        await expect(qrSection).toBeVisible({ timeout: TIMEOUTS.extraLongWait })

        const qrElement = qrSection.locator('[class*="qr"]').first()
        await expect(qrElement).toBeVisible({ timeout: TIMEOUTS.extraLongWait })
    })
})
