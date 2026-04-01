import { v4 as uuidv4 } from "uuid"

import { logger } from "./logger"
import {
    applyPlatformVideoOptimizations,
    waitForPlatformVideoReady,
} from "./platformVideoOptimizations"

interface AutoplayOptions {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    backoffMultiplier?: number
    timeoutMs?: number
    onVideoComplete?: () => void
    completionTimeoutBuffer?: number
    onAutoplayNotStarted?: () => void
    onAutoplayStarted?: () => void
}

const DEFAULT_OPTIONS: Required<
    Omit<
        AutoplayOptions,
        "onVideoComplete" | "onAutoplayNotStarted" | "onAutoplayStarted"
    >
> & {
    onVideoComplete: undefined
    onAutoplayNotStarted: undefined
    onAutoplayStarted: undefined
} = {
    maxRetries: 2,
    initialDelay: 50,
    maxDelay: 500,
    backoffMultiplier: 2,
    timeoutMs: 500,
    onVideoComplete: undefined,
    completionTimeoutBuffer: 500,
    onAutoplayNotStarted: undefined,
    onAutoplayStarted: undefined,
}

const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms))

const playWithTimeout = (
    videoElement: HTMLVideoElement,
    timeoutMs: number
): Promise<void> =>
    Promise.race([
        videoElement.play(),
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Play timeout")), timeoutMs)
        ),
    ])

const isTimeoutError = (error: unknown): boolean =>
    error instanceof Error && error.message === "Play timeout"

/**
 * Checks if the error is a permanent error that won't be resolved by retrying
 * @param error - The error to check
 * @returns True if the error is a permanent error, false otherwise
 */
const isPermanentError = (error: unknown): boolean => {
    if (!(error instanceof Error)) return false

    const permanentErrors = [
        "NotAllowedError",
        "NotSupportedError",
        "AbortError",
    ]

    return permanentErrors.some((errorType) => error.name === errorType)
}

type Playback =
    | {
          action: "start" | "finished"
      }
    | {
          action: "attempt_failed"
          attempt: number
      }
    | {
          action: "attempt_success"
          attempt: number
          success: true
      }
    | {
          action: "blocked_after_max_retries"
          attempt: number
          success: false
      }
    | {
          action:
              | "blocked_permanently"
              | "blocked_timeout"
              | "fallback"
              | "not_ready_skipping"
          success: false
      }

class VideoLogger {
    private id: string

    private src: string

    constructor(videoElement: HTMLVideoElement) {
        this.src = videoElement.src
        this.id = uuidv4()
    }

    public info(message: string, playback: Playback): void {
        logger.info(message, this.buildAdditionalArgs(playback))
    }

    public warn(message: string, playback: Playback): void {
        logger.warn(message, this.buildAdditionalArgs(playback))
    }

    private buildAdditionalArgs(playback: Playback): object {
        return {
            video: {
                url: this.src,
                id: this.id,
                playback,
            },
        }
    }
}

/**
 * Sets up video completion tracking with a fallback timer in case onEnded doesn't fire
 * @param videoElement - The video element to track
 * @param onVideoComplete - The callback to call when the video completes
 * @param completionTimeoutBuffer - The buffer time to add to the video duration
 */
const setupVideoCompletionTracking = (
    videoElement: HTMLVideoElement,
    onVideoComplete: () => void,
    completionTimeoutBuffer: number,
    videoLogger: VideoLogger
): void => {
    const fallbackTimer = setTimeout(
        () => {
            videoLogger.warn(
                "Video fallback timer triggered - video may not have played properly",
                { action: "fallback", success: false }
            )
            onVideoComplete()
        },
        (videoElement.duration || 10) * 1000 + completionTimeoutBuffer
    )

    const handleVideoEnd = (): void => {
        clearTimeout(fallbackTimer)
        videoLogger.info("Video ended", { action: "finished" })
        onVideoComplete()
    }

    videoElement.addEventListener("ended", handleVideoEnd, { once: true })
    ;(
        videoElement as unknown as { __autoplayCleanup: () => void }
    ).__autoplayCleanup = (): void => {
        clearTimeout(fallbackTimer)
        videoElement.removeEventListener("ended", handleVideoEnd)
    }
}

