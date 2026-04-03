import type { datadogRum } from "@datadog/browser-rum"
import { act, renderHook } from "@testing-library/react"

import { GameStatus } from "../constants/game"
import type { Game } from "./useGames"
import { LaunchedGameState, useLaunchedGameState } from "./useLaunchedGameState"

const createMockVitalRef = (): ReturnType<
    typeof datadogRum.startDurationVital
> => ({}) as ReturnType<typeof datadogRum.startDurationVital>

describe("useLaunchedGameState", () => {
    const mockGame: Game = {
        id: "jeopardy",
        title: "Test Game",
        tileImageUrl: "test-tile.avif",
        heroImageUrl: "test-hero.avif",
        animationUri: "test-animation.riv",
        source: "placeholder" as const,
        status: GameStatus.New,
    }

    const mockUrl = "https://game.example.com/test-session-123"
    const mockVitalRef = createMockVitalRef()

    describe("LaunchedGameState class", () => {
        describe("constructor", () => {
            it("should create instance with url, game, and vitalRef", () => {
                const launchedGame = new LaunchedGameState(
                    mockUrl,
                    mockGame,
                    mockVitalRef
                )

                expect(launchedGame.urlWithSessionId).toBe(mockUrl)
                expect(launchedGame.activeGame).toBe(mockGame)
                expect(launchedGame.launchVitalRef).toBe(mockVitalRef)
            })

            it("should create instance with null vitalRef", () => {
                const launchedGame = new LaunchedGameState(
                    mockUrl,
                    mockGame,
                    null
                )

                expect(launchedGame.urlWithSessionId).toBe(mockUrl)
                expect(launchedGame.activeGame).toBe(mockGame)
                expect(launchedGame.launchVitalRef).toBeNull()
            })

            it("should throw error when url is empty string", () => {
                expect(() => {
                    new LaunchedGameState("", mockGame, mockVitalRef)
                }).toThrow(
                    "LaunchedGameState requires urlWithSessionId to be a non-empty string"
                )
            })

            it("should throw error when url is only whitespace", () => {
                expect(() => {
                    new LaunchedGameState("   ", mockGame, mockVitalRef)
                }).toThrow(
                    "LaunchedGameState requires urlWithSessionId to be a non-empty string"
                )
            })

            it("should accept valid url and game", () => {
                expect(() => {
                    new LaunchedGameState(mockUrl, mockGame, mockVitalRef)
                }).not.toThrow()
            })
        })
    })

    describe("useLaunchedGameState hook", () => {
        it("should initialize with null state", () => {
            const { result } = renderHook(() => useLaunchedGameState())

            const [state] = result.current
            expect(state).toBeNull()
        })

        it("should return state and setter function", () => {
            const { result } = renderHook(() => useLaunchedGameState())

            const [state, setState] = result.current
            expect(state).toBeNull()
            expect(typeof setState).toBe("function")
        })

        it("should update state when setter is called", () => {
            const { result } = renderHook(() => useLaunchedGameState())

            const newState = new LaunchedGameState(
                mockUrl,
                mockGame,
                mockVitalRef
            )

            act(() => {
                const [, setState] = result.current
                setState(newState)
            })

            const [updatedState] = result.current
            expect(updatedState).toBe(newState)
            expect(updatedState?.urlWithSessionId).toBe(mockUrl)
            expect(updatedState?.activeGame).toBe(mockGame)
            expect(updatedState?.launchVitalRef).toBe(mockVitalRef)
        })

        it("should set state to null", () => {
            const { result } = renderHook(() => useLaunchedGameState())

            // First set to a launched state
            const launchedState = new LaunchedGameState(
                mockUrl,
                mockGame,
                mockVitalRef
            )

            act(() => {
                const [, setState] = result.current
                setState(launchedState)
            })

            expect(result.current[0]).toBe(launchedState)

            // Then set back to null
            act(() => {
                const [, setState] = result.current
                setState(null)
            })

            expect(result.current[0]).toBeNull()
        })
    })

    describe("type validation", () => {
        it("should enforce non-empty url", () => {
            expect(() => {
                new LaunchedGameState("", mockGame, mockVitalRef)
            }).toThrow()
        })

        it("should allow null vitalRef", () => {
            expect(() => {
                new LaunchedGameState(mockUrl, mockGame, null)
            }).not.toThrow()
        })

        it("should require non-null game", () => {
            const state = new LaunchedGameState(mockUrl, mockGame, mockVitalRef)
            expect(state.activeGame).toBe(mockGame)
            expect(state.activeGame).not.toBeNull()
        })

        it("should require non-empty url", () => {
            const state = new LaunchedGameState(mockUrl, mockGame, mockVitalRef)
            expect(state.urlWithSessionId).toBe(mockUrl)
            expect(state.urlWithSessionId).not.toBe("")
        })
    })

    describe("integration scenarios", () => {
        it("should handle game launch workflow", () => {
            const { result } = renderHook(() => useLaunchedGameState())

            // Initial state - no game launched
            expect(result.current[0]).toBeNull()

            // Launch a game
            act(() => {
                const [, setState] = result.current
                setState(new LaunchedGameState(mockUrl, mockGame, mockVitalRef))
            })

            // Game is now launched
            const [launchedState] = result.current
            expect(launchedState).not.toBeNull()
            expect(launchedState?.activeGame?.title).toBe("Test Game")
            expect(launchedState?.urlWithSessionId).toBe(mockUrl)
            expect(launchedState?.launchVitalRef).toBe(mockVitalRef)

            // Close the game
            act(() => {
                const [, setState] = result.current
                setState(null)
            })

            // Game is closed
            expect(result.current[0]).toBeNull()
        })
    })
})
