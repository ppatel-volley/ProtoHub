import { useCallback, useRef } from "react"

import { logger } from "../utils/logger"
import { useExitModal } from "./useExitModal"
import type { GameLauncher } from "./useGameLauncher"
import type { Game } from "./useGames"
import { useWeekendRebrandModal } from "./useWeekendRebrandModal"

interface UseHubModalsProps {
    isInitialized: boolean
    activeGame: Game | null
    gameLauncher: GameLauncher
    isInUpsell: boolean
}

interface UseHubModalsReturn {
    showExitModal: boolean
    showWeekendRebrandModal: boolean
    handleBackButton: () => void
    handleConfirmExit: () => void
    handleCancelExit: () => void
    handleWeekendRebrandAcknowledge: () => void
}

/** Coordinates exit and weekend rebrand modals, routing back button to the appropriate modal based on visibility. Back during loading is ignored. */
export const useHubModals = ({
    isInitialized,
    activeGame,
    gameLauncher,
    isInUpsell,
}: UseHubModalsProps): UseHubModalsReturn => {
    const isInitializedRef = useRef(isInitialized)
    isInitializedRef.current = isInitialized

    const {
        showExitModal,
        showExitModalRef,
        openExitModal,
        handleConfirmExit,
        handleCancelExit,
        handleBackButtonInExitModal,
    } = useExitModal({
        isInitialized,
        activeGame,
        gameLauncher,
        isInUpsell,
    })

    const {
        showWeekendRebrandModal,
        showWeekendRebrandModalRef,
        handleAcknowledge,
        handleBackButtonInWeekendRebrandModal,
    } = useWeekendRebrandModal({
        isInitialized,
        activeGame,
        isInUpsell,
        gameLauncher,
    })

    const handleBackButton = useCallback(() => {
        if (!isInitializedRef.current) {
            logger.info("Back button pressed during loading - ignoring")
            return
        }

        if (showWeekendRebrandModalRef.current) {
            handleBackButtonInWeekendRebrandModal()
            return
        }

        if (showExitModalRef.current) {
            handleBackButtonInExitModal()
            return
        }

        openExitModal()
    }, [
        showWeekendRebrandModalRef,
        showExitModalRef,
        handleBackButtonInWeekendRebrandModal,
        handleBackButtonInExitModal,
        openExitModal,
    ])

    return {
        showExitModal,
        showWeekendRebrandModal,
        handleBackButton,
        handleConfirmExit,
        handleCancelExit,
        handleWeekendRebrandAcknowledge: handleAcknowledge,
    }
}
