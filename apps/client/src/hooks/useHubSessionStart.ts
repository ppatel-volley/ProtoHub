import { useDeviceInfo } from "@volley/platform-sdk/react"
import { useEffect, useRef } from "react"

import { type Deeplink } from "../config/deeplink"
import { isFireTV, isMobile } from "../config/platformDetection"
import { logger } from "../utils/logger"
import { useHubTracking } from "./useHubTracking"

export const HUB_SESSION_START_DELAY_MS = 1000
export const HUB_SESSION_START_TIMESTAMP_OFFSET_MS = 1500

/**
 * Hook to track the "Hub Session Start" event exactly once per browser session.
 * Fires immediately during the initial loading phase once the platform is ready.
 * Should be called from the Loading component during app startup. Delays tracking by 500ms to resolve amplitude race condition.
 */
export const useHubSessionStart = (
    deeplink?: Deeplink,
    isJeopardyReload: boolean = false,
    platformReady: boolean = false
): void => {
    const { track } = useHubTracking()
    const hasAttemptedTrackingRef = useRef(false)
    const deviceInfo = useDeviceInfo()

    useEffect(() => {
        const shouldSkipDueToReload = (): boolean => {
            return isJeopardyReload ?? false
        }

        const shouldSkipTracking = (): boolean => {
            return (
                !platformReady ||
                isMobile() ||
                shouldSkipDueToReload() ||
                hasAttemptedTrackingRef.current
            )
        }

        const detectHardwareVoiceRemote = async (): Promise<boolean | null> => {
            try {
                if (!isFireTV()) {
                    return null
                }

                const inputDevices = await deviceInfo.getInputDeviceSources()
                if (!inputDevices?.devices) {
                    return null
                }

                for (const device of Object.values(inputDevices.devices)) {
                    if (device?.name === "Amazon Fire TV Remote") {
                        return true
                    }
                }

                return false
            } catch (error) {
                logger.warn(
                    "Failed to detect hardware voice remote:",
                    error as Error
                )
                return null
            }
        }

        const trackSessionStart = async (timestamp: Date): Promise<void> => {
            if (shouldSkipTracking()) {
                return
            }

            logger.info("Tracking Hub Session Start")
            hasAttemptedTrackingRef.current = true

            try {
                const advertisingId =
                    deviceInfo.getAdId()?.advertisingId ?? null
                const attributionId = deeplink?.campaignId ?? null
                const attributionType = deeplink?.campaignId ? "deeplink" : null
                const hasHardwareVoiceRemote = await detectHardwareVoiceRemote()

                track(
                    "Hub Session Start",
                    {
                        advertisingId,
                        attributionId,
                        attributionType,
                        hasHardwareVoiceRemote,
                    },
                    timestamp
                )

                logger.info("Hub Session Start tracked successfully")
            } catch (error) {
                logger.error(
                    "Failed to track Hub Session Start:",
                    error as Error
                )
                hasAttemptedTrackingRef.current = false
            }
        }

        const timestamp = new Date(
            Date.now() - HUB_SESSION_START_TIMESTAMP_OFFSET_MS
        )

        // add delay to resolve amplitude race condition
        const timeoutId = setTimeout(() => {
            void trackSessionStart(timestamp)
        }, HUB_SESSION_START_DELAY_MS)

        return (): void => {
            clearTimeout(timeoutId)
        }
    }, [track, platformReady, isJeopardyReload, deeplink, deviceInfo])
}
