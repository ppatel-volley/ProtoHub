/**
 * These tests verify that regardless of the order in which platform becomes ready,
 * experiments become ready, and video becomes complete, the app initializes without errors.
 *
 * This prevents against regressions, e.g., there was a bug where if we reached videoComplete
 * without experimentsReady, the app would crash.
 */

import { act, render } from "@testing-library/react"
import React from "react"

import { getExperimentManager } from "../experiments/ExperimentManager"

jest.mock("@volley/platform-sdk/lib", () => ({
    getAppVersion: jest.fn(() => null),
}))

jest.mock("../experiments/ExperimentManager", () => ({
    getExperimentManager: jest.fn(),
    createExperimentIdentity: jest
        .fn()
        .mockImplementation((anonymousId?: string, accountId?: string) => {
            if (anonymousId) return { anonymousId, accountId }
            if (accountId) return { accountId, anonymousId }
            return null
        }),
}))

jest.mock("motion/react", () => ({
    LazyMotion: ({
        children,
    }: {
        children: React.ReactNode
    }): React.ReactNode => children,
    domAnimation: {},
}))

const mockIsMobile = jest.fn(() => false)
const mockShouldUseWebCheckout = jest.fn(() => false)
jest.mock("../config/platformDetection", () => ({
    isCurrentEnvironmentWebview: jest.fn().mockReturnValue(true),
    isMobile: mockIsMobile,
    shouldUseWebCheckout: mockShouldUseWebCheckout,
    isFireTV: jest.fn(() => false),
    isLGTV: jest.fn(() => false),
    isSamsungTV: jest.fn(() => false),
    isMobileWebview: jest.fn(() => false),
    isAndroid: jest.fn(() => false),
    isIOS: jest.fn(() => false),
    isLGOrSamsungTV: jest.fn(() => false),
}))

import { App } from "./App"

jest.mock("../config/gameIframeControllerUrl", () => ({
    getGameIframeControllerUrl: jest.fn().mockReturnValue(undefined),
}))

jest.mock("../utils/logger", () => ({
    logger: {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
    },
}))

let mockAccountId = "test-account-id"
jest.mock("../hooks/useAccountId", () => ({
    useAccountId: jest.fn(() => mockAccountId),
}))

jest.mock("../hooks/useAnonymousId", () => ({
    useAnonymousId: jest.fn().mockReturnValue("test-anonymous-id"),
}))

let mockAccount: {
    id: string
    anonymousId: string
    isAnonymous: boolean
    isSubscribed: boolean
} | null = null
let mockPlatformStatus = { isReady: false, error: null }

jest.mock("@volley/platform-sdk/react", () => ({
    useSessionId: jest.fn().mockReturnValue("test-session-id"),
    useDeviceInfo: (): {
        getDeviceId: () => Promise<string>
        getModel: () => Promise<string>
        getManufacturer: () => Promise<string>
        getOperatingSystem: () => Promise<string>
        getOSVersion: () => Promise<string>
        getWebViewVersion: () => Promise<string>
    } => ({
        getDeviceId: (): Promise<string> => Promise.resolve("test-device-id"),
        getModel: (): Promise<string> => Promise.resolve("test-model"),
        getManufacturer: (): Promise<string> =>
            Promise.resolve("test-manufacturer"),
        getOperatingSystem: (): Promise<string> => Promise.resolve("test-os"),
        getOSVersion: (): Promise<string> => Promise.resolve("test-os-version"),
        getWebViewVersion: (): Promise<string> =>
            Promise.resolve("test-webview-version"),
    }),
    PlatformIFrame: ({
        src,
        className,
    }: {
        src: string
        className: string
    }): React.ReactElement => (
        <iframe src={src} className={className} title="Game Controller" />
    ),
    PlatformProvider: ({
        children,
    }: {
        children: React.ReactNode
    }): React.ReactElement => children as React.ReactElement,
    usePlatformStatus: jest.fn(() => mockPlatformStatus),
    useAppLifecycle: jest.fn().mockReturnValue({
        exitApp: jest.fn(),
    }),
    useAppLifecycleState: jest.fn().mockReturnValue({ state: "active" }),
    useAuth: jest.fn().mockReturnValue({
        authStatus: { authenticated: false, authInProgress: false },
        loginWithQR: jest.fn(),
    }),
    useAccount: jest.fn(() => ({
        account: mockAccount,
    })),
    useSupport: jest.fn(() => ({
        getSupportEmail: jest.fn(() => "support@volley.tv"),
    })),
    useTracking: jest.fn(() => ({
        track: jest.fn(),
        updateBaseEventProperties: jest.fn(),
        getBaseUserProperties: jest.fn(() => ({})),
    })),
}))

jest.mock("../hooks/useHubTracking", () => ({
    useHubTracking: jest.fn(() => ({
        track: jest.fn(),
        updateBaseEventProperties: jest.fn(),
    })),
}))

jest.mock("../hooks/useHubSessionStart", () => ({
    useHubSessionStart: jest.fn(),
}))

