// ABOUTME: Test utilities and helpers for device authentication functional tests
// ABOUTME: Provides mocking, simulation, and verification functions for QR code auth flows

import { expect, type Locator, type Page } from "@playwright/test"

import { logger } from "../../src/utils/logger"
import { TIMEOUTS } from "./testHelpers"

export interface DeviceAuthResponse {
    deviceCode: string
    userCode: string
    verificationUri: string
    verificationUriComplete: string
    expiresIn: number
    interval: number
}

export interface GameLaunchResponse {
    url: string
}

/**
 * Creates a default device authorization response with sensible test values
 */
export function createDeviceAuthResponse(
    overrides: Partial<DeviceAuthResponse> = {}
): DeviceAuthResponse {
    return {
        deviceCode: "test-device-code-12345",
        userCode: "TESTQR",
        verificationUri: "https://pair-test.volley.tv",
        verificationUriComplete: "https://pair-test.volley.tv/?pairing=TESTQR",
        expiresIn: 60000,
        interval: 5000,
        ...overrides,
    }
}

/**
 * Creates a game launch response for testing
 */
export function createGameLaunchResponse(
    overrides: Partial<GameLaunchResponse> = {}
): GameLaunchResponse {
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

    return {
        url: dataUrl,
        ...overrides,
    }
}

/**
 * Sets up device authorization API mock to return successful responses
 */
export async function setupDeviceAuthMock(
    page: Page,
    response?: Partial<DeviceAuthResponse>
): Promise<void> {
    const authResponse = createDeviceAuthResponse(response)

    await page.route("**/api/v1/auth/device/authorize", (route) => {
        void route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(authResponse),
        })
    })

    logger.info("[Test] Device auth API mock configured", authResponse)
}

/**
 * Sets up device authorization API mock to return an error
 */
export async function setupDeviceAuthErrorMock(
    page: Page,
    errorMessage: string = "Device authorization failed"
): Promise<void> {
    await page.route("**/api/v1/auth/device/authorize", (route) => {
        void route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ error: errorMessage }),
        })
    })

    logger.info("[Test] Device auth API error mock configured")
}

/**
 * Sets up game launch API mock
 */
export async function setupGameLaunchMock(
    page: Page,
    response?: Partial<GameLaunchResponse>
): Promise<void> {
    const launchResponse = createGameLaunchResponse(response)

    await page.route("**/game-orchestration/games/*/launch", (route) => {
        void route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(launchResponse),
        })
    })

    logger.info("[Test] Game launch API mock configured")
}

/**
 * Sets up a user as subscribed by injecting subscription status into Platform SDK.
 *
 * ## Why this is needed for localhost
 *
 * The auth setup saves a cookie with `domain: ".volley.tv"`. When tests run on
 * `localhost:4173`, the browser won't send this cookie to the local server due to
 * domain mismatch. The Platform SDK makes API calls to `auth-dev.volley.tv` to check
 * subscription status, but cross-origin cookie restrictions prevent the auth cookie
 * from being sent with those requests from a localhost origin.
 *
 * ## When running against staging
 *
 * When `TEST_ENVIRONMENT=staging`, tests run against the real staging URL where the
 * domain matches `.volley.tv`. In this case, the auth cookie flows through correctly
 * and real subscription status is returned from the API. This function becomes a no-op.
 *
 * This should be removed once we have a better solution for local development.
 */
export async function setupSubscribedUser(page: Page): Promise<void> {
    const isStaging = process.env.TEST_ENVIRONMENT === "staging"

    if (isStaging) {
        logger.info(
            "[Test] Staging environment - skipping subscription mock (using real auth)"
        )
        return
    }

    await page.addInitScript(() => {
        sessionStorage.setItem("hasSuccessfulPayment", "true")
    })

    logger.info("[Test] User configured as subscribed (local mock)")
}

/**
 * Waits for QR code to be visible and rendered in the modal
 */
export async function waitForQrCode(page: Page): Promise<Locator> {
    const qrSection = page.locator('[class*="qrSectionContainer"]')
    await expect(qrSection).toBeVisible({ timeout: TIMEOUTS.longWait })

    logger.info("[Test] QR code section visible")

    return qrSection
}

/**
 * Waits for the success animation (green checkmark) to appear
 * Returns null if animation doesn't appear (e.g., modal closes too quickly)
 */
export async function waitForSuccessAnimation(
    page: Page
): Promise<Locator | null> {
    const successIndicator = page.locator('[class*="successCheckmark"]')
    try {
        await expect(successIndicator).toBeVisible({
            timeout: TIMEOUTS.longWait,
        })
        logger.info("[Test] Success animation visible")
        return successIndicator
    } catch {
        logger.info(
            "[Test] Success animation did not appear (modal may have closed)"
        )
        return null
    }
}

/**
 * Simulates a successful payment by triggering subscription status change in Platform SDK
 */
