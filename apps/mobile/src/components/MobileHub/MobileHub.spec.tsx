import { act, render, screen } from "@testing-library/react"
import React from "react"

import {
    clearGameIframeControllerUrl,
    getGameIframeControllerUrl,
} from "../../config/gameIframeControllerUrl"
import { isDemo } from "../../config/isDemo"
import { MobileHub } from "./MobileHub"

jest.mock("../../hooks/useGames", () => ({
    GameId: {
        Jeopardy: "jeopardy",
        SongQuiz: "song-quiz",
        CoComelon: "cocomelon",
        WheelOfFortune: "wheel-of-fortune",
    },
    useGames: jest.fn(() => []),
}))

jest.mock("../../../package.json", () => ({
    version: "1.0.0-test",
}))

jest.mock("../../config/envconfig", () => ({
    getWindowVar: jest.fn(),
    getEnvVar: jest.fn(),
    LOGO_DISPLAY_MILLIS: 2000,
    AMPLITUDE_EXPERIMENT_KEY: "",
    BACKEND_SERVER_ENDPOINT: "http://localhost:3000",
    SEGMENT_WRITE_KEY: "test-key",
    ENVIRONMENT: "local",
    BASE_URL: "/",
    DATADOG_APPLICATION_ID: "test-id",
    DATADOG_CLIENT_TOKEN: "test-token",
}))

jest.mock("../../constants", () => ({
    PLATFORM_API_URL: "https://platform-api-staging.volley-services.net/",
    PLATFORM_STAGE: "staging",
    ROOM_CODE_LENGTH: 6,
}))

jest.mock("@noriginmedia/norigin-spatial-navigation", () => ({
    init: jest.fn(),
}))

jest.mock("../../config/platformDetection", () => ({
    isMobile: jest.fn().mockReturnValue(true),
    isAppClip: jest.fn().mockReturnValue(false),
}))

jest.mock("../../config/gameIframeControllerUrl", () => ({
    getGameIframeControllerUrl: jest.fn(),
    clearGameIframeControllerUrl: jest.fn(),
}))

jest.mock("@volley/platform-sdk/react", () => ({
    PlatformProvider: ({
        children,
        options,
    }: {
        children: React.ReactNode
        options: any
    }): React.ReactElement => (
        <div
            data-testid="platform-provider"
            data-options={JSON.stringify(options)}
        >
            {children}
        </div>
    ),
    useEventBroker: jest.fn(() => ({
        addEventListener: jest.fn(() => jest.fn()),
    })),
    usePlatformStatus: jest.fn(() => ({
        isReady: true,
    })),
    useSupport: jest.fn(() => ({
        showSupportModal: jest.fn(),
        getSupportEmail: jest.fn(() => "support@volley.tv"),
    })),
    useMicrophone: jest.fn(() => ({
        checkPermissions: jest.fn(() => Promise.resolve("prompt")),
    })),
}))

jest.mock("@volley/platform-sdk/lib", () => ({
    getAppVersion: jest.fn(() => null),
}))

jest.mock("@datadog/browser-logs", () => ({
    datadogLogs: {
        setGlobalContextProperty: jest.fn(),
    },
}))

jest.mock("../../hooks/useExperimentInit", () => ({
    useExperimentInit: jest.fn(() => ({ experimentsReady: true })),
}))

jest.mock("../../hooks/useDatadogIdentity", () => ({
    useDatadogIdentity: jest.fn(),
}))

jest.mock("../../hooks/useBrandDocumentMeta", () => ({
    useBrandDocumentMeta: jest.fn(),
}))

jest.mock("./RoomCodeEntry/RoomCodeEntry", () => ({
    RoomCodeEntry: (): React.ReactElement => (
        <div data-testid="room-code-entry">Room Code Entry</div>
    ),
}))

jest.mock("./GameIframeController/GameIframeController", () => ({
    GameIframeController: ({
        url,
        onClose,
        onError,
    }: {
        url: string
        onClose: () => void
        onError: () => void
    }): React.ReactElement => (
        <div
            data-testid="game-controller"
            data-url={url}
            onClick={() => {
                onClose()
                onError()
            }}
        >
            Game Controller
        </div>
    ),
}))

jest.mock("./DemoController/DemoController", () => ({
    __esModule: true,
    default: (): React.ReactElement => (
        <div data-testid="demo-controller">Demo Controller</div>
    ),
}))

jest.mock("lottie-react", () => ({
    __esModule: true,
    default: ({
        animationData: _animationData,
        className,
        loop,
        autoplay,
    }: {
        animationData: object
        className?: string
        loop?: boolean
        autoplay?: boolean
    }): React.ReactElement => (
        <div
            data-testid="lottie-animation"
            className={className}
            data-loop={loop}
            data-autoplay={autoplay}
        >
            Lottie Animation
        </div>
    ),
}))

jest.mock("../../config/isDemo", () => ({
    isDemo: jest.fn(),
}))

