import { act, render, screen } from "@testing-library/react"
import React from "react"

import { getExperimentManager } from "../experiments/ExperimentManager"
import { useHubTracking } from "../hooks/useHubTracking"

jest.mock("@volley/platform-sdk/lib", () => ({
    getAppVersion: jest.fn(() => null),
}))

jest.mock("../hooks/useBrandDocumentMeta", () => ({
    useBrandDocumentMeta: jest.fn(),
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
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
    },
}))

jest.mock("../hooks/useAnonymousId", () => ({
    useAnonymousId: jest.fn().mockReturnValue("test-anonymous-id"),
}))

jest.mock("../hooks/useAccountId", () => ({
    useAccountId: jest.fn().mockReturnValue(undefined),
}))

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
    usePlatformStatus: jest.fn().mockReturnValue({
        isReady: true,
        error: null,
    }),
    useAppLifecycle: jest.fn().mockReturnValue({
        exitApp: jest.fn(),
    }),
    useAppLifecycleState: jest.fn().mockReturnValue({ state: "active" }),
    useAuth: jest.fn().mockReturnValue({
        authStatus: { authenticated: false, authInProgress: false },
        loginWithQR: jest.fn(),
    }),
    useAccount: jest.fn().mockReturnValue({
        account: {
            id: undefined,
            anonymousId: "test-anonymous-id",
            isAnonymous: true,
            isSubscribed: false,
        },
    }),
    useSupport: jest.fn(() => ({
        getSupportEmail: jest.fn(() => "support@volley.tv"),
    })),
    useTracking: jest.fn(() => ({
        getBaseUserProperties: jest.fn(() => ({})),
    })),
}))

