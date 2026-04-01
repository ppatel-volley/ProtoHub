import type { Key } from "@volley/platform-sdk/lib"
import {
    useAccount,
    useGameOrchestration,
    useKeyDown,
    useSessionId,
} from "@volley/platform-sdk/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { v4 as uuidv4 } from "uuid"

import { clearDeeplink, getDeeplink } from "../../../config/deeplink"
import { OVERRIDE_GAME_ORCHESTRATION } from "../../../config/envconfig"
import { ENVIRONMENT } from "../../../config/envconfig"
import { Environment } from "../../../config/environment"
import { isLGTV, shouldUseWebCheckout } from "../../../config/platformDetection"
import { useFocusRestoration } from "../../../hooks/useFocusRestoration"
import { useGameFocusHandler } from "../../../hooks/useGameFocusHandler"
import { GameLauncher } from "../../../hooks/useGameLauncher"
import { type Game, GameId, useGames } from "../../../hooks/useGames"
import { useGameSelectionUpsell } from "../../../hooks/useGameSelectionUpsell"
import { useHubModals } from "../../../hooks/useHubModals"
import { useHubScreenTracking } from "../../../hooks/useHubScreenTracking"
import { useHubTracking } from "../../../hooks/useHubTracking"
import { useLaunchedGameState } from "../../../hooks/useLaunchedGameState"
import type { ImagePreloadingResult } from "../../../hooks/usePreloadImages"
import { useImagePreloading } from "../../../hooks/usePreloadImages"
import { logger } from "../../../utils/logger"
import { OverridenGameOrchestration } from "../../../utils/OverridenGameOrchestration"
import { ExitConfirmationModal } from "../../ExitConfirmationModal"
import GamesCarousel from "../../GamesCarousel"
import { LaunchedGame } from "../../LaunchedGame/LaunchedGame"
import { WeekendRebrandModal } from "../../WeekendRebrandModal"
import { BrandLogo } from "../BrandLogo"
import { Debug } from "../Debug"
import { HeroAssetFader } from "./HeroAssetFader"
import styles from "./Main.module.scss"

