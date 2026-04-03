import type { RenderHookResult } from "@testing-library/react"
import { renderHook } from "@testing-library/react"
import { act } from "react"

import { useGameFocusHandler } from "./useGameFocusHandler"
import type { Game } from "./useGames"

describe("useGameFocusHandler", () => {
    const mockGames: Game[] = [
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
            source: "placeholder" as const,
        },
    ]

    const mockUpdateLastFocusedTile = jest.fn()
    const mockTrack = jest.fn()
    const mockSetSelectedGame = jest.fn()
    let mockScreenDisplayedIdRef: { current: string | null }

    beforeEach(() => {
        jest.clearAllMocks()
        mockScreenDisplayedIdRef = { current: "test-screen-id" }
    })

    const renderUseGameFocusHandler: () => RenderHookResult<
        ReturnType<typeof useGameFocusHandler>,
        { games: Game[] }
    > = () => {
        return renderHook(() =>
            useGameFocusHandler({
                games: mockGames,
                updateLastFocusedTile: mockUpdateLastFocusedTile,
                track: mockTrack,
                screenDisplayedIdRef: mockScreenDisplayedIdRef,
                setSelectedGame: mockSetSelectedGame,
            })
        )
    }

    describe("handleGameFocus", () => {
        it("should update last focused tile for first game", () => {
            const { result } = renderUseGameFocusHandler()

            act(() => {
                result.current.handleGameFocus(mockGames[0]!)
            })

            expect(mockUpdateLastFocusedTile).toHaveBeenCalledWith(
                "game-tile-0"
            )
        })

        it("should update last focused tile for second game", () => {
            const { result } = renderUseGameFocusHandler()

            act(() => {
                result.current.handleGameFocus(mockGames[1]!)
            })

            expect(mockUpdateLastFocusedTile).toHaveBeenCalledWith(
                "game-tile-1"
            )
        })

        it("should not update last focused tile for game not in array", () => {
            const { result } = renderUseGameFocusHandler()
            const gameNotInArray: Game = {
                id: "wheel-of-fortune",
                title: "Wheel of Fortune",
                tileImageUrl: "/wof.avif",
                heroImageUrl: "/wof-hero.avif",
                source: "placeholder" as const,
            }

            act(() => {
                result.current.handleGameFocus(gameNotInArray)
            })

            expect(mockUpdateLastFocusedTile).not.toHaveBeenCalled()
        })

        it("should call setSelectedGame with the focused game", () => {
            const { result } = renderUseGameFocusHandler()

            act(() => {
                result.current.handleGameFocus(mockGames[0]!)
            })

            expect(mockSetSelectedGame).toHaveBeenCalledWith(mockGames[0])
        })

        it("should track Hub Button Hovered when screenDisplayedId is available", () => {
            const { result } = renderUseGameFocusHandler()

            act(() => {
                result.current.handleGameFocus(mockGames[0]!)
            })

            expect(mockTrack).toHaveBeenCalledWith("Hub Button Hovered", {
                eventCategory: "menu",
                eventSubCategory: "jeopardy",
                screenDisplayedId: "test-screen-id",
                heroId: "/jeopardy-hero.avif",
                tileId: "/jeopardy.avif",
            })
        })

        it("should not track when screenDisplayedId is null", () => {
            mockScreenDisplayedIdRef.current = null
            const { result } = renderUseGameFocusHandler()

            act(() => {
                result.current.handleGameFocus(mockGames[0]!)
            })

            expect(mockTrack).not.toHaveBeenCalled()
            expect(mockSetSelectedGame).toHaveBeenCalledWith(mockGames[0])
            expect(mockUpdateLastFocusedTile).toHaveBeenCalledWith(
                "game-tile-0"
            )
        })

        it("should track with correct game properties for different games", () => {
            const { result } = renderUseGameFocusHandler()

            act(() => {
                result.current.handleGameFocus(mockGames[1]!)
            })

            expect(mockTrack).toHaveBeenCalledWith("Hub Button Hovered", {
                eventCategory: "menu",
                eventSubCategory: "cocomelon",
                screenDisplayedId: "test-screen-id",
                heroId: "/cocomelon-hero.avif",
                tileId: "/cocomelon.avif",
            })
        })

        it("should handle multiple focus calls correctly", () => {
            const { result } = renderUseGameFocusHandler()

            act(() => {
                result.current.handleGameFocus(mockGames[0]!)
            })

            act(() => {
                result.current.handleGameFocus(mockGames[1]!)
            })

            expect(mockUpdateLastFocusedTile).toHaveBeenCalledTimes(2)
            expect(mockUpdateLastFocusedTile).toHaveBeenNthCalledWith(
                1,
                "game-tile-0"
            )
            expect(mockUpdateLastFocusedTile).toHaveBeenNthCalledWith(
                2,
                "game-tile-1"
            )

            expect(mockSetSelectedGame).toHaveBeenCalledTimes(2)
            expect(mockSetSelectedGame).toHaveBeenNthCalledWith(1, mockGames[0])
            expect(mockSetSelectedGame).toHaveBeenNthCalledWith(2, mockGames[1])

            expect(mockTrack).toHaveBeenCalledTimes(2)
        })
    })

    describe("memoization", () => {
        it("should return stable handleGameFocus reference when dependencies unchanged", () => {
            const { result, rerender } = renderUseGameFocusHandler()
            const firstCallback = result.current.handleGameFocus

            rerender()
            const secondCallback = result.current.handleGameFocus

            expect(firstCallback).toBe(secondCallback)
        })

        it("should return new handleGameFocus reference when games change", () => {
            const { result, rerender } = renderHook(
                ({ games }) =>
                    useGameFocusHandler({
                        games,
                        updateLastFocusedTile: mockUpdateLastFocusedTile,
                        track: mockTrack,
                        screenDisplayedIdRef: mockScreenDisplayedIdRef,
                        setSelectedGame: mockSetSelectedGame,
                    }),
                { initialProps: { games: mockGames } }
            )
            const firstCallback = result.current.handleGameFocus

            rerender({ games: [mockGames[0]!] })
            const secondCallback = result.current.handleGameFocus

            expect(firstCallback).not.toBe(secondCallback)
        })
    })
})
