import { useRef } from "react"

import type { DurationVitalReference } from "../utils/datadog"
import { safeDatadogRum } from "../utils/datadog"
import { logger } from "../utils/logger"

interface VitalStopContext {
    status: "success" | "error"
    error?: Error
}

export const useDatadogLaunchVitalManager = (
    vitalRef: DurationVitalReference | null
): {
    stopVitalOnSuccess: () => void
    stopVitalOnError: (error: Error) => void
    stopVitalOnUnmount: () => void
    isVitalStopped: boolean
} => {
    const vitalStoppedRef = useRef(false)

    const isValidVitalRef = (vital: DurationVitalReference | null): boolean => {
        return vital !== null && typeof vital === "object"
    }

    const stopVital = (context: VitalStopContext): void => {
        if (!vitalRef || vitalStoppedRef.current) {
            return
        }

        if (isValidVitalRef(vitalRef)) {
            safeDatadogRum.stopDurationVital(vitalRef, { context })
            vitalStoppedRef.current = true
            logger.info("Datadog vital stopped successfully")
        } else {
            logger.warn("Datadog vital reference is invalid, skipping stop")
            vitalStoppedRef.current = true
        }
    }

    const stopVitalOnSuccess = (): void => {
        stopVital({ status: "success" })
    }

    const stopVitalOnError = (error: Error): void => {
        stopVital({ status: "error", error })
    }

    const stopVitalOnUnmount = (): void => {
        if (vitalRef && !vitalStoppedRef.current) {
            stopVital({
                status: "error",
                error: new Error("Component unmounted before completion"),
            })
            logger.info("Datadog vital stopped on unmount")
        }
    }

    return {
        stopVitalOnSuccess,
        stopVitalOnError,
        stopVitalOnUnmount,
        isVitalStopped: vitalStoppedRef.current,
    }
}
