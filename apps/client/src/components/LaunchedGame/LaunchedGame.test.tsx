import { render, screen } from "@testing-library/react"

import type { Game } from "../../hooks/useGames"
import { LaunchedGameState } from "../../hooks/useLaunchedGameState"

jest.mock("../../hooks/useHubTimedReset", () => ({
    useHubTimedReset: jest.fn(),
}))

jest.mock("../../utils/logger", () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
    },
}))

jest.mock("../../utils/datadog", () => ({
    safeDatadogRum: {
        startDurationVital: jest.fn(),
        stopDurationVital: jest.fn(),
        addAction: jest.fn(),
        addError: jest.fn(),
    },
    addCustomContext: jest.fn(),
    logUserAction: jest.fn(),
    datadogRum: {
        init: jest.fn(),
        startDurationVital: jest.fn(),
        stopDurationVital: jest.fn(),
        addAction: jest.fn(),
        addError: jest.fn(),
    },
}))

import { LaunchedGame } from "./LaunchedGame"

jest.mock("@datadog/browser-rum", () => ({
    datadogRum: {
        init: jest.fn(),
        startDurationVital: jest.fn(),
        stopDurationVital: jest.fn(),
        addAction: jest.fn(),
        addError: jest.fn(),
    },
}))

jest.mock("@datadog/browser-logs", () => ({
    datadogLogs: {
        logger: {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
        },
        setGlobalContext: jest.fn(),
        init: jest.fn(),
    },
}))

import type { datadogRum } from "../../utils/datadog"
import { safeDatadogRum } from "../../utils/datadog"
const mockDatadogRum = safeDatadogRum as jest.Mocked<typeof safeDatadogRum>

jest.mock("../../config/gameIframeControllerUrl", () => ({
    getGameIframeControllerUrl: jest.fn(() => null),
    clearGameIframeControllerUrl: jest.fn(),
}))

jest.mock("../../config/envconfig", () => ({
    envConfig: {
        gameLaunchUrl: "https://game.example.com/test-session-123",
        BASE_URL: "https://game.example.com",
    },
    getWindowVar: jest.fn(),
}))

jest.mock("../GameIframeController/GameIframeController", () => ({
    GameIframeController: jest.fn(
        ({
            url,
            onClose,
            onError,
        }: {
            url: string
            onClose: () => void
            onError: (error: Error) => void
        }) => (
            <div
                data-testid="mock-game-iframe-controller"
                data-url={url}
                data-onclose={onClose !== undefined ? "present" : "missing"}
                data-onerror={onError !== undefined ? "present" : "missing"}
            >
                Mock GameIframeController
                <button data-testid="mock-close-button" onClick={onClose}>
                    Close
                </button>
                <button
                    data-testid="mock-error-button"
                    onClick={() => onError(new Error("Test error"))}
                >
                    Trigger Error
                </button>
            </div>
        )
    ),
}))

