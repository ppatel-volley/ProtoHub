import { getMemoryUsage } from "./getMemoryUsage"
import { logger } from "./logger"

/**
 * Log memory usage before and after an operation
 */
export const logMemoryDelta = (
    operation: string,
    before: ReturnType<typeof getMemoryUsage>
): void => {
    const after = getMemoryUsage()
    if (before && after) {
        const delta = after.used - before.used
        logger.info(
            `Memory delta for ${operation}: ${delta > 0 ? "+" : ""}${delta}MB (${before.used}MB -> ${after.used}MB)`
        )
    }
}
