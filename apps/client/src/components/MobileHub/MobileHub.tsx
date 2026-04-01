import {
    useEventBroker,
    useMicrophone,
    usePlatformStatus,
} from "@volley/platform-sdk/react"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { v4 as uuidv4 } from "uuid"

import {
    clearGameIframeControllerUrl,
    getGameIframeControllerUrl,
} from "../../config/gameIframeControllerUrl"
import { isDemo } from "../../config/isDemo"
import { isAppClip } from "../../config/platformDetection"
import { MobileHubEventName } from "../../constants/tracking"
import { useBrandDocumentMeta } from "../../hooks/useBrandDocumentMeta"
import { useDatadogIdentity } from "../../hooks/useDatadogIdentity"
import { useExperimentInit } from "../../hooks/useExperimentInit"
import { GameId } from "../../hooks/useGames"
import { useHubTracking } from "../../hooks/useHubTracking"
import { logger } from "../../utils/logger"
import DemoController from "./DemoController/DemoController"
import { GameIframeController } from "./GameIframeController/GameIframeController"
import { RoomCodeEntry } from "./RoomCodeEntry/RoomCodeEntry"
import {
    SupportOverlay,
    type SupportOverlayContext,
} from "./shared/SupportOverlay/SupportOverlay"

/**
 * Extracts game ID from the gameIframeControllerUrl.
 * Returns "hub" if organic (no QR), otherwise extracts from URL path.
 * E.g., "https://game-clients.volley.tv/cocomelon?..." → "cocomelon"
 * E.g., "https://game-clients.volley.tv/jeopardy/latestV2/controller.html" → "jeopardy"
 * E.g., "https://game-clients.volley.tv/song-quiz-controller/..." → "song-quiz"
 */
const extractGameId = (gameUrl: string | undefined): string => {
    if (!gameUrl) return "hub"

    try {
        const url = new URL(gameUrl)
        const pathSegments = url.pathname.split("/").filter(Boolean)
        // Get first segment (game name), not last (filename)
        const firstSegment = pathSegments[0]

        // Validate against known game IDs
        const gameIdSet = new Set(Object.values(GameId))
        if (firstSegment && gameIdSet.has(firstSegment as GameId)) {
            return firstSegment
        }

        // Normalize by stripping -controller suffix and try again
        // This handles URLs like "song-quiz-controller" → "song-quiz"
        const normalized = firstSegment?.replace(/-controller$/, "")
        if (normalized && gameIdSet.has(normalized as GameId)) {
            return normalized
        }

        return "hub" // Unknown game or invalid
    } catch {
        return "hub"
    }
}

