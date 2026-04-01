import { act, fireEvent, render, screen } from "@testing-library/react"
import React from "react"

import { ArrowPressProvider } from "../../FocusableUI/ArrowPressContext"
import {
    GAME_LOADING_DELAY,
    GameIframeController,
} from "./GameIframeController"

const mockAddEventListener = jest.fn()
const mockUnsubscribe = jest.fn()
let savedCallback: (() => void) | undefined = undefined

jest.mock("../../../config/gameIframeControllerUrl", () => ({
    clearGameIframeControllerUrl: jest.fn(),
}))

jest.mock("@noriginmedia/norigin-spatial-navigation", () => ({
    setFocus: jest.fn(),
    useFocusable: jest.fn(() => ({
        ref: { current: null },
        focusSelf: jest.fn(),
    })),
}))

jest.mock("@volley/platform-sdk/react", () => ({
    PlatformIFrame: ({
        src,
        className,
        hidden,
        onLoad,
    }: {
        src: string
        className: string
        hidden?: boolean
        onLoad?: () => void
    }): React.ReactElement => (
        <iframe
            src={src}
            className={className}
            hidden={hidden}
            data-testid="platform-iframe"
            onLoad={onLoad}
        />
    ),
    useKeyDown: jest.fn((key, callback) => {
        if (key === "Back") {
            document.addEventListener("keydown", (e) => {
                if (e.key === "Backspace") callback()
            })
        }
    }),
    useEventBroker: jest.fn(() => ({
        addEventListener: mockAddEventListener,
    })),
}))

jest.mock("../../FocusableUI/FocusableItem", () => ({
    FocusableItem: ({
        children,
    }: {
        children: React.ReactNode
    }): React.ReactElement => (
        <button data-testid="focusable-item">{children}</button>
    ),
}))

jest.mock("../../GameLoadingScreen/GameLoadingScreen", () => ({
    GameLoadingScreen: (): React.ReactElement => (
        <div data-testid="game-loading-screen">Loading...</div>
    ),
}))

const renderWithProvider = (
    ui: React.ReactElement
): ReturnType<typeof render> =>
    render(<ArrowPressProvider>{ui}</ArrowPressProvider>)

const waitForPromises = (): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, 0))