/**
 * Attempts to autoplay a video element with retries and exponential backoff
 * @param videoElement - The video element to autoplay
 * @param options - The autoplay options- maxRetries, initialDelay, maxDelay, backoffMultiplier, timeoutMs, onVideoComplete, completionTimeoutBuffer
 * @returns True if the video autoplayed successfully, false otherwise
 */
export const attemptVideoAutoplay = async (
    videoElement: HTMLVideoElement,
    options: AutoplayOptions = {}
): Promise<boolean> => {
    const config = { ...DEFAULT_OPTIONS, ...options }
    let hasReportedNotStarted = false
    let attempt = 0
    let delay = config.initialDelay

    const videoLogger = new VideoLogger(videoElement)
    videoLogger.info("Starting video autoplay", { action: "start" })

    applyPlatformVideoOptimizations(videoElement)

    try {
        await waitForPlatformVideoReady(videoElement)
    } catch {
        videoLogger.warn("Platform video not ready - skipping playback", {
            action: "not_ready_skipping",
            success: false,
        })
        if (config.onAutoplayNotStarted) {
            hasReportedNotStarted = true
            config.onAutoplayNotStarted()
        }
        if (config.onVideoComplete) {
            config.onVideoComplete()
        }
        return false
    }

    while (attempt <= config.maxRetries) {
        try {
            await playWithTimeout(videoElement, config.timeoutMs)
            if (attempt > 0) {
                videoLogger.info(
                    `Autoplay successful after ${attempt} retries`,
                    { action: "attempt_success", attempt, success: true }
                )
            } else {
                videoLogger.info("Autoplay successful", {
                    action: "attempt_success",
                    attempt,
                    success: true,
                })
            }

            if (config.onAutoplayStarted) {
                config.onAutoplayStarted()
            }

            if (config.onVideoComplete) {
                setupVideoCompletionTracking(
                    videoElement,
                    config.onVideoComplete,
                    config.completionTimeoutBuffer,
                    videoLogger
                )
            }

            return true
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error)

            if (config.onAutoplayNotStarted && !hasReportedNotStarted) {
                hasReportedNotStarted = true
                config.onAutoplayNotStarted()
            }

            if (isPermanentError(error)) {
                videoLogger.info(
                    `Autoplay permanently blocked for ${videoElement.src} - ${message}`,
                    {
                        action: "blocked_permanently",
                        success: false,
                    }
                )

                if (config.onVideoComplete) {
                    config.onVideoComplete()
                }

                return false
            }

            // Timeouts mean play() is still pending (slow load), not failed.
            // Retrying would issue a second play() while the first is still
            // in-flight, causing LG TVs to seek back.
            if (isTimeoutError(error)) {
                videoLogger.info(`Autoplay timed out for ${videoElement.src}`, {
                    action: "blocked_timeout",
                    success: false,
                })

                if (config.onVideoComplete) {
                    config.onVideoComplete()
                }

                return false
            }

            if (attempt === config.maxRetries) {
                videoLogger.info(
                    `Autoplay blocked for ${videoElement.src} after ${config.maxRetries} retries - ${message}`,
                    {
                        action: "blocked_after_max_retries",
                        attempt,
                        success: false,
                    }
                )

                if (config.onVideoComplete) {
                    config.onVideoComplete()
                }

                return false
            }

            videoLogger.info(
                `Autoplay attempt ${attempt + 1} failed for ${
                    videoElement.src
                }, retrying in ${delay}ms - ${message}`,
                {
                    action: "attempt_failed",
                    attempt,
                }
            )

            await sleep(delay)
            delay = Math.min(delay * config.backoffMultiplier, config.maxDelay)
            attempt++
        }
    }

    return false
}
