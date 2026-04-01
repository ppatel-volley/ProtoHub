import { safeDatadogRum } from "./datadog"
import { logger } from "./logger"

export interface ResourceDetector {
    name: string
    detect: (url: string) => string | null
}

/**
 * Initializes a single PerformanceObserver to detect resource loading issues.
 * Dispatches to registered detector handlers for extensibility.
 */
export function initResourceDetection(detectors: ResourceDetector[]): void {
    if (typeof PerformanceObserver === "undefined") {
        return
    }

    const initVital = safeDatadogRum.startDurationVital(
        "resource_detection_init"
    )

    try {
        const loggedErrors = new Set<string>()

        const observer = new PerformanceObserver((list) => {
            const processVital = safeDatadogRum.startDurationVital(
                "resource_detection_process"
            )

            try {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === "resource") {
                        const url = entry.name

                        for (const detector of detectors) {
                            try {
                                const errorMessage = detector.detect(url)
                                if (
                                    errorMessage &&
                                    !loggedErrors.has(errorMessage)
                                ) {
                                    loggedErrors.add(errorMessage)
                                    logger.error(errorMessage)
                                }
                            } catch (error) {
                                logger.error(
                                    `Error in ${detector.name} detector`,
                                    error
                                )
                            }
                        }
                    }
                }
            } finally {
                safeDatadogRum.stopDurationVital(processVital)
            }
        })

        observer.observe({ entryTypes: ["resource"], buffered: true })
        safeDatadogRum.stopDurationVital(initVital)
    } catch (error) {
        safeDatadogRum.stopDurationVital(initVital)
        logger.error("Failed to initialize resource detection", error)
    }
}
