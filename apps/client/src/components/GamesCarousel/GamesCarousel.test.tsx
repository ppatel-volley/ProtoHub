import type { datadogRum } from "@datadog/browser-rum"
import { act, render as rtlRender, screen } from "@testing-library/react"
import React, { type JSX, type ReactNode } from "react"

import { GameStatus } from "../../constants/game"
import { useFocusTracking } from "../../hooks/useFocusTracking"
import type { GameLauncher } from "../../hooks/useGameLauncher"
import { type Game, useGames } from "../../hooks/useGames"
import { useHubTracking } from "../../hooks/useHubTracking"
import { LaunchedGameState } from "../../hooks/useLaunchedGameState"
import { ArrowPressProvider } from "../FocusableUI/ArrowPressContext"
import { GamesCarousel } from "./GamesCarousel"

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

jest.mock("@rive-app/react-canvas", () => ({
    useRive: (): {
        RiveComponent: React.FC<{ style: React.CSSProperties }>
        rive: { play: jest.Mock }
    } => ({
        RiveComponent: ({
            style,
        }: {
            style: React.CSSProperties
        }): React.ReactElement => (
            <div data-testid="mock-rive-component" style={style} />
        ),
        rive: {
            play: jest.fn(),
        },
    }),
    useStateMachineInput: (): { value: boolean } => ({
        value: false,
    }),
}))

jest.mock("../../config/gameIframeControllerUrl", () => ({
    getGameIframeControllerUrl: jest.fn(() => null),
    clearGameIframeControllerUrl: jest.fn(),
}))

jest.mock("../../config/envconfig", () => ({
    BASE_URL: "/mock-base-url/",
}))

jest.mock("../../hooks/useAsset", () => ({
    useAsset: (key: string): string =>
        key === "focusFrame" ? "assets/images/ui/volley-focus-frame.avif" : "",
}))

