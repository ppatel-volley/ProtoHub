import { useCallback, useEffect, useRef, useState } from "react"

import { SHOULD_FORCE_WEEKEND_REBRAND_MODAL } from "../config/devOverrides"
import { isMobile } from "../config/platformDetection"
import { getExperimentManager } from "../experiments/ExperimentManager"
import { ExperimentFlag } from "../experiments/experimentSchemata"
import { logger } from "../utils/logger"
import type { GameLauncher } from "./useGameLauncher"
import type { Game } from "./useGames"
import { useIsSubscribed } from "./useIsSubscribed"
import { useWeekendRebrandModalTracking } from "./useWeekendRebrandModalTracking"

const WEEKEND_REBRAND_ACKNOWLEDGED_KEY = "hub_weekend_rebrand_acknowledged"
const DEFAULT_START_EPOCH_MS = new Date("2026-02-13T00:00:00-08:00").getTime()
const DEFAULT_END_EPOCH_MS = new Date("2026-02-24T00:00:00-08:00").getTime()

interface WeekendRebrandConfig {
    startEpochMs: number
    endEpochMs: number
    showAgain: boolean
}

interface UseWeekendRebrandModalProps {
    isInitialized: boolean
    activeGame: Game | null
    isInUpsell: boolean
    gameLauncher: GameLauncher
}

interface UseWeekendRebrandModalReturn {
    showWeekendRebrandModal: boolean
    showWeekendRebrandModalRef: React.RefObject<boolean>
    handleAcknowledge: () => void
    handleBackButtonInWeekendRebrandModal: () => void
}

function getWeekendRebrandConfig(): WeekendRebrandConfig | null {
    try {
        const experimentManager = getExperimentManager()
        const variant = experimentManager.getVariant(
            ExperimentFlag.WeekendRebrandInformationalModal
        )

        if (!variant || !variant.value || variant.value === "control") {
            logger.info("Weekend rebrand: experiment is control or not present")
            return null
        }

        const modalDisplay = variant.payload?.["hub-modal-display"]
        return {
            startEpochMs: modalDisplay?.startEpochMs ?? DEFAULT_START_EPOCH_MS,
            endEpochMs: modalDisplay?.endEpochMs ?? DEFAULT_END_EPOCH_MS,
            showAgain: modalDisplay?.showAgain ?? false,
        }
    } catch (error) {
        logger.warn(
            "Weekend rebrand: failed to get experiment config",
            error instanceof Error ? error : undefined
        )
        return null
    }
}

function hasAlreadyAcknowledged(): boolean {
    try {
        return localStorage.getItem(WEEKEND_REBRAND_ACKNOWLEDGED_KEY) === "true"
    } catch {
        return false
    }
}

function setAcknowledged(): void {
    try {
        localStorage.setItem(WEEKEND_REBRAND_ACKNOWLEDGED_KEY, "true")
    } catch (error) {
        logger.warn(
            "Weekend rebrand: failed to save acknowledgement to localStorage",
            error instanceof Error ? error : undefined
        )
    }
}

export const useWeekendRebrandModal = ({
    isInitialized,
    activeGame,
    isInUpsell,
    gameLauncher,
}: UseWeekendRebrandModalProps): UseWeekendRebrandModalReturn => {
    const [showWeekendRebrandModal, setShowWeekendRebrandModal] =
        useState(false)
    const showWeekendRebrandModalRef = useRef(showWeekendRebrandModal)
    showWeekendRebrandModalRef.current = showWeekendRebrandModal
    const hasCheckedConditions = useRef(false)

    const { trackButtonPress } = useWeekendRebrandModalTracking(
        showWeekendRebrandModal
    )

    const isSubscribed = useIsSubscribed()

    useEffect(() => {
        if (
            !isInitialized ||
            isInUpsell ||
            activeGame !== null ||
            gameLauncher.isGameLaunching
        ) {
            return
        }

        if (hasCheckedConditions.current) {
            return
        }

        if (SHOULD_FORCE_WEEKEND_REBRAND_MODAL) {
            logger.info(
                "Weekend rebrand: forcing modal via dev override (force-weekend-modal=true)"
            )
            hasCheckedConditions.current = true
            setShowWeekendRebrandModal(true)
            return
        }

        if (isMobile()) {
            logger.info("Weekend rebrand: mobile platform, skipping")
            hasCheckedConditions.current = true
            return
        }

        if (!isSubscribed) {
            logger.info(
                "Weekend rebrand: user is not subscribed, will check again when they return to hub"
            )
            return
        }

        hasCheckedConditions.current = true

        const config = getWeekendRebrandConfig()
        if (!config) {
            return
        }

        const now = Date.now()

        if (now < config.startEpochMs || now >= config.endEpochMs) {
            logger.info("Weekend rebrand: outside date window", {
                now,
                start: config.startEpochMs,
                end: config.endEpochMs,
            })
            return
        }

        if (!config.showAgain && hasAlreadyAcknowledged()) {
            logger.info(
                "Weekend rebrand: already acknowledged and showAgain is false"
            )
            return
        }

        logger.info("Weekend rebrand: showing modal")
        setShowWeekendRebrandModal(true)
    }, [isInitialized, isInUpsell, activeGame, isSubscribed, gameLauncher])

    const handleAcknowledge = useCallback(() => {
        logger.info("Weekend rebrand: user acknowledged")
        trackButtonPress()
        setAcknowledged()
        setShowWeekendRebrandModal(false)
    }, [trackButtonPress])

    const handleBackButtonInWeekendRebrandModal = useCallback(() => {
        logger.info("Back button pressed in weekend rebrand modal - dismissing")
        trackButtonPress()
        setAcknowledged()
        setShowWeekendRebrandModal(false)
    }, [trackButtonPress])

    return {
        showWeekendRebrandModal,
        showWeekendRebrandModalRef,
        handleAcknowledge,
        handleBackButtonInWeekendRebrandModal,
    }
}