const MainContent: React.FC<{
    setAssetLoadingStates: (states: ImagePreloadingResult) => void
    isInitialized: boolean
    isJeopardyReload: boolean
    isInImmediateUpsell: boolean
}> = ({
    setAssetLoadingStates,
    isInitialized,
    isJeopardyReload,
    isInImmediateUpsell,
}) => {
    const { track } = useHubTracking()
    const games = useGames()
    const deeplink = getDeeplink()
    const { account } = useAccount()

    const wasInImmediateUpsellRef = useRef(isInImmediateUpsell)
    const deferMainHubAssets =
        wasInImmediateUpsellRef.current && shouldUseWebCheckout()
    const imagePreloadingStates = useImagePreloading(
        games,
        account?.isSubscribed,
        deferMainHubAssets
    )
    const { requiredImagesLoaded } = imagePreloadingStates
    useEffect(() => {
        setAssetLoadingStates(imagePreloadingStates)
    }, [imagePreloadingStates, setAssetLoadingStates])

    const { isInGameSelectionUpsell, handleGamePaywall } =
        useGameSelectionUpsell(deeplink)

    const handleGamePaywallRef = useRef(handleGamePaywall)
    useEffect(() => {
        handleGamePaywallRef.current = handleGamePaywall
    }, [handleGamePaywall])

    const isGamePaywallSatisfied = useCallback(
        (game: Game) => handleGamePaywallRef.current(game),
        []
    )

    const isInUpsell = isInImmediateUpsell || isInGameSelectionUpsell

    const isCarouselActive = isInitialized && !isInUpsell

    const defaultGame = games[0]
    const [selectedGame, setSelectedGame] = useState<Game | undefined>(
        defaultGame
    )

    const sessionId = useSessionId()

    const platformApiGameOrchestration = useGameOrchestration()
    const overridenGameOrchestration = new OverridenGameOrchestration(sessionId)

    const gameOrchestration =
        OVERRIDE_GAME_ORCHESTRATION === "true"
            ? overridenGameOrchestration
            : platformApiGameOrchestration

    const [launchedGameState, setLaunchedGameState] = useLaunchedGameState()

    const gameLauncherRef = useRef<GameLauncher | null>(null)
    if (gameLauncherRef.current === null) {
        gameLauncherRef.current = new GameLauncher(
            gameOrchestration,
            setLaunchedGameState,
            isGamePaywallSatisfied
        )
    }
    const gameLauncher = gameLauncherRef.current

    useEffect(() => {
        if (isJeopardyReload && games.length > 0) {
            logger.info("Main - launching jeopardy game after reload")
            const jeopardyGame = games.find(
                (game) => game.id === GameId.Jeopardy
            )
            if (jeopardyGame) {
                void gameLauncher.launchGame(jeopardyGame)
            }
        }
    }, [isJeopardyReload, games, gameLauncher])

    const [gameLoaded, setGameLoaded] = useState(false)

    const { screenDisplayedId } = useHubScreenTracking(
        isInitialized,
        launchedGameState?.activeGame ?? null,
        isInUpsell
    )

    const {
        showExitModal,
        showWeekendRebrandModal,
        handleBackButton,
        handleConfirmExit,
        handleCancelExit,
        handleWeekendRebrandAcknowledge,
    } = useHubModals({
        isInitialized,
        activeGame: launchedGameState?.activeGame ?? null,
        gameLauncher,
        isInUpsell,
    })

    const { updateLastFocusedTile } = useFocusRestoration({
        showExitModal,
        showWeekendRebrandModal,
        isCarouselActive,
        launchedGameState,
        isInitialized,
        isInUpsell,
    })

    const screenDisplayedIdRef = useRef<string | null>(null)

    const { handleGameFocus } = useGameFocusHandler({
        games,
        updateLastFocusedTile,
        track,
        screenDisplayedIdRef,
        setSelectedGame,
    })
    useEffect(() => {
        if (screenDisplayedId) {
            screenDisplayedIdRef.current = screenDisplayedId
        }
    }, [screenDisplayedId])

    const [isProcessingDeeplink, setIsProcessingDeeplink] = useState(!!deeplink)

    useEffect(() => {
        if (!isInitialized) {
            return
        }
        if (!deeplink) {
            return
        }

        if (isInImmediateUpsell) {
            return
        }

        clearDeeplink()
        const game = games.find((g) => g.id === deeplink.gameId)
        if (!game) {
            const errorId = uuidv4()
            logger.error(
                `Game not found for deeplink with gameId: ${deeplink.gameId} and campaignId: ${deeplink.campaignId}`
            )
            void track("Error Occurred", {
                errorId,
            })
            setIsProcessingDeeplink(false)
            return
        }
        logger.info(`Main - deeplink: ${JSON.stringify(deeplink)}`)
        void gameLauncher.launchGame(game)
    }, [
        games,
        gameLauncher,
        isInitialized,
        deeplink,
        isInImmediateUpsell,
        track,
    ])

    useEffect(() => {
        if (launchedGameState !== null) {
            setIsProcessingDeeplink(false)
        }
    }, [launchedGameState])

    const handleGameReady = useCallback(() => {
        logger.info("Main - game ready")
        setGameLoaded(true)
    }, [])

    useEffect(() => {
        if (launchedGameState === null) {
            setGameLoaded(false)
        }
    }, [launchedGameState])

    const gamesReady = games.length > 0

    useEffect(() => {
        if (gamesReady) {
            setSelectedGame(games[0])
        }
    }, [games, gamesReady])

    useKeyDown("Back", handleBackButton)
    useKeyDown("Escape" as Key, handleBackButton)

    const shouldWaitForLGIdentComplete = useMemo(() => {
        return isLGTV() && !isInitialized
    }, [isInitialized])

    if (games.length === 0) {
        return null
    }

    const body = (
        <div className={styles.mainContainer}>
            {!isProcessingDeeplink && !isInImmediateUpsell && (
                <div className={styles.contentContainer}>
                    <div className={styles.heroSection}>
                        {selectedGame && launchedGameState === null && (
                            <HeroAssetFader
                                isCarouselActive={isCarouselActive}
                                image={selectedGame.heroImageUrl}
                                videoUrl={selectedGame.videoUrl}
                                isFocused
                                launchedGameState={launchedGameState}
                                shouldWaitForLGIdentComplete={
                                    shouldWaitForLGIdentComplete
                                }
                            />
                        )}
                        {!launchedGameState?.activeGame && <BrandLogo />}
                    </div>
                    <div>
                        {launchedGameState !== null && (
                            <LaunchedGame
                                launchedGameState={launchedGameState}
                                setLaunchedGameState={setLaunchedGameState}
                                onGameReady={handleGameReady}
                                gameLoaded={gameLoaded}
                            />
                        )}
                    </div>
                    <div className={styles.carouselSection}>
                        {requiredImagesLoaded && launchedGameState === null && (
                            <GamesCarousel
                                onGameFocus={handleGameFocus}
                                launchedGameState={launchedGameState}
                                isCarouselActive={isCarouselActive}
                                screenDisplayedId={screenDisplayedId}
                                gameLauncher={gameLauncher}
                            />
                        )}
                    </div>
                </div>
            )}

            <ExitConfirmationModal
                isOpen={showExitModal}
                onConfirm={handleConfirmExit}
                onCancel={handleCancelExit}
            />

            <WeekendRebrandModal
                isOpen={showWeekendRebrandModal}
                onAcknowledge={handleWeekendRebrandAcknowledge}
            />
        </div>
    )

    return (
        <div>
            {!launchedGameState?.activeGame &&
                ENVIRONMENT !== Environment.PRODUCTION && (
                    <Debug isInitialized={isInitialized} />
                )}
            {body}
        </div>
    )
}

export const Main: React.FC<{
    setAssetLoadingStates: (states: ImagePreloadingResult) => void
    isInitialized: boolean
    isJeopardyReload: boolean
    isInImmediateUpsell: boolean
}> = (props) => {
    return <MainContent {...props} />
}
