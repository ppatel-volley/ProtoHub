interface MemoryInfo {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
}

interface ExtendedPerformance extends Performance {
    memory: MemoryInfo
}

/**
 * Get current memory usage info if available
 */
export const getMemoryUsage = (): {
    used: number
    total: number
    limit: number
    percentage: number
} | null => {
    if ("memory" in performance) {
        const extendedPerformance = performance as ExtendedPerformance
        const memory = extendedPerformance.memory
        return {
            used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
            percentage: Math.round(
                (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
            ),
        }
    }
    return null
}
