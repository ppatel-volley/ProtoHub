import { useEffect, useMemo, useRef, useState } from "react"

import { getAsset } from "../config/branding"
import { BASE_URL, ENVIRONMENT } from "../config/envconfig"
import { Environment } from "../config/environment"
import { shouldUseWebCheckout } from "../config/platformDetection"
import {
    getImageWithFallbackSync,
    isFormatDetectionReady,
    waitForFormatDetection,
} from "../utils/imageFormatFallback"
import { type Game } from "./useGames"

const CHUNK_SIZE = 3
const MAX_RETRIES = 1

const DEBUG_PRELOAD =
    (ENVIRONMENT === Environment.LOCAL ||
        ENVIRONMENT === Environment.DEVELOPMENT) &&
    new URLSearchParams(window.location.search).get("debug-preload") === "true"

const debugLog = (message: string, ...args: unknown[]): void => {
    if (DEBUG_PRELOAD) {
        console.log(`[ImagePreload] ${message}`, ...args)
    }
}

interface PendingImage {
    url: string
    batchId: string
    epoch: number
}

type BatchCallback = () => void

interface UrlWaiter {
    batchId: string
    epoch: number
}

/**
 * Queue for preloading images in batches. Deduplicates URLs across batches;
 * resubmitting the same batchId supersedes the previous batch via epochs.
 * Processes URLs in chunks with main-thread yielding between chunks.
 */
export class ImagePreloadQueue {
    private batchCallbacks = new Map<string, BatchCallback>()

    private batchEpochs = new Map<string, number>()

    private batchRemaining = new Map<string, number>()

    private cancelledBatches = new Set<string>()

    private loadedUrls = new Set<string>()

    private pending: PendingImage[] = []

    private processing = false

    private queuedUrls = new Set<string>()

    private urlWaiters = new Map<string, UrlWaiter[]>()

    /**
     * Submit a batch of URLs to be preloaded.
     *
     * Resubmitting with the same batchId supersedes the previous submission (via epoch
     * tracking). URLs already loaded are skipped. URLs currently being loaded by another
     * batch cause this batch to register as a waiter rather than re-requesting.
     *
     * @param urls - Array of image URLs to preload (duplicates are handled)
     * @param batchId - Unique identifier for this batch (resubmission supersedes previous)
     * @param onComplete - Callback invoked when all URLs for this batch are loaded
     * @returns Cleanup function that cancels this batch and removes it from waiter lists
     */
    public submit(
        urls: string[],
        batchId: string,
        onComplete: BatchCallback
    ): () => void {
        this.removePendingItemsForBatch(batchId)
        this.cancelledBatches.delete(batchId)
        const currentEpoch = (this.batchEpochs.get(batchId) ?? 0) + 1
        this.batchEpochs.set(batchId, currentEpoch)

        const uniqueUrls = [...new Set(urls)]
        const urlsNeedingLoad: string[] = []
        const urlsToWaitOn: string[] = []

        for (const url of uniqueUrls) {
            if (this.loadedUrls.has(url)) continue
            if (this.queuedUrls.has(url)) {
                urlsToWaitOn.push(url)
            } else {
                urlsNeedingLoad.push(url)
            }
        }

        const totalUrlsForBatch = urlsNeedingLoad.length + urlsToWaitOn.length
        const skipped = uniqueUrls.length - totalUrlsForBatch

        if (totalUrlsForBatch === 0) {
            debugLog(
                `Batch "${batchId}" submitted with ${uniqueUrls.length} images (${skipped} already loaded), completing immediately`
            )
            queueMicrotask(onComplete)
            return () => {}
        }

        debugLog(
            `Batch "${batchId}" submitted with ${uniqueUrls.length} images (${skipped} already loaded, ${urlsNeedingLoad.length} to load, ${urlsToWaitOn.length} waiting on in-flight)`
        )

        this.batchCallbacks.set(batchId, onComplete)
        this.batchRemaining.set(batchId, totalUrlsForBatch)

        this.registerBatchAsWaiterForUrls(urlsToWaitOn, batchId, currentEpoch)
        this.enqueueUrlsForLoading(urlsNeedingLoad, batchId, currentEpoch)

        if (!this.processing) {
            this.processing = true
            debugLog("Queue processing started")
            void this.processQueue()
        }

        return () => {
            debugLog(`Batch "${batchId}" cancelled`)
            this.cancelledBatches.add(batchId)
            this.batchCallbacks.delete(batchId)
            this.batchRemaining.delete(batchId)
            this.removeBatchFromWaiterLists(batchId, currentEpoch)
        }
    }

