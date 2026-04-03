import { useEffect, useRef, useState } from "react"
import { v4 as uuidv4 } from "uuid"

import { logger } from "../utils/logger"
import type { Game } from "./useGames"
import { useGames } from "./useGames"
import { useHubTracking } from "./useHubTracking"

/**
 * Hook to track the "Hub Screen Displayed" event when the TV hub is shown.
 * Tracks on initial load and when returning from a game.
 * When isInUpsell is true, the initial tracking is deferred until upsell is dismissed.
 * Returns the current screenDisplayedId for use in button press events.
 */
export const useHubScreenTracking = (
    isInitialized: boolean,
    activeGame: Game | null,
    isInUpsell: boolean = false
): { screenDisplayedId: string | null } => {
    const { track } = useHubTracking()
    const games = useGames()
    const hasTrackedInitialRef = useRef(false)
    const prevActiveGameRef = useRef<Game | null>(activeGame)
    const prevIsInUpsellRef = useRef<boolean>(isInUpsell)
    const [screenDisplayedId, setScreenDisplayedId] = useState<string | null>(
        null
    )

    useEffect(() => {
        const isHubVisible =
            isInitialized && activeGame === null && games.length > 0
        const isReturningFromGame =
            isHubVisible && prevActiveGameRef.current !== null
        const isUpsellDismissed =
            isHubVisible &&
            !isInUpsell &&
            prevIsInUpsellRef.current === true &&
            !hasTrackedInitialRef.current
        const isInitialHubDisplay =
            isHubVisible &&
            !hasTrackedInitialRef.current &&
            !isInUpsell &&
            !prevIsInUpsellRef.current

        const trackHubScreenDisplayed = (context: string): void => {
            const newScreenDisplayedId = uuidv4()
            setScreenDisplayedId(newScreenDisplayedId)

            logger.info(
                `Tracking Hub Screen Displayed (${context}) with ID: ${newScreenDisplayedId}`
            )
            void track("Hub Screen Displayed", {
                screenDisplayedId: newScreenDisplayedId,
                displayChoices: games.map((game) => game.id),
                eventCategory: "menu",
                eventSubCategory: "game selection",
                text: "",
            })
        }

        if (isInitialHubDisplay) {
            hasTrackedInitialRef.current = true
            trackHubScreenDisplayed("initial")
        }

        if (isUpsellDismissed) {
            hasTrackedInitialRef.current = true
            trackHubScreenDisplayed("upsell dismissed")
        }

        if (isReturningFromGame) {
            trackHubScreenDisplayed("returning from game")
        }

        prevActiveGameRef.current = activeGame
        prevIsInUpsellRef.current = isInUpsell
    }, [isInitialized, activeGame, games, track, isInUpsell])

    return { screenDisplayedId }
}
