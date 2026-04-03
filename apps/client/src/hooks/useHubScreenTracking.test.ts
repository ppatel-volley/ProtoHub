import { renderHook } from "@testing-library/react"

import type { Game } from "./useGames"
import { useHubScreenTracking } from "./useHubScreenTracking"

jest.mock("uuid", () => ({
    v4: jest.fn(),
}))

jest.mock("../utils/logger", () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}))

jest.mock("./useGames", () => ({
    useGames: jest.fn(),
}))

jest.mock("./useHubTracking", () => ({
    useHubTracking: jest.fn(),
}))

const mockUseGames = require("./useGames").useGames
const mockUseHubTracking = require("./useHubTracking").useHubTracking
const mockUuidV4 = require("uuid").v4 as jest.Mock

describe("useHubScreenTracking", () => {
    const mockTrack = jest.fn()
    const mockIdentify = jest.fn()
    const mockGroup = jest.fn()

    const createMockGame = (): Game => ({
        id: "jeopardy",
        title: "Jeopardy",
        tileImageUrl: "test-tile.avif",
        heroImageUrl: "test-hero.avif",
        source: "placeholder" as const,
    })

    beforeEach(() => {
        jest.clearAllMocks()
        mockUuidV4.mockReturnValue("test-uuid-123")
        mockUseHubTracking.mockReturnValue({
            track: mockTrack,
            identify: mockIdentify,
            group: mockGroup,
        })
        mockUseGames.mockReturnValue([
            {
                id: "jeopardy",
                title: "Jeopardy",
                tileImageUrl: "test-tile.avif",
                heroImageUrl: "test-hero.avif",
                source: "placeholder" as const,
            },
            {
                id: "song-quiz",
                title: "Song Quiz",
                tileImageUrl: "test-tile-2.avif",
                heroImageUrl: "test-hero-2.avif",
                source: "placeholder" as const,
            },
        ])
    })

    it("should track hub screen displayed when loading is hidden and games are available", () => {
        const { result } = renderHook(() =>
            useHubScreenTracking(true, null, false)
        )

        expect(mockTrack).toHaveBeenCalledWith("Hub Screen Displayed", {
            screenDisplayedId: "test-uuid-123",
            displayChoices: ["jeopardy", "song quiz"],
            eventCategory: "menu",
            eventSubCategory: "game selection",
            text: "",
        })

        expect(result.current.screenDisplayedId).toBe("test-uuid-123")
    })

    it("should not track when loading is not hidden", () => {
        const { result } = renderHook(() =>
            useHubScreenTracking(false, null, false)
        )

        expect(mockTrack).not.toHaveBeenCalled()
        expect(result.current.screenDisplayedId).toBeNull()
    })

    it("should not track when no games are available", () => {
        mockUseGames.mockReturnValue([])

        renderHook(() => useHubScreenTracking(true, null, false))

        expect(mockTrack).not.toHaveBeenCalled()
    })

    it("should only track once even if re-rendered multiple times", () => {
        const initialProps = {
            isInitialized: true,
            activeGame: null as Game | null,
            isInUpsell: false,
        }
        const { rerender } = renderHook(
            ({
                isInitialized,
                activeGame,
                isInUpsell,
            }: {
                isInitialized: boolean
                activeGame: Game | null
                isInUpsell: boolean
            }) => useHubScreenTracking(isInitialized, activeGame, isInUpsell),
            { initialProps }
        )

        expect(mockTrack).toHaveBeenCalledTimes(1)

        const sameProps = {
            isInitialized: true,
            activeGame: null as Game | null,
            isInUpsell: false,
        }
        rerender(sameProps)
        expect(mockTrack).toHaveBeenCalledTimes(1)

        const hiddenProps = {
            isInitialized: false,
            activeGame: null as Game | null,
            isInUpsell: false,
        }
        rerender(hiddenProps)
        expect(mockTrack).toHaveBeenCalledTimes(1)

        const visibleAgainProps = {
            isInitialized: true,
            activeGame: null as Game | null,
            isInUpsell: false,
        }
        rerender(visibleAgainProps)
        expect(mockTrack).toHaveBeenCalledTimes(1)
    })

    it("should track when loading becomes hidden after initial render", () => {
        const initialProps = {
            isInitialized: false,
            activeGame: null as Game | null,
            isInUpsell: false,
        }
        const { rerender } = renderHook(
            ({
                isInitialized,
                activeGame,
                isInUpsell,
            }: {
                isInitialized: boolean
                activeGame: Game | null
                isInUpsell: boolean
            }) => useHubScreenTracking(isInitialized, activeGame, isInUpsell),
            { initialProps }
        )

        expect(mockTrack).not.toHaveBeenCalled()

        const visibleProps = {
            isInitialized: true,
            activeGame: null as Game | null,
            isInUpsell: false,
        }
        rerender(visibleProps)
        expect(mockTrack).toHaveBeenCalledWith("Hub Screen Displayed", {
            screenDisplayedId: "test-uuid-123",
            displayChoices: ["jeopardy", "song quiz"],
            eventCategory: "menu",
            eventSubCategory: "game selection",
            text: "",
        })
    })

    it("should track when returning from a game", () => {
        const mockGame = createMockGame()

        const initialProps = {
            isInitialized: true,
            activeGame: mockGame as Game | null,
            isInUpsell: false,
        }
        const { rerender } = renderHook(
            ({
                isInitialized,
                activeGame,
                isInUpsell,
            }: {
                isInitialized: boolean
                activeGame: Game | null
                isInUpsell: boolean
            }) => useHubScreenTracking(isInitialized, activeGame, isInUpsell),
            { initialProps }
        )

        expect(mockTrack).not.toHaveBeenCalled()

        const returningProps = {
            isInitialized: true,
            activeGame: null as Game | null,
            isInUpsell: false,
        }
        rerender(returningProps)
        expect(mockTrack).toHaveBeenCalledWith("Hub Screen Displayed", {
            screenDisplayedId: "test-uuid-123",
            displayChoices: ["jeopardy", "song quiz"],
            eventCategory: "menu",
            eventSubCategory: "game selection",
            text: "",
        })
    })

    it("should track both initial load and returning from game", () => {
        const mockGame = createMockGame()

        const initialProps = {
            isInitialized: true,
            activeGame: null as Game | null,
            isInUpsell: false,
        }
        const { rerender } = renderHook(
            ({
                isInitialized,
                activeGame,
                isInUpsell,
            }: {
                isInitialized: boolean
                activeGame: Game | null
                isInUpsell: boolean
            }) => useHubScreenTracking(isInitialized, activeGame, isInUpsell),
            { initialProps }
        )

        expect(mockTrack).toHaveBeenCalledTimes(1)

        const gameActiveProps = {
            isInitialized: true,
            activeGame: mockGame as Game | null,
            isInUpsell: false,
        }
        rerender(gameActiveProps)
        expect(mockTrack).toHaveBeenCalledTimes(1)

        const returningProps = {
            isInitialized: true,
            activeGame: null as Game | null,
            isInUpsell: false,
        }
        rerender(returningProps)
        expect(mockTrack).toHaveBeenCalledTimes(2)

        expect(mockTrack).toHaveBeenLastCalledWith("Hub Screen Displayed", {
            screenDisplayedId: "test-uuid-123",
            displayChoices: ["jeopardy", "song quiz"],
            eventCategory: "menu",
            eventSubCategory: "game selection",
            text: "",
        })
    })

    it("should not track when activeGame changes but loading is hidden", () => {
        const mockGame = createMockGame()

        const initialProps = {
            isInitialized: false,
            activeGame: mockGame as Game | null,
            isInUpsell: false,
        }
        const { rerender } = renderHook(
            ({
                isInitialized,
                activeGame,
                isInUpsell,
            }: {
                isInitialized: boolean
                activeGame: Game | null
                isInUpsell: boolean
            }) => useHubScreenTracking(isInitialized, activeGame, isInUpsell),
            { initialProps }
        )

        expect(mockTrack).not.toHaveBeenCalled()

        const noGameProps = {
            isInitialized: false,
            activeGame: null as Game | null,
            isInUpsell: false,
        }
        rerender(noGameProps)
        expect(mockTrack).not.toHaveBeenCalled()
    })

    it("should track when returning to hub multiple times from the same game", () => {
        const mockGame = createMockGame()

        const initialProps = {
            isInitialized: true,
            activeGame: null as Game | null,
            isInUpsell: false,
        }
        const { rerender } = renderHook(
            ({
                isInitialized,
                activeGame,
                isInUpsell,
            }: {
                isInitialized: boolean
                activeGame: Game | null
                isInUpsell: boolean
            }) => useHubScreenTracking(isInitialized, activeGame, isInUpsell),
            { initialProps }
        )

        expect(mockTrack).toHaveBeenCalledTimes(1)

        const gameActiveProps1 = {
            isInitialized: true,
            activeGame: mockGame as Game | null,
            isInUpsell: false,
        }
        rerender(gameActiveProps1)
        expect(mockTrack).toHaveBeenCalledTimes(1)

        const returningProps1 = {
            isInitialized: true,
            activeGame: null as Game | null,
            isInUpsell: false,
        }
        rerender(returningProps1)
        expect(mockTrack).toHaveBeenCalledTimes(2)

        const gameActiveProps2 = {
            isInitialized: true,
            activeGame: mockGame as Game | null,
            isInUpsell: false,
        }
        rerender(gameActiveProps2)
        expect(mockTrack).toHaveBeenCalledTimes(2)

        const returningProps2 = {
            isInitialized: true,
            activeGame: null as Game | null,
            isInUpsell: false,
        }
        rerender(returningProps2)
        expect(mockTrack).toHaveBeenCalledTimes(3)

        expect(mockTrack).toHaveBeenLastCalledWith("Hub Screen Displayed", {
            screenDisplayedId: "test-uuid-123",
            displayChoices: ["jeopardy", "song quiz"],
            eventCategory: "menu",
            eventSubCategory: "game selection",
            text: "",
        })
    })

    it("should generate unique screenDisplayedId for each screen display", () => {
        let uuidCounter = 0
        mockUuidV4.mockImplementation(() => `test-uuid-${++uuidCounter}`)

        const mockGame = createMockGame()

        const initialProps = {
            isInitialized: true,
            activeGame: null as Game | null,
            isInUpsell: false,
        }
        const { result, rerender } = renderHook(
            ({
                isInitialized,
                activeGame,
                isInUpsell,
            }: {
                isInitialized: boolean
                activeGame: Game | null
                isInUpsell: boolean
            }) => useHubScreenTracking(isInitialized, activeGame, isInUpsell),
            { initialProps }
        )

        expect(result.current.screenDisplayedId).toBe("test-uuid-1")
        expect(mockTrack).toHaveBeenCalledWith("Hub Screen Displayed", {
            screenDisplayedId: "test-uuid-1",
            displayChoices: ["jeopardy", "song quiz"],
            eventCategory: "menu",
            eventSubCategory: "game selection",
            text: "",
        })

        const gameActiveProps = {
            isInitialized: true,
            activeGame: mockGame as Game | null,
            isInUpsell: false,
        }
        rerender(gameActiveProps)
        expect(result.current.screenDisplayedId).toBe("test-uuid-1")

        const returningProps = {
            isInitialized: true,
            activeGame: null as Game | null,
            isInUpsell: false,
        }
        rerender(returningProps)
        expect(result.current.screenDisplayedId).toBe("test-uuid-2")
        expect(mockTrack).toHaveBeenLastCalledWith("Hub Screen Displayed", {
            screenDisplayedId: "test-uuid-2",
            displayChoices: ["jeopardy", "song quiz"],
            eventCategory: "menu",
            eventSubCategory: "game selection",
            text: "",
        })
    })

    it("should return null screenDisplayedId when conditions are not met", () => {
        const { result } = renderHook(() =>
            useHubScreenTracking(false, null, false)
        )
        expect(result.current.screenDisplayedId).toBeNull()

        const { result: result2 } = renderHook(() => {
            mockUseGames.mockReturnValue([])
            return useHubScreenTracking(true, null, false)
        })
        expect(result2.current.screenDisplayedId).toBeNull()
    })

    describe("upsell behavior", () => {
        it("should not track when isInUpsell is true", () => {
            const { result } = renderHook(() =>
                useHubScreenTracking(true, null, true)
            )

            expect(mockTrack).not.toHaveBeenCalled()
            expect(result.current.screenDisplayedId).toBeNull()
        })

        it("should track when upsell is dismissed (isInUpsell goes from true to false)", () => {
            const initialProps = {
                isInitialized: true,
                activeGame: null as Game | null,
                isInUpsell: true,
            }
            const { rerender, result } = renderHook(
                ({
                    isInitialized,
                    activeGame,
                    isInUpsell,
                }: {
                    isInitialized: boolean
                    activeGame: Game | null
                    isInUpsell: boolean
                }) =>
                    useHubScreenTracking(isInitialized, activeGame, isInUpsell),
                { initialProps }
            )

            expect(mockTrack).not.toHaveBeenCalled()
            expect(result.current.screenDisplayedId).toBeNull()

            const upsellDismissedProps = {
                isInitialized: true,
                activeGame: null as Game | null,
                isInUpsell: false,
            }
            rerender(upsellDismissedProps)

            expect(mockTrack).toHaveBeenCalledTimes(1)
            expect(mockTrack).toHaveBeenCalledWith("Hub Screen Displayed", {
                screenDisplayedId: "test-uuid-123",
                displayChoices: ["jeopardy", "song quiz"],
                eventCategory: "menu",
                eventSubCategory: "game selection",
                text: "",
            })
            expect(result.current.screenDisplayedId).toBe("test-uuid-123")
        })

        it("should track only once when upsell is dismissed multiple times in same session", () => {
            const initialProps = {
                isInitialized: true,
                activeGame: null as Game | null,
                isInUpsell: true,
            }
            const { rerender } = renderHook(
                ({
                    isInitialized,
                    activeGame,
                    isInUpsell,
                }: {
                    isInitialized: boolean
                    activeGame: Game | null
                    isInUpsell: boolean
                }) =>
                    useHubScreenTracking(isInitialized, activeGame, isInUpsell),
                { initialProps }
            )

            expect(mockTrack).not.toHaveBeenCalled()

            rerender({
                isInitialized: true,
                activeGame: null as Game | null,
                isInUpsell: false,
            })
            expect(mockTrack).toHaveBeenCalledTimes(1)

            rerender({
                isInitialized: true,
                activeGame: null as Game | null,
                isInUpsell: true,
            })
            expect(mockTrack).toHaveBeenCalledTimes(1)

            rerender({
                isInitialized: true,
                activeGame: null as Game | null,
                isInUpsell: false,
            })
            expect(mockTrack).toHaveBeenCalledTimes(1)
        })
    })
})