    /**
     * Add URLs to the pending queue for loading.
     */
    private enqueueUrlsForLoading(
        urls: string[],
        batchId: string,
        epoch: number
    ): void {
        for (const url of urls) {
            this.queuedUrls.add(url)
            this.pending.push({ url, batchId, epoch })
        }
    }

    /**
     * Register a batch as waiting for URLs that are already being loaded by another batch.
     * When those URLs complete, this batch will be notified.
     */
    private registerBatchAsWaiterForUrls(
        urls: string[],
        batchId: string,
        epoch: number
    ): void {
        for (const url of urls) {
            const waiters = this.urlWaiters.get(url) ?? []
            waiters.push({ batchId, epoch })
            this.urlWaiters.set(url, waiters)
        }
    }

    /**
     * Notify all batches waiting on a URL that it has finished loading.
     * Skips batches that have been cancelled or superseded.
     */
    private notifyWaitersUrlLoaded(url: string): void {
        const waiters = this.urlWaiters.get(url) ?? []
        this.urlWaiters.delete(url)
        for (const waiter of waiters) {
            if (this.cancelledBatches.has(waiter.batchId)) continue
            const waiterEpochMismatch =
                this.batchEpochs.get(waiter.batchId) !== waiter.epoch
            if (waiterEpochMismatch) continue
            this.decrementBatchRemaining(waiter.batchId)
        }
    }

    /**
     * Remove a batch from all URL waiter lists.
     * Called when a batch is cancelled to prevent it from receiving completion notifications.
     */
    private removeBatchFromWaiterLists(batchId: string, epoch: number): void {
        for (const [url, waiters] of this.urlWaiters) {
            const filtered = waiters.filter(
                (w) => !(w.batchId === batchId && w.epoch === epoch)
            )
            if (filtered.length === 0) {
                this.urlWaiters.delete(url)
            } else {
                this.urlWaiters.set(url, filtered)
            }
        }
    }

    /**
     * Remove all pending items for a batch and clean up queuedUrls for any URLs
     * that no longer have pending items from other batches.
     */
    private removePendingItemsForBatch(batchId: string): void {
        const urlsBeingRemoved = new Set(
            this.pending
                .filter((item) => item.batchId === batchId)
                .map((item) => item.url)
        )
        this.pending = this.pending.filter((item) => item.batchId !== batchId)
        for (const url of urlsBeingRemoved) {
            const stillPendingElsewhere = this.pending.some(
                (item) => item.url === url
            )
            if (stillPendingElsewhere) continue

            const waiters = this.urlWaiters.get(url)
            if (waiters && waiters.length > 0) {
                const promoted = waiters.shift()!
                if (waiters.length === 0) this.urlWaiters.delete(url)
                this.pending.push({
                    url,
                    batchId: promoted.batchId,
                    epoch: promoted.epoch,
                })
            } else {
                this.queuedUrls.delete(url)
            }
        }
    }

    /**
     * Decrement the remaining URL count for a batch and invoke callback if complete.
     */
    private decrementBatchRemaining(batchId: string): void {
        const remaining = (this.batchRemaining.get(batchId) ?? 1) - 1
        this.batchRemaining.set(batchId, remaining)

        if (remaining === 0) {
            const callback = this.batchCallbacks.get(batchId)
            if (callback) {
                debugLog(`Batch "${batchId}" complete`)
                callback()
                this.batchCallbacks.delete(batchId)
                this.batchRemaining.delete(batchId)
            }
        }
    }

