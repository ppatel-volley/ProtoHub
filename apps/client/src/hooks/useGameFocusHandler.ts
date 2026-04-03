import type { RefObject } from "react"
import { useCallback } from "react"

import type { Game } from "./useGames"

interface UseGameFocusHandlerParams {
    games: Game[]
    updateLastFocusedTile: (tileId: string) => void
    track: <K extends string>(
        eventName: K,
        eventProperties: Record<string, unknown>,
        timestamp?: Date
    ) => void
    screenDisplayedIdRef: RefObject<string | null>
    setSelectedGame: (game: Game) => void
}

/** Updates last-focused tile index, sets selected game, and tracks hub button hover when a game receives focus. Only tracks when screenDisplayedId is available. */
export const useGameFocusHandler = ({
    games,
    updateLastFocusedTile,
    track,
    screenDisplayedIdRef,
    setSelectedGame,
}: UseGameFocusHandlerParams): { handleGameFocus: (game: Game) => void } => {
    const handleGameFocus = useCallback(
        (game: Game) => {
            const gameIndex = games.findIndex((g) => g.id === game.id)
            if (gameIndex !== -1) {
                updateLastFocusedTile(`game-tile-${gameIndex}`)
            }
            setSelectedGame(game)
            if (screenDisplayedIdRef.current !== null) {
                track("Hub Button Hovered", {
                    eventCategory: "menu" as const,
                    eventSubCategory: game.id,
                    screenDisplayedId: screenDisplayedIdRef.current,
                    heroId: game.heroImageUrl,
                    tileId: game.tileImageUrl,
                })
            }
        },
        [
            games,
            updateLastFocusedTile,
            track,
            screenDisplayedIdRef,
            setSelectedGame,
        ]
    )

    return { handleGameFocus }
}