jest.mock("../utils/datadog", () => ({
    safeDatadogRum: {
        setUser: jest.fn(),
        startDurationVital: jest.fn().mockReturnValue({}),
        stopDurationVital: jest.fn(),
        addAction: jest.fn(),
        addError: jest.fn(),
        addTiming: jest.fn(),
    },
}))

jest.mock("../hooks/useInitializationDatadogRUMEvents", () => ({
    useInitializationDatadogRUMEvents: jest.fn(),
}))

jest.mock("../hooks/useWebCheckoutUpsell", () => ({
    WebCheckoutUpsellProvider: jest.fn(),
}))

jest.mock("@datadog/browser-logs", () => ({
    datadogLogs: {
        setGlobalContextProperty: jest.fn(),
        setUser: jest.fn(),
        setAccount: jest.fn(),
    },
}))

declare global {
    interface Window {
        __testCallbacks?: {
            setVideoComplete?: (value: boolean) => void
            setAssetLoadingStates?: (states: any) => void
        }
    }
}

jest.mock("./TvHub/Loading", () => ({
    Loading: ({
        setVideoComplete,
    }: {
        ready: boolean
        setVideoComplete: (value: boolean) => void
    }): React.ReactElement => {
        if (typeof window !== "undefined") {
            window.__testCallbacks = {
                ...window.__testCallbacks,
                setVideoComplete,
            }
        }
        return <div data-testid="loading">Loading</div>
    },
}))

jest.mock("./TvHub/TvHub", () => ({
    TvHub: ({
        setAssetLoadingStates,
    }: {
        setAssetLoadingStates: (states: any) => void
    }): React.ReactElement => {
        if (typeof window !== "undefined") {
            window.__testCallbacks = {
                ...window.__testCallbacks,
                setAssetLoadingStates,
            }
        }
        return <div data-testid="tv-hub">TV Hub</div>
    },
}))

jest.mock("../config/envconfig.ts", () => ({
    LOGO_DISPLAY_MILLIS: 100,
    BASE_URL: "/mock-base-url/",
    getWindowVar: jest.fn().mockReturnValue("staging"),
}))

const mockShouldUseDevUpsell = jest.fn()
const mockShouldForceWebCheckout = jest.fn(() => false)
jest.mock("../config/devOverrides", () => ({
    get IDENT_URL_OVERRIDE(): string {
        return ""
    },
    get SHOULD_USE_DEV_UPSELL(): boolean {
        return mockShouldUseDevUpsell()
    },
    get SHOULD_FORCE_WEB_CHECKOUT(): boolean {
        return mockShouldForceWebCheckout()
    },
    SHOULD_FORCE_WEEKEND_REBRAND: false,
}))

jest.mock("../hooks/useDevUpsell", () => ({
    DevUpsellProvider: ({
        children,
    }: {
        children: React.ReactNode
    }): React.ReactElement => (
        <div data-testid="dev-upsell-provider">{children}</div>
    ),
}))