    /**
     * Load and decode a single image with retry support.
     *
     * @returns true if the image was successfully loaded and decoded
     */
    private async loadAndDecodeImage(url: string): Promise<boolean> {
        const shortUrl = url.split("/").pop() ?? url
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            const img = new Image()
            img.src = url
            try {
                await img.decode()
                debugLog(`✓ Loaded: ${shortUrl}`)
                return true
            } catch {
                if (attempt === MAX_RETRIES) {
                    debugLog(
                        `✗ Failed after ${MAX_RETRIES + 1} attempts: ${shortUrl}`
                    )
                    return false
                }
                debugLog(`⟳ Retry ${attempt + 1}/${MAX_RETRIES}: ${shortUrl}`)
                await new Promise((r) => setTimeout(r, 100))
            }
        }
        return false
    }

    /**
     * Process the pending queue in chunks, yielding to the main thread between chunks.
     *
     * For each URL:
     * 1. Load the image (even if originating batch was cancelled, for waiting batches)
     * 2. Clean up queuedUrls tracking
     * 3. Notify all waiting batches
     * 4. Decrement the originating batch's remaining count (if not cancelled/superseded)
     */
    private async processQueue(): Promise<void> {
        let chunkIndex = 0
        while (this.pending.length > 0) {
            const chunk = this.pending.splice(0, CHUNK_SIZE)
            const chunkUrls = chunk
                .map((c) => c.url.split("/").pop())
                .join(", ")
            debugLog(
                `Chunk ${chunkIndex} processing (${chunk.length} images, ${this.pending.length} remaining): ${chunkUrls}`
            )

            await Promise.all(
                chunk.map(async ({ url, batchId, epoch }) => {
                    if (!this.loadedUrls.has(url)) {
                        const success = await this.loadAndDecodeImage(url)
                        if (success) {
                            this.loadedUrls.add(url)
                        }
                    }

                    this.queuedUrls.delete(url)
                    this.notifyWaitersUrlLoaded(url)

                    const batchCancelled = this.cancelledBatches.has(batchId)
                    const epochMismatch =
                        this.batchEpochs.get(batchId) !== epoch

                    if (batchCancelled || epochMismatch) return

                    this.decrementBatchRemaining(batchId)
                })
            )

            if (this.pending.length > 0) {
                debugLog(`Yielding to main thread...`)
            }
            await new Promise((resolve) => setTimeout(resolve, 0))
            chunkIndex++
        }

        debugLog("Queue processing complete")
        this.processing = false
        this.cancelledBatches.clear()
    }
}

/**
 * Static web checkout images that are required for web checkout modal
 */
const staticWebCheckoutRequiredImages = [
    `${BASE_URL}assets/images/ui/scan-indicator.avif`,
]

/**
 * Status banner images (AVIF images)
 */
const statusBannerImages = [
    `${BASE_URL}assets/images/ui/tags/beta.avif`,
    `${BASE_URL}assets/images/ui/tags/coming-soon.avif`,
    `${BASE_URL}assets/images/ui/tags/new.avif`,
]

export interface ImagePreloadingResult {
    requiredImagesLoaded: boolean
    optionalImagesLoaded: boolean

    firstHeroImageLoaded: boolean
    remainingHeroImagesLoaded: boolean
    tileImagesLoaded: boolean
    focusIndicatorLoaded: boolean
    webCheckoutRequiredImagesLoaded: boolean
    statusBannersLoaded: boolean
    tileAnimationsLoaded: boolean
}

interface ImageCategories {
    requiredFirstHero: string[]
    requiredTile: string[]
    requiredFocusIndicator: string[]
    requiredStatusBanners: string[]
    webCheckoutRequired: string[]
    optionalRemainingHero: string[]
    optionalTile: string[]
    optionalFocusIndicator: string[]
    optionalStatusBanners: string[]
    tileAnimations: string[]
}

