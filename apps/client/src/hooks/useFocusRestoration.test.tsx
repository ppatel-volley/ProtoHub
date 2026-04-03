import { setFocus } from "@noriginmedia/norigin-spatial-navigation"
import { renderHook } from "@testing-library/react"
import { act, type JSX, type ReactNode } from "react"

import { ArrowPressProvider } from "../components/FocusableUI/ArrowPressContext"
import { isLGOrSamsungTV } from "../config/platformDetection"
import { logger } from "../utils/logger"
import {
    FOCUS_RECOVERY_FALLBACK_DELAY_MS,
    useFocusRestoration,
} from "./useFocusRestoration"
import type { Game } from "./useGames"
import { LaunchedGameState } from "./useLaunchedGameState"

type FocusRestorationProps = {
    showExitModal: boolean
    showWeekendRebrandModal: boolean
    isCarouselActive: boolean
    launchedGameState: LaunchedGameState | null
    isInitialized: boolean
    isInUpsell: boolean
}

const mockGame: Game = {
    id: "jeopardy",
    title: "Jeopardy",
    tileImageUrl: "/jeopardy.avif",
    heroImageUrl: "/jeopardy-hero.avif",
    source: "placeholder" as const,
}

jest.mock("@noriginmedia/norigin-spatial-navigation", () => ({
    setFocus: jest.fn(),
}))

jest.mock("../utils/logger", () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}))

jest.mock("../config/platformDetection", () => ({
    isLGOrSamsungTV: jest.fn(),
}))

const mockSetFocus = setFocus as jest.Mock
const mockIsLGOrSamsungTV = isLGOrSamsungTV as jest.Mock
const mockLogger = logger as jest.Mocked<typeof logger>
const mockLoggerInfo = jest.fn()
const mockLoggerWarn = jest.fn()
const mockLoggerError = jest.fn()
const mockVitalRef = { __dd_vital_reference: true } as never

mockLogger.info = mockLoggerInfo
mockLogger.warn = mockLoggerWarn
mockLogger.error = mockLoggerError

const createProps = (
    overrides: Partial<FocusRestorationProps> = {}
): FocusRestorationProps => ({
    showExitModal: false,
    showWeekendRebrandModal: false,
    isCarouselActive: true,
    launchedGameState: null,
    isInitialized: true,
    isInUpsell: false,
    ...overrides,
})

