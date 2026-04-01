import { expect, type Locator, type Page } from "@playwright/test"

import { logger } from "../../src/utils/logger"
import {
    clearAmplitudeExperiments,
    type ExperimentMockConfig,
    setAmplitudeExperiments,
} from "./amplitudeMock"

/**
 * Common utility functions for functional tests
 */

export type { ExperimentMockConfig }

export interface TestSetupOptions {
    experiments?: ExperimentMockConfig
    logoDisplayMillis?: number
    accountId?: string
}

/**
 * Comprehensive test setup function with experiment mocking and environment configuration
 */
export async function setupFunctionalTest(
    page: Page,
    options: TestSetupOptions = {}
): Promise<void> {
    const {
        experiments = {},
        logoDisplayMillis = 100,
        accountId = "test-account-id",
    } = options

    setAmplitudeExperiments(experiments)

    // Use Playwright's route interception for browser-side requests
    await page.route("https://api.lab.amplitude.com/**", (route) => {
        const configuredExperiments = { ...experiments }
        void route.fulfill({
            json: configuredExperiments,
            headers: { "Content-Type": "application/json" },
        })
    })

    await page.addInitScript(
        (config: {
            logoDisplayMillis: number
            accountId: string
            environment: string
        }) => {
            ;(
                window as unknown as Window & {
                    __TEST_PLATFORM_OVERRIDES?: {
                        isFunctionalTest?: boolean
                    }
                }
            ).__TEST_PLATFORM_OVERRIDES = {
                isFunctionalTest: true,
            }
            ;(window as unknown as { __env: Record<string, string> }).__env = {
                VITE_VOLLEY_LOGO_DISPLAY_MILLIS:
                    config.logoDisplayMillis.toString(),
            }
            ;(
                globalThis as unknown as {
                    import: { meta: { env: Record<string, string> } }
                }
            ).import = {
                meta: {
                    env: (
                        window as unknown as { __env: Record<string, string> }
                    ).__env,
                },
            }
            ;(
                window as unknown as { APP_CONFIG: Record<string, string> }
            ).APP_CONFIG = {
                environment: config.environment,
                // BACKEND_SERVER_ENDPOINT: Not needed for functional tests since we are not presently using it
                SEGMENT_WRITE_KEY: "test-key",
                AMPLITUDE_EXPERIMENT_KEY: "test-amplitude-key",
                DATADOG_APPLICATION_ID: "test-id",
                DATADOG_CLIENT_TOKEN: "test-token",
                VOLLEY_LOGO_DISPLAY_MILLIS: config.logoDisplayMillis.toString(),
            }

            const OriginalImage = window.Image
            window.Image = function (
                width?: number,
                height?: number
            ): HTMLImageElement {
                const img = new OriginalImage(width, height)
                setTimeout(() => {
                    try {
                        // Fire event listeners registered via addEventListener
                        img.dispatchEvent(new Event("load"))
                    } catch (_e) {
                        /* noop */
                    }
                    try {
                        // Also call onload property handler if set
                        if (typeof img.onload === "function") {
                            img.onload(new Event("load") as unknown as Event)
                        }
                    } catch (_e) {
                        /* noop */
                    }
                    try {
                        // Help code paths that depend on the `complete` flag
                        Object.defineProperty(img, "complete", { value: true })
                    } catch (_e) {
                        /* noop */
                    }
                }, 10)
                return img
            } as unknown as typeof window.Image

            if (config.accountId) {
                window.localStorage.setItem("accountId", config.accountId)
            }
        },
        {
            logoDisplayMillis,
            accountId,
            environment: process.env.TEST_ENVIRONMENT || "local",
        }
    )
}

/**
 * Cleanup function for functional tests
 */
export function cleanupFunctionalTest(): void {
    clearAmplitudeExperiments()
}

/**
 * Set a single experiment variant (convenience function)
 */
export function setExperimentVariant(
    flagKey: string,
    value: string,
    payload?: unknown
): void {
    setAmplitudeExperiments({
        [flagKey]: { value, payload },
    })
}

/**
 * Waits for the loading screen to appear (after lazy chunk loads) and then disappear.
 * Handles the case where App is lazy-loaded and the loading element is not
 * immediately in the DOM.
 */
export async function waitForLoadingComplete(
    page: Page,
    timeout: number = TIMEOUTS.extraLongWait
): Promise<void> {
    await page.waitForSelector('[data-testid="loading"]', {
        state: "attached",
        timeout,
    })
    await page.waitForSelector('[data-testid="loading"]', {
        state: "detached",
        timeout,
    })
}