describe("GameIframeController", () => {
    const mockOnClose = jest.fn()
    const mockOnError = jest.fn()
    const mockOnReady = jest.fn()
    const mockGameLoaded = true
    const testUrl = "https://test.com/game"

    beforeEach(() => {
        jest.clearAllMocks()
        savedCallback = undefined
        document.querySelector = jest.fn().mockImplementation((selector) => {
            if (selector === ".game-iframe") {
                return {
                    focus: jest.fn(),
                } as unknown as HTMLIFrameElement
            }
            return null
        })

        mockAddEventListener.mockImplementation(
            (eventName: string, callback: () => void) => {
                if (eventName === "close") {
                    savedCallback = callback
                }
                return mockUnsubscribe
            }
        )
    })

    it("renders with correct props", () => {
        renderWithProvider(
            <GameIframeController
                url={testUrl}
                onClose={mockOnClose}
                onError={mockOnError}
                onReady={mockOnReady}
                gameLoaded={mockGameLoaded}
            />
        )

        const iframe = screen.getByTestId("platform-iframe")
        expect(iframe).toBeInTheDocument()
        expect(iframe).toHaveAttribute("src", testUrl)
        expect(iframe).toHaveClass("game-iframe")
    })

    it("handles iframe load and focuses it", async () => {
        const mockFocus = jest.fn()
        document.querySelector = jest.fn().mockImplementation((selector) => {
            if (selector === ".game-iframe") {
                return {
                    focus: mockFocus,
                } as unknown as HTMLIFrameElement
            }
            return null
        })

        renderWithProvider(
            <GameIframeController
                url={testUrl}
                onClose={mockOnClose}
                onError={mockOnError}
                onReady={mockOnReady}
                gameLoaded={mockGameLoaded}
            />
        )

        const iframe = screen.getByTestId("platform-iframe")
        await act(async () => {
            fireEvent.load(iframe)
            await waitForPromises()
        })

        expect(mockOnReady).toHaveBeenCalled()
        expect(mockFocus).toHaveBeenCalled()
    })

    it("registers event listener for 'close' event on mount", () => {
        renderWithProvider(
            <GameIframeController
                url={testUrl}
                onClose={mockOnClose}
                onError={mockOnError}
                onReady={mockOnReady}
                gameLoaded={mockGameLoaded}
            />
        )

        expect(mockAddEventListener).toHaveBeenCalledWith(
            "close",
            expect.any(Function)
        )
    })

    it("calls onClose when 'close' event is received", () => {
        renderWithProvider(
            <GameIframeController
                url={testUrl}
                onClose={mockOnClose}
                onError={mockOnError}
                onReady={mockOnReady}
                gameLoaded={mockGameLoaded}
            />
        )

        expect(savedCallback).toBeDefined()

        act(() => {
            savedCallback!()
        })

        expect(mockOnClose).toHaveBeenCalled()
    })

    it("unsubscribes from event listener on unmount", () => {
        const { unmount } = renderWithProvider(
            <GameIframeController
                url={testUrl}
                onClose={mockOnClose}
                onError={mockOnError}
                onReady={mockOnReady}
                gameLoaded={mockGameLoaded}
            />
        )

        unmount()

        expect(mockUnsubscribe).toHaveBeenCalled()
    })

    it("hides iframe when gameLoaded is false", () => {
        renderWithProvider(
            <GameIframeController
                url={testUrl}
                onClose={mockOnClose}
                onError={mockOnError}
                onReady={mockOnReady}
                gameLoaded={false}
            />
        )

        const iframe = screen.getByTestId("platform-iframe")
        expect(iframe).toHaveAttribute("hidden")
    })

    it("shows iframe when gameLoaded is true", () => {
        renderWithProvider(
            <GameIframeController
                url={testUrl}
                onClose={mockOnClose}
                onError={mockOnError}
                onReady={mockOnReady}
                gameLoaded={mockGameLoaded}
            />
        )

        const iframe = screen.getByTestId("platform-iframe")
        expect(iframe).not.toHaveAttribute("hidden")
    })

    it("renders GameLoadingScreen when gameLoaded is false and 2 seconds have passed", () => {
        jest.useFakeTimers()

        renderWithProvider(
            <GameIframeController
                url={testUrl}
                onClose={mockOnClose}
                onError={mockOnError}
                onReady={mockOnReady}
                gameLoaded={false}
            />
        )

        expect(
            screen.queryByTestId("game-loading-screen")
        ).not.toBeInTheDocument()

        act(() => {
            jest.advanceTimersByTime(GAME_LOADING_DELAY)
        })

        const loadingScreen = screen.getByTestId("game-loading-screen")
        expect(loadingScreen).toBeInTheDocument()

        jest.useRealTimers()
    })

    it("does not show GameLoadingScreen before 2-second delay", () => {
        jest.useFakeTimers()

        renderWithProvider(
            <GameIframeController
                url={testUrl}
                onClose={mockOnClose}
                onError={mockOnError}
                onReady={mockOnReady}
                gameLoaded={false}
            />
        )

        act(() => {
            jest.advanceTimersByTime(GAME_LOADING_DELAY - 1)
        })

        expect(
            screen.queryByTestId("game-loading-screen")
        ).not.toBeInTheDocument()

        jest.useRealTimers()
    })
    it("does not show GameLoadingScreen when gameLoaded is true", () => {
        jest.useFakeTimers()

        renderWithProvider(
            <GameIframeController
                url={testUrl}
                onClose={mockOnClose}
                onError={mockOnError}
                onReady={mockOnReady}
                gameLoaded
            />
        )

        expect(
            screen.queryByTestId("game-loading-screen")
        ).not.toBeInTheDocument()

        act(() => {
            jest.advanceTimersByTime(GAME_LOADING_DELAY)
        })

        expect(
            screen.queryByTestId("game-loading-screen")
        ).not.toBeInTheDocument()

        jest.useRealTimers()
    })

    it("hides GameLoadingScreen when gameLoaded changes to true after delay", () => {
        jest.useFakeTimers()

        const { rerender } = renderWithProvider(
            <GameIframeController
                url={testUrl}
                onClose={mockOnClose}
                onError={mockOnError}
                onReady={mockOnReady}
                gameLoaded={false}
            />
        )

        act(() => {
            jest.advanceTimersByTime(GAME_LOADING_DELAY)
        })

        expect(screen.getByTestId("game-loading-screen")).toBeInTheDocument()

        rerender(
            <GameIframeController
                url={testUrl}
                onClose={mockOnClose}
                onError={mockOnError}
                onReady={mockOnReady}
                gameLoaded
            />
        )

        expect(
            screen.queryByTestId("game-loading-screen")
        ).not.toBeInTheDocument()

        jest.useRealTimers()
    })
})
