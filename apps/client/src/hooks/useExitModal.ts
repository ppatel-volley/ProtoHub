import { useAppLifecycle } from "@volley/platform-sdk/react"
import { useCallback, useRef, useState } from "react"

import { logger } from "../utils/logger"
import { useExitModalTracking } from "./useExitModalTracking"
import type { GameLauncher } from "./useGameLauncher"
import type { Game } from "./useGames"
import { useHubTracking } from "./useHubTracking"

interface UseExitModalStateProps {
    isInitialized: boolean
    activeGame: Game | null
    gameLauncher: GameLauncher
    isInUpsell: boolean
}

interface UseExitModalStateReturn {
    showExitModal: boolean
    showExitModalRef: React.RefObject<boolean>
    openExitModal: () => void
    handleConfirmExit: () => void
    handleCancelExit: () => void
    handleBackButtonInExitModal: () => void
}

/** Manages exit confirmation modal. Back opens modal when not in game/upsell; ref-based checks block opening during loading, upsell, or active game. */
export const useExitModal = ({
    isInitialized,
    activeGame,
    gameLauncher,
    isInUpsell,
}: UseExitModalStateProps): UseExitModalStateReturn => {
    const { exitApp } = useAppLifecycle()
    const { track } = useHubTracking()

    const [showExitModal, setShowExitModal] = useState(false)
    const showExitModalRef = useRef(showExitModal)
    showExitModalRef.current = showExitModal

    const isInitializedRef = useRef(isInitialized)
    isInitializedRef.current = isInitialized

    const activeGameRef = useRef(activeGame)
    activeGameRef.current = activeGame

    const { screenDisplayedId: exitModalScreenDisplayedId } =
        useExitModalTracking(showExitModal)
    const exitModalScreenDisplayedIdRef = useRef<string | null>(null)
    exitModalScreenDisplayedIdRef.current = exitModalScreenDisplayedId

    const trackExitModalSelection = useCallback(
        (choice: "yes" | "no") => {
            const screenDisplayedId = exitModalScreenDisplayedIdRef.current
            if (!screenDisplayedId) {
                logger.warn("No exit modal screen displayed id, skipping track")
                return
            }
            void track("Hub Button Pressed", {
                eventCategory: "menu" as const,
                eventSubCategory: "exit modal selection",
                screenDisplayedId,
                displayChoices: ["yes", "no"],
                choiceValue: choice,
                text: "",
            })
        },
        [track]
    )

    const openExitModal = useCallback(() => {
        if (!isInitializedRef.current) {
            logger.info("Cannot open exit modal - not initialized")
            return
        }

        if (isInUpsell) {
            logger.info("Cannot open exit modal - in upsell")
            return
        }

        if (activeGameRef.current || gameLauncher.isGameLaunching) {
            logger.info("Cannot open exit modal - game is active or launching")
            return
        }

        logger.info("Opening exit confirmation modal")
        void track("Command Requested", {
            choiceValue: "back",
            eventCategory: "menu" as const,
            eventSubCategory: "game selection",
        })
        setShowExitModal(true)
    }, [track, isInUpsell, gameLauncher])

    const handleBackButtonInExitModal = useCallback(() => {
        logger.info("Back button pressed in exit modal - canceling")
        void track("Command Requested", {
            choiceValue: "back",
            eventCategory: "menu" as const,
            eventSubCategory: "exit modal selection",
        })
        trackExitModalSelection("no")
        setShowExitModal(false)
    }, [track, trackExitModalSelection])

    const handleConfirmExit = useCallback(() => {
        logger.info("Exit confirmed")
        trackExitModalSelection("yes")
        setShowExitModal(false)
        void exitApp()
    }, [exitApp, trackExitModalSelection])

    const handleCancelExit = useCallback(() => {
        logger.info("Exit canceled")
        trackExitModalSelection("no")
        setShowExitModal(false)
    }, [trackExitModalSelection])

    return {
        showExitModal,
        showExitModalRef,
        openExitModal,
        handleConfirmExit,
        handleCancelExit,
        handleBackButtonInExitModal,
    }
}