describe("App Initialization Order Integration Tests", () => {
    let mockExperimentManager: {
        initialize: jest.Mock
        onInitialized: jest.Mock
        getVariant: jest.Mock
    }
    let experimentInitializedCallback: (() => void) | undefined

    beforeEach(() => {
        jest.clearAllMocks()
        jest.useFakeTimers()
        mockIsMobile.mockReturnValue(false)
        mockShouldUseDevUpsell.mockReturnValue(false)
        mockShouldUseWebCheckout.mockReturnValue(false)
        mockShouldForceWebCheckout.mockReturnValue(false)

        experimentInitializedCallback = undefined
        mockExperimentManager = {
            initialize: jest.fn().mockImplementation(() => Promise.resolve()),
            onInitialized: jest
                .fn()
                .mockImplementation((callback: () => void) => {
                    experimentInitializedCallback = callback
                    return callback
                }),
            getVariant: jest.fn().mockReturnValue({ value: "off" }),
        }
        ;(getExperimentManager as jest.Mock).mockReturnValue(
            mockExperimentManager
        )

        mockPlatformStatus = { isReady: false, error: null }
        mockAccount = null
        mockAccountId = "test-account-id"

        window.__testCallbacks = undefined

        delete (window as { location?: Location }).location
        window.location = {
            ...window.location,
            search: "",
        } as unknown as string & Location
    })

    afterEach(() => {
        jest.runOnlyPendingTimers()
        jest.useRealTimers()
    })

    const triggerPlatformReady = (): void => {
        mockPlatformStatus = { isReady: true, error: null }
        mockAccount = {
            id: "test-account-id",
            anonymousId: "test-anonymous-id",
            isAnonymous: false,
            isSubscribed: false,
        }
    }

    const triggerExperimentsReady = (): void => {
        if (experimentInitializedCallback) {
            experimentInitializedCallback()
        }
    }

    const triggerVideoComplete = (): void => {
        const callbacks = window.__testCallbacks
        if (callbacks?.setVideoComplete) {
            callbacks.setVideoComplete(true)
        }
    }

    const triggerImagesLoaded = (): void => {
        const callbacks = window.__testCallbacks
        if (callbacks?.setAssetLoadingStates) {
            callbacks.setAssetLoadingStates({
                requiredImagesLoaded: true,
                tileImagesLoaded: true,
                firstHeroImageLoaded: true,
                remainingHeroImagesLoaded: true,
                focusIndicatorLoaded: true,
                webCheckoutRequiredImagesLoaded: true,
                statusBannersLoaded: true,
                tileAnimationsLoaded: true,
                webCheckoutOptionalImagesLoaded: true,
                optionalImagesLoaded: true,
            })
        }
    }

    interface InitializationScenario {
        platformReadyDelayMs: number
        experimentsReadyDelayMs: number
        videoCompleteDelayMs: number
    }

    const runInitializationTest = (scenario: InitializationScenario): void => {
        const { logger } = require("../utils/logger")
        logger.error.mockClear()

        let rerenderFn: (ui: React.ReactElement) => void

        act(() => {
            const result = render(<App />)
            rerenderFn = result.rerender
        })

        const events = [
            {
                delay: scenario.platformReadyDelayMs,
                name: "platformReady",
                trigger: (): void => {
                    triggerPlatformReady()
                    rerenderFn(<App />)
                },
            },
            {
                delay: scenario.experimentsReadyDelayMs,
                name: "experimentsReady",
                trigger: (): void => {
                    triggerExperimentsReady()
                    rerenderFn(<App />)
                },
            },
            {
                delay: scenario.videoCompleteDelayMs,
                name: "videoComplete",
                trigger: (): void => {
                    triggerVideoComplete()
                    rerenderFn(<App />)
                },
            },
        ].sort((a, b) => a.delay - b.delay)

        let currentTime = 0
        for (const event of events) {
            if (event.delay > currentTime) {
                act(() => {
                    jest.advanceTimersByTime(event.delay - currentTime)
                })
                currentTime = event.delay
            }
            act(() => {
                event.trigger()
            })
        }

        act(() => {
            triggerImagesLoaded()
        })

        act(() => {
            jest.runAllTimers()
        })

        expect(logger.error).not.toHaveBeenCalled()
    }

    describe("systematic initialization order tests with delays from 0s to 30s", () => {
        const delayValues = [0, 5000, 30000]

        it("tests all orderings where platformReady completes first", () => {
            const scenarios: InitializationScenario[] = []

            for (const platformDelay of [0]) {
                for (const experimentsDelay of delayValues.filter(
                    (d) => d >= platformDelay
                )) {
                    for (const videoDelay of delayValues.filter(
                        (d) => d >= platformDelay
                    )) {
                        scenarios.push({
                            platformReadyDelayMs: platformDelay,
                            experimentsReadyDelayMs: experimentsDelay,
                            videoCompleteDelayMs: videoDelay,
                        })
                    }
                }
            }

            scenarios.forEach((scenario) => {
                jest.clearAllMocks()
                window.__testCallbacks = undefined
                mockPlatformStatus = { isReady: false, error: null }
                mockAccount = null
                experimentInitializedCallback = undefined

                runInitializationTest(scenario)
            })

            expect(scenarios.length).toBeGreaterThan(0)
        })

        it("tests all orderings where experimentsReady completes first", () => {
            const scenarios: InitializationScenario[] = []

            for (const experimentsDelay of [0]) {
                for (const platformDelay of delayValues.filter(
                    (d) => d > experimentsDelay
                )) {
                    for (const videoDelay of delayValues) {
                        scenarios.push({
                            platformReadyDelayMs: platformDelay,
                            experimentsReadyDelayMs: experimentsDelay,
                            videoCompleteDelayMs: videoDelay,
                        })
                    }
                }
            }

            scenarios.forEach((scenario) => {
                jest.clearAllMocks()
                window.__testCallbacks = undefined
                mockPlatformStatus = { isReady: false, error: null }
                mockAccount = null
                experimentInitializedCallback = undefined

                runInitializationTest(scenario)
            })

            expect(scenarios.length).toBeGreaterThan(0)
        })

        it("tests all orderings where videoComplete completes first", () => {
            const scenarios: InitializationScenario[] = []

            for (const videoDelay of [0]) {
                for (const platformDelay of delayValues.filter(
                    (d) => d > videoDelay
                )) {
                    for (const experimentsDelay of delayValues.filter(
                        (d) => d >= platformDelay
                    )) {
                        scenarios.push({
                            platformReadyDelayMs: platformDelay,
                            experimentsReadyDelayMs: experimentsDelay,
                            videoCompleteDelayMs: videoDelay,
                        })
                    }
                }
            }

            scenarios.forEach((scenario) => {
                jest.clearAllMocks()
                window.__testCallbacks = undefined
                mockPlatformStatus = { isReady: false, error: null }
                mockAccount = null
                experimentInitializedCallback = undefined

                runInitializationTest(scenario)
            })

            expect(scenarios.length).toBeGreaterThan(0)
        })
    })
})
