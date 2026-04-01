import { render } from "@testing-library/react"
import React from "react"

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
    useAccount: jest.fn(() => ({ account: undefined })),
    useTracking: jest.fn(() => ({
        getBaseUserProperties: jest.fn(() => ({})),
    })),
    useSessionId: jest.fn(() => undefined),
}))

jest.mock("@volley/platform-sdk/lib", () => ({
    getAppVersion: jest.fn(() => null),
}))

jest.mock("@datadog/browser-logs", () => ({
    datadogLogs: {
        setGlobalContextProperty: jest.fn(),
    },
}))

jest.mock("../../hooks/useHubTracking", () => ({
    useHubTracking: jest.fn(() => ({
        track: jest.fn(),
        updateBaseEventProperties: jest.fn(),
    })),
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

const mockSupportOverlay = jest.fn()
jest.mock("./shared/SupportOverlay/SupportOverlay", () => ({
    SupportOverlay: (props: Record<string, unknown>): React.ReactElement => {
        mockSupportOverlay(props)
        return <div>SupportOverlay</div>
    },
}))

describe("MobileHub ?force_support_modal param", () => {
    const originalLocation = window.location

    beforeEach(() => {
        jest.clearAllMocks()
    })

    afterEach(() => {
        Object.defineProperty(window, "location", {
            value: originalLocation,
            writable: true,
        })
    })

    const setUrl = (url: string): void => {
        Object.defineProperty(window, "location", {
            value: new URL(url),
            writable: true,
        })
    }

    it("opens support modal and sets closable=false when ?force_support_modal=true", () => {
        setUrl("https://hub.volley.tv/?force_support_modal=true")

        render(<MobileHub />)

        const lastCall =
            mockSupportOverlay.mock.calls[
                mockSupportOverlay.mock.calls.length - 1
            ][0]
        expect(lastCall).toEqual(
            expect.objectContaining({
                open: true,
                closable: false,
            })
        )
    })

    it("does not open support modal without ?force_support_modal param", () => {
        setUrl("https://hub.volley.tv/")

        render(<MobileHub />)

        expect(mockSupportOverlay).toHaveBeenCalledWith(
            expect.objectContaining({
                open: false,
                closable: true,
            })
        )
    })

    it("does not open support modal when ?force_support_modal is not 'true'", () => {
        setUrl("https://hub.volley.tv/?force_support_modal=false")

        render(<MobileHub />)

        expect(mockSupportOverlay).toHaveBeenCalledWith(
            expect.objectContaining({
                open: false,
            })
        )
    })
})
