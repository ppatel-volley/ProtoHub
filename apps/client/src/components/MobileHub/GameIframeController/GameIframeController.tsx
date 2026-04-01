import "./GameIframeController.css"

import { PlatformIFrame, useEventBroker } from "@volley/platform-sdk/react"
import { useCallback, useEffect, useMemo, useState } from "react"

import { clearGameIframeControllerUrl } from "../../../config/gameIframeControllerUrl"
import { logger } from "../../../utils/logger"
import { GameLoadingScreen } from "../../GameLoadingScreen/GameLoadingScreen"

export const GAME_LOADING_DELAY = 1000

type GameIframeControllerProps = {
    url: string
    onClose: () => void
    onError: (error: Error) => void
    onReady: () => void
    gameLoaded: boolean
}

export const GameIframeController = ({
    url,
    onClose,
    onError,
    onReady,
    gameLoaded,
}: GameIframeControllerProps): React.ReactElement => {
    const eventBroker = useEventBroker()
    const [isGameLoadingSlowly, setIsGameLoadingSlowly] = useState(false)

    // Generate a unique key for each URL to force iframe recreation
    // This ensures WebAssembly memory is properly cleaned up between game launches
    const iframeKey = useMemo(() => {
        const key = `iframe-${Date.now()}`
        logger.info(
            `GameIframeController - creating new iframe with key: ${key} for URL: ${url}`
        )
        return key
    }, [url])

    const handleClose = useCallback(() => {
        const clear = clearGameIframeControllerUrl as () => void
        clear()
        onClose()
    }, [onClose])

    const handleIframeLoad = useCallback((): void => {
        const timestamp = new Date().toISOString()
        logger.info(
            `GameIframeController - PlatformIFrame onLoad called (ready event received): ${timestamp}`
        )

        onReady()
    }, [onReady])

    useEffect(() => {
        logger.info(`GameIframeController - initializing with URL: ${url}`)

        const unsubscribe = eventBroker.addEventListener("close", () => {
            logger.info("GameIframeController - close event received")
            handleClose()
        })

        return (): void => {
            unsubscribe()
        }
    }, [eventBroker, handleClose, url])

    useEffect(() => {
        logger.info(
            `GameIframeController - gameLoaded changed to: ${gameLoaded}`
        )
        if (gameLoaded) {
            const iframe = document.querySelector(
                ".game-iframe"
            ) as HTMLIFrameElement
            if (iframe) {
                iframe.focus()
                logger.info(
                    "GameIframeController - iframe focused (gameLoaded effect)"
                )
            }
        }
    }, [gameLoaded])

    useEffect(() => {
        setTimeout(() => {
            setIsGameLoadingSlowly(true)
        }, GAME_LOADING_DELAY)
    }, [])

    return (
        <div className="game-iframe-container">
            {!gameLoaded && isGameLoadingSlowly && (
                <div className="loading-fallback">
                    <GameLoadingScreen />
                </div>
            )}
            <PlatformIFrame
                key={iframeKey}
                src={url}
                className="game-iframe"
                hidden={!gameLoaded}
                onError={onError}
                onClose={handleClose}
                onLoad={handleIframeLoad}
            />
        </div>
    )
}