describe("LaunchedGame Component", () => {
    const mockSetLaunchedGameState = jest.fn()
    const mockLogger = require("../../utils/logger").logger
    const mockOnGameReady = jest.fn()
    const mockGameLoaded = true
    const mockVitalRef = {} as ReturnType<typeof datadogRum.startDurationVital>

    const mockGame: Game = {
        id: "song-quiz",
        title: "Song Quiz",
        tileImageUrl: "test.avif",
        heroImageUrl: "test-hero.avif",
        source: "placeholder" as const,
    }

    const mockUrl = "https://test.com/game?sessionId=test-123"

    const mockLaunchedGameState = new LaunchedGameState(
        mockUrl,
        mockGame,
        mockVitalRef
    )
    const mockLaunchedGameStateWithVital = new LaunchedGameState(
        mockUrl,
        mockGame,
        mockVitalRef
    )

    beforeEach(() => {
        jest.clearAllMocks()
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    it("renders GameIframeController with correct props", () => {
        render(
            <LaunchedGame
                launchedGameState={mockLaunchedGameState}
                setLaunchedGameState={mockSetLaunchedGameState}
                onGameReady={mockOnGameReady}
                gameLoaded={mockGameLoaded}
            />
        )

        const iframeController = screen.getByTestId(
            "mock-game-iframe-controller"
        )
        expect(iframeController).toBeInTheDocument()
        expect(iframeController).toHaveAttribute("data-url", mockUrl)
        expect(iframeController).toHaveAttribute("data-onclose", "present")
        expect(iframeController).toHaveAttribute("data-onerror", "present")
    })

    it("passes the correct URL to GameIframeController", () => {
        const customUrl = "https://custom-game.com/session?id=custom-123"
        const customLaunchedGameState = new LaunchedGameState(
            customUrl,
            mockGame,
            mockVitalRef
        )

        render(
            <LaunchedGame
                launchedGameState={customLaunchedGameState}
                setLaunchedGameState={mockSetLaunchedGameState}
                onGameReady={mockOnGameReady}
                gameLoaded={mockGameLoaded}
            />
        )

        const iframeController = screen.getByTestId(
            "mock-game-iframe-controller"
        )
        expect(iframeController).toHaveAttribute("data-url", customUrl)
    })

    describe("handleGameClose", () => {
        it("logs close action and resets game state", () => {
            render(
                <LaunchedGame
                    launchedGameState={mockLaunchedGameState}
                    setLaunchedGameState={mockSetLaunchedGameState}
                    onGameReady={mockOnGameReady}
                    gameLoaded={mockGameLoaded}
                />
            )

            const closeButton = screen.getByTestId("mock-close-button")
            closeButton.click()

            expect(mockLogger.info).toHaveBeenCalledWith(
                "LaunchedGame handleGameClose called"
            )
            expect(mockSetLaunchedGameState).toHaveBeenCalledWith(null)
        })

        it("calls setLaunchedGameState only once per close", () => {
            render(
                <LaunchedGame
                    launchedGameState={mockLaunchedGameState}
                    setLaunchedGameState={mockSetLaunchedGameState}
                    onGameReady={mockOnGameReady}
                    gameLoaded={mockGameLoaded}
                />
            )

            const closeButton = screen.getByTestId("mock-close-button")
            closeButton.click()
            closeButton.click() // Click twice to test multiple calls

            expect(mockSetLaunchedGameState).toHaveBeenCalledTimes(2)
            expect(mockSetLaunchedGameState).toHaveBeenCalledWith(null)
        })
    })

    describe("handleGameError", () => {
        it("logs error and resets game state", () => {
            render(
                <LaunchedGame
                    launchedGameState={mockLaunchedGameState}
                    setLaunchedGameState={mockSetLaunchedGameState}
                    onGameReady={mockOnGameReady}
                    gameLoaded={mockGameLoaded}
                />
            )

            const errorButton = screen.getByTestId("mock-error-button")
            errorButton.click()

            expect(mockLogger.error).toHaveBeenCalledWith(
                "Error - LaunchedGame",
                new Error("Test error")
            )
            expect(mockSetLaunchedGameState).toHaveBeenCalledWith(null)
        })

        it("stops duration vital with error context when vital ref exists", () => {
            render(
                <LaunchedGame
                    launchedGameState={mockLaunchedGameStateWithVital}
                    setLaunchedGameState={mockSetLaunchedGameState}
                    onGameReady={mockOnGameReady}
                    gameLoaded={mockGameLoaded}
                />
            )

            const errorButton = screen.getByTestId("mock-error-button")
            errorButton.click()

            expect(mockDatadogRum.stopDurationVital).toHaveBeenCalledWith(
                mockVitalRef,
                {
                    context: {
                        status: "error",
                        error: new Error("Test error"),
                    },
                }
            )
        })

        it("handles different error objects", () => {
            const MockGameIframeController = jest.requireMock(
                "../GameIframeController/GameIframeController"
            ).GameIframeController

            // Create a custom error
            const customError = new Error("Custom test error")
            customError.name = "CustomError"

            MockGameIframeController.mockImplementationOnce(
                ({ onError }: { onError: (error: Error) => void }) => (
                    <button
                        data-testid="custom-error-button"
                        onClick={() => onError(customError)}
                    >
                        Custom Error
                    </button>
                )
            )

            render(
                <LaunchedGame
                    launchedGameState={mockLaunchedGameState}
                    setLaunchedGameState={mockSetLaunchedGameState}
                    onGameReady={mockOnGameReady}
                    gameLoaded={mockGameLoaded}
                />
            )

            const errorButton = screen.getByTestId("custom-error-button")
            errorButton.click()

            expect(mockLogger.error).toHaveBeenCalledWith(
                "Error - LaunchedGame",
                customError
            )
            expect(mockSetLaunchedGameState).toHaveBeenCalledWith(null)
        })
    })

    describe("handleGameReady", () => {
        it("stops duration vital with success context when vital ref exists", () => {
            const MockGameIframeController = jest.requireMock(
                "../GameIframeController/GameIframeController"
            ).GameIframeController

            let capturedOnReady: (() => void) | null = null
            MockGameIframeController.mockImplementationOnce(
                ({ onReady }: { onReady: () => void }) => {
                    capturedOnReady = onReady
                    return <div data-testid="mock-controller">Mock</div>
                }
            )

            render(
                <LaunchedGame
                    launchedGameState={mockLaunchedGameStateWithVital}
                    setLaunchedGameState={mockSetLaunchedGameState}
                    onGameReady={mockOnGameReady}
                    gameLoaded={mockGameLoaded}
                />
            )

            expect(capturedOnReady).toBeDefined()
            capturedOnReady!()

            expect(mockDatadogRum.stopDurationVital).toHaveBeenCalledWith(
                mockVitalRef,
                {
                    context: {
                        status: "success",
                    },
                }
            )
            expect(mockLogger.info).toHaveBeenCalledWith(
                "LaunchedGame - game iframe ready"
            )
            expect(mockOnGameReady).toHaveBeenCalled()
        })

        it("calls onGameReady callback", () => {
            const MockGameIframeController = jest.requireMock(
                "../GameIframeController/GameIframeController"
            ).GameIframeController

            let capturedOnReady: (() => void) | null = null
            MockGameIframeController.mockImplementationOnce(
                ({ onReady }: { onReady: () => void }) => {
                    capturedOnReady = onReady
                    return <div data-testid="mock-controller">Mock</div>
                }
            )

            render(
                <LaunchedGame
                    launchedGameState={mockLaunchedGameState}
                    setLaunchedGameState={mockSetLaunchedGameState}
                    onGameReady={mockOnGameReady}
                    gameLoaded={mockGameLoaded}
                />
            )

            expect(capturedOnReady).toBeDefined()
            capturedOnReady!()

            expect(mockOnGameReady).toHaveBeenCalledTimes(1)
        })
    })

    describe("stopLaunchVital function", () => {
        it("handles different error types with vital ref", () => {
            const MockGameIframeController = jest.requireMock(
                "../GameIframeController/GameIframeController"
            ).GameIframeController

            const customError = new TypeError("Custom type error")
            customError.name = "TypeError"

            MockGameIframeController.mockImplementationOnce(
                ({ onError }: { onError: (error: Error) => void }) => (
                    <button
                        data-testid="custom-error-button"
                        onClick={() => onError(customError)}
                    >
                        Custom Error
                    </button>
                )
            )

            render(
                <LaunchedGame
                    launchedGameState={mockLaunchedGameStateWithVital}
                    setLaunchedGameState={mockSetLaunchedGameState}
                    onGameReady={mockOnGameReady}
                    gameLoaded={mockGameLoaded}
                />
            )

            const errorButton = screen.getByTestId("custom-error-button")
            errorButton.click()

            expect(mockDatadogRum.stopDurationVital).toHaveBeenCalledWith(
                mockVitalRef,
                {
                    context: {
                        status: "error",
                        error: customError,
                    },
                }
            )
        })
    })

    describe("edge cases", () => {
        it("handles null state correctly", () => {
            try {
                render(
                    <LaunchedGame
                        launchedGameState={null}
                        setLaunchedGameState={mockSetLaunchedGameState}
                        onGameReady={mockOnGameReady}
                        gameLoaded={mockGameLoaded}
                    />
                )
                fail(
                    "LaunchedGame should throw an error when launchedGameState is null"
                )
            } catch (error) {
                expect(error).toBeInstanceOf(Error)
                expect((error as Error).message).toBe(
                    "LaunchedGame should not be rendered when launchedGameState is not launched"
                )
                expect(mockSetLaunchedGameState).not.toHaveBeenCalled()
            }
        })
    })

    describe("props validation", () => {
        it("uses the provided setLaunchedGameState function", () => {
            const customSetState = jest.fn()

            render(
                <LaunchedGame
                    launchedGameState={mockLaunchedGameState}
                    setLaunchedGameState={customSetState}
                    onGameReady={mockOnGameReady}
                    gameLoaded={mockGameLoaded}
                />
            )

            const closeButton = screen.getByTestId("mock-close-button")
            closeButton.click()

            expect(customSetState).toHaveBeenCalledWith(null)
            expect(mockSetLaunchedGameState).not.toHaveBeenCalled()
        })

        it("re-renders when launchedGameState changes", () => {
            const { rerender } = render(
                <LaunchedGame
                    launchedGameState={mockLaunchedGameState}
                    setLaunchedGameState={mockSetLaunchedGameState}
                    onGameReady={mockOnGameReady}
                    gameLoaded={mockGameLoaded}
                />
            )

            const initialController = screen.getByTestId(
                "mock-game-iframe-controller"
            )
            expect(initialController).toHaveAttribute("data-url", mockUrl)

            const newUrl = "https://new-game.com/session?id=new-456"
            const newGame = { ...mockGame, title: "New Game" }
            const newLaunchedGameState = new LaunchedGameState(
                newUrl,
                newGame,
                mockVitalRef
            )

            rerender(
                <LaunchedGame
                    launchedGameState={newLaunchedGameState}
                    setLaunchedGameState={mockSetLaunchedGameState}
                    onGameReady={mockOnGameReady}
                    gameLoaded={mockGameLoaded}
                />
            )

            const updatedController = screen.getByTestId(
                "mock-game-iframe-controller"
            )
            expect(updatedController).toHaveAttribute("data-url", newUrl)
        })
    })

    describe("component lifecycle", () => {
        it("cleans up properly on unmount", () => {
            const { unmount } = render(
                <LaunchedGame
                    launchedGameState={mockLaunchedGameState}
                    setLaunchedGameState={mockSetLaunchedGameState}
                    onGameReady={mockOnGameReady}
                    gameLoaded={mockGameLoaded}
                />
            )

            expect(
                screen.getByTestId("mock-game-iframe-controller")
            ).toBeInTheDocument()

            unmount()

            expect(
                screen.queryByTestId("mock-game-iframe-controller")
            ).not.toBeInTheDocument()
        })
    })

    describe("integration with GameIframeController", () => {
        it("passes onClose callback correctly", () => {
            const MockGameIframeController = jest.requireMock(
                "../GameIframeController/GameIframeController"
            ).GameIframeController

            render(
                <LaunchedGame
                    launchedGameState={mockLaunchedGameState}
                    setLaunchedGameState={mockSetLaunchedGameState}
                    onGameReady={mockOnGameReady}
                    gameLoaded={mockGameLoaded}
                />
            )

            // Verify the mock was called with the expected props
            expect(MockGameIframeController).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: mockUrl,
                    onClose: expect.any(Function),
                    onError: expect.any(Function),
                }),
                undefined
            )
        })

        it("onClose callback resets state correctly", () => {
            const MockGameIframeController = jest.requireMock(
                "../GameIframeController/GameIframeController"
            ).GameIframeController

            let capturedOnClose: (() => void) | null = null
            MockGameIframeController.mockImplementationOnce(
                ({ onClose }: { onClose: () => void }) => {
                    capturedOnClose = onClose
                    return <div data-testid="mock-controller">Mock</div>
                }
            )

            render(
                <LaunchedGame
                    launchedGameState={mockLaunchedGameState}
                    setLaunchedGameState={mockSetLaunchedGameState}
                    onGameReady={mockOnGameReady}
                    gameLoaded={mockGameLoaded}
                />
            )

            expect(capturedOnClose).toBeDefined()
            capturedOnClose!()

            expect(mockLogger.info).toHaveBeenCalledWith(
                "LaunchedGame handleGameClose called"
            )
            expect(mockSetLaunchedGameState).toHaveBeenCalledWith(null)
        })

        it("onError callback handles errors correctly", () => {
            const MockGameIframeController = jest.requireMock(
                "../GameIframeController/GameIframeController"
            ).GameIframeController

            let capturedOnError: ((error: Error) => void) | null = null
            MockGameIframeController.mockImplementationOnce(
                ({ onError }: { onError: (error: Error) => void }) => {
                    capturedOnError = onError
                    return <div data-testid="mock-controller">Mock</div>
                }
            )

            render(
                <LaunchedGame
                    launchedGameState={mockLaunchedGameStateWithVital}
                    setLaunchedGameState={mockSetLaunchedGameState}
                    onGameReady={mockOnGameReady}
                    gameLoaded={mockGameLoaded}
                />
            )

            const testError = new Error("Integration test error")
            expect(capturedOnError).toBeDefined()
            capturedOnError!(testError)

            expect(mockLogger.error).toHaveBeenCalledWith(
                "Error - LaunchedGame",
                testError
            )
            expect(mockDatadogRum.stopDurationVital).toHaveBeenCalledWith(
                mockVitalRef,
                {
                    context: {
                        status: "error",
                        error: testError,
                    },
                }
            )
            expect(mockSetLaunchedGameState).toHaveBeenCalledWith(null)
        })

        it("onReady callback stops vital and calls onGameReady", () => {
            const MockGameIframeController = jest.requireMock(
                "../GameIframeController/GameIframeController"
            ).GameIframeController

            let capturedOnReady: (() => void) | null = null
            MockGameIframeController.mockImplementationOnce(
                ({ onReady }: { onReady: () => void }) => {
                    capturedOnReady = onReady
                    return <div data-testid="mock-controller">Mock</div>
                }
            )

            render(
                <LaunchedGame
                    launchedGameState={mockLaunchedGameStateWithVital}
                    setLaunchedGameState={mockSetLaunchedGameState}
                    onGameReady={mockOnGameReady}
                    gameLoaded={mockGameLoaded}
                />
            )

            expect(capturedOnReady).toBeDefined()
            capturedOnReady!()

            expect(mockLogger.info).toHaveBeenCalledWith(
                "LaunchedGame - game iframe ready"
            )
            expect(mockDatadogRum.stopDurationVital).toHaveBeenCalledWith(
                mockVitalRef,
                {
                    context: {
                        status: "success",
                    },
                }
            )
            expect(mockOnGameReady).toHaveBeenCalled()
        })

        it("passes onReady callback correctly", () => {
            const MockGameIframeController = jest.requireMock(
                "../GameIframeController/GameIframeController"
            ).GameIframeController

            render(
                <LaunchedGame
                    launchedGameState={mockLaunchedGameState}
                    setLaunchedGameState={mockSetLaunchedGameState}
                    onGameReady={mockOnGameReady}
                    gameLoaded={mockGameLoaded}
                />
            )

            expect(MockGameIframeController).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: mockUrl,
                    onClose: expect.any(Function),
                    onError: expect.any(Function),
                    onReady: expect.any(Function),
                    gameLoaded: mockGameLoaded,
                }),
                undefined
            )
        })
    })
})
