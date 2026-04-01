import { AppLifecycleEvent } from "@volley/platform-sdk/lib"
import { useAppLifecycle } from "@volley/platform-sdk/react"
import { useEffect, useRef } from "react"

import { logger } from "../utils/logger"

export const RESET_DELAY = 1000 * 60 * 20 // 20 minutes

/** Schedules a reset callback when app is backgrounded; clears timer when foregrounded or unmounted. Used to reset hub state after prolonged background. */
export const useHubTimedReset = (
    onTimedReset: () => void
): NodeJS.Timeout | null => {
    const { currentState } = useAppLifecycle()
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const clearTimer = (timer: NodeJS.Timeout | null): void => {
        if (timer) {
            clearTimeout(timer)
            timerRef.current = null
        }
    }
    useEffect(() => {
        if (currentState === AppLifecycleEvent.BACKGROUNDING) {
            logger.info(
                `HubTimedReset - resetting hub after ${RESET_DELAY} minutes`
            )
            timerRef.current = setTimeout(() => {
                if (currentState === AppLifecycleEvent.BACKGROUNDING) {
                    logger.info("HubTimedReset - timed reset triggered")
                    onTimedReset()
                }
            }, RESET_DELAY)
        }

        if (currentState === AppLifecycleEvent.FOREGROUNDED) {
            if (timerRef.current) {
                logger.info("HubTimedReset - foregrounded - clearing timer")
                clearTimer(timerRef.current)
            }
        }

        return (): void => {
            if (timerRef.current) {
                logger.info("HubTimedReset - unmounting - clearing timer")
                clearTimer(timerRef.current)
            }
        }
    }, [currentState, onTimedReset])
    return timerRef.current
}