/**
 * Waits for the Hub application to fully load and be ready for testing
 */
export async function waitForHubToLoad(page: Page): Promise<void> {
    await page.goto("./")
    await expect(page).toHaveTitle(/Volley|Weekend/)

    await waitForLoadingComplete(page)

    await expect(page.locator('[data-testid="loading"]')).not.toBeVisible()

    // Wait for either mainContainer (carousel) or web checkout modal to appear
    // This handles both the normal flow and the immediate upsell flow
    await page.waitForSelector(
        '[class*="mainContainer"], [class*="modal"][class*="modalVisible"], [class*="qrSectionContainer"]',
        {
            state: "visible",
            timeout: TIMEOUTS.loadingPhase,
        }
    )

    const carousel = page.locator(SELECTORS.gamesCarousel)
    const iframeContainer = page.locator(".game-iframe-container")
    const modal = page.locator('[class*="modal"][class*="modalVisible"]')
    const qrSection = page.locator('[class*="qrSectionContainer"]')

    const carouselVisible = await carousel.isVisible().catch(() => false)
    const iframePresent = (await iframeContainer.count()) > 0
    const modalVisible = await modal.isVisible().catch(() => false)
    const qrVisible = await qrSection.isVisible().catch(() => false)

    if (carouselVisible) {
        await expect(page.locator(SELECTORS.heroSection)).toBeVisible()
        const firstTile = page.locator(SELECTORS.gameTile).first()
        await expect(firstTile).toBeVisible()
        await expect(firstTile).toBeEnabled()
        await firstTile.focus()
    } else if (iframePresent) {
        await expect(iframeContainer).toHaveCount(1)
    } else if (modalVisible || qrVisible) {
        // Web checkout modal is showing (immediate upsell)
        await Promise.race([
            modal.waitFor({ state: "visible", timeout: TIMEOUTS.mediumWait }),
            qrSection.waitFor({
                state: "visible",
                timeout: TIMEOUTS.mediumWait,
            }),
        ])
    } else {
        await page.waitForSelector(
            `${SELECTORS.gamesCarousel}, .game-iframe-container, [class*="modal"][class*="modalVisible"], [class*="qrSectionContainer"]`,
            { timeout: TIMEOUTS.extraLongWait }
        )
    }

    await page.waitForTimeout(TIMEOUTS.navigation)
}

/**
 * Waits for basic app navigation (lighter version for simple tests)
 */
export async function waitForBasicLoad(page: Page): Promise<void> {
    await page.goto("./")
    await expect(page).toHaveTitle(/Volley|Weekend/)
}

/**
 * Waits for loading screen to appear and disappear (for ident video tests)
 */
export async function waitForLoadingPhase(page: Page): Promise<void> {
    await page.goto("./")
    await page.waitForSelector('[data-testid="loading"]', {
        timeout: TIMEOUTS.loadingPhase,
    })
}

/**
 * Waits for games carousel to be ready for navigation testing
 */
export async function waitForCarouselReady(page: Page): Promise<void> {
    await waitForLoadingComplete(page)
    await page.evaluate(() => {
        sessionStorage.removeItem("jeopardy-reload")
    })
    const iframeContainer = page.locator(".game-iframe-container")
    if ((await iframeContainer.count()) > 0) {
        await page.reload()
    }
    await page.waitForSelector(SELECTORS.gamesCarousel, {
        timeout: TIMEOUTS.extraLongWait,
    })
    await page.waitForSelector(SELECTORS.gameTile, {
        timeout: TIMEOUTS.extraLongWait,
    })
    await page.waitForTimeout(TIMEOUTS.mediumWait)
}

/**
 * Sets up a video element for autoplay testing by mocking its properties and events
 */
export async function setupVideoForAutoplay(
    videoElement: Locator
): Promise<void> {
    await videoElement.evaluate((video: HTMLVideoElement) => {
        Object.defineProperty(video, "readyState", {
            value: 4,
            writable: false,
        })
        Object.defineProperty(video, "duration", {
            value: 30,
            writable: false,
        })

        video.play = async (): Promise<void> => {
            Object.defineProperty(video, "paused", {
                value: false,
                writable: false,
            })
            return Promise.resolve()
        }

        video.pause = (): void => {
            Object.defineProperty(video, "paused", {
                value: true,
                writable: false,
            })
        }

        video.dispatchEvent(new Event("canplay"))
    })
}

/**
 * Finds and returns the exit modal element using multiple selector strategies
 */
