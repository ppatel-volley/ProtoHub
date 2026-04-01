import { useCallback, useEffect, useRef } from "react"

import { safeDatadogRum } from "../utils/datadog"
import { logger } from "../utils/logger"

const DEFAULT_TIMEOUT_MS = 6_000
const DEFAULT_MAX_RETRIES = 2

interface UseQrLoadWatchdogProps {
    isOpen: boolean
    onQrRendered?: () => void
    retry: () => void
    maxRetries?: number
    timeoutMs?: number
}

interface UseQrLoadWatchdogResult {
    wrappedOnQrRendered: () => void
}

export const useQrLoadWatchdog = ({
    isOpen,
    onQrRendered,
    retry,
    maxRetries = DEFAULT_MAX_RETRIES,
    timeoutMs = DEFAULT_TIMEOUT_MS,
}: UseQrLoadWatchdogProps): UseQrLoadWatchdogResult => {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const retryCountRef = useRef(0)
    const qrRenderedRef = useRef(false)

    const clearTimer = useCallback(() => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }
    }, [])

    const startTimer = useCallback(() => {
        clearTimer()

        if (retryCountRef.current >= maxRetries) {
            logger.warn(
                `[QR Watchdog] Max retries (${maxRetries}) reached — giving up`
            )
            safeDatadogRum.addAction("qr_watchdog_max_retries_reached", {
                scope: "web_checkout",
                maxRetries,
            })
            return
        }

        timerRef.current = setTimeout(() => {
            if (qrRenderedRef.current) return

            retryCountRef.current += 1
            logger.warn(
                `[QR Watchdog] QR not rendered within ${timeoutMs}ms — retrying (attempt ${retryCountRef.current}/${maxRetries})`
            )
            safeDatadogRum.addAction("qr_watchdog_timeout_retry", {
                scope: "web_checkout",
                attempt: retryCountRef.current,
                maxRetries,
                timeoutMs,
            })

            retry()
            startTimer()
        }, timeoutMs)
    }, [clearTimer, maxRetries, timeoutMs, retry])

    useEffect(() => {
        if (isOpen) {
            qrRenderedRef.current = false
            retryCountRef.current = 0
            startTimer()
        } else {
            clearTimer()
            qrRenderedRef.current = false
            retryCountRef.current = 0
        }

        return clearTimer
    }, [isOpen, startTimer, clearTimer])

    const wrappedOnQrRendered = useCallback(() => {
        qrRenderedRef.current = true
        clearTimer()
        onQrRendered?.()
    }, [clearTimer, onQrRendered])

    return { wrappedOnQrRendered }
}
