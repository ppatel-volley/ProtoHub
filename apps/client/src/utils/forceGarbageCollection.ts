import { logger } from "./logger"

declare global {
    interface Window {
        gc?: () => void
    }
}

/**
 * Force garbage collection if available
 * Works in Chrome with --js-flags="--expose-gc" flag
 * or in development builds with gc exposed
 */
export const forceGarbageCollection = (): void => {
    try {
        if (window.gc) {
            logger.info("Forcing garbage collection...")
            window.gc()
            logger.info("Garbage collection completed")
        } else {
            logger.info(
                "GC not available, skipping fallback to avoid memory allocation during cleanup"
            )
        }
    } catch (error) {
        logger.error("Error during garbage collection", error)
    }
}
