import { test as base } from "@playwright/test"

import {
    getAmplitudeExperiments,
    setAmplitudeExperiments,
} from "./amplitudeMock"

export interface ExperimentVariant {
    value?: string
    payload?: unknown
}

export interface ExperimentMockConfig {
    [flagKey: string]: ExperimentVariant
}

const useMocks = process.env.USE_MOCKS === "true"

export const test = base.extend<{
    testSetup: void
    mockExperiment: (config: ExperimentMockConfig) => Promise<void>
}>({
    // Auto-fixture that runs for every test

    testSetup: [
        async ({ page }, use): Promise<void> => {
            // Mock Segment API globally to prevent real analytics calls during tests
            await page.route("**/api.segment.io/**", (route) => {
                void route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify({ success: true }),
                })
            })

            // Mock test CDN URLs to return success for media validation
            await page.route("https://test-cdn.volley.tv/**", (route) => {
                if (route.request().method() === "HEAD") {
                    void route.fulfill({
                        status: 200,
                        headers: {
                            "Content-Type": route
                                .request()
                                .url()
                                .endsWith(".mp4")
                                ? "video/mp4"
                                : "image/avif",
                        },
                    })
                } else {
                    void route.fulfill({
                        status: 200,
                        body: "",
                        headers: {
                            "Content-Type": route
                                .request()
                                .url()
                                .endsWith(".mp4")
                                ? "video/mp4"
                                : "image/avif",
                        },
                    })
                }
            })

            // Set up basic app config for tests
            await page.addInitScript(
                (config: {
                    environment: string
                    mockSubscription: boolean
                }) => {
                    ;(
                        window as unknown as {
                            __TEST_PLATFORM_OVERRIDES: {
                                isWeb: boolean
                                shouldUseWebCheckout: boolean
                                isFunctionalTest: boolean
                            }
                        }
                    ).__TEST_PLATFORM_OVERRIDES = {
                        isWeb: false,
                        shouldUseWebCheckout: true,
                        isFunctionalTest: true,
                    }
                    ;(
                        window as unknown as { __env: Record<string, string> }
                    ).__env = {
                        VITE_VOLLEY_LOGO_DISPLAY_MILLIS: "100",
                    }
                    ;(
                        globalThis as unknown as {
                            import: { meta: { env: Record<string, string> } }
                        }
                    ).import = {
                        meta: {
                            env: (
                                window as unknown as {
                                    __env: Record<string, string>
                                }
                            ).__env,
                        },
                    }
                    ;(
                        window as unknown as {
                            APP_CONFIG: Record<string, string>
                        }
                    ).APP_CONFIG = {
                        environment: config.environment,
                        SEGMENT_WRITE_KEY: "test-key",
                        AMPLITUDE_EXPERIMENT_KEY: "test-amplitude-key",
                        DATADOG_APPLICATION_ID: "test-id",
                        DATADOG_CLIENT_TOKEN: "test-token",
                        VOLLEY_LOGO_DISPLAY_MILLIS: "100",
                    }

                    const OriginalImage = window.Image
                    window.Image = function (
                        width?: number,
                        height?: number
                    ): HTMLImageElement {
                        const img = new OriginalImage(width, height)
                        setTimeout(() => {
                            if (img.onload) {
                                const event = new Event("load")
                                img.onload(event)
                            }
                        }, 10)
                        return img
                    } as unknown as typeof window.Image

                    const originalCreateElement =
                        document.createElement.bind(document)
                    document.createElement = function <
                        K extends keyof HTMLElementTagNameMap,
                    >(
                        tagName: K,
                        options?: ElementCreationOptions
                    ): HTMLElementTagNameMap[K] {
                        const element = originalCreateElement(tagName, options)

                        if (tagName.toLowerCase() === "video") {
                            const video = element as HTMLVideoElement

                            Object.defineProperty(video, "paused", {
                                value: true,
                                writable: true,
                            })
                            Object.defineProperty(video, "readyState", {
                                value: 4,
                                writable: true,
                            })
                            Object.defineProperty(video, "duration", {
                                value: 1,
                                writable: true,
                            })
                            Object.defineProperty(video, "currentTime", {
                                value: 0,
                                writable: true,
                            })

                            video.play = (): Promise<void> => {
                                Object.defineProperty(video, "paused", {
                                    value: false,
                                    writable: true,
                                })

                                setTimeout(() => {
                                    video.dispatchEvent(new Event("loadeddata"))
                                    video.dispatchEvent(new Event("canplay"))
                                    video.dispatchEvent(new Event("play"))

                                    setTimeout(() => {
                                        Object.defineProperty(
                                            video,
                                            "currentTime",
                                            { value: 1, writable: true }
                                        )
                                        video.dispatchEvent(new Event("ended"))
                                    }, 100)
                                }, 10)

                                return Promise.resolve()
                            }
                        }

                        return element
                    } as typeof document.createElement

                    window.localStorage.setItem("accountId", "test-account-id")

                    // Only mock subscription when USE_MOCKS=true
                    if (config.mockSubscription) {
                        window.sessionStorage.setItem(
                            "hasSuccessfulPayment",
                            "true"
                        )
                    }
                },
                {
                    environment: process.env.TEST_ENVIRONMENT || "local",
                    mockSubscription: useMocks,
                }
            )

            await use()
        },
        { auto: true },
    ],

    async mockExperiment({ page }, use) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        await use(async (config) => {
            setAmplitudeExperiments(config)

            await page.route("https://api.lab.amplitude.com/**", (route) => {
                const experiments = getAmplitudeExperiments()
                void route.fulfill({
                    json: experiments,
                    headers: { "Content-Type": "application/json" },
                })
            })
        })
    },
})

export { expect } from "@playwright/test"

export const createTestWithUserAgent = (userAgent: string): typeof test =>
    test.extend({
        userAgent: [userAgent, { scope: "test" }],
    })

const samsungUA =
    "Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/6.0 TV Safari/537.36"
export const testSamsung = createTestWithUserAgent(samsungUA)

const lgWebOSUA =
    "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.270 Safari/537.36 WebAppManager"
export const testLgWebOS = createTestWithUserAgent(lgWebOSUA)

const fireTVUA =
    "Mozilla/5.0 (Linux; U; Android 4.2.2; en-us; AFTB Build/JDQ39) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30"
export const testFireTV = createTestWithUserAgent(fireTVUA)

const mobileIOSUA =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1"
export const testMobileIOS = createTestWithUserAgent(mobileIOSUA)

const mobileAndroidUA =
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36"
export const testMobileAndroid = createTestWithUserAgent(mobileAndroidUA)
