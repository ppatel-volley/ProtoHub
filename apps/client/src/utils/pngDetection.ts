import type { ResourceDetector } from "./resourceDetection"

/**
 * Detects PNG image requests to enforce the use of optimized image formats like WebP.
 * Excludes branded favicons and the Weekend focus frame (volley uses AVIF) from detection.
 */
export function detectPng(url: string): string | null {
    const lower = url.toLowerCase()
    const isExcluded =
        lower.endsWith("/volley-favicon.png") ||
        lower.includes("weekend-favicon") ||
        lower.includes("weekend-focus-frame")
    if (lower.endsWith(".png") && !isExcluded) {
        return `Suboptimal image requested: ${url}`
    }
    return null
}

export const pngDetector: ResourceDetector = {
    name: "png",
    detect: detectPng,
}
