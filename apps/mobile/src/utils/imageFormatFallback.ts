import React from "react"

import { logger } from "./logger"

/**
 * Image format fallback utility for older browsers that don't support AVIF
 * Chromium 68 (Samsung TV) doesn't support AVIF (introduced in Chrome 85)
 */

export const SUPPORT_TIMEOUT_MS = 5000

// 1x1 pixel test images for format support detection
const AVIF_TEST_IMAGE =
    "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A="

const WEBP_TEST_IMAGE =
    "data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoBAAEALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA"

let avifSupport: boolean | null = null
let webpSupport: boolean | null = null

let formatSupportReady: Promise<void> | null = null

const initializeFormatSupport = async (): Promise<void> => {
    await Promise.all([supportsAVIF(), supportsWebP()])
}

formatSupportReady = initializeFormatSupport()

/**
 * Wait for format support detection to complete
 * @returns Promise<void> - resolves when format detection is ready
 */
export async function waitForFormatDetection(): Promise<void> {
    if (formatSupportReady) {
        await formatSupportReady
    }
}

/**
 * Check if format detection has completed
 * @returns boolean - true if detection is complete
 */
export function isFormatDetectionReady(): boolean {
    return avifSupport !== null && webpSupport !== null
}

/**
 * Generic image format detection helper
 * @param testImage - Base64 encoded test image
 * @param formatName - Name of the format for logging
 * @returns Promise<boolean> - true if format is supported
 */
function detectImageFormatSupport(
    testImage: string,
    formatName: string
): Promise<boolean> {
    return new Promise((resolve) => {
        let settled = false
        const img = new Image()

        const timeout = setTimeout(() => {
            settlePromise(
                false,
                `${formatName} format detection timed out, assuming not supported`
            )
        }, SUPPORT_TIMEOUT_MS)

        const settlePromise = (supported: boolean, reason?: string): void => {
            if (settled) return
            settled = true
            clearTimeout(timeout)
            if (!supported && reason) {
                logger.warn(reason)
            }
            resolve(supported)
        }

        img.onload = (): void => {
            settlePromise(true)
        }
        img.onerror = (): void => {
            settlePromise(false, `${formatName} format detection failed`)
        }
        img.src = testImage
    })
}

/**
 * Detects if the browser supports AVIF format
 * @returns Promise<boolean> - true if AVIF is supported
 */
export function supportsAVIF(): Promise<boolean> {
    if (avifSupport !== null) {
        return Promise.resolve(avifSupport)
    }

    return detectImageFormatSupport(AVIF_TEST_IMAGE, "AVIF").then(
        (supported) => {
            avifSupport = supported
            return supported
        }
    )
}

/**
 * Detects if the browser supports WebP format
 * @returns Promise<boolean> - true if WebP is supported
 */
export function supportsWebP(): Promise<boolean> {
    if (webpSupport !== null) {
        return Promise.resolve(webpSupport)
    }

    return detectImageFormatSupport(WEBP_TEST_IMAGE, "WebP").then(
        (supported) => {
            webpSupport = supported
            return supported
        }
    )
}

/**
 * Converts an AVIF URL to the best supported fallback format
 * @param avifUrl - The original AVIF image URL
 * @returns Promise<string> - The fallback URL or original if AVIF is supported
 */
export async function getImageWithFallback(avifUrl: string): Promise<string> {
    if (!avifUrl.includes(".avif")) {
        return avifUrl
    }

    const hasAVIF = await supportsAVIF()
    if (hasAVIF) {
        return avifUrl
    }

    const hasWebP = await supportsWebP()
    if (hasWebP) {
        const webpUrl = avifUrl.replace(".avif", ".webp")
        if (await imageExists(webpUrl)) {
            logger.info(`Using WebP fallback for ${avifUrl}`)
            return webpUrl
        }
    }

    const pngUrl = avifUrl.replace(".avif", ".png")
    if (await imageExists(pngUrl)) {
        logger.info(`Using PNG fallback for ${avifUrl}`)
        return pngUrl
    }

    const jpgUrl = avifUrl.replace(".avif", ".jpg")
    if (await imageExists(jpgUrl)) {
        logger.info(`Using JPG fallback for ${avifUrl}`)
        return jpgUrl
    }

    logger.warn(
        `No fallback found for ${avifUrl}, AVIF not supported on this browser`
    )
    return avifUrl
}

/**
 * Checks if an image URL exists and can be loaded
 * @param url - The image URL to check
 * @returns Promise<boolean> - true if the image exists and can be loaded
 */
async function imageExists(url: string): Promise<boolean> {
    return new Promise((resolve) => {
        const img = new Image()
        img.onload = (): void => resolve(true)
        img.onerror = (): void => resolve(false)
        img.src = url
    })
}

/**
 * Hook for using image with fallback support
 * @param originalUrl - The original image URL (potentially AVIF)
 * @returns [fallbackUrl, isLoading] - The fallback URL and loading state
 */
export function useImageWithFallback(
    originalUrl: string
): [string | null, boolean] {
    const [fallbackUrl, setFallbackUrl] = React.useState<string | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)

    React.useEffect(() => {
        let cancelled = false

        const loadWithFallback = async (): Promise<void> => {
            try {
                const url = await getImageWithFallback(originalUrl)
                if (!cancelled) {
                    setFallbackUrl(url)
                    setIsLoading(false)
                }
            } catch (error) {
                if (!cancelled) {
                    logger.error("Failed to load image with fallback", error)
                    setFallbackUrl(originalUrl)
                    setIsLoading(false)
                }
            }
        }

        setIsLoading(true)
        void loadWithFallback()

        return (): void => {
            cancelled = true
        }
    }, [originalUrl])

    return [fallbackUrl, isLoading]
}

/**
 * Synchronously converts an AVIF URL to the best supported fallback format
 * REQUIRES: Format detection must be complete (isFormatDetectionReady() === true)
 * @param avifUrl - The original AVIF image URL
 * @returns string - The fallback URL or original if AVIF is supported
 */
export function getImageWithFallbackSync(avifUrl: string): string {
    if (!avifUrl.includes(".avif")) {
        return avifUrl
    }

    if (!isFormatDetectionReady()) {
        logger.warn(
            "getImageWithFallbackSync called before format detection ready"
        )
        return avifUrl
    }

    if (avifSupport) {
        return avifUrl
    }

    if (webpSupport) {
        const webpUrl = avifUrl.replace(".avif", ".webp")
        logger.info(`Using WebP fallback for ${avifUrl}`)
        return webpUrl
    }

    const pngUrl = avifUrl.replace(".avif", ".png")
    logger.info(`Using PNG fallback for ${avifUrl}`)
    return pngUrl
}

/**
 * Gets a CSS background image URL with fallback support
 * @param avifUrl - The original AVIF image URL
 * @returns Promise<string> - CSS url() string with fallback
 */
export async function getCSSBackgroundWithFallback(
    avifUrl: string
): Promise<string> {
    const fallbackUrl = await getImageWithFallback(avifUrl)
    return `url("${fallbackUrl}")`
}
