import type { JSX } from "react"
import { useEffect } from "react"

import { useDatadogLaunchVitalManager } from "../../hooks/useDatadogLaunchVitalManager"
import { useHubTimedReset } from "../../hooks/useHubTimedReset"
import type { LaunchedGameState } from "../../hooks/useLaunchedGameState"
import { useMemoryCleanup } from "../../hooks/useMemoryCleanup"
import { logger } from "../../utils/logger"
import { GameIframeController } from "../MobileHub/GameIframeController/GameIframeController"

interface LaunchedGameProps {
    launchedGameState: LaunchedGameState | null
    setLaunchedGameState: (state: LaunchedGameState | null) => void
    onGameReady: () => void
    gameLoaded: boolean
}

export const LaunchedGame = ({
    launchedGameState,
    setLaunchedGameState,
    onGameReady,
    gameLoaded,
}: LaunchedGameProps): JSX.Element => {
    if (launchedGameState === null) {
        throw new Error(
            "LaunchedGame should not be rendered when launchedGameState is not launched"
        )
    }

    const { performMemoryCleanup } = useMemoryCleanup()
    const { stopVitalOnSuccess, stopVitalOnError, stopVitalOnUnmount } =
        useDatadogLaunchVitalManager(launchedGameState.launchVitalRef)

    const handleGameClose = (): void => {
        logger.info("LaunchedGame handleGameClose called")

        // TODO: uncomment once VGF is updated to implement exit route - platform-api and platform-sdk already support exitGame, but VGF does not yet support it
        //await gameOrchestration.exitGame(activeGame?.id ?? "", sessionId ?? "")

        setLaunchedGameState(null)
        performMemoryCleanup("game close")
    }

    const handleGameError = (error: Error): void => {
        logger.error("Error - LaunchedGame", error)
        stopVitalOnError(error)
        setLaunchedGameState(null)
        performMemoryCleanup("game close")
    }

    const handleGameReady = (): void => {
        logger.info("LaunchedGame - game iframe ready")
        stopVitalOnSuccess()
        onGameReady()
    }

    // cleanup datadog vitals on component unmount
    useEffect((): (() => void) => {
        return stopVitalOnUnmount
    }, [stopVitalOnUnmount])

    useHubTimedReset(handleGameClose)

    return (
        <GameIframeController
            url={launchedGameState.urlWithSessionId}
            onClose={() => {
                void handleGameClose()
            }}
            onError={handleGameError}
            onReady={handleGameReady}
            gameLoaded={gameLoaded}
        />
    )
}
