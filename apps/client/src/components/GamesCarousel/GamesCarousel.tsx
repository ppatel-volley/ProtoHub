import { type CSSProperties, type JSX, useRef, useState } from "react"

import { BASE_URL } from "../../config/envconfig"
import { useAsset } from "../../hooks/useAsset"
import { useFocusTracking } from "../../hooks/useFocusTracking"
import type { GameLauncher } from "../../hooks/useGameLauncher"
import type { Game, GameId } from "../../hooks/useGames"
import { useGames } from "../../hooks/useGames"
import { useHubTracking } from "../../hooks/useHubTracking"
import type { LaunchedGameState } from "../../hooks/useLaunchedGameState"
import { logger } from "../../utils/logger"
import { FocusableContainer } from "../FocusableUI/FocusableContainer"
import { FocusIndicator } from "../FocusableUI/FocusIndicator"
import GameTile from "../GameTile"
import styles from "./GamesCarousel.module.scss"

interface GamesCarouselProps {
    onGameFocus?: (game: Game) => void
    launchedGameState: LaunchedGameState | null
    isCarouselActive: boolean
    screenDisplayedId?: string | null
    gameLauncher: GameLauncher
}

/**
 * Renders game tiles in a carousel with spatial navigation. Uses useFocusTracking
 * to drive a floating FocusIndicator that follows the focused tile.
 */
export const GamesCarousel = ({
    onGameFocus,
    launchedGameState,
    isCarouselActive,
    screenDisplayedId,
    gameLauncher,
}: GamesCarouselProps): JSX.Element => {
    const containerRef = useRef<HTMLDivElement>(null)
    const focusableContainerRef = useRef<HTMLDivElement>(null)
    const hasReceivedFirstFocus = useRef(false)
    const { track } = useHubTracking()
    const [isPressed, setIsPressed] = useState<GameId | null>(null)
    const [scrollX, setScrollX] = useState(0)

    const {
        focusTarget,
        initialized,
        initializeWithElement,
        updateFocusTarget,
    } = useFocusTracking({
        fadeInDelay: 0,
    })

    const games = useGames()
    const focusFramePath = useAsset("focusFrame")
    const firstGameTile = "game-tile-0"

    const handleTileFocus = (element: HTMLDivElement, game: Game): void => {
        const container = containerRef.current
        if (container) {
            const containerWidth = container.offsetWidth
            const tileLeft = element.offsetLeft
            const tileRight = tileLeft + element.offsetWidth
            const SCROLL_PEEK_OFFSET = 65

            setScrollX((prev) => {
                const visibleRight = prev + containerWidth

                if (tileRight + SCROLL_PEEK_OFFSET > visibleRight) {
                    return tileRight - containerWidth + SCROLL_PEEK_OFFSET
                }

                if (tileLeft - SCROLL_PEEK_OFFSET < prev) {
                    return Math.max(0, tileLeft - SCROLL_PEEK_OFFSET)
                }

                return prev
            })
        }

        // Initialize focus indicator on first focus event
        if (!hasReceivedFirstFocus.current) {
            initializeWithElement(element)
            hasReceivedFirstFocus.current = true
        } else {
            // Update focus indicator for subsequent focus events
            updateFocusTarget(element)
        }

        onGameFocus?.(game)
    }

    const handleGameSelect = async (game: Game): Promise<void> => {
        setIsPressed(game.id)

        if (screenDisplayedId) {
            void track("Hub Button Pressed", {
                choiceValue: game.id,
                eventCategory: "menu",
                eventSubCategory: "game selection",
                screenDisplayedId,
                displayChoices: games.map((g) => g.id),
                text: "",
            })
        } else {
            logger.warn(
                "Hub Button Pressed not tracked - no screen displayed id"
            )
        }
        await gameLauncher.launchGame(game)
    }

    const carouselTransformStyle: CSSProperties = {
        transform: `translate3d(${-scrollX}px, 0, 0.1px)`,
        transition: "transform 0.3s ease",
    }

    if (launchedGameState !== null) {
        throw new Error(
            "GamesCarousel should not be rendered when launchedGameState is launched"
        )
    }

    return (
        <div ref={containerRef} className={styles.container}>
            {/* Floating Focus Indicator */}
            <FocusIndicator
                target={focusTarget}
                initialized={initialized}
                isPressed={isPressed !== null}
                imagePath={`${BASE_URL}${focusFramePath}`}
                scrollOffset={scrollX}
            />

            {/* Games Grid */}
            <FocusableContainer
                ref={focusableContainerRef}
                className={styles.gamesCarousel}
                style={carouselTransformStyle}
                defaultFocusKey={firstGameTile}
                focusable={isCarouselActive}
                autoFocus={false}
            >
                {games.map((game, index) => (
                    <GameTile
                        key={game.id}
                        index={index}
                        game={game}
                        onFocus={(el) => {
                            handleTileFocus(el, game)
                        }}
                        isCarouselActive={isCarouselActive}
                        onSelect={() => {
                            void handleGameSelect(game)
                        }}
                        isPressed={isPressed === game.id}
                        onBlur={setIsPressed}
                    />
                ))}
            </FocusableContainer>
        </div>
    )
}
