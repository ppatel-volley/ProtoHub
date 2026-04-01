import type { datadogRum } from "@datadog/browser-rum"
import {
    act,
    fireEvent,
    render as rtlRender,
    screen,
} from "@testing-library/react"
import React, { type JSX, type ReactNode } from "react"

import { PaywallType } from "../../../constants/game"
import type { Game, GameId } from "../../../hooks/useGames"
import { useGames } from "../../../hooks/useGames"
import { useHubTracking } from "../../../hooks/useHubTracking"
import { useImagePreloading } from "../../../hooks/usePreloadImages"
import { ArrowPressProvider } from "../../FocusableUI/ArrowPressContext"
import { Main } from "./Main"

const mockGames: Game[] = [
    {
        id: "jeopardy" as Game["id"],
        trackingId: "jeopardy",
        title: "Jeopardy",
        tileImageUrl: "/jeopardy.avif",
        heroImageUrl: "/jeopardy-hero.avif",
        paywallType: PaywallType.Soft,
    },
    {
        id: "cocomelon" as Game["id"],
        trackingId: "cocomelon",
        title: "CoComelon",
        tileImageUrl: "/cocomelon.avif",
        heroImageUrl: "/cocomelon-hero.avif",
        paywallType: PaywallType.Soft,
    },
    {
        id: "wheel-of-fortune" as Game["id"],
        trackingId: "wheel of fortune",
        title: "Wheel of Fortune",
        tileImageUrl: "/wof.avif",
        heroImageUrl: "/wof-hero.avif",
        paywallType: PaywallType.Soft,
    },
]

const mockLaunchGame = jest.fn()
jest.mock("@volley/platform-sdk/react", () => ({
    useAppLifecycle: jest.fn(() => ({
        exitApp: jest.fn(),
    })),
    useGameOrchestration: jest.fn(() => ({
        launchGame: mockLaunchGame,
    })),
    useKeyDown: jest.fn(),
    useAccount: jest.fn(() => ({
        account: { isSubscribed: false },
    })),
    useDeviceInfo: jest.fn(() => ({
        getDeviceId: jest.fn(() => "test-device-id"),
        getModel: jest.fn(() => "test-model"),
    })),
    useSessionId: jest.fn(() => "test-session-id"),
}))

jest.mock("../../../utils/logger", () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}))

jest.mock("@noriginmedia/norigin-spatial-navigation", () => ({
    setFocus: jest.fn(),
}))

jest.mock("../../../config/envconfig", () => ({
    BASE_URL: "/mock-base-url/",
    getWindowVar: jest.fn().mockReturnValue("staging"),
    OVERRIDE_GAME_ORCHESTRATION: "false",
}))

jest.mock("../../../config/deeplink", () => ({
    getDeeplink: jest.fn(),
    clearDeeplink: jest.fn(),
}))

// Get references to the mocked functions
const mockDeeplinkModule = jest.requireMock("../../../config/deeplink")
const mockGetDeeplink = mockDeeplinkModule.getDeeplink as jest.Mock
const mockClearDeeplink = mockDeeplinkModule.clearDeeplink as jest.Mock

const mockGameLauncher = {
    launchGame: jest.fn(),
}
let capturedIsGamePaywallSatisfied:
    | ((game: Game) => Promise<boolean>)
    | undefined
const mockGameLauncherConstructor = jest.fn(
    (
        _gameOrchestration,
        _setLaunchedGameState,
        isGamePaywallSatisfied: (game: Game) => Promise<boolean>
    ) => {
        capturedIsGamePaywallSatisfied = isGamePaywallSatisfied
        return mockGameLauncher
    }
)
jest.mock("../../../hooks/useGameLauncher", () => ({
    GameLauncher: jest.fn(
        (
            gameOrchestration: unknown,
            setLaunchedGameState: unknown,
            isGamePaywallSatisfied: (game: Game) => Promise<boolean>
        ) =>
            mockGameLauncherConstructor(
                gameOrchestration,
                setLaunchedGameState,
                isGamePaywallSatisfied
            )
    ),
}))