/**
 * Manages required (loading-blocking) and optional (non-blocking) image preloading.
 * When deferMainHubAssets is true, all main hub assets become optional and load
 * after the first hero. Uses ImagePreloadQueue for batching and format detection.
 */
export function useImagePreloading(
    games: Game[],
    isSubscribed?: boolean,
    deferMainHubAssets = false
): ImagePreloadingResult {
    const useHardPaywalls = shouldUseWebCheckout()
    const [formatReady, setFormatReady] = useState(isFormatDetectionReady())
    const queueRef = useRef<ImagePreloadQueue | null>(null)
    if (!queueRef.current) {
        queueRef.current = new ImagePreloadQueue()
    }

    const [firstHeroImageLoaded, setFirstHeroImageLoaded] = useState(false)
    const [tileImagesLoaded, setTileImagesLoaded] = useState(false)
    const [focusIndicatorLoaded, setFocusIndicatorLoaded] = useState(false)
    const [statusBannersLoaded, setStatusBannersLoaded] = useState(false)
    const [
        webCheckoutRequiredImagesLoaded,
        setWebCheckoutRequiredImagesLoaded,
    ] = useState(false)
    const [remainingHeroImagesLoaded, setRemainingHeroImagesLoaded] =
        useState(false)
    const [deferredTileLoaded, setDeferredTileLoaded] = useState(false)
    const [deferredFocusIndicatorLoaded, setDeferredFocusIndicatorLoaded] =
        useState(false)
    const [deferredStatusBannersLoaded, setDeferredStatusBannersLoaded] =
        useState(false)
    const [tileAnimationsLoaded, setTileAnimationsLoaded] = useState(false)

    useEffect(() => {
        if (!isFormatDetectionReady()) {
            void waitForFormatDetection().then(() => {
                setFormatReady(true)
            })
        }
    }, [])

    const imageCategories: ImageCategories = useMemo(() => {
        if (!formatReady) {
            return {
                requiredFirstHero: [],
                requiredTile: [],
                requiredFocusIndicator: [],
                requiredStatusBanners: [],
                webCheckoutRequired: [],
                optionalRemainingHero: [],
                optionalTile: [],
                optionalFocusIndicator: [],
                optionalStatusBanners: [],
                tileAnimations: [],
            }
        }

        const heroImages = games.map((g) =>
            getImageWithFallbackSync(g.heroImageUrl)
        )
        const tileImages = games.map((g) =>
            getImageWithFallbackSync(g.tileImageUrl)
        )
        const focusIndicatorUrl = `${BASE_URL}${getAsset("focusFrame")}`
        const focusIndicatorImages = [
            getImageWithFallbackSync(focusIndicatorUrl),
        ]
        const statusBannerImagesWithFallback = statusBannerImages.map((url) =>
            getImageWithFallbackSync(url)
        )

        const shouldLoadWebCheckoutImages = useHardPaywalls && !isSubscribed

        return {
            // First hero image is required (unless deferring all)
            requiredFirstHero: deferMainHubAssets ? [] : heroImages.slice(0, 1),
            requiredTile: deferMainHubAssets ? [] : tileImages,
            requiredFocusIndicator: deferMainHubAssets
                ? []
                : focusIndicatorImages,
            requiredStatusBanners: deferMainHubAssets
                ? []
                : statusBannerImagesWithFallback,
            webCheckoutRequired: shouldLoadWebCheckoutImages
                ? staticWebCheckoutRequiredImages.map((url) =>
                      getImageWithFallbackSync(url)
                  )
                : [],

            // Remaining hero images are always optional, or ALL hero images if deferring
            optionalRemainingHero: deferMainHubAssets
                ? heroImages
                : heroImages.slice(1),
            optionalTile: deferMainHubAssets ? tileImages : [],
            optionalFocusIndicator: deferMainHubAssets
                ? focusIndicatorImages
                : [],
            optionalStatusBanners: deferMainHubAssets
                ? statusBannerImagesWithFallback
                : [],
            tileAnimations: games
                .map((g) => g.animationUri)
                .filter((url): url is string => Boolean(url)),
        }
    }, [games, useHardPaywalls, formatReady, isSubscribed, deferMainHubAssets])

    useEffect(() => {
        debugLog(
            `Required batches effect running - formatReady=${formatReady}, games=${games.length}, deferMainHubAssets=${deferMainHubAssets}`
        )

        const queue = queueRef.current!
        const cleanups: Array<() => void> = []

        setFirstHeroImageLoaded(false)
        setTileImagesLoaded(false)
        setFocusIndicatorLoaded(false)
        setStatusBannersLoaded(false)
        setWebCheckoutRequiredImagesLoaded(false)

        cleanups.push(
            queue.submit(imageCategories.requiredFirstHero, "firstHero", () =>
                setFirstHeroImageLoaded(true)
            )
        )
        cleanups.push(
            queue.submit(imageCategories.requiredTile, "tiles", () =>
                setTileImagesLoaded(true)
            )
        )
        cleanups.push(
            queue.submit(imageCategories.requiredFocusIndicator, "focus", () =>
                setFocusIndicatorLoaded(true)
            )
        )
        cleanups.push(
            queue.submit(imageCategories.requiredStatusBanners, "status", () =>
                setStatusBannersLoaded(true)
            )
        )
        cleanups.push(
            queue.submit(
                imageCategories.webCheckoutRequired,
                "webCheckout",
                () => setWebCheckoutRequiredImagesLoaded(true)
            )
        )

        return (): void => cleanups.forEach((fn) => fn())
    }, [imageCategories])

    const requiredImagesLoaded =
        formatReady &&
        firstHeroImageLoaded &&
        tileImagesLoaded &&
        focusIndicatorLoaded &&
        statusBannersLoaded &&
        webCheckoutRequiredImagesLoaded

    useEffect(() => {
        if (!requiredImagesLoaded) return

        const queue = queueRef.current!
        const cleanups: Array<() => void> = []

        setRemainingHeroImagesLoaded(false)
        setDeferredTileLoaded(false)
        setDeferredFocusIndicatorLoaded(false)
        setDeferredStatusBannersLoaded(false)
        setTileAnimationsLoaded(false)

        cleanups.push(
            queue.submit(
                imageCategories.optionalRemainingHero,
                "remainingHero",
                () => setRemainingHeroImagesLoaded(true)
            )
        )
        cleanups.push(
            queue.submit(imageCategories.optionalTile, "deferredTile", () =>
                setDeferredTileLoaded(true)
            )
        )
        cleanups.push(
            queue.submit(
                imageCategories.optionalFocusIndicator,
                "deferredFocus",
                () => setDeferredFocusIndicatorLoaded(true)
            )
        )
        cleanups.push(
            queue.submit(
                imageCategories.optionalStatusBanners,
                "deferredStatus",
                () => setDeferredStatusBannersLoaded(true)
            )
        )
        cleanups.push(
            queue.submit(imageCategories.tileAnimations, "animations", () =>
                setTileAnimationsLoaded(true)
            )
        )

        return (): void => cleanups.forEach((fn) => fn())
    }, [requiredImagesLoaded, imageCategories])

    const optionalImagesLoaded =
        remainingHeroImagesLoaded &&
        deferredTileLoaded &&
        deferredFocusIndicatorLoaded &&
        deferredStatusBannersLoaded &&
        tileAnimationsLoaded

    return useMemo(
        () => ({
            requiredImagesLoaded,
            optionalImagesLoaded,

            firstHeroImageLoaded,
            remainingHeroImagesLoaded,
            tileImagesLoaded,
            focusIndicatorLoaded,
            webCheckoutRequiredImagesLoaded,
            statusBannersLoaded,
            tileAnimationsLoaded,
        }),
        [
            requiredImagesLoaded,
            optionalImagesLoaded,
            firstHeroImageLoaded,
            remainingHeroImagesLoaded,
            tileImagesLoaded,
            focusIndicatorLoaded,
            webCheckoutRequiredImagesLoaded,
            statusBannersLoaded,
            tileAnimationsLoaded,
        ]
    )
}