const MobileHubContent: React.FC = () => {
    const [url, setUrl] = useState<string | undefined>(
        getGameIframeControllerUrl()
    )
    const [gameLoaded, setGameLoaded] = useState(true)
    const { track } = useHubTracking()
    const hasTrackedControllerEntry = useRef(false)
    const [screenDisplayedId] = useState<string>(() => uuidv4())
    const [micPermission, setMicPermission] = useState<
        "granted" | "denied" | "prompt" | null
    >(null)
    const mic = useMicrophone()

    // Detect if gameIframeControllerUrl was present on initial page load (QR scan)
    // Manual entry: loads without it, then navigates to it after code resolution
    const [hadInitialGameUrl] = useState(() => {
        // Pure initializer - only read, no side effects
        // Wrap storage access in try/catch for Safari private mode compatibility
        let isManualEntry = false
        try {
            isManualEntry =
                sessionStorage.getItem("hub_manual_entry") === "true"
        } catch (storageError) {
            logger.warn("Failed to read hub_manual_entry from sessionStorage", {
                error: storageError,
            })
            // If storage is unavailable, we can't determine if this is manual entry
            // Default to false (not manual) to avoid misclassifying
        }

        if (isManualEntry) {
            return false
        }

        // Check if gameIframeControllerUrl is present on page load
        const params = new URLSearchParams(window.location.search)
        return params.has("gameIframeControllerUrl")
    })

    // Clear the manual entry flag after reading (separate effect to avoid side effects in initializer)
    useEffect(() => {
        try {
            const isManualEntry =
                sessionStorage.getItem("hub_manual_entry") === "true"
            if (isManualEntry) {
                sessionStorage.removeItem("hub_manual_entry")
            }
        } catch (storageError) {
            logger.warn(
                "Failed to clear hub_manual_entry from sessionStorage",
                { error: storageError }
            )
        }
    }, [])

    // Check microphone permission status
    useEffect(() => {
        void mic
            .checkPermissions()
            .then((status) => {
                setMicPermission(status)
            })
            .catch((error: unknown) => {
                logger.warn("Failed to check microphone permission", { error })
            })
    }, [mic])

    const handleClose = useCallback((): void => {
        logger.info("MobileHub handleClose called")
        setUrl(undefined)
        clearGameIframeControllerUrl()
    }, [])

    const handleError = useCallback((): void => {
        setUrl(undefined)
    }, [])

    const handleReady = useCallback((): void => {
        setGameLoaded(true)
    }, [])

    // Track controller entry from QR code scan
    // Scenarios: iOS/Android app installed, iOS App Clip
    useEffect(() => {
        if (hasTrackedControllerEntry.current) return
        if (!url) return

        // Only track if gameIframeControllerUrl was present on initial page load
        // QR scan: page loads with gameIframeControllerUrl immediately
        // Manual entry: page loads without it, navigates to it after code entry
        if (hadInitialGameUrl) {
            hasTrackedControllerEntry.current = true

            // Extract metadata from URL for QR tracking
            const gameId = extractGameId(url)
            let hubSessionId: string | null = null
            let gameSessionId: string | null = null
            try {
                const urlParams = new URLSearchParams(new URL(url).search)
                hubSessionId = urlParams.get("volley_hub_session_id")
                gameSessionId = urlParams.get("sessionId")
            } catch {
                logger.warn(
                    "MobileHub: Invalid game URL; skipping session id parsing",
                    { url }
                )
            }
            track(MobileHubEventName.WEB_APP_SCREEN_DISPLAYED, {
                appType: isAppClip() ? "mobile app clip" : "mobile app",
                eventCategory: "app loading",
                eventSubCategory: "app loading",
                gameId,
                screenDisplayedId,
                displayChoices: [],
                entrySource: "QR",
                ...(micPermission && { micPermission }),
                ...(hubSessionId && { hubSessionId }),
                ...(gameSessionId && { gameSessionId }),
            })

            logger.info("MobileHub: Tracked controller entry from QR code", {
                entrySource: "QR",
                gameId,
                appType: isAppClip() ? "mobile app clip" : "mobile app",
                url,
            })
        }
    }, [url, track, hadInitialGameUrl, micPermission, screenDisplayedId])

    if (isDemo()) {
        return <DemoController />
    }

    return url ? (
        <GameIframeController
            url={url}
            onClose={handleClose}
            onError={handleError}
            onReady={handleReady}
            gameLoaded={gameLoaded}
        />
    ) : (
        <RoomCodeEntry />
    )
}

export const MobileHub: React.FC = () => {
    useExperimentInit()
    useDatadogIdentity()
    useBrandDocumentMeta()

    const [forceSupportModal] = useState(
        () =>
            new URLSearchParams(window.location.search).get(
                "force_support_modal"
            ) === "true"
    )
    const [supportContext, setSupportContext] =
        useState<SupportOverlayContext | null>(null)
    const [supportOpen, setSupportOpen] = useState(false)
    const eventBroker = useEventBroker()
    const { isReady } = usePlatformStatus()
    const hasForcedOpen = useRef(false)

    const closable = !forceSupportModal

    const handleSupportClose = useCallback((): void => {
        if (!closable) return
        setSupportOpen(false)
    }, [closable])

    useEffect(() => {
        if (!isReady || !forceSupportModal || hasForcedOpen.current) return
        hasForcedOpen.current = true
        setSupportOpen(true)
    }, [isReady, forceSupportModal])

    useEffect((): void | (() => void) => {
        if (!isReady) return

        const unsubscribe = eventBroker.addEventListener(
            "support:open",
            (payload) => {
                setSupportContext({
                    gameContext: payload.gameContext ?? {},
                    sdkContext: payload.sdkContext ?? {},
                })
                setSupportOpen(true)
            }
        )

        return unsubscribe
    }, [eventBroker, isReady])

    return (
        <>
            <MobileHubContent />
            <SupportOverlay
                open={supportOpen}
                context={supportContext}
                onClose={handleSupportClose}
                closable={closable}
            />
        </>
    )
}