jest.mock("../../../hooks/useGames", () => ({
    useGames: jest.fn(() => mockGames),
    GameId: {
        Jeopardy: "jeopardy",
        SongQuiz: "song-quiz",
        CoComelon: "cocomelon",
        WheelOfFortune: "wheel-of-fortune",
    },
    GAME_ID_TO_EVENT_SUB_CATEGORY: {
        jeopardy: "jeopardy",
        "song-quiz": "song quiz",
        cocomelon: "cocomelon",
    },
}))

jest.mock("../../../hooks/usePreloadImages", () => ({
    useImagePreloading: jest.fn(() => ({
        requiredImagesLoaded: true,
        optionalImagesLoaded: true,
    })),
}))

jest.mock("../../../hooks/useHubTracking", () => ({
    useHubTracking: jest.fn(() => ({
        track: jest.fn(),
    })),
}))

jest.mock("uuid", () => ({
    v4: jest.fn(),
}))

jest.mock("../../LaunchedGame/LaunchedGame", () => ({
    LaunchedGame: ({
        launchedGameState,
    }: {
        launchedGameState: LaunchedGameState | null
    }): React.ReactElement => (
        <div data-testid="mock-launched-game">
            Game: {launchedGameState !== null ? "Launched" : "Not Launched"}
        </div>
    ),
}))

jest.mock("../../../hooks/useLaunchedGameState", () => {
    const originalLaunchedGameState = jest.requireActual(
        "../../../hooks/useLaunchedGameState"
    )
    return {
        __esModule: true,
        ...originalLaunchedGameState,
        useLaunchedGameState: jest.fn(),
    }
})

jest.mock("../../GamesCarousel", () => ({
    __esModule: true,
    default: ({
        onGameFocus,
        isCarouselActive,
    }: {
        onGameFocus: (game: Game) => void
        isCarouselActive: boolean
    }): React.ReactElement => (
        <div data-testid="games-carousel" data-focusable={isCarouselActive}>
            <button
                data-testid="focus-first-game"
                onClick={() => onGameFocus(mockGames[0]!)}
            >
                Focus First Game
            </button>
            <button
                data-testid="focus-second-game"
                onClick={() => onGameFocus(mockGames[1]!)}
            >
                Focus Second Game
            </button>
        </div>
    ),
}))

jest.mock("../../ExitConfirmationModal", () => ({
    ExitConfirmationModal: ({
        isOpen,
        onConfirm,
        onCancel,
    }: {
        isOpen: boolean
        onConfirm: () => void
        onCancel: () => void
    }): React.ReactElement | null => {
        if (!isOpen) return null
        return (
            <div data-testid="exit-confirmation-modal">
                <button data-testid="confirm-exit" onClick={onConfirm}>
                    Exit
                </button>
                <button data-testid="cancel-exit" onClick={onCancel}>
                    Cancel
                </button>
            </div>
        )
    },
}))

jest.mock("../BrandLogo", () => ({
    BrandLogo: (): React.ReactElement => (
        <div data-testid="volley-logo">Volley Logo</div>
    ),
}))

jest.mock("./HeroAssetFader", () => ({
    HeroAssetFader: ({
        image,
        videoUrl,
    }: {
        image: string
        videoUrl: string
    }): React.ReactElement => (
        <div data-testid="hero-asset-fader">
            Hero Asset Fader - {image} - {videoUrl}
        </div>
    ),
}))

import { useAppLifecycle, useKeyDown } from "@volley/platform-sdk/react"

import type { Deeplink } from "../../../config/deeplink"
import {
    LaunchedGameState,
    useLaunchedGameState,
} from "../../../hooks/useLaunchedGameState"
import { logger } from "../../../utils/logger"

const mockUseAppLifecycle = useAppLifecycle as jest.Mock
const mockUseKeyDownHook = useKeyDown as jest.Mock
const mockLoggerObj = logger as jest.Mocked<typeof logger>
const mockUseGames = useGames as jest.Mock
const mockUseImagePreloading = useImagePreloading as jest.Mock
const mockUseHubTracking = useHubTracking as jest.Mock
const mockUuidV4 = require("uuid").v4 as jest.Mock

