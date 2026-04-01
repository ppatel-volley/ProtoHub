import { setupDeviceAuthMock, waitForQrCode } from "../deviceAuthHelpers"
import { expect, test } from "../fixtures"
import {
    setupFunctionalTest,
    TIMEOUTS,
    waitForLoadingComplete,
} from "../testHelpers"

test.describe("Web Checkout QR Code Loading States", () => {
    test.beforeEach(async ({ page }) => {
        await setupFunctionalTest(page, { bypassIdentitySubscription: false })

        await page.addInitScript(() => {
            sessionStorage.removeItem("hasSuccessfulPayment")
        })

        await setupDeviceAuthMock(page, {
            userCode: "TEST123",
        })
    })

    test("placeholder QR code shows while real QR is loading", async ({
        page,
    }) => {
        await page.route("**/api/v1/qr?url=**", async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 2000))
            await route.continue()
        })

        await page.goto("./")

        await waitForLoadingComplete(page, TIMEOUTS.loadingPhase)

        const modalRoot = page.locator('[data-testid="web-checkout-modal"]')
        await expect(modalRoot).toHaveClass(/modalVisible/, {
            timeout: TIMEOUTS.longWait,
        })

        const qrSection = await waitForQrCode(page)

        const placeholderQr = qrSection.locator('[class*="fakeQr"]').first()
        await expect(placeholderQr).toBeVisible()

        const hasRealQr = await page.waitForFunction(
            () => {
                const root = document.querySelector('[class*="root"]')
                if (!root) return false
                const qrDivs = root.querySelectorAll('[class*="qr"]')
                for (const div of qrDivs) {
                    const style = window.getComputedStyle(div as HTMLElement)
                    if (
                        style.backgroundImage !== "none" &&
                        !(div as HTMLElement).className.includes("fakeQr")
                    ) {
                        return true
                    }
                }
                return false
            },
            { timeout: TIMEOUTS.longWait }
        )

        expect(hasRealQr).toBeTruthy()
    })

    test("spinner shows while device authorization is loading", async ({
        page,
    }) => {
        await page.route("**/api/v1/auth/device/authorize", async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 2000))
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    deviceCode: "test-device-code",
                    userCode: "LOADING",
                    verificationUri: "https://pair-test.volley.tv",
                    verificationUriComplete:
                        "https://pair-test.volley.tv/?pairing=LOADING",
                    expiresIn: 60000,
                    interval: 5000,
                }),
            })
        })

        await page.goto("./")

        await waitForLoadingComplete(page, TIMEOUTS.loadingPhase)

        const modalRoot = page.locator('[data-testid="web-checkout-modal"]')
        await expect(modalRoot).toHaveClass(/modalVisible/, {
            timeout: TIMEOUTS.longWait,
        })

        const spinner = page.locator('[class*="refreshingSpinner"]')
        await expect(spinner).toBeVisible()

        await waitForQrCode(page)
    })
})