export async function findExitModal(page: Page): Promise<Locator | null> {
    const modalSelectors = [
        '[id*="modal"]',
        '[class*="modal"]',
        '[class*="Modal"]',
        '[class*="overlay"]',
        '[class*="Overlay"]',
        '[role="dialog"]',
        "dialog",
    ]

    for (const selector of modalSelectors) {
        const element = page.locator(selector)
        if ((await element.count()) > 0) {
            return element.first()
        }
    }
    return null
}

/**
 * Handles web checkout modal if it appears by simulating successful payment
 */
export async function dismissWebCheckoutModal(page: Page): Promise<void> {
    try {
        const modal = page.locator('[class*="modal"][class*="modalVisible"]')
        const qrSection = page.locator('[class*="qrSectionContainer"]')

        try {
            await Promise.race([
                modal.waitFor({
                    state: "visible",
                    timeout: TIMEOUTS.mediumWait,
                }),
                qrSection.waitFor({
                    state: "visible",
                    timeout: TIMEOUTS.mediumWait,
                }),
            ])
        } catch {
            return
        }

        const isModalVisible = await modal.isVisible().catch(() => false)
        const isQrVisible = await qrSection.isVisible().catch(() => false)

        if (isModalVisible || isQrVisible) {
            logger.info(
                "Web checkout modal detected, simulating successful payment"
            )

            await page.evaluate(() => {
                sessionStorage.setItem("hasSuccessfulPayment", "true")
                ;(
                    window as unknown as Window & {
                        simulatePaymentSuccess?: () => void
                    }
                ).simulatePaymentSuccess?.()

                const accountChangeEvent = new CustomEvent("account:change", {
                    detail: {
                        account: {
                            isSubscribed: true,
                        },
                    },
                })
                window.dispatchEvent(accountChangeEvent)
            })

            const successCheckmark = page.locator('[class*="successCheckmark"]')
            try {
                await successCheckmark.waitFor({
                    state: "visible",
                    timeout: TIMEOUTS.videoAutoplay,
                })
                logger.info("Success animation visible")
            } catch {
                logger.info("Success animation did not appear")
            }

            try {
                await Promise.race([
                    modal.waitFor({
                        state: "hidden",
                        timeout: TIMEOUTS.loadingPhase,
                    }),
                    qrSection.waitFor({
                        state: "hidden",
                        timeout: TIMEOUTS.loadingPhase,
                    }),
                ])
                logger.info("Modal closed after simulated payment")
            } catch {
                logger.info("Modal did not close after simulated payment")
            }
        }
    } catch (error) {
        logger.info(
            `Modal handling attempt failed: ${(error as Error).message}`
        )
    }
}

/**
 * Clicks a game tile and handles any web checkout modal that appears
 */
export async function clickGameTileWithModalHandling(
    page: Page,
    tileSelector: string | Locator
): Promise<void> {
    const locator =
        typeof tileSelector === "string"
            ? page.locator(tileSelector)
            : tileSelector

    await locator.click()

    await dismissWebCheckoutModal(page)
}

/**
 * Common experiment configurations
 */
export const COMMON_EXPERIMENTS = {
    suppressImmediateUpsell: { "suppress-immediate-upsell": { value: "on" } },
    noExperiments: {},
} as const

/**
 * Creates a game payload swap experiment configuration
 */
export function createGamePayloadSwap(
    gameId: string,
    payload: Record<string, unknown>
): Record<string, { value: string; payload: Record<string, unknown> }> {
    return {
        [`${gameId}-payload-swap`]: {
            value: "enabled",
            payload: {
                id: gameId,
                ...payload,
            },
        },
    }
}

/**
 * Common selectors used across tests
 */
export const SELECTORS = {
    // Hero section
    heroVideo: '[class*="heroSection"] video',
    heroImage: '[class*="heroSection"] img[class*="heroImage"]',
    heroSection: '[class*="heroSection"]',
    heroContent:
        '[class*="heroSection"] img, [class*="heroSection"] video, img[alt*="hero"], img[src*="hero"]',

    // Game tiles and carousel
    gameTile: '[class*="gameTile"]',
    gamesCarousel: '[class*="gamesCarousel"]',
    tileAnimation: '[data-testid="tile-animation"]',

    // Loading and UI
    loading: '[data-testid="loading"]',
    mainContainer: '[class*="mainContainer"]',

    // Identity video
    identVideo: 'video[role="identvideo"]',

    // Logo
    brandLogo: 'img[alt="Weekend Logo"][src*="weekend-text.webp"]',

    // Error states
    errorMessage: '[data-testid="error-message"]',
    loadingError: '[data-testid="loading-error"]',

    // Modal elements
    exitModalText: "text=Are you sure you want to exit?",
    yesButton: 'button:has-text("Yes")',
    noButton: 'button:has-text("No")',
} as const