jest.mock("../../../hooks/useImmediateUpsell", () => ({
    useImmediateUpsell: jest.fn(() => ({
        isInImmediateUpsell: false,
    })),
}))

jest.mock("../../../hooks/useGameSelectionUpsell", () => ({
    useGameSelectionUpsell: jest.fn(() => ({
        isInGameSelectionUpsell: false,
        handleGamePaywall: jest.fn().mockResolvedValue(true),
    })),
}))

const useGameSelectionUpsellMock = jest.requireMock(
    "../../../hooks/useGameSelectionUpsell"
).useGameSelectionUpsell as jest.Mock

// Wrapper to provide ArrowPressContext
const render = (
    ui: React.ReactElement,
    options = {}
): ReturnType<typeof rtlRender> => {
    return rtlRender(ui, {
        wrapper: ({ children }: { children: ReactNode }): JSX.Element => (
            <ArrowPressProvider>{children}</ArrowPressProvider>
        ),
        ...options,
    })
}

describe("Main Component", () => {
    const mockSetAssetLoadingStates = jest.fn()
    let backButtonCallback: () => void
    let mockExitAppFn: jest.Mock
    let mockTrack: jest.Mock
    let mockLaunchedGameState: LaunchedGameState | null
    let mockSetLaunchedGameState: (
        launchedGameState: LaunchedGameState | null
    ) => void
    const mockUseLaunchedGameState = useLaunchedGameState as jest.Mock
    const mockVitalRef = {} as ReturnType<typeof datadogRum.startDurationVital>

    beforeEach(() => {
        jest.clearAllMocks()
        capturedIsGamePaywallSatisfied = undefined
        mockGameLauncherConstructor.mockClear()
        useGameSelectionUpsellMock.mockReturnValue({
            isInGameSelectionUpsell: false,
            handleGamePaywall: jest.fn().mockResolvedValue(true),
        })

        // Reset deeplink mocks
        mockGetDeeplink.mockReturnValue(null)
        mockClearDeeplink.mockClear()
        mockGameLauncher.launchGame.mockClear()

        mockLaunchedGameState = null
        mockSetLaunchedGameState = (
            launchedGameState: LaunchedGameState | null
        ): void => {
            mockLaunchedGameState = launchedGameState
            // Update the mock to return the new state on subsequent calls
            mockUseLaunchedGameState.mockReturnValue([
                mockLaunchedGameState,
                mockSetLaunchedGameState,
            ])
        }
        mockUseLaunchedGameState.mockReturnValue([
            mockLaunchedGameState,
            mockSetLaunchedGameState,
        ])

        global.requestAnimationFrame = jest.fn((cb) => {
            setTimeout(cb, 0)
            return 0
        })

        let uuidCounter = 0
        mockUuidV4.mockImplementation(() => `test-uuid-${++uuidCounter}`)

        mockExitAppFn = jest.fn()
        mockUseAppLifecycle.mockReturnValue({
            exitApp: mockExitAppFn,
        })

        mockTrack = jest.fn()
        mockUseHubTracking.mockReturnValue({ track: mockTrack })

        mockUseGames.mockReturnValue(mockGames)
        mockUseImagePreloading.mockReturnValue({
            requiredImagesLoaded: true,
            optionalImagesLoaded: true,
        })

        mockUseKeyDownHook.mockImplementation(
            (key: string, callback: () => void) => {
                if (key === "Back") {
                    backButtonCallback = callback
                }
            }
        )
    })

    describe("Basic Rendering", () => {
        it("should render nothing when no games are available", () => {
            mockUseGames.mockReturnValue([])
            const { container } = render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized={false}
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )
            expect(container).toBeEmptyDOMElement()
        })

        it("should render the main content when games are available", () => {
            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized={false}
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            expect(screen.getByTestId("hero-asset-fader")).toBeInTheDocument()
            expect(screen.getByTestId("volley-logo")).toBeInTheDocument()
            expect(screen.getByTestId("games-carousel")).toBeInTheDocument()
        })

        it("should call setRequiredImagesLoaded when images are loaded", () => {
            mockUseImagePreloading.mockReturnValue({
                requiredImagesLoaded: true,
                optionalImagesLoaded: true,
            })
            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized={false}
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )
            expect(mockSetAssetLoadingStates).toHaveBeenCalledWith(
                expect.objectContaining({
                    requiredImagesLoaded: true,
                    optionalImagesLoaded: true,
                })
            )
        })

        it("should show games carousel only when images are loaded", () => {
            mockUseImagePreloading.mockReturnValue({
                requiredImagesLoaded: false,
                optionalImagesLoaded: false,
            })
            const { rerender } = render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized={false}
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )
            expect(
                screen.queryByTestId("games-carousel")
            ).not.toBeInTheDocument()

            mockUseImagePreloading.mockReturnValue({
                requiredImagesLoaded: true,
                optionalImagesLoaded: true,
            })
            rerender(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized={false}
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )
            expect(screen.getByTestId("games-carousel")).toBeInTheDocument()
        })

        it("should render the volley logo when no game is launched", () => {
            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized={false}
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )
            expect(screen.getByTestId("volley-logo")).toBeInTheDocument()
        })

        it("should not render the volley logo when a game is launched", () => {
            const activeGameState = new LaunchedGameState(
                "https://test.com/game?sessionId=test-123",
                mockGames[0] as Game,
                mockVitalRef
            )
            mockLaunchedGameState = activeGameState
            mockUseLaunchedGameState.mockReturnValue([
                activeGameState,
                mockSetLaunchedGameState,
            ])
            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized={false}
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )
            expect(screen.queryByTestId("volley-logo")).not.toBeInTheDocument()
        })
    })

    describe("Game Focus Handling", () => {
        it("should update selected game when a game is focused", () => {
            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized={false}
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            const focusButton = screen.getByTestId("focus-first-game")
            act(() => {
                fireEvent.click(focusButton)
            })

            expect(screen.getByTestId("hero-asset-fader")).toHaveTextContent(
                "Hero Asset Fader - /jeopardy-hero.avif"
            )
        })
    })

    describe("Back Button and Exit Modal Integration", () => {
        it("should register back button handler with useKeyDown", () => {
            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            expect(mockUseKeyDownHook).toHaveBeenCalledWith(
                "Back",
                expect.any(Function)
            )
        })

        it("should show exit modal when back button is pressed", () => {
            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            act(() => {
                backButtonCallback()
            })

            expect(
                screen.getByTestId("exit-confirmation-modal")
            ).toBeInTheDocument()
        })

        it("should exit app when confirm button is clicked", () => {
            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            act(() => {
                backButtonCallback()
            })

            const confirmButton = screen.getByTestId("confirm-exit")
            act(() => {
                fireEvent.click(confirmButton)
            })

            expect(mockExitAppFn).toHaveBeenCalled()
            expect(
                screen.queryByTestId("exit-confirmation-modal")
            ).not.toBeInTheDocument()
        })
    })

    describe("Tracking", () => {
        it("should track hub screen displayed when loading is hidden", () => {
            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            expect(mockTrack).toHaveBeenCalledWith("Hub Screen Displayed", {
                screenDisplayedId: "test-uuid-1",
                displayChoices: ["jeopardy", "cocomelon", "wheel of fortune"],
                eventCategory: "menu",
                eventSubCategory: "game selection",
                text: "",
            })
        })

        it("should not track hub screen displayed when loading is not hidden", () => {
            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized={false}
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            expect(mockTrack).not.toHaveBeenCalled()
        })

        it("should track exit modal screen displayed when modal opens", () => {
            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            mockTrack.mockClear()

            act(() => {
                backButtonCallback()
            })

            expect(mockTrack).toHaveBeenCalledWith("Hub Screen Displayed", {
                screenDisplayedId: "test-uuid-2",
                displayChoices: ["yes", "no"],
                eventCategory: "menu",
                eventSubCategory: "exit modal selection",
                text: "",
            })
        })

        it("should track exit modal each time it opens", () => {
            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            mockTrack.mockClear()

            act(() => {
                backButtonCallback()
            })

            expect(mockTrack).toHaveBeenCalledWith("Hub Screen Displayed", {
                screenDisplayedId: "test-uuid-2",
                displayChoices: ["yes", "no"],
                eventCategory: "menu",
                eventSubCategory: "exit modal selection",
                text: "",
            })

            const cancelButton = screen.getByTestId("cancel-exit")
            act(() => {
                fireEvent.click(cancelButton)
            })

            mockTrack.mockClear()

            act(() => {
                backButtonCallback()
            })

            expect(mockTrack).toHaveBeenCalledWith("Hub Screen Displayed", {
                screenDisplayedId: "test-uuid-3",
                displayChoices: ["yes", "no"],
                eventCategory: "menu",
                eventSubCategory: "exit modal selection",
                text: "",
            })
        })

        it("should verify GameTile components maintain their screenDisplayedId after exit modal closes", () => {
            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            expect(mockTrack).toHaveBeenCalledWith("Hub Screen Displayed", {
                screenDisplayedId: "test-uuid-1",
                displayChoices: ["jeopardy", "cocomelon", "wheel of fortune"],
                eventCategory: "menu",
                eventSubCategory: "game selection",
                text: "",
            })

            mockTrack.mockClear()

            act(() => {
                backButtonCallback()
            })

            expect(mockTrack).toHaveBeenCalledWith("Hub Screen Displayed", {
                screenDisplayedId: "test-uuid-2",
                displayChoices: ["yes", "no"],
                eventCategory: "menu",
                eventSubCategory: "exit modal selection",
                text: "",
            })

            mockTrack.mockClear()

            const cancelButton = screen.getByTestId("cancel-exit")
            act(() => {
                fireEvent.click(cancelButton)
            })

            expect(mockTrack).toHaveBeenCalledWith("Hub Button Pressed", {
                eventCategory: "menu",
                eventSubCategory: "exit modal selection",
                screenDisplayedId: "test-uuid-2",
                displayChoices: ["yes", "no"],
                choiceValue: "no",
                text: "",
            })
        })

        it("should track Hub Button Hovered when games are selected", async () => {
            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            const focusButton = screen.getByTestId("focus-first-game")
            act(() => {
                fireEvent.click(focusButton)
            })
            await act(async () => {
                await Promise.resolve()
            })
            expect(mockTrack).toHaveBeenCalledWith("Hub Button Hovered", {
                eventCategory: "menu",
                eventSubCategory: "jeopardy",
                heroId: "/jeopardy-hero.avif",
                tileId: "/jeopardy.avif",
                screenDisplayedId: "test-uuid-1",
            })
        })
        it("should track hub button hovered everytime a game is focused", async () => {
            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            const focusFirstButton = screen.getByTestId("focus-first-game")
            act(() => {
                fireEvent.click(focusFirstButton)
            })

            await act(async () => {
                await Promise.resolve()
            })

            expect(mockTrack).toHaveBeenCalledWith("Hub Button Hovered", {
                eventCategory: "menu",
                eventSubCategory: "jeopardy",
                heroId: "/jeopardy-hero.avif",
                tileId: "/jeopardy.avif",
                screenDisplayedId: "test-uuid-1",
            })

            mockTrack.mockClear()

            const focusSecondButton = screen.getByTestId("focus-second-game")
            act(() => {
                fireEvent.click(focusSecondButton)
            })

            act(() => {
                fireEvent.click(focusFirstButton)
            })

            await act(async () => {
                await Promise.resolve()
            })

            expect(mockTrack).toHaveBeenCalledWith("Hub Button Hovered", {
                eventCategory: "menu",
                eventSubCategory: "jeopardy",
                heroId: "/jeopardy-hero.avif",
                tileId: "/jeopardy.avif",
                screenDisplayedId: "test-uuid-1",
            })
        })

        it("should not track Hub Button Hovered when app is still rendering", () => {
            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized={false} // Still rendering - no screenDisplayedId yet
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            const focusButton = screen.queryByTestId("focus-first-game")
            if (focusButton) {
                act(() => {
                    fireEvent.click(focusButton)
                })
            }

            // Should NOT track Hub Button Hovered when app is still rendering
            expect(mockTrack).not.toHaveBeenCalledWith(
                "Hub Button Hovered",
                expect.any(Object)
            )
        })
    })

    describe("Carousel Activation", () => {
        it("should not show carousel when loading is not hidden", () => {
            mockUseImagePreloading.mockReturnValueOnce({
                requiredImagesLoaded: false,
                optionalImagesLoaded: false,
            })
            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized={false}
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            expect(
                screen.queryByTestId("games-carousel")
            ).not.toBeInTheDocument()
        })

        it("should hide main content when in immediate upsell", () => {
            mockUseImagePreloading.mockReturnValueOnce({
                requiredImagesLoaded: true,
                optionalImagesLoaded: true,
            })

            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized
                    isJeopardyReload={false}
                    isInImmediateUpsell
                />
            )

            expect(
                screen.queryByTestId("games-carousel")
            ).not.toBeInTheDocument()
            expect(
                screen.queryByTestId("hero-asset-fader")
            ).not.toBeInTheDocument()
            expect(screen.queryByTestId("volley-logo")).not.toBeInTheDocument()
        })

        it("should show but deactivate carousel when in game selection upsell", () => {
            const mockUseImmediateUpsell = jest.requireMock(
                "../../../hooks/useImmediateUpsell"
            ).useImmediateUpsell
            const mockUseGameSelectionUpsell = jest.requireMock(
                "../../../hooks/useGameSelectionUpsell"
            ).useGameSelectionUpsell

            mockUseImmediateUpsell.mockReset()
            mockUseGameSelectionUpsell.mockReset()

            mockUseImmediateUpsell.mockReturnValue({
                isInImmediateUpsell: false,
            })
            mockUseGameSelectionUpsell.mockReturnValue({
                isInGameSelectionUpsell: true,
                handleGamePaywall: jest.fn(),
            })
            mockUseImagePreloading.mockReturnValueOnce({
                requiredImagesLoaded: true,
                optionalImagesLoaded: true,
            })

            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            const carousel = screen.getByTestId("games-carousel")
            expect(carousel).toBeInTheDocument()
            expect(carousel).toHaveAttribute("data-focusable", "false")
        })

        it("should show carousel when loading is hidden and not in any upsell", () => {
            const mockUseImmediateUpsell = jest.requireMock(
                "../../../hooks/useImmediateUpsell"
            ).useImmediateUpsell
            const mockUseGameSelectionUpsell = jest.requireMock(
                "../../../hooks/useGameSelectionUpsell"
            ).useGameSelectionUpsell

            mockUseImmediateUpsell.mockReturnValueOnce({
                isInImmediateUpsell: false,
            })
            mockUseGameSelectionUpsell.mockReturnValueOnce({
                isInGameSelectionUpsell: false,
                handleGamePaywall: jest.fn(),
            })
            mockUseImagePreloading.mockReturnValueOnce({
                requiredImagesLoaded: true,
                optionalImagesLoaded: true,
            })

            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            expect(screen.getByTestId("games-carousel")).toBeInTheDocument()
        })
    })

    describe("Paywall Updates", () => {
        it("should use latest paywall handler after subscription succeeds", async () => {
            const initialHandleGamePaywall = jest.fn().mockResolvedValue(false)
            const updatedHandleGamePaywall = jest.fn().mockResolvedValue(true)
            let currentHandleGamePaywall = initialHandleGamePaywall

            useGameSelectionUpsellMock.mockImplementation(() => ({
                isInGameSelectionUpsell: false,
                handleGamePaywall: currentHandleGamePaywall,
            }))

            const { rerender } = render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            expect(capturedIsGamePaywallSatisfied).toBeDefined()

            await expect(
                capturedIsGamePaywallSatisfied!(mockGames[0]!)
            ).resolves.toBe(false)
            expect(initialHandleGamePaywall).toHaveBeenCalledTimes(1)
            expect(updatedHandleGamePaywall).not.toHaveBeenCalled()

            currentHandleGamePaywall = updatedHandleGamePaywall

            await act(async () => {
                rerender(
                    <Main
                        setAssetLoadingStates={mockSetAssetLoadingStates}
                        isInitialized
                        isJeopardyReload={false}
                        isInImmediateUpsell={false}
                    />
                )
                await Promise.resolve()
            })

            await expect(
                capturedIsGamePaywallSatisfied!(mockGames[0]!)
            ).resolves.toBe(true)
            expect(updatedHandleGamePaywall).toHaveBeenCalledTimes(1)
        })
    })

    describe("Deeplink Handling", () => {
        it("should do nothing when no deeplink is present", () => {
            mockGetDeeplink.mockReturnValue(null)

            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            expect(mockGetDeeplink).toHaveBeenCalled()
            expect(mockClearDeeplink).not.toHaveBeenCalled()
            expect(mockGameLauncher.launchGame).not.toHaveBeenCalled()
            expect(mockLoggerObj["info"]).not.toHaveBeenCalledWith(
                expect.stringContaining("Main - deeplink")
            )
        })

        it("should log error when deeplink game is not found", () => {
            mockGetDeeplink.mockReturnValue({
                gameId: "unknown-game",
                campaignId: "",
            })

            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            expect(mockGetDeeplink).toHaveBeenCalled()
            expect(mockLoggerObj["error"]).toHaveBeenCalledWith(
                "Game not found for deeplink with gameId: unknown-game and campaignId: "
            )
            expect(mockClearDeeplink).toHaveBeenCalled()
            expect(mockGameLauncher.launchGame).not.toHaveBeenCalled()
        })
        it("should no-op when valid deeplink is present but not initialized", () => {
            mockGetDeeplink.mockReturnValue({
                gameId: "jeopardy" as GameId,
                campaignId: "",
            } as Deeplink)

            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized={false}
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            expect(mockGetDeeplink).toHaveBeenCalled()
            expect(mockClearDeeplink).not.toHaveBeenCalled()
            expect(mockGameLauncher.launchGame).not.toHaveBeenCalled()
        })

        it("should launch game when valid deeplink is present", () => {
            mockGetDeeplink.mockReturnValue({
                gameId: "jeopardy" as GameId,
                campaignId: "",
            } as Deeplink)

            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            expect(mockGetDeeplink).toHaveBeenCalled()
            expect(mockLoggerObj["info"]).toHaveBeenCalledWith(
                'Main - deeplink: {"gameId":"jeopardy","campaignId":""}'
            )
            expect(mockClearDeeplink).toHaveBeenCalled()
            expect(mockGameLauncher.launchGame).toHaveBeenCalledWith(
                mockGames[0]
            )
        })

        it("should not render hero asset fader when deeplink is present", () => {
            mockGetDeeplink.mockReturnValue({
                gameId: "jeopardy" as GameId,
                campaignId: "",
            } as Deeplink)

            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            expect(
                screen.queryByTestId("hero-asset-fader")
            ).not.toBeInTheDocument()
        })

        it("should not render hero asset fader when launched game is active", () => {
            mockGetDeeplink.mockReturnValue({
                gameId: "jeopardy" as GameId,
                campaignId: "",
            } as Deeplink)
            mockLaunchedGameState = new LaunchedGameState(
                "https://test.com/game?sessionId=test-123",
                mockGames[0] as Game,
                mockVitalRef
            )
            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )
            expect(
                screen.queryByTestId("hero-asset-fader")
            ).not.toBeInTheDocument()
        })

        it("should launch second game when its deeplink is present", () => {
            mockGetDeeplink.mockReturnValue({
                gameId: "cocomelon",
                campaignId: "",
            })

            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            expect(mockGetDeeplink).toHaveBeenCalled()
            expect(mockLoggerObj["info"]).toHaveBeenCalledWith(
                'Main - deeplink: {"gameId":"cocomelon","campaignId":""}'
            )
            expect(mockClearDeeplink).toHaveBeenCalled()
            expect(mockGameLauncher.launchGame).toHaveBeenCalledWith(
                mockGames[1]
            )
        })

        it("should not render fader or games carousel when deeplink is present", () => {
            mockGetDeeplink.mockReturnValue({
                gameId: "jeopardy" as GameId,
                campaignId: "",
            } as Deeplink)

            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            expect(
                screen.queryByTestId("games-carousel")
            ).not.toBeInTheDocument()
            expect(
                screen.queryByTestId("hero-asset-fader")
            ).not.toBeInTheDocument()
        })

        it("should handle deeplink effect when games array changes", () => {
            mockGetDeeplink.mockReturnValue({
                gameId: "jeopardy",
                campaignId: "",
            })

            const { rerender } = render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            expect(mockGameLauncher.launchGame).toHaveBeenCalledWith(
                mockGames[0]
            )

            // Clear mocks and change games
            mockGameLauncher.launchGame.mockClear()
            mockGetDeeplink.mockClear()
            mockClearDeeplink.mockClear()

            // Simulate games array change by updating the mock
            const newGames = [
                ...mockGames,
                {
                    id: "new-game",
                    trackingId: "new-game",
                    title: "New Game",
                    tileImageUrl: "/new-game.avif",
                    heroImageUrl: "/new-game-hero.avif",
                    paywallType: PaywallType.Soft,
                },
            ]
            mockUseGames.mockReturnValue(newGames)

            rerender(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            // Should call deeplink functions again due to games dependency
            expect(mockGetDeeplink).toHaveBeenCalled()
        })

        it("should handle undefined deeplink", () => {
            mockGetDeeplink.mockReturnValue(undefined)

            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            expect(mockGetDeeplink).toHaveBeenCalled()
            expect(mockClearDeeplink).not.toHaveBeenCalled()
            expect(mockGameLauncher.launchGame).not.toHaveBeenCalled()
        })

        it("should defer deeplink processing when immediate upsell is active", () => {
            mockGetDeeplink.mockReturnValue({
                gameId: "jeopardy" as GameId,
                campaignId: "",
            } as Deeplink)

            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized
                    isJeopardyReload={false}
                    isInImmediateUpsell
                />
            )

            expect(mockGetDeeplink).toHaveBeenCalled()
            expect(mockClearDeeplink).not.toHaveBeenCalled()
            expect(mockGameLauncher.launchGame).not.toHaveBeenCalled()
        })

        it("should pass deeplink to useGameSelectionUpsell when deeplink is present", () => {
            const mockUseGameSelectionUpsell = jest.requireMock(
                "../../../hooks/useGameSelectionUpsell"
            ).useGameSelectionUpsell

            mockUseGameSelectionUpsell.mockReturnValue({
                isInGameSelectionUpsell: false,
                handleGamePaywall: jest.fn().mockResolvedValue(true),
            })

            const testDeeplink = {
                gameId: "cocomelon" as GameId,
                campaignId: "test-campaign-2",
            } as Deeplink

            mockGetDeeplink.mockReturnValue(testDeeplink)

            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            expect(mockUseGameSelectionUpsell).toHaveBeenCalledWith(
                testDeeplink
            )
        })

        it("should pass undefined to useGameSelectionUpsell when no deeplink is present", () => {
            const mockUseGameSelectionUpsell = jest.requireMock(
                "../../../hooks/useGameSelectionUpsell"
            ).useGameSelectionUpsell

            mockUseGameSelectionUpsell.mockReturnValue({
                isInGameSelectionUpsell: false,
                handleGamePaywall: jest.fn().mockResolvedValue(true),
            })

            mockGetDeeplink.mockReturnValue(undefined)

            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized={false}
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            expect(mockUseGameSelectionUpsell).toHaveBeenCalledWith(undefined)
        })
    })

    describe("Game Orchestration Override", () => {
        it("should use platform game orchestration when override is disabled", () => {
            render(
                <Main
                    setAssetLoadingStates={mockSetAssetLoadingStates}
                    isInitialized
                    isJeopardyReload={false}
                    isInImmediateUpsell={false}
                />
            )

            expect(mockGameLauncherConstructor).toHaveBeenCalled()
            const gameOrchestration =
                mockGameLauncherConstructor.mock.calls[0]?.[0]
            expect(gameOrchestration.launchGame).toBe(mockLaunchGame)
        })
    })
})