describe("useFocusRestoration", () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.useFakeTimers()
        global.requestAnimationFrame = jest.fn((cb) => {
            setTimeout(cb, 0)
            return 0
        })

        Object.defineProperty(document, "hasFocus", {
            value: jest.fn(() => true),
            writable: true,
        })

        Object.defineProperty(document, "visibilityState", {
            value: "visible",
            writable: true,
        })

        // Default to LG/Samsung TV for fallback tests
        mockIsLGOrSamsungTV.mockReturnValue(true)
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    const wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
        <ArrowPressProvider>{children}</ArrowPressProvider>
    )

    it("should restore focus after modal close", () => {
        const { rerender } = renderHook((props) => useFocusRestoration(props), {
            wrapper,
            initialProps: createProps(),
        })

        rerender(
            createProps({
                showExitModal: true,
                isCarouselActive: false,
            })
        )

        rerender(
            createProps({
                showExitModal: false,
                isCarouselActive: true,
            })
        )

        act(() => {
            jest.runOnlyPendingTimers()
        })

        expect(mockSetFocus).toHaveBeenCalledWith("game-tile-0")
        expect(mockLoggerInfo).toHaveBeenCalledWith(
            "Restoring focus to game-tile-0 after exit modal close and carousel activation"
        )
    })

    it("should restore focus to updated tile after focusing different game", () => {
        const { result, rerender } = renderHook<
            { updateLastFocusedTile: (tileKey: string) => void },
            FocusRestorationProps
        >((props) => useFocusRestoration(props), {
            wrapper,
            initialProps: createProps(),
        })

        act(() => {
            result.current.updateLastFocusedTile("game-tile-1")
        })

        rerender(
            createProps({
                showExitModal: true,
                isCarouselActive: false,
            })
        )

        rerender(
            createProps({
                showExitModal: false,
                isCarouselActive: true,
            })
        )

        act(() => {
            jest.runOnlyPendingTimers()
        })

        expect(mockSetFocus).toHaveBeenCalledWith("game-tile-1")
        expect(mockLoggerInfo).toHaveBeenCalledWith(
            "Restoring focus to game-tile-1 after exit modal close and carousel activation"
        )
    })

    it("should restore focus when carousel becomes active after being inactive", () => {
        const { result, rerender } = renderHook(
            (props) => useFocusRestoration(props),
            {
                wrapper,
                initialProps: createProps({
                    isCarouselActive: false,
                    isInUpsell: true,
                }),
            }
        )

        act(() => {
            result.current.updateLastFocusedTile("game-tile-1")
        })

        mockSetFocus.mockClear()
        mockLoggerInfo.mockClear()

        rerender(
            createProps({
                showExitModal: false,
                isCarouselActive: true,
                isInUpsell: false,
            })
        )

        act(() => {
            jest.runOnlyPendingTimers()
        })

        expect(mockSetFocus).toHaveBeenCalledWith("game-tile-1")
        expect(mockLoggerInfo).toHaveBeenCalledWith(
            "Restoring focus to game-tile-1 after carousel activation"
        )
    })

    it("should restore focus when a game closes", () => {
        const activeGameState = new LaunchedGameState(
            "https://test.com/game?sessionId=test-123",
            mockGame,
            mockVitalRef
        )

        const { rerender } = renderHook((props) => useFocusRestoration(props), {
            wrapper,
            initialProps: createProps({
                launchedGameState: activeGameState,
            }),
        })

        mockSetFocus.mockClear()
        mockLoggerInfo.mockClear()

        rerender(createProps())

        act(() => {
            jest.runOnlyPendingTimers()
        })

        expect(mockSetFocus).toHaveBeenCalledWith("game-tile-0")
        expect(mockLoggerInfo).toHaveBeenCalledWith(
            "Restoring focus to game-tile-0 after game ended"
        )
    })

    it("should not restore focus when game closes if weekend rebrand modal is showing", () => {
        const activeGameState = new LaunchedGameState(
            "https://test.com/game?sessionId=test-123",
            mockGame,
            mockVitalRef
        )

        const { rerender } = renderHook((props) => useFocusRestoration(props), {
            wrapper,
            initialProps: createProps({
                launchedGameState: activeGameState,
            }),
        })

        mockSetFocus.mockClear()
        mockLoggerInfo.mockClear()

        rerender(
            createProps({
                showWeekendRebrandModal: true,
            })
        )

        act(() => {
            jest.runOnlyPendingTimers()
        })

        expect(mockSetFocus).not.toHaveBeenCalled()
        expect(mockLoggerInfo).not.toHaveBeenCalled()
    })

    it("should not restore focus when game closes if exit modal is showing", () => {
        const activeGameState = new LaunchedGameState(
            "https://test.com/game?sessionId=test-123",
            mockGame,
            mockVitalRef
        )

        const { rerender } = renderHook((props) => useFocusRestoration(props), {
            wrapper,
            initialProps: createProps({
                launchedGameState: activeGameState,
            }),
        })

        mockSetFocus.mockClear()
        mockLoggerInfo.mockClear()

        rerender(
            createProps({
                showExitModal: true,
            })
        )

        act(() => {
            jest.runOnlyPendingTimers()
        })

        expect(mockSetFocus).not.toHaveBeenCalled()
        expect(mockLoggerInfo).not.toHaveBeenCalled()
    })

    it("should not restore focus when game closes if carousel is not active", () => {
        const activeGameState = new LaunchedGameState(
            "https://test.com/game?sessionId=test-123",
            mockGame,
            mockVitalRef
        )

        const { rerender } = renderHook((props) => useFocusRestoration(props), {
            wrapper,
            initialProps: createProps({
                launchedGameState: activeGameState,
            }),
        })

        mockSetFocus.mockClear()
        mockLoggerInfo.mockClear()

        rerender(
            createProps({
                isCarouselActive: false,
            })
        )

        act(() => {
            jest.runOnlyPendingTimers()
        })

        expect(mockSetFocus).not.toHaveBeenCalled()
        expect(mockLoggerInfo).not.toHaveBeenCalled()
    })

    it("should not restore focus when not initialized", () => {
        const { rerender } = renderHook((props) => useFocusRestoration(props), {
            wrapper,
            initialProps: createProps({
                isCarouselActive: false,
                isInitialized: false,
            }),
        })

        rerender(
            createProps({
                isCarouselActive: true,
                isInitialized: false,
            })
        )

        act(() => {
            jest.runOnlyPendingTimers()
        })

        expect(mockSetFocus).not.toHaveBeenCalled()
        expect(mockLoggerInfo).not.toHaveBeenCalled()
    })

    it("should not restore focus if user has navigated during requestAnimationFrame delay", () => {
        const activeGameState = new LaunchedGameState(
            "https://test.com/game?sessionId=test-123",
            mockGame,
            mockVitalRef
        )

        const { result, rerender } = renderHook(
            (props) => useFocusRestoration(props),
            {
                wrapper,
                initialProps: createProps({
                    launchedGameState: activeGameState,
                }),
            }
        )

        // Game ends - this schedules focus restoration in requestAnimationFrame
        rerender(createProps())

        // Before requestAnimationFrame runs, user navigates to a different tile
        act(() => {
            result.current.updateLastFocusedTile("game-tile-3")
        })

        // Now run the requestAnimationFrame callback
        act(() => {
            jest.runOnlyPendingTimers()
        })

        // Focus restoration should be skipped because user has navigated
        expect(mockLoggerInfo).toHaveBeenCalledWith(
            expect.stringContaining(
                "Skipping focus restoration to game-tile-0 after game ended - user has navigated"
            )
        )
    })

    it("should restore focus after weekend rebrand modal close", () => {
        const { rerender } = renderHook((props) => useFocusRestoration(props), {
            wrapper,
            initialProps: createProps(),
        })

        rerender(
            createProps({
                showWeekendRebrandModal: true,
                isCarouselActive: false,
            })
        )

        rerender(
            createProps({
                showWeekendRebrandModal: false,
                isCarouselActive: true,
            })
        )

        act(() => {
            jest.runOnlyPendingTimers()
        })

        expect(mockSetFocus).toHaveBeenCalledWith("game-tile-0")
        expect(mockLoggerInfo).toHaveBeenCalledWith(
            "Restoring focus to game-tile-0 after weekend rebrand modal close"
        )
    })

    it("should restore focus to updated tile after weekend rebrand modal close", () => {
        const { result, rerender } = renderHook<
            { updateLastFocusedTile: (tileKey: string) => void },
            FocusRestorationProps
        >((props) => useFocusRestoration(props), {
            wrapper,
            initialProps: createProps(),
        })

        act(() => {
            result.current.updateLastFocusedTile("game-tile-2")
        })

        rerender(
            createProps({
                showWeekendRebrandModal: true,
                isCarouselActive: false,
            })
        )

        rerender(
            createProps({
                showWeekendRebrandModal: false,
                isCarouselActive: true,
            })
        )

        act(() => {
            jest.runOnlyPendingTimers()
        })

        expect(mockSetFocus).toHaveBeenCalledWith("game-tile-2")
        expect(mockLoggerInfo).toHaveBeenCalledWith(
            "Restoring focus to game-tile-2 after weekend rebrand modal close"
        )
    })

    describe("TV Focus Recovery Fallback", () => {
        it("should run fallback monitoring on all TV platforms (not just LG/Samsung)", () => {
            // Platform detection is no longer used - fallback runs on all platforms
            mockIsLGOrSamsungTV.mockReturnValue(false)

            const activeGameState = new LaunchedGameState(
                "https://test.com/game?sessionId=test-123",
                mockGame,
                mockVitalRef
            )

            const { rerender } = renderHook(
                (props) => useFocusRestoration(props),
                {
                    wrapper,
                    initialProps: createProps({
                        launchedGameState: activeGameState,
                    }),
                }
            )

            rerender(createProps())

            act(() => {
                jest.runOnlyPendingTimers()
            })

            expect(mockSetFocus).toHaveBeenCalledWith("game-tile-0")

            mockSetFocus.mockClear()
            mockLoggerWarn.mockClear()
            ;(document.hasFocus as jest.Mock).mockReturnValue(false)

            act(() => {
                jest.advanceTimersByTime(FOCUS_RECOVERY_FALLBACK_DELAY_MS)
            })

            // Fallback should run even on non-LG/Samsung platforms (e.g., FireTV)
            expect(mockSetFocus).toHaveBeenCalledWith("game-tile-0")
        })

        it("should trigger fallback monitoring after game ends and focus is restored", () => {
            const activeGameState = new LaunchedGameState(
                "https://test.com/game?sessionId=test-123",
                mockGame,
                mockVitalRef
            )

            const { rerender } = renderHook(
                (props) => useFocusRestoration(props),
                {
                    wrapper,
                    initialProps: createProps({
                        launchedGameState: activeGameState,
                    }),
                }
            )

            mockSetFocus.mockClear()
            mockLoggerInfo.mockClear()

            rerender(createProps())

            act(() => {
                jest.runOnlyPendingTimers()
            })

            expect(mockSetFocus).toHaveBeenCalledWith("game-tile-0")

            mockSetFocus.mockClear()
            mockLoggerInfo.mockClear()
            mockLoggerWarn.mockClear()
            ;(document.hasFocus as jest.Mock).mockReturnValue(false)

            act(() => {
                jest.advanceTimersByTime(FOCUS_RECOVERY_FALLBACK_DELAY_MS)
            })

            expect(mockSetFocus).toHaveBeenCalledWith("game-tile-0")
        })

        it("should not trigger fallback when page has focus", () => {
            const activeGameState = new LaunchedGameState(
                "https://test.com/game?sessionId=test-123",
                mockGame,
                mockVitalRef
            )

            const { rerender } = renderHook(
                (props) => useFocusRestoration(props),
                {
                    wrapper,
                    initialProps: createProps({
                        launchedGameState: activeGameState,
                    }),
                }
            )

            rerender(createProps())

            act(() => {
                jest.runOnlyPendingTimers()
            })

            mockSetFocus.mockClear()
            mockLoggerWarn.mockClear()
            ;(document.hasFocus as jest.Mock).mockReturnValue(true)

            act(() => {
                jest.advanceTimersByTime(FOCUS_RECOVERY_FALLBACK_DELAY_MS)
            })

            expect(mockSetFocus).not.toHaveBeenCalled()
        })

        it("should not trigger fallback when page is not visible", () => {
            const activeGameState = new LaunchedGameState(
                "https://test.com/game?sessionId=test-123",
                mockGame,
                mockVitalRef
            )

            const { rerender } = renderHook(
                (props) => useFocusRestoration(props),
                {
                    wrapper,
                    initialProps: createProps({
                        launchedGameState: activeGameState,
                    }),
                }
            )

            // Simulate game ending
            rerender(createProps())

            act(() => {
                jest.runOnlyPendingTimers()
            })

            // Clear mocks
            mockSetFocus.mockClear()
            mockLoggerWarn.mockClear()

            Object.defineProperty(document, "visibilityState", {
                value: "hidden",
                writable: true,
            })
            ;(document.hasFocus as jest.Mock).mockReturnValue(false)

            act(() => {
                jest.advanceTimersByTime(FOCUS_RECOVERY_FALLBACK_DELAY_MS)
            })

            expect(mockSetFocus).not.toHaveBeenCalled()
        })

        it("should not trigger fallback when carousel is not active", () => {
            const activeGameState = new LaunchedGameState(
                "https://test.com/game?sessionId=test-123",
                mockGame,
                mockVitalRef
            )

            const { rerender } = renderHook(
                (props) => useFocusRestoration(props),
                {
                    wrapper,
                    initialProps: createProps({
                        launchedGameState: activeGameState,
                    }),
                }
            )
            rerender(
                createProps({
                    isCarouselActive: false,
                })
            )

            act(() => {
                jest.runOnlyPendingTimers()
            })

            mockSetFocus.mockClear()
            mockLoggerWarn.mockClear()
            ;(document.hasFocus as jest.Mock).mockReturnValue(false)

            act(() => {
                jest.advanceTimersByTime(FOCUS_RECOVERY_FALLBACK_DELAY_MS)
            })

            expect(mockLoggerWarn).not.toHaveBeenCalled()
            expect(mockSetFocus).not.toHaveBeenCalled()
        })

        it("should not trigger fallback when in upsell", () => {
            const activeGameState = new LaunchedGameState(
                "https://test.com/game?sessionId=test-123",
                mockGame,
                mockVitalRef
            )

            const { rerender } = renderHook(
                (props) => useFocusRestoration(props),
                {
                    wrapper,
                    initialProps: createProps({
                        launchedGameState: activeGameState,
                    }),
                }
            )

            rerender(
                createProps({
                    isInUpsell: true,
                })
            )

            act(() => {
                jest.runOnlyPendingTimers()
            })

            mockSetFocus.mockClear()
            mockLoggerWarn.mockClear()
            ;(document.hasFocus as jest.Mock).mockReturnValue(false)

            act(() => {
                jest.advanceTimersByTime(FOCUS_RECOVERY_FALLBACK_DELAY_MS)
            })

            expect(mockSetFocus).not.toHaveBeenCalled()
        })

        it("should not trigger fallback when exit modal is showing", () => {
            const activeGameState = new LaunchedGameState(
                "https://test.com/game?sessionId=test-123",
                mockGame,
                mockVitalRef
            )

            const { rerender } = renderHook(
                (props) => useFocusRestoration(props),
                {
                    wrapper,
                    initialProps: createProps({
                        launchedGameState: activeGameState,
                    }),
                }
            )

            rerender(
                createProps({
                    showExitModal: true,
                })
            )

            act(() => {
                jest.runOnlyPendingTimers()
            })

            mockSetFocus.mockClear()
            mockLoggerWarn.mockClear()
            ;(document.hasFocus as jest.Mock).mockReturnValue(false)

            act(() => {
                jest.advanceTimersByTime(FOCUS_RECOVERY_FALLBACK_DELAY_MS)
            })

            expect(mockSetFocus).not.toHaveBeenCalled()
        })

        it("should not trigger fallback when weekend rebrand modal is showing", () => {
            const activeGameState = new LaunchedGameState(
                "https://test.com/game?sessionId=test-123",
                mockGame,
                mockVitalRef
            )

            const { rerender } = renderHook(
                (props) => useFocusRestoration(props),
                {
                    wrapper,
                    initialProps: createProps({
                        launchedGameState: activeGameState,
                    }),
                }
            )

            rerender(
                createProps({
                    showWeekendRebrandModal: true,
                })
            )

            act(() => {
                jest.runOnlyPendingTimers()
            })

            mockSetFocus.mockClear()
            mockLoggerWarn.mockClear()
            ;(document.hasFocus as jest.Mock).mockReturnValue(false)

            act(() => {
                jest.advanceTimersByTime(FOCUS_RECOVERY_FALLBACK_DELAY_MS)
            })

            expect(mockSetFocus).not.toHaveBeenCalled()
        })

        it("should clear previous timeout when new fallback monitoring starts", () => {
            const clearTimeoutSpy = jest.spyOn(global, "clearTimeout")

            const { rerender } = renderHook(
                (props) => useFocusRestoration(props),
                {
                    wrapper,
                    initialProps: createProps(),
                }
            )

            mockSetFocus.mockReset()

            rerender(
                createProps({
                    showExitModal: true,
                    isCarouselActive: false,
                })
            )

            rerender(
                createProps({
                    showExitModal: false,
                    isCarouselActive: true,
                })
            )

            act(() => {
                jest.runOnlyPendingTimers()
            })

            rerender(
                createProps({
                    showExitModal: true,
                    isCarouselActive: false,
                })
            )

            rerender(
                createProps({
                    showExitModal: false,
                    isCarouselActive: true,
                })
            )

            act(() => {
                jest.runOnlyPendingTimers()
            })

            expect(clearTimeoutSpy).toHaveBeenCalled()

            clearTimeoutSpy.mockRestore()
        })

        it("should respect updated isCarouselActive in fallback", () => {
            const activeGameState = new LaunchedGameState(
                "https://test.com/game?sessionId=test-123",
                mockGame,
                mockVitalRef
            )

            const { rerender } = renderHook(
                (props) => useFocusRestoration(props),
                {
                    wrapper,
                    initialProps: createProps({
                        launchedGameState: activeGameState,
                    }),
                }
            )

            rerender(createProps())

            act(() => {
                jest.runOnlyPendingTimers()
            })

            mockSetFocus.mockClear()
            mockLoggerWarn.mockClear()

            rerender(
                createProps({
                    isCarouselActive: false,
                })
            )
            ;(document.hasFocus as jest.Mock).mockReturnValue(false)

            act(() => {
                jest.advanceTimersByTime(FOCUS_RECOVERY_FALLBACK_DELAY_MS)
            })

            expect(mockLoggerWarn).not.toHaveBeenCalled()
            expect(mockSetFocus).not.toHaveBeenCalled()
        })

        it("should respect updated showExitModal in fallback", () => {
            const activeGameState = new LaunchedGameState(
                "https://test.com/game?sessionId=test-123",
                mockGame,
                mockVitalRef
            )

            const { rerender } = renderHook(
                (props) => useFocusRestoration(props),
                {
                    wrapper,
                    initialProps: createProps({
                        launchedGameState: activeGameState,
                    }),
                }
            )

            rerender(createProps())

            act(() => {
                jest.runOnlyPendingTimers()
            })

            mockSetFocus.mockClear()
            mockLoggerWarn.mockClear()

            rerender(
                createProps({
                    showExitModal: true,
                })
            )
            ;(document.hasFocus as jest.Mock).mockReturnValue(false)

            act(() => {
                jest.advanceTimersByTime(FOCUS_RECOVERY_FALLBACK_DELAY_MS)
            })

            expect(mockLoggerWarn).not.toHaveBeenCalled()
            expect(mockSetFocus).not.toHaveBeenCalled()
        })

        it("should respect updated showWeekendRebrandModal in fallback", () => {
            const activeGameState = new LaunchedGameState(
                "https://test.com/game?sessionId=test-123",
                mockGame,
                mockVitalRef
            )

            const { rerender } = renderHook(
                (props) => useFocusRestoration(props),
                {
                    wrapper,
                    initialProps: createProps({
                        launchedGameState: activeGameState,
                    }),
                }
            )

            rerender(createProps())

            act(() => {
                jest.runOnlyPendingTimers()
            })

            mockSetFocus.mockClear()
            mockLoggerWarn.mockClear()

            rerender(
                createProps({
                    showWeekendRebrandModal: true,
                })
            )
            ;(document.hasFocus as jest.Mock).mockReturnValue(false)

            act(() => {
                jest.advanceTimersByTime(FOCUS_RECOVERY_FALLBACK_DELAY_MS)
            })

            expect(mockLoggerWarn).not.toHaveBeenCalled()
            expect(mockSetFocus).not.toHaveBeenCalled()
        })

        it("should respect updated isInUpsell in fallback", () => {
            const activeGameState = new LaunchedGameState(
                "https://test.com/game?sessionId=test-123",
                mockGame,
                mockVitalRef
            )

            const { rerender } = renderHook(
                (props) => useFocusRestoration(props),
                {
                    wrapper,
                    initialProps: createProps({
                        launchedGameState: activeGameState,
                    }),
                }
            )

            rerender(createProps())

            act(() => {
                jest.runOnlyPendingTimers()
            })

            mockSetFocus.mockClear()
            mockLoggerWarn.mockClear()

            rerender(
                createProps({
                    isInUpsell: true,
                })
            )
            ;(document.hasFocus as jest.Mock).mockReturnValue(false)

            act(() => {
                jest.advanceTimersByTime(FOCUS_RECOVERY_FALLBACK_DELAY_MS)
            })

            expect(mockLoggerWarn).not.toHaveBeenCalled()
            expect(mockSetFocus).not.toHaveBeenCalled()
        })
    })
})
