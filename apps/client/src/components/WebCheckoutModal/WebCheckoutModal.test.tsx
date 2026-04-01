import { act, render, screen, waitFor } from "@testing-library/react"
import React from "react"

import { UpsellEventSubCategory } from "../../constants"
import { PaywallType } from "../../constants/game"

jest.mock("../../config/platformDetection", () => ({
    isFireTV: jest.fn(() => false),
    isLGTV: jest.fn(() => false),
    isSamsungTV: jest.fn(() => false),
    isMobileWebview: jest.fn(() => false),
    isMobile: jest.fn(() => false),
    isAndroid: jest.fn(() => false),
    isIOS: jest.fn(() => false),
    isLGOrSamsungTV: jest.fn(() => false),
    shouldUseWebCheckout: jest.fn(() => false),
}))

jest.mock("@datadog/browser-rum", () => ({
    datadogRum: {
        init: jest.fn(),
        setGlobalContextProperty: jest.fn(),
        setUser: jest.fn(),
        startDurationVital: jest.fn(() => ({})),
        stopDurationVital: jest.fn(),
        addAction: jest.fn(),
        addError: jest.fn(),
        addTiming: jest.fn(),
    },
}))
jest.mock("@datadog/browser-logs", () => ({
    datadogLogs: {
        init: jest.fn(),
        setGlobalContextProperty: jest.fn(),
        logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
    },
}))

jest.mock("../../config/devOverrides", () => ({
    SHOULD_FORCE_WEB_CHECKOUT: true,
}))

jest.mock("../UI/RiveButton", () => ({
    RiveButton: ({
        title,
        onClick,
    }: {
        title: string
        onClick: () => void
    }): React.JSX.Element => <button onClick={onClick}>{title}</button>,
}))
import { GameId } from "../../hooks/useGames"
import {
    BACK_BUTTON_TEXT,
    VISIBILITY_DELAY_MS,
    WebCheckoutModal,
} from "./WebCheckoutModal"

const MOCK_DEVICE_AUTH_DATA = {
    deviceCode: "mock-device-code",
    userCode: "1234",
    verificationUri: "https://pair-dev.volley.tv",
    verificationUriComplete: "https://pair-dev.volley.tv?pairing=1234",
    expiresIn: 600,
    interval: 5,
    expiresAt: 1609459800000, // MOCK_CURRENT_TIME + 600000
}

jest.mock("../../hooks/useDeviceAuthorization", () => ({
    useDeviceAuthorization: jest.fn(() => ({
        data: MOCK_DEVICE_AUTH_DATA,
        isLoading: false,
        error: null,
        isExpired: false,
        authStatus: { authenticated: false, authInProgress: false },
    })),
}))

const { useDeviceAuthorization } =
    require("../../hooks/useDeviceAuthorization") as {
        useDeviceAuthorization: jest.Mock
    }