jest.mock("../LaunchedGame/LaunchedGame", () => ({
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

jest.mock("../FocusableUI/FocusableContainer", () => ({
    FocusableContainer: React.forwardRef<
        HTMLDivElement,
        {
            children: React.ReactNode
            className?: string
            style?: React.CSSProperties
            defaultFocusKey?: string
            focusable?: boolean
            autoFocus?: boolean
        }
    >(
        (
            {
                children,
                className,
                style,
                defaultFocusKey,
                focusable,
                autoFocus,
            },
            ref
        ) => (
            <div
                ref={ref}
                data-testid="focusable-container"
                className={className}
                style={style}
                data-default-focus-key={defaultFocusKey}
                data-focusable={focusable?.toString()}
                data-autofocus={autoFocus?.toString()}
            >
                {children}
            </div>
        )
    ),
}))

jest.mock("../FocusableUI/FocusIndicator", () => ({
    FocusIndicator: jest.fn(() => null),
}))

jest.mock("../GameTile", () => ({
    __esModule: true,
    default: jest.fn(
        ({ game, onSelect }: { game: Game; onSelect?: () => void }) => {
            const handleClick = (): void => {
                if (onSelect) {
                    onSelect()
                }
            }

            return (
                <div
                    data-testid="mock-game-tile"
                    data-status={game.status}
                    onClick={handleClick}
                >
                    Mock Game Tile
                </div>
            )
        }
    ),
}))

jest.mock("../../hooks/useGames", () => ({
    useGames: jest.fn().mockReturnValue([
        {
            id: "jeopardy",
            title: "Jeopardy",
            tileImageUrl: "/jeopardy.avif",
            heroImageUrl: "/jeopardy-hero.avif",
            source: "placeholder" as const,
        },
        {
            id: "cocomelon",
            title: "CoComelon",
            tileImageUrl: "/cocomelon.avif",
            heroImageUrl: "/cocomelon-hero.avif",
            status: GameStatus.ComingSoon,
            source: "placeholder" as const,
        },
        {
            id: "wheel-of-fortune",
            title: "Wheel of Fortune",
            tileImageUrl: "wof.avif",
            heroImageUrl: "wof-hero.avif",
            status: GameStatus.ComingSoon,
            source: "placeholder" as const,
        },
    ]),
}))

jest.mock("../../hooks/useFocusTracking", () => ({
    useFocusTracking: jest.fn().mockReturnValue({
        focusTarget: null,
        initialized: true,
        initializeWithElement: jest.fn(),
        updateFocusTarget: jest.fn(),
    }),
}))

jest.mock("../../hooks/useHubTracking", () => ({
    useHubTracking: jest.fn(() => ({
        track: jest.fn(),
    })),
}))

const mockAddEventListener = jest.fn()
const mockUnsubscribe = jest.fn()
let savedCallback: (() => void) | undefined = undefined

jest.mock("@volley/platform-sdk/react", () => ({
    useEventBroker: jest.fn(() => ({
        addEventListener: mockAddEventListener,
    })),
}))

jest.mock("../../utils/logger", () => ({
    logger: {
        warn: (): void => {},
        info: (): void => {},
        error: (): void => {},
    },
}))

const MockGamesCarousel: React.FC = () => {
    React.useEffect(() => {
        console.log(
            "GamesCarousel - listening for ready event: " +
                new Date().toISOString()
        )

        const unsubscribe = mockAddEventListener(
            "ready",
            function readyEventHandler(): void {
                const timestamp = new Date().toISOString()
                console.log(
                    `GamesCarousel - ready event received: ${timestamp}`
                )
            }
        )

        return (): void => {
            console.log("GamesCarousel - ready event listener removed")

            unsubscribe()
        }
    }, [])

    return <div data-testid="mock-games-carousel">Mock Games Carousel</div>
}

describe("GamesCarousel ready event listener", () => {
    beforeEach(() => {
        jest.clearAllMocks()
        savedCallback = undefined

        mockAddEventListener.mockImplementation(
            (eventName: string, callback: () => void) => {
                if (eventName === "ready") {
                    savedCallback = callback
                }
                return mockUnsubscribe
            }
        )

        jest.spyOn(console, "log").mockImplementation(() => {})
    })

    it("registers an event listener for 'ready' event on mount", () => {
        render(<MockGamesCarousel />)

        expect(mockAddEventListener).toHaveBeenCalledWith(
            "ready",
            expect.any(Function)
        )
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("listening for ready event")
        )
    })

    it("logs when 'ready' event is received", () => {
        render(<MockGamesCarousel />)

        expect(mockAddEventListener).toHaveBeenCalled()
        expect(savedCallback).toBeDefined()

        act(() => {
            savedCallback!()
        })

        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("ready event received")
        )
    })

    it("unsubscribes from the event listener on unmount", () => {
        const { unmount } = render(<MockGamesCarousel />)

        unmount()

        expect(mockUnsubscribe).toHaveBeenCalled()
        expect(console.log).toHaveBeenCalledWith(
            "GamesCarousel - ready event listener removed"
        )
    })
})

describe("GamesCarousel Component", () => {
    const mockTrack = jest.fn()
    const mockUseGames = useGames as jest.Mock
    const MockGameTile = jest.requireMock("../GameTile").default as jest.Mock

    const mockGameLauncher = {
        launchGame: jest.fn() as jest.MockedFunction<
            GameLauncher["launchGame"]
        >,
    } as jest.Mocked<GameLauncher>

    beforeEach(() => {
        jest.clearAllMocks()
        ;(useHubTracking as jest.Mock).mockReturnValue({ track: mockTrack })
    })

    it("should pass status prop to GameTile when game has status", () => {
        render(
            <GamesCarousel
                launchedGameState={null}
                isCarouselActive
                gameLauncher={mockGameLauncher}
            />
        )

        const gameTiles = screen.getAllByTestId("mock-game-tile")
        expect(gameTiles).toHaveLength(3)

        expect(gameTiles[0]).not.toHaveAttribute("data-status")

        expect(gameTiles[1]).toHaveAttribute("data-status", "coming-soon")
        expect(gameTiles[2]).toHaveAttribute("data-status", "coming-soon")
    })
    it("should pass correct props to FocusableContainer", () => {
        render(
            <GamesCarousel
                launchedGameState={null}
                isCarouselActive
                gameLauncher={mockGameLauncher}
            />
        )

        const focusableContainer = screen.getByTestId("focusable-container")
        expect(focusableContainer).toHaveAttribute("data-autofocus", "false")
        expect(focusableContainer).toHaveAttribute("data-focusable", "true")
        expect(focusableContainer).toHaveAttribute(
            "data-default-focus-key",
            "game-tile-0"
        )
    })

    describe("initialization behavior", () => {
        const mockInitializeWithElement = jest.fn()
        const mockOnGameFocus = jest.fn()

        beforeEach(() => {
            jest.clearAllMocks()
            const mockUseFocusTracking = useFocusTracking as jest.Mock
            mockUseFocusTracking.mockReturnValue({
                focusTarget: {
                    element: null,
                    opacity: 0,
                },
                initialized: true,
                initializeWithElement: mockInitializeWithElement,
                updateFocusTarget: jest.fn(),
            })
        })

        it("should initialize focus indicator when first tile receives focus", () => {
            const { container } = render(
                <GamesCarousel
                    onGameFocus={mockOnGameFocus}
                    launchedGameState={null}
                    isCarouselActive
                    gameLauncher={mockGameLauncher}
                />
            )

            // Initially, initializeWithElement should not have been called on mount
            expect(mockInitializeWithElement).not.toHaveBeenCalled()

            // Get the first GameTile mock and simulate focus
            const gameTileProps = MockGameTile.mock.calls[0][0]
            const mockElement = container.querySelector(
                '[data-testid="mock-game-tile"]'
            ) as HTMLElement

            // Simulate focus event
            act(() => {
                gameTileProps.onFocus(mockElement)
            })

            // Now initializeWithElement should have been called
            expect(mockInitializeWithElement).toHaveBeenCalledTimes(1)
            expect(mockInitializeWithElement).toHaveBeenCalledWith(mockElement)
            expect(mockOnGameFocus).toHaveBeenCalledWith(gameTileProps.game)
        })

        it("should not initialize focus indicator on mount", () => {
            render(
                <GamesCarousel
                    onGameFocus={mockOnGameFocus}
                    launchedGameState={null}
                    isCarouselActive
                    gameLauncher={mockGameLauncher}
                />
            )

            // Initialization should not happen on mount
            expect(mockInitializeWithElement).not.toHaveBeenCalled()
        })

        it("should not initialize if games array is empty", () => {
            const mockUseGames = useGames as jest.Mock
            mockUseGames.mockReturnValueOnce([])
            const mockSetIsReady = jest.fn()
            jest.spyOn(React, "useState").mockReturnValue([
                false,
                mockSetIsReady,
            ])

            render(
                <GamesCarousel
                    onGameFocus={mockOnGameFocus}
                    launchedGameState={null}
                    isCarouselActive
                    gameLauncher={mockGameLauncher}
                />
            )

            expect(mockInitializeWithElement).not.toHaveBeenCalled()
            expect(mockOnGameFocus).not.toHaveBeenCalled()
        })
    })

    describe("GamesCarousel game selection", () => {
        const mockUseFocusTracking = jest.requireMock(
            "../../hooks/useFocusTracking"
        ).useFocusTracking as jest.Mock
        const MockGameIframeController = jest.requireMock(
            "../GameIframeController/GameIframeController"
        ).GameIframeController as jest.Mock
        const mockGame: Game = {
            id: "song-quiz",
            title: "Song Quiz",
            tileImageUrl: "test.avif",
            heroImageUrl: "test-hero.avif",
            source: "placeholder" as const,
        }
        const mockComingSoonGame: Game = {
            id: "wheel-of-fortune",
            title: "Wheel of Fortune",
            tileImageUrl: "/wof.avif",
            heroImageUrl: "/wof-hero.avif",
            source: "placeholder" as const,
            status: GameStatus.ComingSoon,
        }
        const mockBetaGame: Game = {
            id: "song-quiz",
            title: "Song Quiz",
            tileImageUrl: "test.avif",
            heroImageUrl: "test-hero.avif",
            source: "placeholder" as const,
            status: GameStatus.Beta,
        }

        beforeEach(() => {
            jest.clearAllMocks()
            jest.spyOn(console, "log").mockImplementation(() => {})
            jest.spyOn(console, "error").mockImplementation(() => {})

            mockUseFocusTracking.mockReturnValue({
                focusTarget: null,
                initialized: false,
                initializeWithElement: jest.fn(),
                updateFocusTarget: jest.fn(),
            })
        })

        it("handles game selection with partyId in response", async () => {
            mockUseGames.mockReturnValue([mockGame])

            render(
                <GamesCarousel
                    launchedGameState={null}
                    isCarouselActive
                    gameLauncher={mockGameLauncher}
                />
            )

            const gameTileProps = MockGameTile.mock.calls[0][0]

            MockGameIframeController.mockClear()

            act(() => {
                gameTileProps.onSelect()
            })

            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 100))
            })

            expect(mockGameLauncher["launchGame"]).toHaveBeenCalledWith(
                mockGame
            )
        })

        it("handles errors from GameIframeController", async () => {
            mockUseGames.mockReturnValue([mockGame])

            const consoleErrorSpy = jest
                .spyOn(console, "error")
                .mockImplementation(() => {})

            render(
                <GamesCarousel
                    launchedGameState={null}
                    isCarouselActive
                    gameLauncher={mockGameLauncher}
                />
            )

            // Get the onSelect prop from the GameTile mock
            const gameTileProps = MockGameTile.mock.calls[0][0]

            // Call onSelect directly
            await act(async () => {
                try {
                    await gameTileProps.onSelect()
                } catch (_error) {
                    // Error is expected and should be handled by the component
                }
            })

            // Verify launchGame was called
            expect(mockGameLauncher["launchGame"]).toHaveBeenCalledWith(
                mockGame
            )

            consoleErrorSpy.mockRestore()
        })

        it("calls onSelect when game tile is clicked", async () => {
            mockUseGames.mockReturnValue([mockGame])

            render(
                <GamesCarousel
                    launchedGameState={null}
                    isCarouselActive
                    gameLauncher={mockGameLauncher}
                />
            )

            // Get the onSelect prop from the GameTile mock
            const gameTileProps = MockGameTile.mock.calls[0][0]
            expect(gameTileProps.onSelect).toBeDefined()

            // Call onSelect directly
            await act(async () => {
                await gameTileProps.onSelect()
            })

            // Check that launchGame was called
            expect(mockGameLauncher["launchGame"]).toHaveBeenCalledWith(
                mockGame
            )
        })

        it("renders nothing when launchedGameState has an active game", () => {
            try {
                const mockVitalRef = {} as ReturnType<
                    typeof datadogRum.startDurationVital
                >
                render(
                    <GamesCarousel
                        launchedGameState={
                            new LaunchedGameState(
                                "https://test.com/game?sessionId=test-123",
                                mockGame,
                                mockVitalRef
                            )
                        }
                        isCarouselActive
                        gameLauncher={mockGameLauncher}
                    />
                )
                fail(
                    "GamesCarousel should throw an error when launchedGameState is active"
                )
            } catch (error) {
                expect(error).toBeInstanceOf(Error)
                expect((error as Error).message).toBe(
                    "GamesCarousel should not be rendered when launchedGameState is launched"
                )
            }
        })

        describe("Tracking", () => {
            it("should track coming-soon games", async () => {
                mockUseGames.mockReturnValue([mockComingSoonGame])

                render(
                    <GamesCarousel
                        launchedGameState={null}
                        screenDisplayedId="test-screen-id-123"
                        isCarouselActive
                        gameLauncher={mockGameLauncher}
                    />
                )

                const gameTileProps = MockGameTile.mock.calls[0][0]
                await act(async () => {
                    await gameTileProps.onSelect()
                })

                expect(mockTrack).toHaveBeenCalledWith("Hub Button Pressed", {
                    eventCategory: "menu",
                    eventSubCategory: "game selection",
                    screenDisplayedId: "test-screen-id-123",
                    choiceValue: "hub",
                    displayChoices: ["hub"],
                    text: "",
                })
                expect(mockGameLauncher["launchGame"]).toHaveBeenCalledWith(
                    mockComingSoonGame
                )
            })

            it("should track game selection when clicking a game tile with screenDisplayedId", async () => {
                mockUseGames.mockReturnValue([mockGame])

                render(
                    <GamesCarousel
                        launchedGameState={null}
                        screenDisplayedId="test-screen-id-123"
                        isCarouselActive
                        gameLauncher={mockGameLauncher}
                    />
                )

                const gameTileProps = MockGameTile.mock.calls[0][0]
                await act(async () => {
                    await gameTileProps.onSelect()
                })

                expect(mockTrack).toHaveBeenCalledWith("Hub Button Pressed", {
                    eventCategory: "menu",
                    eventSubCategory: "game selection",
                    screenDisplayedId: "test-screen-id-123",
                    choiceValue: "song quiz",
                    displayChoices: ["song quiz"],
                    text: "",
                })
                expect(mockGameLauncher["launchGame"]).toHaveBeenCalledWith(
                    mockGame
                )
            })

            it("should not track when screenDisplayedId is null", async () => {
                mockUseGames.mockReturnValue([mockGame])

                render(
                    <GamesCarousel
                        launchedGameState={null}
                        screenDisplayedId={null}
                        isCarouselActive
                        gameLauncher={mockGameLauncher}
                    />
                )

                const gameTileProps = MockGameTile.mock.calls[0][0]
                await act(async () => {
                    await gameTileProps.onSelect()
                })

                expect(mockTrack).not.toHaveBeenCalled()
                expect(mockGameLauncher["launchGame"]).toHaveBeenCalledWith(
                    mockGame
                )
            })

            it("should not track when screenDisplayedId is undefined", async () => {
                mockUseGames.mockReturnValue([mockGame])

                render(
                    <GamesCarousel
                        launchedGameState={null}
                        isCarouselActive
                        gameLauncher={mockGameLauncher}
                    />
                )

                const gameTileProps = MockGameTile.mock.calls[0][0]
                await act(async () => {
                    await gameTileProps.onSelect()
                })

                expect(mockTrack).not.toHaveBeenCalled()
                expect(mockGameLauncher["launchGame"]).toHaveBeenCalledWith(
                    mockGame
                )
            })

            it("should track and launch game for beta games", async () => {
                mockUseGames.mockReturnValue([mockBetaGame])

                render(
                    <GamesCarousel
                        launchedGameState={null}
                        screenDisplayedId="test-screen-id-123"
                        isCarouselActive
                        gameLauncher={mockGameLauncher}
                    />
                )

                const gameTileProps = MockGameTile.mock.calls[0][0]
                await act(async () => {
                    await gameTileProps.onSelect()
                })

                expect(mockTrack).toHaveBeenCalledWith("Hub Button Pressed", {
                    eventCategory: "menu",
                    eventSubCategory: "game selection",
                    screenDisplayedId: "test-screen-id-123",
                    choiceValue: "song quiz",
                    displayChoices: ["song quiz"],
                    text: "",
                })
                expect(mockGameLauncher["launchGame"]).toHaveBeenCalledWith(
                    mockBetaGame
                )
            })
        })
    })

    describe("carousel scrolling", () => {
        const SCROLL_PEEK_OFFSET = 65
        const MockFocusIndicatorFn = jest.requireMock(
            "../FocusableUI/FocusIndicator"
        ).FocusIndicator as jest.Mock

        const mockInitializeWithElement = jest.fn()
        const mockUpdateFocusTarget = jest.fn()

        beforeEach(() => {
            jest.restoreAllMocks()
            jest.clearAllMocks()
            ;(useHubTracking as jest.Mock).mockReturnValue({
                track: mockTrack,
            })
            ;(useFocusTracking as jest.Mock).mockReturnValue({
                focusTarget: { element: null, opacity: 0 },
                initialized: true,
                initializeWithElement: mockInitializeWithElement,
                updateFocusTarget: mockUpdateFocusTarget,
            })
        })

        const CONTAINER_WIDTH = 1920

        const mockElementWithLayout = (
            offsetLeft: number,
            width: number
        ): HTMLDivElement => {
            const el = document.createElement("div")
            Object.defineProperty(el, "offsetLeft", { value: offsetLeft })
            Object.defineProperty(el, "offsetWidth", { value: width })
            return el
        }

        const setupContainerWidth = (containerDiv: HTMLElement): void => {
            Object.defineProperty(containerDiv, "offsetWidth", {
                value: CONTAINER_WIDTH,
                configurable: true,
            })
        }

        it("should not scroll when focused tile is within visible bounds", () => {
            const { container } = render(
                <GamesCarousel
                    launchedGameState={null}
                    isCarouselActive
                    gameLauncher={mockGameLauncher}
                />
            )

            setupContainerWidth(container.firstChild as HTMLElement)

            const mockElement = mockElementWithLayout(400, 400)
            const gameTileProps = MockGameTile.mock.calls[0][0]

            act(() => {
                gameTileProps.onFocus(mockElement)
            })

            const focusableContainer = screen.getByTestId("focusable-container")
            expect(focusableContainer.style.transform).toBe(
                "translate3d(0px, 0, 0.1px)"
            )
        })

        it("should scroll right with peek offset when tile exceeds right edge", () => {
            const { container } = render(
                <GamesCarousel
                    launchedGameState={null}
                    isCarouselActive
                    gameLauncher={mockGameLauncher}
                />
            )

            setupContainerWidth(container.firstChild as HTMLElement)

            // Tile at offsetLeft=1800, width=400 → right edge at 2200
            const mockElement = mockElementWithLayout(1800, 400)
            const gameTileProps = MockGameTile.mock.calls[0][0]

            act(() => {
                gameTileProps.onFocus(mockElement)
            })

            // scrollX = tileRight - containerWidth + PEEK = 2200 - 1920 + 65 = 345
            const expectedScroll =
                1800 + 400 - CONTAINER_WIDTH + SCROLL_PEEK_OFFSET

            const focusableContainer = screen.getByTestId("focusable-container")
            expect(focusableContainer.style.transform).toBe(
                `translate3d(${-expectedScroll}px, 0, 0.1px)`
            )
        })

        it("should scroll left with peek offset when tile is off the left edge", () => {
            const { container } = render(
                <GamesCarousel
                    launchedGameState={null}
                    isCarouselActive
                    gameLauncher={mockGameLauncher}
                />
            )

            setupContainerWidth(container.firstChild as HTMLElement)

            // First scroll right
            const rightElement = mockElementWithLayout(1800, 400)
            const firstTileProps = MockGameTile.mock.calls[0][0]

            act(() => {
                firstTileProps.onFocus(rightElement)
            })

            const lastRenderFirstTile =
                MockGameTile.mock.calls[
                    MockGameTile.mock.calls.length - 3
                ]?.[0] ??
                MockGameTile.mock.calls[MockGameTile.mock.calls.length - 1][0]

            // Tile at offsetLeft=200, width=1800 → right edge 2000 > 1920, doesn't fit at scrollX=0
            // tileLeft - PEEK = 135 < prev(345), so left scroll triggers
            const leftElement = mockElementWithLayout(200, 1800)

            act(() => {
                lastRenderFirstTile.onFocus(leftElement)
            })

            // scrollX = max(0, tileLeft - PEEK) = 200 - 65 = 135
            const expectedScroll = 200 - SCROLL_PEEK_OFFSET

            const focusableContainer = screen.getByTestId("focusable-container")
            expect(focusableContainer.style.transform).toBe(
                `translate3d(${-expectedScroll}px, 0, 0.1px)`
            )
        })

        it("should not scroll below zero", () => {
            const { container } = render(
                <GamesCarousel
                    launchedGameState={null}
                    isCarouselActive
                    gameLauncher={mockGameLauncher}
                />
            )

            setupContainerWidth(container.firstChild as HTMLElement)

            // Tile at start, well within bounds
            const mockElement = mockElementWithLayout(10, 400)
            const gameTileProps = MockGameTile.mock.calls[0][0]

            act(() => {
                gameTileProps.onFocus(mockElement)
            })

            const focusableContainer = screen.getByTestId("focusable-container")
            expect(focusableContainer.style.transform).toBe(
                "translate3d(0px, 0, 0.1px)"
            )
        })

        it("should pass scrollOffset to FocusIndicator", () => {
            const { container } = render(
                <GamesCarousel
                    launchedGameState={null}
                    isCarouselActive
                    gameLauncher={mockGameLauncher}
                />
            )

            expect(MockFocusIndicatorFn).toHaveBeenCalledWith(
                expect.objectContaining({ scrollOffset: 0 }),
                undefined
            )

            setupContainerWidth(container.firstChild as HTMLElement)
            MockFocusIndicatorFn.mockClear()

            const mockElement = mockElementWithLayout(1800, 400)
            const gameTileProps = MockGameTile.mock.calls[0][0]

            act(() => {
                gameTileProps.onFocus(mockElement)
            })

            const expectedScroll =
                1800 + 400 - CONTAINER_WIDTH + SCROLL_PEEK_OFFSET
            expect(MockFocusIndicatorFn).toHaveBeenCalledWith(
                expect.objectContaining({ scrollOffset: expectedScroll }),
                undefined
            )
        })
    })
})