jest.mock("../hooks/useHubTracking", () => ({
    useHubTracking: jest.fn(() => ({
        identify: jest.fn(),
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
        ready,
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
        return (
            <div data-testid="loading" data-ready={ready}>
                Loading
            </div>
        )
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

const mockUseHubTracking = useHubTracking as jest.Mock

describe("App", () => {
    const mockExperimentManager = {
        initialize: jest.fn().mockImplementation(() => Promise.resolve()),
        onInitialized: jest.fn(),
        getVariant: jest.fn().mockReturnValue(undefined),
    }
    ;(getExperimentManager as jest.Mock).mockReturnValue(mockExperimentManager)
    let onInitializedCallback: (() => void) | undefined

    let mockIdentify: jest.Mock
    let mockWebCheckoutUpsellProvider: jest.Mock
    let mockUsePlatformStatus: jest.Mock

    beforeEach(() => {
        jest.clearAllMocks()
        ;(getExperimentManager as jest.Mock).mockReturnValue(
            mockExperimentManager
        )
        mockIsMobile.mockReturnValue(false)
        mockShouldUseDevUpsell.mockReturnValue(false)
        mockShouldUseWebCheckout.mockReturnValue(false)
        mockShouldForceWebCheckout.mockReturnValue(false)
        onInitializedCallback = undefined
        mockExperimentManager.onInitialized.mockImplementation(
            (callback: () => void) => {
                onInitializedCallback = callback
                return callback
            }
        )

        mockIdentify = jest.fn()
        mockUseHubTracking.mockReturnValue({ identify: mockIdentify })

        mockWebCheckoutUpsellProvider =
            require("../hooks/useWebCheckoutUpsell").WebCheckoutUpsellProvider
        mockUsePlatformStatus =
            require("@volley/platform-sdk/react").usePlatformStatus

        mockWebCheckoutUpsellProvider.mockImplementation(
            ({ children }: { children: React.ReactNode }) => (
                <div data-testid="web-checkout-upsell-provider">{children}</div>
            )
        )

        const { useAnonymousId } = jest.requireMock("../hooks/useAnonymousId")
        const { useAccountId } = jest.requireMock("../hooks/useAccountId")
        useAnonymousId.mockReturnValue("test-anonymous-id")
        useAccountId.mockReturnValue(undefined)

        delete (window as { location?: Location }).location
        window.location = {
            ...window.location,
            search: "",
        } as unknown as string & Location
    })

    it("initializes experiment manager with anonymous ID", () => {
        render(<App />)
        expect(mockExperimentManager.initialize).toHaveBeenCalledWith(
            {
                anonymousId: "test-anonymous-id",
                accountId: undefined,
            },
            {}
        )
    })
    it("does not initialize experiment manager when account is null", () => {
        const { useAccount } = require("@volley/platform-sdk/react")
        useAccount.mockReturnValue({ account: null })

        render(<App />)
        expect(mockExperimentManager.initialize).not.toHaveBeenCalled()
    })

    it("initializes experiment manager when account arrives after initial render", () => {
        const { useAccount } = require("@volley/platform-sdk/react")
        useAccount.mockReturnValue({ account: null })

        const { rerender } = render(<App />)
        expect(mockExperimentManager.initialize).not.toHaveBeenCalled()

        useAccount.mockReturnValue({
            account: {
                id: undefined,
                anonymousId: "test-anonymous-id",
                isAnonymous: true,
                isSubscribed: false,
            },
        })

        rerender(<App />)
        expect(mockExperimentManager.initialize).toHaveBeenCalledWith(
            {
                anonymousId: "test-anonymous-id",
                accountId: undefined,
            },
            {}
        )
    })

    it("initializes experiment manager with authenticated user (accountId only)", () => {
        const { useAccount } = jest.requireMock("@volley/platform-sdk/react")
        useAccount.mockReturnValue({
            account: {
                id: "authenticated-user-123",
                anonymousId: undefined,
                isAnonymous: false,
                isSubscribed: false,
            },
        })

        render(<App />)
        expect(mockExperimentManager.initialize).toHaveBeenCalledWith(
            {
                anonymousId: undefined,
                accountId: "authenticated-user-123",
            },
            {}
        )
    })

    it("initializes experiment manager with anonymous user (anonymousId only)", () => {
        const { useAccount } = jest.requireMock("@volley/platform-sdk/react")
        useAccount.mockReturnValue({
            account: {
                id: undefined,
                anonymousId: "anonymous-device-456",
                isAnonymous: true,
                isSubscribed: false,
            },
        })

        render(<App />)
        expect(mockExperimentManager.initialize).toHaveBeenCalledWith(
            {
                anonymousId: "anonymous-device-456",
                accountId: undefined,
            },
            {}
        )
    })

    it("does not initialize when account is null", () => {
        const { useAccount } = require("@volley/platform-sdk/react")
        useAccount.mockReturnValue({ account: null })

        render(<App />)
        expect(mockExperimentManager.initialize).not.toHaveBeenCalled()

        useAccount.mockReturnValue({
            account: {
                id: undefined,
                anonymousId: "test-anonymous-id",
                isAnonymous: true,
                isSubscribed: false,
            },
        })
    })

    it("calls useHubSessionStart with platform ready", () => {
        const { usePlatformStatus } = require("@volley/platform-sdk/react")
        const { useHubSessionStart } = require("../hooks/useHubSessionStart")

        usePlatformStatus.mockReturnValue({
            isReady: true,
            error: null,
        })

        render(<App />)

        expect(useHubSessionStart).toHaveBeenCalledWith(undefined, false, true)
    })

    it("does not re-initialize when dependencies change but already initialized", () => {
        const { usePlatformStatus } = require("@volley/platform-sdk/react")

        usePlatformStatus.mockReturnValue({
            isReady: true,
            error: null,
        })

        const { rerender } = render(<App />)

        expect(mockExperimentManager.initialize).toHaveBeenCalledTimes(1)

        mockExperimentManager.initialize.mockClear()

        usePlatformStatus.mockReturnValue({
            isReady: false,
            error: null,
        })

        rerender(<App />)

        expect(mockExperimentManager.initialize).not.toHaveBeenCalled()
    })

    it("only runs initialization once despite multiple re-renders", () => {
        const { usePlatformStatus } = require("@volley/platform-sdk/react")

        usePlatformStatus.mockReturnValue({
            isReady: true,
            error: null,
        })

        const { rerender } = render(<App />)

        expect(mockExperimentManager.initialize).toHaveBeenCalledTimes(1)

        mockExperimentManager.initialize.mockClear()

        usePlatformStatus.mockReturnValue({
            isReady: false,
            error: null,
        })
        rerender(<App />)

        usePlatformStatus.mockReturnValue({
            isReady: true,
            error: null,
        })
        rerender(<App />)

        usePlatformStatus.mockReturnValue({
            isReady: false,
            error: null,
        })
        rerender(<App />)

        usePlatformStatus.mockReturnValue({
            isReady: true,
            error: null,
        })
        rerender(<App />)

        expect(mockExperimentManager.initialize).not.toHaveBeenCalled()
    })

    it("renders TV Hub by default", () => {
        render(<App />)
        expect(screen.getByTestId("tv-hub")).toBeInTheDocument()
    })

    it("shows TV loading screen until all conditions are ready", () => {
        render(<App />)

        const loadingScreen = screen.getByTestId("loading")
        expect(loadingScreen).toBeInTheDocument()

        if (!onInitializedCallback) {
            throw new Error("Experiment callback not found")
        }
        act(() => {
            onInitializedCallback!()
        })
        expect(loadingScreen).toBeInTheDocument()

        act(() => {
            const callbacks = window.__testCallbacks
            if (callbacks?.setVideoComplete) {
                callbacks.setVideoComplete(true)
            }
        })
        expect(loadingScreen).toBeInTheDocument()

        act(() => {
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
        })
        expect(loadingScreen).not.toBeInTheDocument()
    })

    it("does not reshow loading screen when isPlatformReady becomes false (isInitialized one-way latch)", () => {
        const { rerender } = render(<App />)

        if (!onInitializedCallback) {
            throw new Error("Experiment callback not found")
        }

        act(() => {
            onInitializedCallback?.()
        })

        act(() => {
            const callbacks = window.__testCallbacks
            callbacks?.setVideoComplete?.(true)
        })

        act(() => {
            const callbacks = window.__testCallbacks
            callbacks?.setAssetLoadingStates?.({
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
        })

        expect(screen.queryByTestId("loading")).not.toBeInTheDocument()

        const { usePlatformStatus } = require("@volley/platform-sdk/react")
        usePlatformStatus.mockReturnValue({
            isReady: false,
            error: null,
        })

        rerender(<App />)

        expect(screen.queryByTestId("loading")).not.toBeInTheDocument()
    })

    it("handles experiment initialization errors", async () => {
        const { logger } = require("../utils/logger")
        const {
            usePlatformStatus,
            useAccount,
        } = require("@volley/platform-sdk/react")
        usePlatformStatus.mockReturnValue({
            isReady: true,
            error: null,
        })
        useAccount.mockReturnValue({
            account: {
                anonymousId: "test-anonymous-id",
                id: "test-account-id",
            },
        })
        mockExperimentManager.initialize.mockRejectedValueOnce(
            new Error("Test error")
        )

        render(<App />)
        await new Promise((resolve) => setTimeout(resolve, 0))

        expect(logger.error).toHaveBeenCalledWith(
            "Failed to initialize experiment manager",
            new Error("Test error")
        )
    })

    it("hides TV loading screen only when all conditions are met", () => {
        const mockExperimentManager = {
            initialize: jest.fn().mockImplementation(() => Promise.resolve()),
            onInitialized: jest
                .fn()
                .mockImplementation((callback: () => void) => {
                    onInitializedCallback = callback
                    return callback
                }),
            getVariant: jest.fn().mockReturnValue(undefined),
        }
        ;(getExperimentManager as jest.Mock).mockReturnValue(
            mockExperimentManager
        )

        type TestCase = {
            videoComplete: boolean
            experimentsReady: boolean
            imagesLoaded: boolean
            platformReady: boolean
            shouldShowLoading: boolean
        }

        const testCases: TestCase[] = []

        for (let i = 0; i < 16; i++) {
            const testCase: TestCase = {
                videoComplete: Boolean(i & 1),
                experimentsReady: Boolean(i & 2),
                imagesLoaded: Boolean(i & 4),
                platformReady: Boolean(i & 8),
                shouldShowLoading: true,
            }
            const isTvLoadingComplete =
                testCase.videoComplete &&
                testCase.experimentsReady &&
                testCase.imagesLoaded &&
                testCase.platformReady
            testCase.shouldShowLoading = !isTvLoadingComplete
            testCases.push(testCase)
        }

        testCases.forEach(
            ({
                videoComplete,
                experimentsReady,
                imagesLoaded,
                platformReady,
                shouldShowLoading,
            }) => {
                jest.clearAllMocks()
                window.__testCallbacks = undefined
                onInitializedCallback = undefined

                mockIsMobile.mockReturnValue(false)
                ;(getExperimentManager as jest.Mock).mockReturnValue(
                    mockExperimentManager
                )

                const {
                    createExperimentIdentity,
                } = require("../experiments/ExperimentManager")
                createExperimentIdentity.mockImplementation(
                    (anonymousId?: string, accountId?: string) => {
                        if (anonymousId) return { anonymousId, accountId }
                        if (accountId) return { accountId, anonymousId }
                        return null
                    }
                )

                mockExperimentManager.onInitialized.mockImplementation(
                    (callback: () => void) => {
                        onInitializedCallback = callback
                        return callback
                    }
                )

                const psdkReact = require("@volley/platform-sdk/react")
                psdkReact.usePlatformStatus.mockReturnValue({
                    isReady: platformReady,
                    error: null,
                })
                psdkReact.useAccount.mockReturnValue({
                    account: {
                        id: undefined,
                        anonymousId: "test-anonymous-id",
                        isAnonymous: true,
                        isSubscribed: false,
                    },
                })
                psdkReact.useTracking.mockReturnValue({
                    getBaseUserProperties: jest.fn(() => ({})),
                })
                psdkReact.useSessionId.mockReturnValue("test-session-id")

                const { unmount } = render(<App />)

                if (experimentsReady && onInitializedCallback) {
                    act(() => {
                        if (onInitializedCallback) {
                            onInitializedCallback()
                        }
                    })
                }

                if (videoComplete) {
                    act(() => {
                        const callbacks = window.__testCallbacks
                        if (callbacks?.setVideoComplete) {
                            callbacks.setVideoComplete(true)
                        }
                    })
                }

                if (imagesLoaded) {
                    act(() => {
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
                    })
                }

                if (shouldShowLoading) {
                    expect(screen.getByTestId("loading")).toBeInTheDocument()
                } else {
                    expect(
                        screen.queryByTestId("loading")
                    ).not.toBeInTheDocument()
                }

                unmount()
            }
        )
    })

    it("renders without DevUpsellProvider when SHOULD_USE_DEV_UPSELL is false", () => {
        mockShouldUseDevUpsell.mockReturnValue(false)
        render(<App />)

        expect(
            screen.queryByTestId("dev-upsell-provider")
        ).not.toBeInTheDocument()
        expect(screen.getByTestId("tv-hub")).toBeInTheDocument()
    })

    it("renders with DevUpsellProvider when SHOULD_USE_DEV_UPSELL is true", () => {
        mockShouldUseDevUpsell.mockReturnValue(true)
        render(<App />)

        expect(screen.getByTestId("dev-upsell-provider")).toBeInTheDocument()
        expect(screen.getByTestId("tv-hub")).toBeInTheDocument()
    })

    describe("setUser DataDog tracking", () => {
        let setUserSpy: jest.Mock

        beforeEach(() => {
            const { safeDatadogRum } = require("../utils/datadog")
            setUserSpy = safeDatadogRum.setUser

            const { usePlatformStatus } = require("@volley/platform-sdk/react")
            usePlatformStatus.mockReturnValue({
                isReady: true,
                error: null,
            })

            const { useAnonymousId } = require("../hooks/useAnonymousId")
            useAnonymousId.mockReturnValue("test-anonymous-id")
        })

        it("does not call safeDatadogRum.setUser when no account ID", () => {
            render(<App />)

            expect(setUserSpy).not.toHaveBeenCalled()
        })

        it("calls safeDatadogRum.setUser with account ID when authenticated", () => {
            const { useAccountId } = require("../hooks/useAccountId")
            useAccountId.mockReturnValue("test-account-id")

            render(<App />)

            expect(setUserSpy).toHaveBeenCalledWith({ id: "test-account-id" })
        })

        it("does not call safeDatadogRum.setUser when platform is not ready", () => {
            const { usePlatformStatus } = require("@volley/platform-sdk/react")
            usePlatformStatus.mockReturnValue({
                isReady: false,
                error: null,
            })

            render(<App />)

            expect(setUserSpy).not.toHaveBeenCalled()
        })

        it("calls safeDatadogRum.setUser when platform becomes ready and has account ID", () => {
            const { usePlatformStatus } = require("@volley/platform-sdk/react")
            const { useAccountId } = require("../hooks/useAccountId")
            useAccountId.mockReturnValue("test-account-id")

            usePlatformStatus.mockReturnValue({
                isReady: false,
                error: null,
            })

            const { rerender } = render(<App />)
            expect(setUserSpy).not.toHaveBeenCalled()

            usePlatformStatus.mockReturnValue({
                isReady: true,
                error: null,
            })

            rerender(<App />)
            expect(setUserSpy).toHaveBeenCalledWith({ id: "test-account-id" })
        })

        it("does not call safeDatadogRum.setUser multiple times on re-renders", () => {
            const { useAccountId } = require("../hooks/useAccountId")
            useAccountId.mockReturnValue("test-account-id")

            const { rerender } = render(<App />)

            expect(setUserSpy).toHaveBeenCalledTimes(1)
            expect(setUserSpy).toHaveBeenCalledWith({ id: "test-account-id" })

            setUserSpy.mockClear()

            rerender(<App />)
            rerender(<App />)
            rerender(<App />)

            expect(setUserSpy).toHaveBeenCalledTimes(0)
        })
    })

    describe("WebCheckoutUpsellProvider Integration", () => {
        beforeEach(() => {
            const { usePlatformStatus } = require("@volley/platform-sdk/react")
            usePlatformStatus.mockReturnValue({
                isReady: true,
                error: null,
            })
        })

        it("should render WebCheckoutUpsellProvider when web checkout is enabled", () => {
            mockShouldUseWebCheckout.mockReturnValue(true)

            render(<App />)

            expect(
                screen.getByTestId("web-checkout-upsell-provider")
            ).toBeInTheDocument()
        })

        it("should not render WebCheckoutUpsellProvider when web checkout is disabled", () => {
            mockShouldUseWebCheckout.mockReturnValue(false)

            render(<App />)

            expect(
                screen.queryByTestId("web-checkout-upsell-provider")
            ).not.toBeInTheDocument()
        })
    })

    describe("Initialization Error Handling", () => {
        it("shows failed initialization modal when platform error occurs", () => {
            const platformError = new Error("Platform connection failed")
            mockUsePlatformStatus.mockReturnValue({
                isReady: false,
                error: platformError,
            })

            render(<App />)

            expect(
                screen.getByText(/Hmm, something went wrong/)
            ).toBeInTheDocument()
            expect(screen.getByText(/PLATFORM_ERROR/)).toBeInTheDocument()
        })

        it("hides TV Hub when failed initialization modal is shown", () => {
            const platformError = new Error("Platform connection failed")
            mockUsePlatformStatus.mockReturnValue({
                data: null,
                isLoading: false,
                error: platformError,
            })

            render(<App />)

            expect(
                screen.getByText(/Hmm, something went wrong/)
            ).toBeInTheDocument()
            expect(screen.queryByTestId("tv-hub")).not.toBeInTheDocument()
        })

        it("hides loading screen when failed initialization modal is shown", () => {
            const platformError = new Error("Platform connection failed")
            mockUsePlatformStatus.mockReturnValue({
                isReady: false,
                error: platformError,
            })

            render(<App />)

            expect(
                screen.getByText(/Hmm, something went wrong/)
            ).toBeInTheDocument()
            expect(screen.queryByTestId("loading")).not.toBeInTheDocument()
        })

        it("does not show failed initialization modal when no errors occur", () => {
            mockUsePlatformStatus.mockReturnValue({
                isReady: true,
                error: null,
            })

            render(<App />)

            expect(
                screen.queryByText(/Hmm, something went wrong/)
            ).not.toBeInTheDocument()
        })
    })

    describe("Initialization Stages Memoization", () => {
        it("should only call useInitializationDatadogRUMEvents once when component re-renders without stage value changes", () => {
            const mockUseInitializationDatadogRUMEvents = jest.fn()
            jest.mocked(
                require("../hooks/useInitializationDatadogRUMEvents")
                    .useInitializationDatadogRUMEvents
            ).mockImplementation(mockUseInitializationDatadogRUMEvents)

            mockUsePlatformStatus.mockReturnValue({
                isReady: true,
                error: null,
            })

            const mockUseSessionId = jest.fn()
            mockUseSessionId.mockReturnValueOnce(undefined)
            jest.mocked(
                require("@volley/platform-sdk/react").useSessionId
            ).mockImplementation(mockUseSessionId)

            const { rerender } = render(<App />)

            const firstCallArg =
                mockUseInitializationDatadogRUMEvents.mock.calls[0]?.[0]

            mockUseSessionId.mockReturnValueOnce("test-session-id")

            act(() => {
                rerender(<App />)
            })

            const secondCallArg =
                mockUseInitializationDatadogRUMEvents.mock.calls[1]?.[0]

            expect(firstCallArg).toBe(secondCallArg)
        })
    })
})