beforeEach(() => {
    jest.clearAllMocks()
    useDeviceAuthorization.mockReset()
    useDeviceAuthorization.mockReturnValue({
        data: {
            deviceCode: "mock-device-code",
            userCode: "1234",
            verificationUri: "https://pair-dev.volley.tv",
            verificationUriComplete: "https://pair-dev.volley.tv?pairing=1234",
            expiresIn: 600,
            interval: 5,
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
    })
})

jest.mock("../QrWithPlaceholder/QrWithPlaceholder", () => ({
    QrWithPlaceholder: ({ url }: { url: string }): React.JSX.Element => (
        <div data-testid="qr-placeholder" data-url={url}>
            Mocked QR Component
        </div>
    ),
}))

jest.mock("../PaymentSuccessIndicator/PaymentSuccessIndicator", () => ({
    PaymentSuccessIndicator: ({
        isVisible,
        onAnimationComplete,
    }: {
        isVisible: boolean
        onAnimationComplete: () => void
    }): React.JSX.Element | null => {
        if (!isVisible) return null
        return (
            <div
                data-testid="payment-success-indicator"
                onClick={() => {
                    onAnimationComplete()
                }}
            >
                Mocked Payment Success
            </div>
        )
    },
}))

const mockAccountId = "test-account-123"
jest.mock("../../hooks/useAccountId", () => ({
    useAccountId: (): string => mockAccountId,
}))

const mockTrack = jest.fn()
const mockIdentify = jest.fn()
jest.mock("../../hooks/useHubTracking", () => ({
    useHubTracking: (): {
        track: jest.Mock
        identify: jest.Mock
    } => ({
        track: mockTrack,
        identify: mockIdentify,
    }),
}))

jest.mock("../../hooks/useVideoSequenceSegmented", () => ({
    useVideoSequenceSegmented: (): {
        currentVideo: "intro" | "looping"
        videoRef: { current: null }
    } => ({
        currentVideo: "intro",
        videoRef: { current: null },
    }),
}))

const mockUseKeyDown = jest.fn()
const mockExitApp = jest.fn()
jest.mock("@volley/platform-sdk/react", () => ({
    useAccount: (): { account: { isSubscribed: boolean } } => ({
        account: { isSubscribed: false },
    }),
    useKeyDown: (key: string, callback: () => void): void =>
        mockUseKeyDown(key, callback),
    useSessionId: jest.fn(() => "test-session-id"),
    useAppLifecycle: jest.fn(() => ({
        exitApp: mockExitApp,
    })),
    useSupport: jest.fn(() => ({
        getSupportEmail: jest.fn(() => "support@volley.tv"),
    })),
}))

jest.mock("@volley/platform-sdk/lib", () => ({
    SubscriptionFlowResult: {
        Successful: "Successful",
        Failed: "Failed",
        AlreadyPurchased: "AlreadyPurchased",
        Cancelled: "Cancelled",
    },
    getPlatform: (): string => "web",
    Platform: {
        Web: "WEB",
        Mobile: "MOBILE",
        FireTV: "FIRE_TV",
        LGTV: "LGTV",
        SamsungTV: "SAMSUNG_TV",
    },
}))

Object.defineProperty(HTMLMediaElement.prototype, "play", {
    writable: true,
    value: jest.fn().mockImplementation(() => Promise.resolve()),
})

Object.defineProperty(HTMLMediaElement.prototype, "pause", {
    writable: true,
    value: jest.fn(),
})

describe("WebCheckoutModal", () => {
    const ACCOUNT_PAIRING_CATEGORY = "account pairing"
    const MOCK_CURRENT_TIME = 1609459200000
    const MOCK_FUTURE_TIME = MOCK_CURRENT_TIME + 600000

    const renderWithAct = (
        ui: React.ReactElement
    ): ReturnType<typeof render> => {
        let result: ReturnType<typeof render>
        act(() => {
            result = render(ui)
        })
        return result!
    }

    beforeAll(() => {
        jest.spyOn(Date, "now").mockReturnValue(MOCK_CURRENT_TIME)
    })

    afterAll(() => {
        jest.restoreAllMocks()
    })

    const defaultProps = {
        isOpen: true,
        subscribeOptions: {
            eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
        },
        onResult: jest.fn(),
        onClose: jest.fn(),
        onModalHide: jest.fn(),
        videoSrc: "/test/video.mp4",
        posterSrc: "/test/poster.jpg",
        mainHeading: "Connect Volley account on your phone",
        subtitle:
            "One step away from playing Jeopardy!, Song Quiz, and more Volley games on your TV!",
        upsellContext: { type: "immediate" as const },
        videoSegments: {
            introStart: 0,
            introEnd: 3,
            loopStart: 3,
        },
        authStatus: {
            authInProgress: false,
            authenticated: false,
        },
        deviceAuth: {
            deviceCode: "mock-device-code",
            userCode: "1234",
            verificationUri: "https://pair-dev.volley.tv",
            verificationUriComplete: "https://pair-dev.volley.tv?pairing=1234",
            expiresIn: 600,
            interval: 5,
            expiresAt: MOCK_FUTURE_TIME,
        },
        isDeviceAuthLoading: false,
        setConnectionId: jest.fn(),
    }

    beforeEach(() => {
        jest.clearAllMocks()
        mockTrack.mockClear()
        mockIdentify.mockClear()
        mockUseKeyDown.mockClear()
        jest.useFakeTimers()
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    describe("Rendering", () => {
        it("should be hidden when isOpen is false", () => {
            renderWithAct(<WebCheckoutModal {...defaultProps} isOpen={false} />)

            const modal = screen
                .getByText(defaultProps.mainHeading)
                .closest(".modal")
            expect(modal).toHaveClass("modalHidden")
            expect(modal).not.toHaveClass("modalVisible")
        })

        it("should be visible when isOpen is true", async () => {
            renderWithAct(<WebCheckoutModal {...defaultProps} isOpen />)

            expect(
                screen.getByText(defaultProps.mainHeading)
            ).toBeInTheDocument()
            expect(screen.getByText(BACK_BUTTON_TEXT)).toBeInTheDocument()

            await waitFor(
                () => {
                    const modal = screen
                        .getByText(defaultProps.mainHeading)
                        .closest(".modal")
                    expect(modal).toHaveClass("modalVisible")
                },
                { timeout: VISIBILITY_DELAY_MS + 1 }
            )
        })

        it("should render with default content when isOpen is true", () => {
            renderWithAct(<WebCheckoutModal {...defaultProps} />)

            expect(
                screen.getByText(/Connect Volley account/)
            ).toBeInTheDocument()
            expect(
                screen.getByText(/One step away from playing Jeopardy!/)
            ).toBeInTheDocument()
            expect(screen.getByText(BACK_BUTTON_TEXT)).toBeInTheDocument()
        })

        it("should render with custom main heading including line breaks", () => {
            const customHeading = "Play Jeopardy!\nGet started on your phone"
            renderWithAct(
                <WebCheckoutModal
                    {...defaultProps}
                    mainHeading={customHeading}
                />
            )

            expect(screen.getByText(/Play Jeopardy!/)).toBeInTheDocument()
            expect(
                screen.getByText(/Get started on your phone/)
            ).toBeInTheDocument()
        })

        it("should render with custom subtitle", () => {
            const customSubtitle = "One step away from playing Jeopardy!"
            renderWithAct(
                <WebCheckoutModal {...defaultProps} subtitle={customSubtitle} />
            )

            expect(screen.getByText(customSubtitle)).toBeInTheDocument()
        })

        it("should render activation text with user code", () => {
            renderWithAct(<WebCheckoutModal {...defaultProps} />)

            expect(screen.getByText(/pair-dev\.volley\.tv/)).toBeInTheDocument()
            expect(screen.getByText(/enter this code/)).toBeInTheDocument()
            expect(screen.getByText(/1234/)).toBeInTheDocument()
        })

        it("should show dashes when no user code is available", () => {
            render(<WebCheckoutModal {...defaultProps} deviceAuth={null} />)

            expect(screen.getByText(/enter this code/)).toBeInTheDocument()
            expect(screen.getByText(/------/)).toBeInTheDocument()
        })

        it("should render QR rim and scan indicator", () => {
            render(<WebCheckoutModal {...defaultProps} />)

            const qrSection = document.querySelector('[class*="qrSection"]')
            const rim = document.querySelector('[class*="rim"]')
            const qrCodeBox = document.querySelector('[class*="qrCodeBox"]')
            const scanIndicator = screen.getByAltText("Scan Indicator")

            expect(qrSection).toBeInTheDocument()
            expect(rim).toBeInTheDocument()
            expect(qrCodeBox).toBeInTheDocument()

            expect(scanIndicator).toBeInTheDocument()
            expect(scanIndicator).toHaveAttribute(
                "src",
                "/assets/images/ui/scan-indicator.avif"
            )
        })
    })

    describe("Tracking Behavior", () => {
        it("should track 'Hub Screen Displayed' when modal opens", () => {
            render(<WebCheckoutModal {...defaultProps} isOpen />)

            expect(mockTrack).toHaveBeenCalledWith(
                "Hub Screen Displayed",
                expect.objectContaining({
                    screenDisplayedId: expect.any(String),
                    displayChoices: [BACK_BUTTON_TEXT],
                    eventCategory: ACCOUNT_PAIRING_CATEGORY,
                    eventSubCategory: UpsellEventSubCategory.IMMEDIATE_PRE_ROLL,
                })
            )
        })

        it("should not track when modal is initially closed", () => {
            render(<WebCheckoutModal {...defaultProps} isOpen={false} />)

            expect(mockTrack).not.toHaveBeenCalled()
        })

        it("should track with correct eventSubCategory for immediate upsell", () => {
            render(
                <WebCheckoutModal
                    {...defaultProps}
                    upsellContext={{ type: "immediate" }}
                />
            )

            expect(mockTrack).toHaveBeenCalledWith(
                "Hub Screen Displayed",
                expect.objectContaining({
                    eventSubCategory: UpsellEventSubCategory.IMMEDIATE_PRE_ROLL,
                })
            )
        })

        it("should track with correct eventSubCategory for game-selection upsell", () => {
            const gameSelectionContext = {
                type: "game-selection" as const,
                game: {
                    id: GameId.Jeopardy,
                    title: "Jeopardy",
                    trackingId: "jeopardy" as const,
                    tileImageUrl: "/tile.avif",
                    heroImageUrl: "/hero.avif",
                    paywallType: PaywallType.Soft,
                },
            }

            render(
                <WebCheckoutModal
                    {...defaultProps}
                    upsellContext={gameSelectionContext}
                />
            )

            expect(mockTrack).toHaveBeenCalledWith(
                "Hub Screen Displayed",
                expect.objectContaining({
                    eventSubCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
                })
            )
        })

        it("should track back button press with correct screenDisplayedId", () => {
            render(<WebCheckoutModal {...defaultProps} isOpen />)

            act(() => {
                jest.runOnlyPendingTimers()
            })

            expect(mockTrack).toHaveBeenCalledWith(
                "Hub Screen Displayed",
                expect.objectContaining({
                    screenDisplayedId: expect.any(String),
                })
            )

            const screenDisplayedCall = mockTrack.mock.calls.find(
                (call) => call[0] === "Hub Screen Displayed"
            )
            const screenDisplayedId =
                screenDisplayedCall?.[1]?.screenDisplayedId

            const backButtonCallback = mockUseKeyDown.mock.calls.find(
                (call) => call[0] === "Back"
            )?.[1]

            expect(backButtonCallback).toBeDefined()
            expect(screenDisplayedId).toBeDefined()

            act(() => {
                backButtonCallback?.()
            })

            const buttonPressedCalls = mockTrack.mock.calls.filter(
                (call) => call[0] === "Hub Button Pressed"
            )

            if (buttonPressedCalls.length > 0) {
                expect(mockTrack).toHaveBeenCalledWith("Hub Button Pressed", {
                    choiceValue: BACK_BUTTON_TEXT,
                    displayChoices: [BACK_BUTTON_TEXT],
                    eventCategory: ACCOUNT_PAIRING_CATEGORY,
                    eventSubCategory: UpsellEventSubCategory.IMMEDIATE_PRE_ROLL,
                    screenDisplayedId,
                })
                expect(mockTrack).toHaveBeenCalledTimes(2)
            } else {
                expect(mockTrack).toHaveBeenCalledTimes(1)
            }
        })

        it("should not track back button press if no screenDisplayedId", () => {
            render(<WebCheckoutModal {...defaultProps} isOpen={false} />)

            const backButtonCallback = mockUseKeyDown.mock.calls.find(
                (call) => call[0] === "Back"
            )?.[1]

            expect(backButtonCallback).toBeDefined()

            backButtonCallback?.()

            expect(mockTrack).not.toHaveBeenCalled()
        })

        describe("Deduping Behavior", () => {
            it("should only track once even with multiple rerenders when isOpen stays true", () => {
                const { rerender } = render(
                    <WebCheckoutModal {...defaultProps} isOpen />
                )

                expect(mockTrack).toHaveBeenCalledTimes(1)

                rerender(
                    <WebCheckoutModal
                        {...defaultProps}
                        isOpen
                        mainHeading="Different heading"
                        upsellContext={{ type: "immediate" }}
                    />
                )

                expect(mockTrack).toHaveBeenCalledTimes(1)

                rerender(<WebCheckoutModal {...defaultProps} isOpen />)

                expect(mockTrack).toHaveBeenCalledTimes(1)
            })

            it("should track again when modal closes and reopens", () => {
                const { rerender } = render(
                    <WebCheckoutModal {...defaultProps} isOpen />
                )

                expect(mockTrack).toHaveBeenCalledTimes(1)

                rerender(<WebCheckoutModal {...defaultProps} isOpen={false} />)

                expect(mockTrack).toHaveBeenCalledTimes(1)

                rerender(<WebCheckoutModal {...defaultProps} isOpen />)

                expect(mockTrack).toHaveBeenCalledTimes(2)
            })

            it("should not track when transitioning from closed to closed", () => {
                const { rerender } = render(
                    <WebCheckoutModal {...defaultProps} isOpen={false} />
                )

                expect(mockTrack).not.toHaveBeenCalled()

                rerender(
                    <WebCheckoutModal
                        {...defaultProps}
                        isOpen={false}
                        mainHeading="Different heading"
                        upsellContext={{ type: "immediate" }}
                    />
                )

                expect(mockTrack).not.toHaveBeenCalled()
            })
        })
    })

    describe("Device Authorization Props", () => {
        it("should render with device authorization data from props", () => {
            render(<WebCheckoutModal {...defaultProps} isOpen />)

            expect(screen.getByTestId("qr-placeholder")).toBeInTheDocument()
            expect(screen.getByText(/1234/)).toBeInTheDocument()
        })
    })

    describe("Background Videos", () => {
        it("should render video with correct src", () => {
            const videoSrc = "/test-video.mp4"
            render(<WebCheckoutModal {...defaultProps} videoSrc={videoSrc} />)

            const video = document.querySelector('video[src="/test-video.mp4"]')
            expect(video).toBeInTheDocument()
            expect(video).toHaveAttribute("playsInline", "")
            expect(video).toHaveAttribute("preload", "auto")
        })

        it("should have single video element with correct attributes", () => {
            const videoSrc = "/test-video.mp4"
            render(<WebCheckoutModal {...defaultProps} videoSrc={videoSrc} />)

            const allVideos = document.querySelectorAll("video")
            expect(allVideos).toHaveLength(1)

            const video = allVideos[0]
            expect(video).toHaveAttribute("src", "/test-video.mp4")
            expect(video).toHaveAttribute("playsInline", "")
            expect(video).toHaveAttribute("preload", "auto")
        })

        it("should render single video for segmented playback", () => {
            const videoSrc = "/test-video.mp4"
            render(<WebCheckoutModal {...defaultProps} videoSrc={videoSrc} />)

            const allVideos = document.querySelectorAll("video")
            expect(allVideos).toHaveLength(1)

            const video = document.querySelector('video[src="/test-video.mp4"]')
            expect(video).toBeInTheDocument()
        })

        it("video should mount before first open, unmount after first close, remount on subsequent opens, and unmount after subsequent closes", () => {
            const videoSrc = "/first-open-cycle.mp4"
            const { rerender } = render(
                <WebCheckoutModal
                    {...defaultProps}
                    isOpen={false}
                    videoSrc={videoSrc}
                />
            )

            expect(
                document.querySelector(`video[src="${videoSrc}"]`)
            ).toBeInTheDocument()

            rerender(
                <WebCheckoutModal
                    {...defaultProps}
                    isOpen
                    videoSrc={videoSrc}
                />
            )
            expect(
                document.querySelector(`video[src="${videoSrc}"]`)
            ).toBeInTheDocument()

            rerender(
                <WebCheckoutModal
                    {...defaultProps}
                    isOpen={false}
                    videoSrc={videoSrc}
                />
            )
            expect(
                document.querySelector(`video[src="${videoSrc}"]`)
            ).not.toBeInTheDocument()

            rerender(
                <WebCheckoutModal
                    {...defaultProps}
                    isOpen
                    videoSrc={videoSrc}
                />
            )
            expect(
                document.querySelector(`video[src="${videoSrc}"]`)
            ).toBeInTheDocument()

            rerender(
                <WebCheckoutModal
                    {...defaultProps}
                    isOpen={false}
                    videoSrc={videoSrc}
                />
            )
            expect(
                document.querySelector(`video[src="${videoSrc}"]`)
            ).not.toBeInTheDocument()
        })
    })

    describe("Back Button Handling", () => {
        it("should register back button handler", () => {
            render(<WebCheckoutModal {...defaultProps} />)

            expect(mockUseKeyDown).toHaveBeenCalledWith(
                "Back",
                expect.any(Function)
            )
        })

        it("should call onResult with Failed and onClose when back button is pressed", () => {
            render(<WebCheckoutModal {...defaultProps} />)

            const backButtonCallback = mockUseKeyDown.mock.calls.find(
                (call) => call[0] === "Back"
            )?.[1]

            expect(backButtonCallback).toBeDefined()

            act(() => {
                backButtonCallback?.()
            })

            expect(defaultProps.onResult).toHaveBeenCalledWith("Failed")
            expect(defaultProps.onClose).toHaveBeenCalled()
        })
    })

    describe("CSS classes and structure", () => {
        it("should have proper modal structure", () => {
            render(<WebCheckoutModal {...defaultProps} />)

            const modal = document.querySelector('[class*="modal"]')
            expect(modal).toBeInTheDocument()

            const qrSection = document.querySelector('[class*="qrSection"]')
            expect(qrSection).toBeInTheDocument()

            const mainHeading = document.querySelector('[class*="mainHeading"]')
            expect(mainHeading).toBeInTheDocument()

            const subtitle = document.querySelector('[class*="subtitle"]')
            expect(subtitle).toBeInTheDocument()
        })

        it("should render activation text with highlighted elements", () => {
            render(<WebCheckoutModal {...defaultProps} />)

            const activationText = screen.getByText(/Or go to/)
            expect(activationText).toBeInTheDocument()

            expect(screen.getByText(/pair-dev\.volley\.tv/)).toBeInTheDocument()
            expect(screen.getByText(/1234/)).toBeInTheDocument()
        })
    })

    describe("QrWithPlaceholder Integration", () => {
        it("should render QrWithPlaceholder component", () => {
            render(<WebCheckoutModal {...defaultProps} />)

            const qrComponent = screen.getByTestId("qr-placeholder")
            expect(qrComponent).toBeInTheDocument()
            expect(qrComponent).toHaveTextContent("Mocked QR Component")
        })

        it("should pass correct URL to QrWithPlaceholder with device authorization URI", () => {
            render(<WebCheckoutModal {...defaultProps} />)

            const qrComponent = screen.getByTestId("qr-placeholder")
            expect(qrComponent).toHaveAttribute(
                "data-url",
                "https://pair-dev.volley.tv/?pairing=1234"
            )
        })

        it("should not render QR component when deviceAuth is null", () => {
            render(<WebCheckoutModal {...defaultProps} deviceAuth={null} />)

            const qrComponent = screen.queryByTestId("qr-placeholder")
            expect(qrComponent).not.toBeInTheDocument()
        })

        it("should handle deviceAuth with missing userCode gracefully", () => {
            const deviceAuthWithoutUserCode = {
                ...MOCK_DEVICE_AUTH_DATA,
                userCode: "",
                verificationUriComplete: "https://pair-dev.volley.tv?pairing=",
            }
            render(
                <WebCheckoutModal
                    {...defaultProps}
                    deviceAuth={deviceAuthWithoutUserCode}
                />
            )

            expect(screen.getByText(/------/)).toBeInTheDocument()
            const qrComponent = screen.queryByTestId("qr-placeholder")
            expect(qrComponent).not.toBeInTheDocument()
        })

        it("should handle different user code lengths", () => {
            const deviceAuthWithLongerCode = {
                ...MOCK_DEVICE_AUTH_DATA,
                userCode: "123456",
                verificationUriComplete:
                    "https://pair-dev.volley.tv?pairing=123456",
            }
            render(
                <WebCheckoutModal
                    {...defaultProps}
                    deviceAuth={deviceAuthWithLongerCode}
                />
            )

            expect(screen.getByText(/123456/)).toBeInTheDocument()
            const qrComponent = screen.getByTestId("qr-placeholder")
            expect(qrComponent).toHaveAttribute(
                "data-url",
                "https://pair-dev.volley.tv/?pairing=123456"
            )
        })

        it("should handle deviceAuth with undefined userCode", () => {
            const deviceAuthWithUndefinedUserCode = {
                deviceCode: "test-device-code",
                userCode: undefined as any,
                verificationUri: "https://pair-dev.volley.tv",
                verificationUriComplete: "https://pair-dev.volley.tv?pairing=",
                expiresIn: 600,
                interval: 5,
                expiresAt: Date.now() + 600000,
            }
            render(
                <WebCheckoutModal
                    {...defaultProps}
                    deviceAuth={deviceAuthWithUndefinedUserCode}
                />
            )

            expect(screen.getByText(/------/)).toBeInTheDocument()
            const qrComponent = screen.queryByTestId("qr-placeholder")
            expect(qrComponent).not.toBeInTheDocument()
        })

        it("should use verificationUri for different environments", () => {
            const stagingDeviceAuth = {
                ...MOCK_DEVICE_AUTH_DATA,
                verificationUri: "https://pair-staging.volley.tv",
                userCode: "5678",
            }
            render(
                <WebCheckoutModal
                    {...defaultProps}
                    deviceAuth={stagingDeviceAuth}
                />
            )

            const qrComponent = screen.getByTestId("qr-placeholder")
            expect(qrComponent).toHaveAttribute(
                "data-url",
                "https://pair-staging.volley.tv/?pairing=5678"
            )
            expect(
                screen.getByText("pair-staging.volley.tv")
            ).toBeInTheDocument()
        })
    })

    describe("Props handling", () => {
        it("should handle minimal required props", () => {
            const minimalProps = {
                isOpen: true,
                subscribeOptions: {},
                onResult: jest.fn(),
                onClose: jest.fn(),
                videoSrc: "/test/video.mp4",
                posterSrc: "/test/poster.jpg",
                mainHeading: "Test",
                subtitle: "Test subtitle",
                upsellContext: { type: "immediate" as const },
                videoSegments: {
                    introStart: 0,
                    introEnd: 3,
                    loopStart: 3,
                },
                deviceAuth: null,
                authStatus: null,
                isDeviceAuthLoading: false,
                setConnectionId: jest.fn(),
            }

            expect(() =>
                render(<WebCheckoutModal {...minimalProps} />)
            ).not.toThrow()
        })

        it("should handle empty strings for text props", () => {
            const propsWithEmptyStrings = {
                ...defaultProps,
                videoSrc: "/fallback-intro.mp4",
                mainHeading: "",
                subtitle: "",
            }

            expect(() =>
                render(<WebCheckoutModal {...propsWithEmptyStrings} />)
            ).not.toThrow()
        })
    })

    describe("Payment Success Flow", () => {
        beforeEach(() => {
            jest.useFakeTimers()
            process.env.NODE_ENV = "development"
            jest.spyOn(console, "error").mockImplementation(() => {})
        })

        afterEach(() => {
            jest.runOnlyPendingTimers()
            jest.useRealTimers()
            jest.restoreAllMocks()
        })

        it("should show QR code initially", () => {
            render(<WebCheckoutModal {...defaultProps} />)

            expect(screen.getByTestId("qr-placeholder")).toBeInTheDocument()
            expect(
                screen.queryByTestId("payment-success-indicator")
            ).not.toBeInTheDocument()
        })

        it("should show success indicator when payment succeeds via simulatePaymentSuccess", () => {
            render(<WebCheckoutModal {...defaultProps} />)

            expect(
                screen.queryByTestId("payment-success-indicator")
            ).not.toBeInTheDocument()

            act(() => {
                if (typeof window !== "undefined") {
                    ;(window as any).simulatePaymentSuccess?.()
                }
            })

            expect(
                screen.getByTestId("payment-success-indicator")
            ).toBeInTheDocument()
        })

        it("should call onResult with Successful when success animation completes", () => {
            render(<WebCheckoutModal {...defaultProps} />)

            act(() => {
                if (typeof window !== "undefined") {
                    ;(window as any).simulatePaymentSuccess?.()
                }
            })

            const successIndicator = screen.getByTestId(
                "payment-success-indicator"
            )

            act(() => {
                successIndicator.click()
                jest.advanceTimersByTime(400)
            })

            expect(defaultProps.onResult).toHaveBeenCalledWith("Successful")
            expect(defaultProps.onModalHide).toHaveBeenCalled()
        })

        it("should keep activation text and scan indicator visible during success state", () => {
            render(<WebCheckoutModal {...defaultProps} />)

            expect(screen.getByText(/Or go to/)).toBeInTheDocument()
            expect(screen.getByAltText("Scan Indicator")).toBeInTheDocument()

            act(() => {
                if (typeof window !== "undefined") {
                    ;(window as any).simulatePaymentSuccess?.()
                }
            })

            expect(screen.getByText(/Or go to/)).toBeInTheDocument()
            expect(screen.getByAltText("Scan Indicator")).toBeInTheDocument()
        })

        it("should keep back hint visible during success state", () => {
            render(<WebCheckoutModal {...defaultProps} />)

            expect(screen.getByText(BACK_BUTTON_TEXT)).toBeInTheDocument()

            act(() => {
                if (typeof window !== "undefined") {
                    ;(window as any).simulatePaymentSuccess?.()
                }
            })

            expect(screen.getByText(BACK_BUTTON_TEXT)).toBeInTheDocument()
        })

        it("should trigger payment success when subscription status changes to true", () => {
            const mockDevOverrides = require("../../config/devOverrides")
            const originalForceWebCheckout =
                mockDevOverrides.SHOULD_FORCE_WEB_CHECKOUT
            const originalUseDevUpsell = mockDevOverrides.SHOULD_USE_DEV_UPSELL
            mockDevOverrides.SHOULD_FORCE_WEB_CHECKOUT = false
            mockDevOverrides.SHOULD_USE_DEV_UPSELL = false

            let mockSubscriptionStatus = false
            const useAccountSpy = jest.spyOn(
                require("@volley/platform-sdk/react"),
                "useAccount"
            )
            useAccountSpy.mockImplementation(() => ({
                account: { isSubscribed: mockSubscriptionStatus },
            }))

            const { rerender } = render(<WebCheckoutModal {...defaultProps} />)

            expect(screen.getByTestId("qr-placeholder")).toBeInTheDocument()
            expect(
                screen.queryByTestId("payment-success-indicator")
            ).not.toBeInTheDocument()

            mockSubscriptionStatus = true

            act(() => {
                rerender(<WebCheckoutModal {...defaultProps} />)
            })

            expect(
                screen.getByTestId("payment-success-indicator")
            ).toBeInTheDocument()

            useAccountSpy.mockRestore()
            mockDevOverrides.SHOULD_FORCE_WEB_CHECKOUT =
                originalForceWebCheckout
            mockDevOverrides.SHOULD_USE_DEV_UPSELL = originalUseDevUpsell
        })

        it("should call onResult with Successful when subscription status change completes animation", () => {
            const mockDevOverrides = require("../../config/devOverrides")
            const originalForceWebCheckout =
                mockDevOverrides.SHOULD_FORCE_WEB_CHECKOUT
            const originalUseDevUpsell = mockDevOverrides.SHOULD_USE_DEV_UPSELL
            mockDevOverrides.SHOULD_FORCE_WEB_CHECKOUT = false
            mockDevOverrides.SHOULD_USE_DEV_UPSELL = false

            let mockSubscriptionStatus = false
            const useAccountSpy = jest.spyOn(
                require("@volley/platform-sdk/react"),
                "useAccount"
            )
            useAccountSpy.mockImplementation(() => ({
                account: { isSubscribed: mockSubscriptionStatus },
            }))

            const { rerender } = render(<WebCheckoutModal {...defaultProps} />)

            mockSubscriptionStatus = true

            act(() => {
                rerender(<WebCheckoutModal {...defaultProps} />)
            })

            const successIndicator = screen.getByTestId(
                "payment-success-indicator"
            )

            act(() => {
                successIndicator.click()
                jest.advanceTimersByTime(400)
            })

            expect(defaultProps.onResult).toHaveBeenCalledWith("Successful")
            expect(defaultProps.onModalHide).toHaveBeenCalled()

            useAccountSpy.mockRestore()
            mockDevOverrides.SHOULD_FORCE_WEB_CHECKOUT =
                originalForceWebCheckout
            mockDevOverrides.SHOULD_USE_DEV_UPSELL = originalUseDevUpsell
        })

        it("should not trigger payment success when subscription status remains false", () => {
            const mockDevOverrides = require("../../config/devOverrides")
            const originalForceWebCheckout =
                mockDevOverrides.SHOULD_FORCE_WEB_CHECKOUT
            const originalUseDevUpsell = mockDevOverrides.SHOULD_USE_DEV_UPSELL
            mockDevOverrides.SHOULD_FORCE_WEB_CHECKOUT = false
            mockDevOverrides.SHOULD_USE_DEV_UPSELL = false

            const mockSubscriptionStatus = false
            const useAccountSpy = jest.spyOn(
                require("@volley/platform-sdk/react"),
                "useAccount"
            )
            useAccountSpy.mockImplementation(() => ({
                account: { isSubscribed: mockSubscriptionStatus },
            }))

            const { rerender } = render(<WebCheckoutModal {...defaultProps} />)

            act(() => {
                rerender(<WebCheckoutModal {...defaultProps} />)
            })

            expect(
                screen.queryByTestId("payment-success-indicator")
            ).not.toBeInTheDocument()

            useAccountSpy.mockRestore()
            mockDevOverrides.SHOULD_FORCE_WEB_CHECKOUT =
                originalForceWebCheckout
            mockDevOverrides.SHOULD_USE_DEV_UPSELL = originalUseDevUpsell
        })

        it("should respect dev overrides and not trigger on subscription change", () => {
            const mockDevOverrides = require("../../config/devOverrides")
            const originalForceWebCheckout =
                mockDevOverrides.SHOULD_FORCE_WEB_CHECKOUT
            const originalUseDevUpsell = mockDevOverrides.SHOULD_USE_DEV_UPSELL

            mockDevOverrides.SHOULD_FORCE_WEB_CHECKOUT = true
            mockDevOverrides.SHOULD_USE_DEV_UPSELL = true

            let mockSubscriptionStatus = false
            const useAccountSpy = jest.spyOn(
                require("@volley/platform-sdk/react"),
                "useAccount"
            )
            useAccountSpy.mockImplementation(() => ({
                account: { isSubscribed: mockSubscriptionStatus },
            }))

            const { rerender } = render(<WebCheckoutModal {...defaultProps} />)

            mockSubscriptionStatus = true

            act(() => {
                rerender(<WebCheckoutModal {...defaultProps} />)
            })

            expect(
                screen.queryByTestId("payment-success-indicator")
            ).not.toBeInTheDocument()

            useAccountSpy.mockRestore()
            mockDevOverrides.SHOULD_FORCE_WEB_CHECKOUT =
                originalForceWebCheckout
            mockDevOverrides.SHOULD_USE_DEV_UPSELL = originalUseDevUpsell
        })
    })

    describe("Device Authorization Expiration Handling", () => {
        it("should show normal QR code when device authorization is not expired", () => {
            render(<WebCheckoutModal {...defaultProps} />)

            expect(screen.getByTestId("qr-placeholder")).toBeInTheDocument()
            expect(screen.getByText(/1234/)).toBeInTheDocument()
            expect(
                document.querySelector('[class*="refreshingCode"]')
            ).not.toBeInTheDocument()
            expect(
                document.querySelector('[class*="refreshingSpinner"]')
            ).not.toBeInTheDocument()
        })

        it("should show dashes when loading and no device auth data", () => {
            render(
                <WebCheckoutModal
                    {...defaultProps}
                    deviceAuth={null}
                    isDeviceAuthLoading
                />
            )

            expect(screen.getByText(/------/)).toBeInTheDocument()
            expect(
                screen.queryByTestId("qr-placeholder")
            ).not.toBeInTheDocument()
        })
    })

    describe("defensive safeguard", () => {
        it("should immediately close with Successful if user is already subscribed when modal opens", () => {
            const useIsSubscribedModule = require("../../hooks/useIsSubscribed")
            const useIsSubscribedSpy = jest
                .spyOn(useIsSubscribedModule, "useIsSubscribed")
                .mockReturnValue(true)

            const onResult = jest.fn()
            const onClose = jest.fn()

            render(
                <WebCheckoutModal
                    {...defaultProps}
                    isOpen
                    onResult={onResult}
                    onClose={onClose}
                />
            )

            expect(onResult).toHaveBeenCalledWith("Successful")
            expect(onClose).toHaveBeenCalled()

            useIsSubscribedSpy.mockRestore()
        })
    })
})