jest.mock("./shared/SupportOverlay/SupportOverlay", () => ({
    SupportOverlay: ({
        open,
        context,
        onClose,
    }: {
        open: boolean
        context: any
        onClose: () => void
    }): React.ReactElement => (
        <div
            data-testid="support-overlay"
            data-open={open}
            data-context={JSON.stringify(context)}
            onClick={onClose}
        >
            Support Overlay
        </div>
    ),
}))

jest.mock("../../hooks/useHubTracking", () => ({
    useHubTracking: jest.fn(() => ({
        track: jest.fn(),
        identify: jest.fn(),
    })),
}))

jest.mock("../../hooks/useGames", () => ({
    useGames: jest.fn(() => []),
}))

describe("MobileHub", () => {
    const mockGetGameIframeControllerUrl =
        getGameIframeControllerUrl as jest.MockedFunction<
            typeof getGameIframeControllerUrl
        >
    const mockClearGameIframeControllerUrl =
        clearGameIframeControllerUrl as jest.MockedFunction<
            typeof clearGameIframeControllerUrl
        >
    const mockIsDemo = isDemo as jest.MockedFunction<typeof isDemo>

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it("renders RoomCodeEntry when no game iframe controller URL", () => {
        mockGetGameIframeControllerUrl.mockReturnValue(undefined)

        render(<MobileHub />)

        expect(screen.getByTestId("room-code-entry")).toBeInTheDocument()
    })

    it("renders GameIframeController when has game iframe controller URL", () => {
        const testUrl =
            "https://game-clients-dev.volley.tv/cocomelon?roomCode=123"
        mockGetGameIframeControllerUrl.mockReturnValue(testUrl)

        render(<MobileHub />)

        const gameController = screen.getByTestId("game-controller")
        expect(gameController).toBeInTheDocument()
        expect(gameController.getAttribute("data-url")).toBe(testUrl)
    })

    it("handles close event from GameIframeController", () => {
        const mockReplaceState = jest.fn()
        const originalHistory = window.history
        delete (window as { history?: History }).history
        window.history = {
            ...originalHistory,
            replaceState: mockReplaceState,
        } as unknown as History

        const originalLocation = window.location
        delete (window as { location?: Location }).location
        window.location = {
            ...originalLocation,
            href: "https://example.com/?gameIframeControllerUrl=test",
            search: "?gameIframeControllerUrl=test",
        } as unknown as string & Location

        const testUrl =
            "https://game-clients-dev.volley.tv/cocomelon?roomCode=123"
        mockGetGameIframeControllerUrl.mockReturnValue(testUrl)

        // Mock clearGameIframeControllerUrl to call history.replaceState
        mockClearGameIframeControllerUrl.mockImplementation(() => {
            const currentUrl = new URL(window.location.href)
            currentUrl.searchParams.delete("gameIframeControllerUrl")
            window.history.replaceState({}, "", currentUrl.toString())
        })

        render(<MobileHub />)

        // Trigger onClose by clicking the game controller
        act(() => {
            screen.getByTestId("game-controller").click()
        })

        expect(mockClearGameIframeControllerUrl).toHaveBeenCalled()
        expect(mockReplaceState).toHaveBeenCalledWith(
            {},
            "",
            "https://example.com/"
        )

        window.history = originalHistory
        window.location = originalLocation as unknown as string & Location
    })

    it("parses gameIframeControllerUrl from query parameters correctly", () => {
        const originalLocation = window.location
        delete (window as { location?: Location }).location
        window.location = {
            ...originalLocation,
            search: "?gameIframeControllerUrl=https://game-clients-dev.volley.tv/cocomelon?roomCode=123",
        } as unknown as string & Location

        mockGetGameIframeControllerUrl.mockImplementation(() => {
            const params = new URLSearchParams(window.location.search)
            const url = params.get("gameIframeControllerUrl")
            return url || undefined
        })

        render(<MobileHub />)

        const gameController = screen.getByTestId("game-controller")
        expect(gameController.getAttribute("data-url")).toBe(
            "https://game-clients-dev.volley.tv/cocomelon?roomCode=123"
        )

        window.location = originalLocation as unknown as string & Location
    })

    it("renders DemoController when in demo mode", () => {
        mockIsDemo.mockReturnValue(true)

        render(<MobileHub />)

        expect(screen.getByTestId("demo-controller")).toBeInTheDocument()
    })

    it("renders SupportOverlay alongside RoomCodeEntry", () => {
        mockGetGameIframeControllerUrl.mockReturnValue(undefined)
        mockIsDemo.mockReturnValue(false)

        render(<MobileHub />)

        expect(screen.getByTestId("room-code-entry")).toBeInTheDocument()
        expect(screen.getByTestId("support-overlay")).toBeInTheDocument()
    })

    it("renders SupportOverlay alongside GameIframeController", () => {
        const testUrl =
            "https://game-clients-dev.volley.tv/cocomelon?roomCode=123"
        mockGetGameIframeControllerUrl.mockReturnValue(testUrl)
        mockIsDemo.mockReturnValue(false)

        render(<MobileHub />)

        expect(screen.getByTestId("game-controller")).toBeInTheDocument()
        expect(screen.getByTestId("support-overlay")).toBeInTheDocument()
    })

    it("renders SupportOverlay alongside DemoController", () => {
        mockIsDemo.mockReturnValue(true)

        render(<MobileHub />)

        expect(screen.getByTestId("demo-controller")).toBeInTheDocument()
        expect(screen.getByTestId("support-overlay")).toBeInTheDocument()
    })

    it("SupportOverlay starts closed by default", () => {
        mockIsDemo.mockReturnValue(false)

        render(<MobileHub />)

        const supportOverlay = screen.getByTestId("support-overlay")
        expect(supportOverlay.getAttribute("data-open")).toBe("false")
    })

    it("opens SupportOverlay when support:open event is triggered", () => {
        const mockAddEventListener = jest.fn()
        const mockUseEventBroker =
            require("@volley/platform-sdk/react").useEventBroker
        mockUseEventBroker.mockReturnValue({
            addEventListener: mockAddEventListener,
        })

        mockIsDemo.mockReturnValue(false)

        render(<MobileHub />)

        // Get the event listener callback that was registered
        expect(mockAddEventListener).toHaveBeenCalledWith(
            "support:open",
            expect.any(Function)
        )

        const eventCallback = mockAddEventListener.mock.calls[0][1]

        // Trigger the support:open event with context
        act(() => {
            eventCallback({
                gameContext: { gameId: "test-game" },
                sdkContext: { version: "1.0" },
            })
        })

        const supportOverlay = screen.getByTestId("support-overlay")
        expect(supportOverlay.getAttribute("data-open")).toBe("true")
        expect(supportOverlay.getAttribute("data-context")).toBe(
            JSON.stringify({
                gameContext: { gameId: "test-game" },
                sdkContext: { version: "1.0" },
            })
        )
    })

    it("closes SupportOverlay when onClose is called", () => {
        const mockAddEventListener = jest.fn()
        const mockUseEventBroker =
            require("@volley/platform-sdk/react").useEventBroker
        mockUseEventBroker.mockReturnValue({
            addEventListener: mockAddEventListener,
        })

        mockIsDemo.mockReturnValue(false)

        render(<MobileHub />)

        const eventCallback = mockAddEventListener.mock.calls[0][1]

        // Open the support overlay
        act(() => {
            eventCallback({
                gameContext: { gameId: "test-game" },
                sdkContext: { version: "1.0" },
            })
        })

        let supportOverlay = screen.getByTestId("support-overlay")
        expect(supportOverlay.getAttribute("data-open")).toBe("true")

        // Close the support overlay
        act(() => {
            supportOverlay.click()
        })

        supportOverlay = screen.getByTestId("support-overlay")
        expect(supportOverlay.getAttribute("data-open")).toBe("false")
    })

    it("handles support:open event with partial context", () => {
        const mockAddEventListener = jest.fn()
        const mockUseEventBroker =
            require("@volley/platform-sdk/react").useEventBroker
        mockUseEventBroker.mockReturnValue({
            addEventListener: mockAddEventListener,
        })

        mockIsDemo.mockReturnValue(false)

        render(<MobileHub />)

        const eventCallback = mockAddEventListener.mock.calls[0][1]

        // Trigger with only gameContext
        act(() => {
            eventCallback({ gameContext: { gameId: "test-game" } })
        })

        const supportOverlay = screen.getByTestId("support-overlay")
        expect(supportOverlay.getAttribute("data-context")).toBe(
            JSON.stringify({
                gameContext: { gameId: "test-game" },
                sdkContext: {},
            })
        )
    })

    it("does not register support event listener when platform is not ready", () => {
        const mockAddEventListener = jest.fn()
        const mockUseEventBroker =
            require("@volley/platform-sdk/react").useEventBroker
        const mockUsePlatformStatus =
            require("@volley/platform-sdk/react").usePlatformStatus

        mockUseEventBroker.mockReturnValue({
            addEventListener: mockAddEventListener,
        })
        mockUsePlatformStatus.mockReturnValue({
            isReady: false,
        })

        mockIsDemo.mockReturnValue(false)

        render(<MobileHub />)

        expect(mockAddEventListener).not.toHaveBeenCalled()
    })

    it("initializes experiments, datadog identity, and brand document meta", () => {
        const { useExperimentInit } = require("../../hooks/useExperimentInit")
        const { useDatadogIdentity } = require("../../hooks/useDatadogIdentity")
        const {
            useBrandDocumentMeta,
        } = require("../../hooks/useBrandDocumentMeta")

        mockIsDemo.mockReturnValue(false)

        render(<MobileHub />)

        expect(useExperimentInit).toHaveBeenCalled()
        expect(useDatadogIdentity).toHaveBeenCalled()
        expect(useBrandDocumentMeta).toHaveBeenCalled()
    })
})
