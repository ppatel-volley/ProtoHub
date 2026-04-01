import { render } from "@testing-library/react"
import React from "react"

import { MobileHubEventName } from "../../constants/tracking"
import { useHubTracking } from "../../hooks/useHubTracking"
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

jest.mock("@volley/platform-sdk/react", () => ({
    useEventBroker: jest.fn(() => ({
        addEventListener: jest.fn(() => jest.fn()),
    })),
    usePlatformStatus: jest.fn(() => ({ isReady: true })),
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

jest.mock("../../hooks/useHubTracking")

jest.mock("../../hooks/useExperimentInit", () => ({
    useExperimentInit: jest.fn(() => ({ experimentsReady: true })),
}))

jest.mock("../../hooks/useDatadogIdentity", () => ({
    useDatadogIdentity: jest.fn(),
}))

jest.mock("../../hooks/useBrandDocumentMeta", () => ({
    useBrandDocumentMeta: jest.fn(),
}))

jest.mock("../../config/gameIframeControllerUrl", () => ({
    getGameIframeControllerUrl: jest.fn(),
    clearGameIframeControllerUrl: jest.fn(),
    setGameIframeControllerUrl: jest.fn(),
}))
jest.mock("../../config/platformDetection", () => ({
    isMobile: jest.fn(),
    isAppClip: jest.fn(() => false),
}))
jest.mock("../../config/isDemo", () => ({
    isDemo: jest.fn(() => false),
}))
jest.mock("../../utils/logger", () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}))
jest.mock("./DemoController/DemoController", () => ({
    __esModule: true,
    default: (): React.ReactElement => <div>DemoController</div>,
}))
jest.mock("./GameIframeController/GameIframeController", () => ({
    GameIframeController: (): React.ReactElement => (
        <div>GameIframeController</div>
    ),
}))
jest.mock("./RoomCodeEntry/RoomCodeEntry", () => ({
    RoomCodeEntry: (): React.ReactElement => <div>RoomCodeEntry</div>,
}))
jest.mock("./shared/SupportOverlay/SupportOverlay", () => ({
    SupportOverlay: (): React.ReactElement => <div>SupportOverlay</div>,
}))

const mockUseHubTracking = useHubTracking as jest.MockedFunction<
    typeof useHubTracking
>
const mockTrack = jest.fn()

describe("MobileHub QR Tracking", () => {
    const originalLocation = window.location

    beforeEach(() => {
        jest.clearAllMocks()
        sessionStorage.clear()

        mockUseHubTracking.mockReturnValue({
            track: mockTrack,
            updateBaseEventProperties: jest.fn(),
        })

        // Reset location mock
        delete (window as { location?: Location }).location
        window.location = { ...originalLocation, search: "" }
    })

    afterEach(() => {
        window.location = originalLocation
    })

    describe("QR Code Scan Detection", () => {
        it("should track QR scan when gameIframeControllerUrl is present on page load", () => {
            const { isMobile } = require("../../config/platformDetection")
            const {
                getGameIframeControllerUrl,
            } = require("../../config/gameIframeControllerUrl")
            const { isDemo } = require("../../config/isDemo")
            isMobile.mockReturnValue(true)
            isDemo.mockReturnValue(false)
            getGameIframeControllerUrl.mockReturnValue(
                "https://game.example.com/jeopardy/latestV2/controller.html"
            )

            window.location = {
                ...originalLocation,
                search: "?gameIframeControllerUrl=https://game.example.com/jeopardy/latestV2/controller.html",
            }

            render(<MobileHub />)

            expect(mockTrack).toHaveBeenCalledWith(
                MobileHubEventName.WEB_APP_SCREEN_DISPLAYED,
                expect.objectContaining({
                    appType: "mobile app",
                    eventCategory: "app loading",
                    eventSubCategory: "app loading",
                    gameId: "jeopardy",
                    screenDisplayedId: expect.any(String),
                    displayChoices: [],
                    entrySource: "QR",
                })
            )
        })

        it("should track as app_clip when in App Clip environment", () => {
            const {
                isMobile,
                isAppClip,
            } = require("../../config/platformDetection")
            const {
                getGameIframeControllerUrl,
            } = require("../../config/gameIframeControllerUrl")
            const { isDemo } = require("../../config/isDemo")
            isMobile.mockReturnValue(true)
            isAppClip.mockReturnValue(true)
            isDemo.mockReturnValue(false)
            getGameIframeControllerUrl.mockReturnValue(
                "https://game.example.com/cocomelon"
            )

            window.location = {
                ...originalLocation,
                search: "?gameIframeControllerUrl=https://game.example.com/cocomelon",
            }

            render(<MobileHub />)

            expect(mockTrack).toHaveBeenCalledWith(
                MobileHubEventName.WEB_APP_SCREEN_DISPLAYED,
                expect.objectContaining({
                    appType: "mobile app clip",
                    eventCategory: "app loading",
                    eventSubCategory: "app loading",
                    gameId: "cocomelon",
                    screenDisplayedId: expect.any(String),
                    displayChoices: [],
                    entrySource: "QR",
                })
            )
        })

        it("should normalize song-quiz-controller URL to song-quiz gameId", () => {
            const {
                isMobile,
                isAppClip,
            } = require("../../config/platformDetection")
            const {
                getGameIframeControllerUrl,
            } = require("../../config/gameIframeControllerUrl")
            const { isDemo } = require("../../config/isDemo")

            isMobile.mockReturnValue(true)
            isAppClip.mockReturnValue(false)
            isDemo.mockReturnValue(false)
            getGameIframeControllerUrl.mockReturnValue(
                "https://game-clients.volley.tv/song-quiz-controller/latest"
            )

            window.location = {
                ...originalLocation,
                search: "?gameIframeControllerUrl=https://game-clients.volley.tv/song-quiz-controller/latest",
            }

            render(<MobileHub />)

            expect(mockTrack).toHaveBeenCalledWith(
                MobileHubEventName.WEB_APP_SCREEN_DISPLAYED,
                expect.objectContaining({
                    appType: "mobile app",
                    eventCategory: "app loading",
                    eventSubCategory: "app loading",
                    gameId: "song-quiz",
                    screenDisplayedId: expect.any(String),
                    displayChoices: [],
                    entrySource: "QR",
                })
            )
        })

        it("should extract sessionId from gameIframeControllerUrl", () => {
            const {
                isMobile,
                isAppClip,
            } = require("../../config/platformDetection")
            const {
                getGameIframeControllerUrl,
            } = require("../../config/gameIframeControllerUrl")
            const { isDemo } = require("../../config/isDemo")

            isMobile.mockReturnValue(true)
            isAppClip.mockReturnValue(false)
            isDemo.mockReturnValue(false)
            getGameIframeControllerUrl.mockReturnValue(
                "https://game.example.com/jeopardy/latestV2/controller.html?sessionId=abc123&volley_hub_session_id=hub456"
            )

            window.location = {
                ...originalLocation,
                search: "?gameIframeControllerUrl=https://game.example.com/jeopardy/latestV2/controller.html?sessionId=abc123&volley_hub_session_id=hub456",
            }

            render(<MobileHub />)

            expect(mockTrack).toHaveBeenCalledWith(
                MobileHubEventName.WEB_APP_SCREEN_DISPLAYED,
                expect.objectContaining({
                    appType: "mobile app",
                    eventCategory: "app loading",
                    eventSubCategory: "app loading",
                    gameId: "jeopardy",
                    hubSessionId: "hub456",
                    gameSessionId: "abc123",
                    screenDisplayedId: expect.any(String),
                    displayChoices: [],
                    entrySource: "QR",
                })
            )
        })

        it("should NOT track when gameIframeControllerUrl is not present on page load", () => {
            const { isMobile } = require("../../config/platformDetection")
            const {
                getGameIframeControllerUrl,
            } = require("../../config/gameIframeControllerUrl")
            const { isDemo } = require("../../config/isDemo")
            isMobile.mockReturnValue(true)
            isDemo.mockReturnValue(false)
            getGameIframeControllerUrl.mockReturnValue(undefined)

            window.location = { ...originalLocation, search: "" }

            render(<MobileHub />)

            expect(mockTrack).not.toHaveBeenCalledWith(
                MobileHubEventName.WEB_APP_SCREEN_DISPLAYED,
                expect.objectContaining({
                    entrySource: "QR",
                })
            )
        })
    })

    describe("Manual Entry Detection (sessionStorage)", () => {
        it("should NOT track when hub_manual_entry flag is set in sessionStorage", () => {
            const { isMobile } = require("../../config/platformDetection")
            const {
                getGameIframeControllerUrl,
            } = require("../../config/gameIframeControllerUrl")
            const { isDemo } = require("../../config/isDemo")
            isMobile.mockReturnValue(true)
            isDemo.mockReturnValue(false)
            getGameIframeControllerUrl.mockReturnValue(
                "https://game.example.com/controller"
            )

            // Set manual entry flag
            sessionStorage.setItem("hub_manual_entry", "true")

            window.location = {
                ...originalLocation,
                search: "?gameIframeControllerUrl=https://game.example.com/controller",
            }

            render(<MobileHub />)

            expect(mockTrack).not.toHaveBeenCalledWith(
                MobileHubEventName.WEB_APP_SCREEN_DISPLAYED,
                expect.objectContaining({
                    entrySource: "QR",
                })
            )
        })

        it("should clear hub_manual_entry flag from sessionStorage after reading", () => {
            const { isMobile } = require("../../config/platformDetection")
            const {
                getGameIframeControllerUrl,
            } = require("../../config/gameIframeControllerUrl")
            const { isDemo } = require("../../config/isDemo")
            isMobile.mockReturnValue(true)
            isDemo.mockReturnValue(false)
            getGameIframeControllerUrl.mockReturnValue(
                "https://game.example.com/controller"
            )

            sessionStorage.setItem("hub_manual_entry", "true")

            window.location = {
                ...originalLocation,
                search: "?gameIframeControllerUrl=https://game.example.com/controller",
            }

            render(<MobileHub />)

            expect(sessionStorage.getItem("hub_manual_entry")).toBeNull()
        })
    })

    describe("Edge Cases", () => {
        it("should only track once per session", () => {
            const { isMobile } = require("../../config/platformDetection")
            const {
                getGameIframeControllerUrl,
            } = require("../../config/gameIframeControllerUrl")
            const { isDemo } = require("../../config/isDemo")
            isMobile.mockReturnValue(true)
            isDemo.mockReturnValue(false)
            getGameIframeControllerUrl.mockReturnValue(
                "https://game.example.com/controller"
            )

            window.location = {
                ...originalLocation,
                search: "?gameIframeControllerUrl=https://game.example.com/controller",
            }

            const { rerender } = render(<MobileHub />)

            expect(mockTrack).toHaveBeenCalledTimes(1)

            rerender(<MobileHub />)

            expect(mockTrack).toHaveBeenCalledTimes(1)
        })
    })
})