/**
 * Common timeouts used in tests
 * Values are increased when running against staging environment to account for network latency
 */
const isStaging = process.env.TEST_ENVIRONMENT === "staging"
const timeoutMultiplier = isStaging ? 3 : 1

export const TIMEOUTS = {
    videoAutoplay: 3000 * timeoutMultiplier,
    navigation: 500 * timeoutMultiplier,
    focusProcessing: 100 * timeoutMultiplier,
    modalTransition: 500 * timeoutMultiplier,
    carouselLoad: 10000 * timeoutMultiplier,
    loadingPhase: 10000 * timeoutMultiplier,
    quickWait: 200 * timeoutMultiplier,
    mediumWait: 1000 * timeoutMultiplier,
    longWait: 2000 * timeoutMultiplier,
    extraLongWait: 15000 * timeoutMultiplier,
} as const

/**
 * Session event tracking interface
 */
export interface SessionEventTracker {
    sessionEndEvents: Array<{ timestamp: number }>
    sessionStartEvents: Array<{ timestamp: number }>
}

/**
 * Sets up tracking for Hub Session Start and End events through segment.io API
 */
export async function setupSessionEventTracking(
    page: Page
): Promise<SessionEventTracker> {
    const sessionEndEvents: Array<{ timestamp: number }> = []
    const sessionStartEvents: Array<{ timestamp: number }> = []

    await page.route("**/api.segment.io/**", async (route) => {
        const request = route.request()
        const postData = request.postData()

        if (postData) {
            try {
                const data = JSON.parse(postData) as { event?: string }

                if (data.event === "Hub Session Start") {
                    sessionStartEvents.push({ timestamp: Date.now() })
                }
            } catch (_e) {
                // Ignore malformed JSON
            }
        }

        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true }),
        })
    })

    return { sessionEndEvents, sessionStartEvents }
}

/**
 * Triggers a beforeunload event on the page
 */
export async function triggerBeforeUnloadEvent(page: Page): Promise<void> {
    await page.evaluate(() => {
        const beforeUnloadEvent = new Event("beforeunload", {
            cancelable: true,
            bubbles: true,
        })
        window.dispatchEvent(beforeUnloadEvent)
    })
}

/**
 * Finds an event in the tracking events list by name and optional property filters
 */
export function findTrackingEvent(
    events: Array<{ event: string; properties?: Record<string, unknown> }>,
    eventName: string,
    propertyFilters?: Record<string, unknown>
): { event: string; properties?: Record<string, unknown> } | undefined {
    return events.find((e) => {
        if (e.event !== eventName) return false
        if (!propertyFilters) return true

        return Object.entries(propertyFilters).every(
            ([key, value]) => e.properties?.[key] === value
        )
    })
}

/**
 * Parses displayChoices from tracking events, handling both string and array formats
 */
export function parseDisplayChoices(displayChoices: unknown): unknown {
    return typeof displayChoices === "string"
        ? JSON.parse(displayChoices)
        : displayChoices
}

/**
 * Opens the exit modal by pressing Escape and waits for it to be visible
 */
export async function openExitModal(page: Page): Promise<void> {
    await page.keyboard.press("Escape")
    await page.waitForTimeout(TIMEOUTS.modalTransition)
    await expect(page.locator(SELECTORS.exitModalText)).toBeVisible()
    await page.waitForTimeout(500)
}

/**
 * Launches a game by clicking the specified tile and waiting for the game iframe to load
 */
export async function launchGame(
    page: Page,
    tileSelector: string | Locator
): Promise<void> {
    await clickGameTileWithModalHandling(page, tileSelector)

    const iframe = page.locator("iframe.game-iframe")
    await expect(iframe).toHaveCount(1)

    await page.waitForFunction(
        () =>
            !(document.querySelector("iframe.game-iframe") as HTMLIFrameElement)
                ?.hidden
    )
}

/**
 * Exits a game by clicking the exit button in the game iframe
 */
export async function exitGame(page: Page): Promise<void> {
    await page.frameLocator("iframe.game-iframe").locator("#exitButton").click()

    await expect(page.locator("iframe.game-iframe")).toHaveCount(0)
}
