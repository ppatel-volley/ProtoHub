import { displayCodeToUrl } from "@volley/platform-sdk/lib"
import { useAppLifecycle } from "@volley/platform-sdk/react"
import { useEffect, useRef, useState } from "react"
import { v4 } from "uuid"

import packageJson from "../../../../package.json"
import { isAppClip } from "../../../config/platformDetection"
import {
    MobileHubEventName,
    PLATFORM_STAGE,
    ROOM_CODE_LENGTH,
} from "../../../constants"
import { useHubTracking } from "../../../hooks/useHubTracking"
import { logger } from "../../../utils/logger"
import backgroundAnimation from "../shared/assets/faceoff-shapes.json"
import { Background } from "../shared/Background/Background"
import { SupportLink } from "../shared/SupportLink/SupportLink"
import LightXBtn from "./assets/LightXBtn.svg"
import { JoinRoomForm } from "./JoinRoomForm/JoinRoomForm"
import styles from "./RoomCodeEntry.module.css"

const displayCodeStage =
    PLATFORM_STAGE === "local" || PLATFORM_STAGE === "test"
        ? "dev"
        : PLATFORM_STAGE

export const RoomCodeEntry = (): React.ReactElement => {
    const [roomCode, setRoomCode] = useState<string | undefined | null>()
    const [error, setError] = useState<string | null>(null)
    const isSubmitEnabled = roomCode?.length === ROOM_CODE_LENGTH
    const [isRequestInProgress, setIsRequestInProgress] = useState(false)
    const [screenDisplayedId] = useState<string>(() => v4())
    const hasTrackedScreenDisplayed = useRef(false)
    const hasTrackedError = useRef(false)
    const { exitApp } = useAppLifecycle()
    const { track } = useHubTracking()

    const handleSubmit = async (): Promise<void> => {
        if (isRequestInProgress) return

        track(MobileHubEventName.WEB_APP_BUTTON_PRESSED, {
            choiceValue: "play",
            displayChoices: ["play", "support"],
            eventCategory: "game setup",
            eventSubCategory: "room code",
            screenDisplayedId,
            ...(roomCode?.trim() ? { text: roomCode?.trim() } : {}),
        })

        const requestId = v4()
        logger.info("Fetching controller URL", { roomCode, requestId })
        try {
            setIsRequestInProgress(true)
            setError(null)
            if (roomCode) {
                const url = await displayCodeToUrl(roomCode, displayCodeStage)

                logger.info("Redirecting to controller URL", {
                    url,
                    roomCode,
                    requestId,
                })
                // Mark this as manual entry so MobileHub doesn't track it as QR scan
                // Wrap in try/catch so navigation always proceeds even if storage fails
                try {
                    sessionStorage.setItem("hub_manual_entry", "true")
                } catch (storageError) {
                    logger.warn(
                        "Failed to set hub_manual_entry flag in sessionStorage",
                        { error: storageError }
                    )
                }
                window.location.href = url
            }
        } catch (err) {
            const error =
                err instanceof Error ? err : new Error("Failed to join room")
            logger.error("Failed to fetch controller URL", error, { requestId })
            setError(error.message)
        } finally {
            setIsRequestInProgress(false)
        }
    }

    const handleRoomCodeChange = (code: string): void => {
        setRoomCode(code)

        if (code.length < ROOM_CODE_LENGTH) {
            setError(null)
            hasTrackedError.current = false
        }
    }

    const handleCloseClick = (): void => {
        void exitApp()
    }

    const handleSupportClick = (): void => {
        track(MobileHubEventName.WEB_APP_BUTTON_PRESSED, {
            choiceValue: "support",
            displayChoices: ["play", "support"],
            eventCategory: "game setup",
            eventSubCategory: "room code",
            screenDisplayedId,
            ...(roomCode?.trim() ? { text: roomCode?.trim() } : {}),
        })
    }

    useEffect(() => {
        if (hasTrackedScreenDisplayed.current) return

        hasTrackedScreenDisplayed.current = true

        track(MobileHubEventName.WEB_APP_SCREEN_DISPLAYED, {
            screenDisplayedId,
            displayChoices: ["play", "support"],
            eventCategory: "game setup",
            eventSubCategory: "room code",
        })
    }, [track, screenDisplayedId])

    // Track error display when error state changes
    useEffect(() => {
        if (error && !hasTrackedError.current && roomCode) {
            hasTrackedError.current = true
            track(MobileHubEventName.WEB_APP_ERROR_OCCURRED, {
                screenDisplayedId,
                eventCategory: "game setup",
                eventSubCategory: "room code",
                message: `Room Code: ${roomCode} - Error: ${error}`,
            })

            logger.info("RoomCodeEntry: Tracked room join error", {
                roomCode,
                error,
                screenDisplayedId,
            })
        }
    }, [error, roomCode, screenDisplayedId, track])

    return (
        <Background animationData={backgroundAnimation}>
            <div className={styles.container}>
                {!isAppClip() && (
                    <button
                        className={styles.closeButton}
                        onClick={handleCloseClick}
                    >
                        <img src={LightXBtn} alt="Close" />
                    </button>
                )}

                {/* Form Section */}
                <JoinRoomForm
                    roomCode={roomCode}
                    onRoomCodeChange={handleRoomCodeChange}
                    onSubmit={() => void handleSubmit()}
                    error={error}
                    isSubmitEnabled={isSubmitEnabled}
                />

                {/* Support Link Section */}
                <div className={styles.supportSection}>
                    <SupportLink
                        roomCode={roomCode}
                        onSupportClick={handleSupportClick}
                    />
                </div>
            </div>
            <div className={styles.version}>v{packageJson.version}</div>
        </Background>
    )
}
