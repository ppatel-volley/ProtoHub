import { isSamsungTV } from "../config/platformDetection"
import { logger } from "./logger"

export const PLATFORM_VIDEO_READY_TIMEOUT_MS = 3000

export const applyPlatformVideoOptimizations = (
    videoElement: HTMLVideoElement
): void => {
    if (isSamsungTV()) {
        videoElement.style.transform = "translateZ(0)"
        videoElement.style.backfaceVisibility = "hidden"
        videoElement.style.webkitBackfaceVisibility = "hidden"

        if (videoElement.poster && videoElement.readyState === 0) {
            videoElement.load()
        }

        void videoElement.offsetHeight
    }
}

export const hidePlatformVideo = (videoElement: HTMLVideoElement): void => {
    if (isSamsungTV()) {
        videoElement.style.opacity = "0"
        videoElement.style.visibility = "hidden"
        videoElement.style.willChange = "auto"

        void videoElement.offsetHeight
    }
}

export const getPlatformVideoAttributes = (): Partial<
    React.VideoHTMLAttributes<HTMLVideoElement>
> => {
    if (isSamsungTV()) {
        return {
            preload: "metadata",
        }
    }

    return {}
}

export const waitForPlatformVideoReady = async (
    videoElement: HTMLVideoElement
): Promise<void> => {
    if (!isSamsungTV()) return

    return new Promise((resolve, reject) => {
        if (videoElement.readyState >= 3) {
            resolve()
            return
        }

        let isSettled = false
        let timeoutId: NodeJS.Timeout | null = null

        const cleanup = (): void => {
            if (timeoutId) {
                clearTimeout(timeoutId)
                timeoutId = null
            }
            videoElement.removeEventListener(
                "canplaythrough",
                handleCanPlayThrough
            )
        }

        const handleCanPlayThrough = (): void => {
            if (isSettled) return
            isSettled = true
            cleanup()
            resolve()
        }

        videoElement.addEventListener("canplaythrough", handleCanPlayThrough)

        timeoutId = setTimeout(() => {
            if (isSettled) return
            isSettled = true
            cleanup()
            logger.warn(
                `Samsung video not ready after ${PLATFORM_VIDEO_READY_TIMEOUT_MS}ms timeout - skipping playback`
            )
            reject(new Error("Samsung video ready timeout"))
        }, PLATFORM_VIDEO_READY_TIMEOUT_MS)
    })
}