export async function simulateSuccessfulPayment(
    page: Page,
    delayMs: number = 1000
): Promise<void> {
    await page.waitForTimeout(delayMs)

    await page.evaluate(() => {
        sessionStorage.setItem("hasSuccessfulPayment", "true")

        const win = window as unknown as Window & {
            simulatePaymentSuccess?: () => void
        }

        if (win.simulatePaymentSuccess) {
            win.simulatePaymentSuccess()
        } else {
            const accountChangeEvent = new CustomEvent("account:change", {
                detail: {
                    account: {
                        isSubscribed: true,
                    },
                },
            })
            window.dispatchEvent(accountChangeEvent)
        }
    })

    logger.info("[Test] Simulated successful payment")
}

/**
 * Verifies that the web checkout modal has closed and is no longer visible
 */
export async function verifyModalClosed(
    page: Page,
    modal?: Locator
): Promise<void> {
    const modalLocator =
        modal || page.locator('[data-testid="web-checkout-modal"]')

    await expect(modalLocator).toHaveClass(/modalHidden/, {
        timeout: TIMEOUTS.longWait,
    })
    await expect(modalLocator).not.toHaveClass(/modalVisible/)

    logger.info("[Test] Modal successfully closed")
}

/**
 * Verifies that focus has been restored to the correct element
 */
export async function verifyFocusRestored(
    page: Page,
    expectedElement?: Locator
): Promise<void> {
    if (expectedElement) {
        await expect(expectedElement).toBeFocused({
            timeout: TIMEOUTS.longWait,
        })
        logger.info("[Test] Focus restored to expected element")
    } else {
        const carousel = page.locator('[class*="gamesCarousel"]')
        await expect(carousel).toBeVisible()
        logger.info("[Test] Focus restored to carousel")
    }
}

/**
 * Waits for game iframe to appear and become visible
 */
export async function waitForGameIframe(page: Page): Promise<Locator> {
    const iframe = page.locator("iframe.game-iframe")
    await expect(iframe).toHaveCount(1, { timeout: TIMEOUTS.longWait })

    await page.waitForFunction(
        () =>
            !(document.querySelector("iframe.game-iframe") as HTMLIFrameElement)
                ?.hidden,
        { timeout: TIMEOUTS.longWait }
    )

    logger.info("[Test] Game iframe visible and ready")

    return iframe
}

/**
 * Sets up DataDog event tracking interception for verification
 */
export async function setupDataDogTracking(page: Page): Promise<{
    getEvents: () => Array<{ name: string; context?: Record<string, unknown> }>
}> {
    const events: Array<{ name: string; context?: Record<string, unknown> }> =
        []

    await page.exposeFunction(
        "mockDataDogAddAction",
        (name: string, context?: Record<string, unknown>) => {
            events.push({ name, context })
        }
    )

    logger.info("[Test] DataDog tracking mock configured")

    return {
        getEvents: () => events,
    }
}

/**
 * Sets up Segment.io event tracking interception for verification
 */
export async function setupSegmentTracking(page: Page): Promise<{
    getEvents: () => Array<{
        event: string
        properties?: Record<string, unknown>
        timestamp?: string
    }>
}> {
    const events: Array<{
        event: string
        properties?: Record<string, unknown>
        timestamp?: string
    }> = []

    await page.route("**/api.segment.io/**", async (route) => {
        const request = route.request()
        const postData = request.postData()

        if (postData) {
            try {
                const data = JSON.parse(postData) as {
                    event?: string
                    properties?: Record<string, unknown>
                    timestamp?: string
                }

                if (data.event) {
                    events.push({
                        event: data.event,
                        properties: data.properties,
                        timestamp: data.timestamp,
                    })
                }
            } catch {
                // Ignore malformed JSON
            }
        }

        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true }),
        })
    })

    logger.info("[Test] Segment tracking mock configured")

    return {
        getEvents: () => events,
    }
}

/**
 * Dismisses the web checkout modal by pressing the back button
 */
export async function dismissModal(page: Page): Promise<void> {
    await page.keyboard.press("Escape")
    await page.waitForTimeout(TIMEOUTS.modalTransition)

    logger.info("[Test] Modal dismissed via back button")
}

/**
 * Completes the full device auth success flow:
 * 1. Wait for QR code to appear
 * 2. Simulate successful payment
 * 3. Wait for success animation
 * 4. Wait for modal to close
 */
export async function completeDeviceAuthFlow(
    page: Page,
    paymentDelayMs: number = 1000
): Promise<void> {
    await waitForQrCode(page)
    await simulateSuccessfulPayment(page, paymentDelayMs)
    await waitForSuccessAnimation(page)

    const modal = page.locator('[data-testid="web-checkout-modal"]')
    await verifyModalClosed(page, modal)

    logger.info("[Test] Device auth flow completed successfully")
}
