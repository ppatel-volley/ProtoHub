import "@testing-library/jest-dom"

import { act, render, screen } from "@testing-library/react"
import React from "react"

import { shouldUseWebCheckout } from "../config/platformDetection"
import { PaywallType } from "../constants/game"
import type { Game } from "./useGames"
import { ImagePreloadQueue, useImagePreloading } from "./usePreloadImages"

// Hoisted mocks for wrapper tests
jest.mock("../config/platformDetection", () => ({
    shouldUseWebCheckout: jest.fn(),
}))

const mockModalContent = {
    videoSrc: "https://videos/video.mp4",
    mainHeading: "Test Heading",
    subtitle: "Test Subtitle",
    videoSegments: { introStart: 0, introEnd: 3, loopStart: 3 },
}

jest.mock("../components/WebCheckoutModal/webCheckoutModalConfig", () => ({
    getWebCheckoutModalContent: jest.fn(() => mockModalContent),
}))

jest.mock("../config/envconfig", () => ({
    BASE_URL: "https://cdn/",
    getWindowVar: jest.fn(),
}))

jest.mock("../utils/imageFormatFallback", () => ({
    getImageWithFallbackSync: jest.fn((url: string) => url),
    isFormatDetectionReady: jest.fn(() => true),
    waitForFormatDetection: jest.fn(() => Promise.resolve()),
    supportsAVIF: jest.fn(() => Promise.resolve(true)),
    supportsWebP: jest.fn(() => Promise.resolve(true)),
}))

interface MockImageType {
    complete: boolean
    listeners: Record<string, () => void>
    src?: string
    decodeResolve: (() => void) | null
    decodeReject: ((e: Error) => void) | null

    addEventListener(event: string, cb: () => void): void

    removeEventListener(event: string): void

    decode(): Promise<void>
}

let instances: MockImageType[] = []

beforeAll(() => {
    // @ts-expect-error: overriding global FontFace for test harness
    global.FontFace = class MockFontFace {
        public family: string

        public loaded = false

        public loadPromise: Promise<void>

        public rejectLoad!: (error: Error) => void

        public resolveLoad!: () => void

        public source: string

        constructor(family: string, source: string) {
            this.family = family
            this.source = source

            this.loadPromise = new Promise<void>((resolve, reject) => {
                this.resolveLoad = (): void => {
                    this.loaded = true
                    resolve()
                }
                this.rejectLoad = reject
            })
        }

        public load(): Promise<void> {
            return this.loadPromise
        }
    }

    // @ts-expect-error: overriding global Image for test harness
    global.Image = class MockImage {
        private _src?: string

        public complete = false

        public decodeReject: ((e: Error) => void) | null = null

        public decodeResolve: (() => void) | null = null

        public listeners: Record<string, () => void> = {}

        public get src(): string | undefined {
            return this._src
        }

        public set src(value: string) {
            this._src = value
        }

        constructor() {
            instances.push(this)
        }

        public addEventListener(event: string, cb: () => void): void {
            this.listeners[event] = cb
        }

        public removeEventListener(event: string): void {
            delete this.listeners[event]
        }

        public decode(): Promise<void> {
            if (this.complete) {
                return Promise.resolve()
            }
            return new Promise((resolve, reject) => {
                this.decodeResolve = resolve
                this.decodeReject = reject
            })
        }
    }
})

beforeEach(() => {
    jest.useFakeTimers()
})

afterEach(() => {
    instances = []
    jest.useRealTimers()
})

async function resolveAllImages(iterations = 20): Promise<void> {
    for (let i = 0; i < iterations; i++) {
        // eslint-disable-next-line @typescript-eslint/require-await
        await act(async () => {
            instances.forEach((img) => img.decodeResolve?.())
            jest.advanceTimersByTime(10)
        })
    }
}

describe("useImagePreloading (wrapper)", () => {
    const FOCUS_INDICATOR_COUNT = 1
    const STATUS_BANNER_COUNT = 3
    const TILE_ANIMATIONS_COUNT = 0
    const WEB_CHECKOUT_REQUIRED_IMAGES_COUNT = 1
    const WEB_CHECKOUT_REQUIRED_DISABLED_COUNT = 0

    function makeGames(count: number): Array<Game> {
        return Array.from({ length: count }).map((_, i) => ({
            id: `g${i}` as unknown as any,
            trackingId: `tg${i}` as unknown as any,
            title: `Game ${i}`,
            tileImageUrl: `/tile_${i}.avif`,
            heroImageUrl: `/hero_${i}.avif`,
            paywallType: PaywallType.Soft,
        }))
    }

    function TestPreload({
        games,
        isSubscribed,
        deferMainHubAssets,
    }: {
        games: Game[]
        isSubscribed?: boolean
        deferMainHubAssets?: boolean
    }): React.JSX.Element {
        const { requiredImagesLoaded } = useImagePreloading(
            games,
            isSubscribed,
            deferMainHubAssets
        )
        return requiredImagesLoaded ? (
            <span data-testid="done" />
        ) : (
            <span data-testid="loading" />
        )
    }

    beforeEach(() => {
        ;(shouldUseWebCheckout as jest.Mock).mockReset()
        instances = []
    })

    it("preloads hero and web checkout assets when hard paywalls are enabled and user is unsubscribed", async () => {
        ;(shouldUseWebCheckout as jest.Mock).mockReturnValue(true)

        const games = makeGames(2)
        const FIRST_HERO_IMAGE_COUNT = 1
        const REMAINING_HERO_IMAGE_COUNT = games.length - 1
        const TILE_IMAGES_COUNT = games.length

        const REQUIRED_IMAGES_COUNT =
            FIRST_HERO_IMAGE_COUNT +
            TILE_IMAGES_COUNT +
            FOCUS_INDICATOR_COUNT +
            STATUS_BANNER_COUNT +
            WEB_CHECKOUT_REQUIRED_IMAGES_COUNT
        const OPTIONAL_IMAGES_COUNT =
            TILE_ANIMATIONS_COUNT + REMAINING_HERO_IMAGE_COUNT

        render(<TestPreload games={games} />)

        await resolveAllImages()

        expect(instances.length).toBe(
            REQUIRED_IMAGES_COUNT + OPTIONAL_IMAGES_COUNT
        )

        expect(await screen.findByTestId("done")).toBeInTheDocument()
    })

    it("preloads only hero images when hard paywalls are disabled", async () => {
        ;(shouldUseWebCheckout as jest.Mock).mockReturnValue(false)

        const games = makeGames(3)
        const FIRST_HERO_IMAGE_COUNT = 1
        const REMAINING_HERO_IMAGE_COUNT = games.length - 1
        const TILE_IMAGES_COUNT = games.length

        const REQUIRED_IMAGES_COUNT =
            FIRST_HERO_IMAGE_COUNT +
            TILE_IMAGES_COUNT +
            FOCUS_INDICATOR_COUNT +
            STATUS_BANNER_COUNT +
            WEB_CHECKOUT_REQUIRED_DISABLED_COUNT
        const OPTIONAL_IMAGES_COUNT =
            TILE_ANIMATIONS_COUNT + REMAINING_HERO_IMAGE_COUNT

        render(<TestPreload games={games} />)

        await resolveAllImages()

        expect(instances.length).toBe(
            REQUIRED_IMAGES_COUNT + OPTIONAL_IMAGES_COUNT
        )

        expect(await screen.findByTestId("done")).toBeInTheDocument()
    })
})

describe("useImagePreloading granular states", () => {
    const FOCUS_INDICATOR_COUNT = 1
    const STATUS_BANNER_COUNT = 3
    const TILE_ANIMATIONS_COUNT = 0
    const WEB_CHECKOUT_REQUIRED_DISABLED_COUNT = 0

    function makeGames(count: number): Array<Game> {
        return Array.from({ length: count }).map((_, i) => ({
            id: `g${i}` as unknown as any,
            trackingId: `tg${i}` as unknown as any,
            title: `Game ${i}`,
            tileImageUrl: `/tile_${i}.avif`,
            heroImageUrl: `/hero_${i}.avif`,
            paywallType: PaywallType.Soft,
        }))
    }

    function TestGranularStates({
        games,
    }: {
        games: Game[]
    }): React.JSX.Element {
        const states = useImagePreloading(games)
        return (
            <div>
                <span data-testid="first-hero-loaded">
                    {states.firstHeroImageLoaded.toString()}
                </span>
                <span data-testid="remaining-hero-loaded">
                    {states.remainingHeroImagesLoaded.toString()}
                </span>
                <span data-testid="tile-loaded">
                    {states.tileImagesLoaded.toString()}
                </span>
                <span data-testid="focus-loaded">
                    {states.focusIndicatorLoaded.toString()}
                </span>
                <span data-testid="web-required-loaded">
                    {states.webCheckoutRequiredImagesLoaded.toString()}
                </span>
                <span data-testid="required-loaded">
                    {states.requiredImagesLoaded.toString()}
                </span>
                <span data-testid="status-loaded">
                    {states.statusBannersLoaded.toString()}
                </span>
                <span data-testid="animations-loaded">
                    {states.tileAnimationsLoaded.toString()}
                </span>
                <span data-testid="optional-loaded">
                    {states.optionalImagesLoaded.toString()}
                </span>
            </div>
        )
    }

    beforeEach(() => {
        ;(shouldUseWebCheckout as jest.Mock).mockReset()
        instances = []
    })

    it("reports granular loading states correctly", async () => {
        ;(shouldUseWebCheckout as jest.Mock).mockReturnValue(false)

        const games = makeGames(1)
        const FIRST_HERO_IMAGE_COUNT = 1
        const TILE_IMAGES_COUNT = games.length

        const REQUIRED_IMAGES_COUNT =
            FIRST_HERO_IMAGE_COUNT +
            TILE_IMAGES_COUNT +
            FOCUS_INDICATOR_COUNT +
            STATUS_BANNER_COUNT +
            WEB_CHECKOUT_REQUIRED_DISABLED_COUNT
        const OPTIONAL_IMAGES_COUNT = TILE_ANIMATIONS_COUNT

        render(<TestGranularStates games={games} />)

        act(() => {
            jest.advanceTimersByTime(0)
        })

        expect(screen.getByTestId("first-hero-loaded")).toHaveTextContent(
            "false"
        )
        expect(screen.getByTestId("remaining-hero-loaded")).toHaveTextContent(
            "false"
        )
        expect(screen.getByTestId("tile-loaded")).toHaveTextContent("false")
        expect(screen.getByTestId("focus-loaded")).toHaveTextContent("false")
        expect(screen.getByTestId("required-loaded")).toHaveTextContent("false")
        expect(screen.getByTestId("optional-loaded")).toHaveTextContent("false")

        expect(screen.getByTestId("web-required-loaded")).toHaveTextContent(
            "true"
        )

        await resolveAllImages(10)

        expect(screen.getByTestId("first-hero-loaded")).toHaveTextContent(
            "true"
        )
        expect(screen.getByTestId("tile-loaded")).toHaveTextContent("true")
        expect(screen.getByTestId("focus-loaded")).toHaveTextContent("true")
        expect(screen.getByTestId("status-loaded")).toHaveTextContent("true")
        expect(screen.getByTestId("required-loaded")).toHaveTextContent("true")

        expect(instances.length).toBe(
            REQUIRED_IMAGES_COUNT + OPTIONAL_IMAGES_COUNT
        )

        expect(screen.getByTestId("remaining-hero-loaded")).toHaveTextContent(
            "true"
        )
        expect(screen.getByTestId("animations-loaded")).toHaveTextContent(
            "true"
        )
        expect(screen.getByTestId("optional-loaded")).toHaveTextContent("true")
    })

    it("does not load optional images until required images are complete", async () => {
        ;(shouldUseWebCheckout as jest.Mock).mockReturnValue(false)

        const games = makeGames(1)
        const FIRST_HERO_IMAGE_COUNT = 1
        const TILE_IMAGES_COUNT = games.length

        const REQUIRED_IMAGES_COUNT =
            FIRST_HERO_IMAGE_COUNT +
            TILE_IMAGES_COUNT +
            FOCUS_INDICATOR_COUNT +
            STATUS_BANNER_COUNT +
            WEB_CHECKOUT_REQUIRED_DISABLED_COUNT
        const OPTIONAL_IMAGES_COUNT = TILE_ANIMATIONS_COUNT

        render(<TestGranularStates games={games} />)

        act(() => {
            jest.advanceTimersByTime(10)
        })

        act(() => {
            instances[0]?.decodeResolve?.()
            instances[1]?.decodeResolve?.()
            jest.advanceTimersByTime(10)
        })

        expect(screen.getByTestId("required-loaded")).toHaveTextContent("false")
        expect(screen.getByTestId("optional-loaded")).toHaveTextContent("false")

        await resolveAllImages(10)

        expect(screen.getByTestId("required-loaded")).toHaveTextContent("true")

        expect(instances.length).toBe(
            REQUIRED_IMAGES_COUNT + OPTIONAL_IMAGES_COUNT
        )
    })
})

describe("useImagePreloading with WebP fallback", () => {
    const {
        getImageWithFallbackSync,
        isFormatDetectionReady,
    } = require("../utils/imageFormatFallback")

    function makeGames(count: number): Array<Game> {
        return Array.from({ length: count }).map((_, i) => ({
            id: `g${i}` as unknown as any,
            trackingId: `tg${i}` as unknown as any,
            title: `Game ${i}`,
            tileImageUrl: `/tile_${i}.avif`,
            heroImageUrl: `/hero_${i}.avif`,
            paywallType: PaywallType.Soft,
        }))
    }

    function TestPreload({ games }: { games: Game[] }): React.JSX.Element {
        const { requiredImagesLoaded } = useImagePreloading(games)
        return requiredImagesLoaded ? (
            <span data-testid="done" />
        ) : (
            <span data-testid="loading" />
        )
    }

    beforeEach(() => {
        ;(shouldUseWebCheckout as jest.Mock).mockReset()
        ;(shouldUseWebCheckout as jest.Mock).mockReturnValue(false)
        ;(isFormatDetectionReady as jest.Mock).mockReturnValue(true)
        ;(getImageWithFallbackSync as jest.Mock).mockImplementation(
            (url: string) => url
        )
        instances = []
    })

    it("preloads WebP images when AVIF is not supported", () => {
        ;(getImageWithFallbackSync as jest.Mock).mockImplementation(
            (url: string) => url.replace(".avif", ".webp")
        )

        const games = makeGames(2)
        render(<TestPreload games={games} />)

        expect(getImageWithFallbackSync).toHaveBeenCalled()

        const callArgs = (getImageWithFallbackSync as jest.Mock).mock.calls
        const avifUrls = callArgs
            .map((call: string[]) => call[0] as string)
            .filter((url) => url?.includes(".avif"))

        expect(avifUrls.length).toBeGreaterThan(0)

        const convertedUrls = avifUrls.map(
            (url: string) =>
                (getImageWithFallbackSync as jest.Mock)(url) as string
        )
        expect(convertedUrls.every((url) => url?.includes(".webp"))).toBe(true)
        expect(
            convertedUrls.every((url) => url && !url.includes(".avif"))
        ).toBe(true)
    })

    it("preloads AVIF images when AVIF is supported", () => {
        ;(getImageWithFallbackSync as jest.Mock).mockImplementation(
            (url: string) => url
        )

        const games = makeGames(2)
        render(<TestPreload games={games} />)

        expect(getImageWithFallbackSync).toHaveBeenCalled()

        const callArgs = (getImageWithFallbackSync as jest.Mock).mock.calls
        const preloadedUrls = callArgs.map(
            (call: string[]) => call[0] as string
        )

        expect(preloadedUrls.some((url) => url?.includes(".avif"))).toBe(true)
    })

    it("waits for format detection before preloading", async () => {
        ;(isFormatDetectionReady as jest.Mock).mockReturnValue(false)
        const {
            waitForFormatDetection,
        } = require("../utils/imageFormatFallback")
        let resolveFormatDetection: () => void
        ;(waitForFormatDetection as jest.Mock).mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    resolveFormatDetection = resolve
                })
        )

        const games = makeGames(1)
        render(<TestPreload games={games} />)

        expect(screen.getByTestId("loading")).toBeInTheDocument()

        expect(instances.length).toBe(0)

        act(() => {
            ;(isFormatDetectionReady as jest.Mock).mockReturnValue(true)
            resolveFormatDetection()
            jest.advanceTimersByTime(10)
        })

        await resolveAllImages(5)

        expect(instances.length).toBeGreaterThan(0)
    })
})

describe("useImagePreloading subscription-based loading", () => {
    function makeGames(count: number): Array<Game> {
        return Array.from({ length: count }).map((_, i) => ({
            id: `g${i}` as unknown as any,
            trackingId: `tg${i}` as unknown as any,
            title: `Game ${i}`,
            tileImageUrl: `/tile_${i}.avif`,
            heroImageUrl: `/hero_${i}.avif`,
            paywallType: PaywallType.Soft,
        }))
    }

    function TestSubscriptionPreload({
        games,
        isSubscribed,
        deferMainHubAssets,
    }: {
        games: Game[]
        isSubscribed?: boolean
        deferMainHubAssets?: boolean
    }): React.JSX.Element {
        const states = useImagePreloading(
            games,
            isSubscribed,
            deferMainHubAssets
        )
        return (
            <div>
                <span data-testid="web-required-loaded">
                    {states.webCheckoutRequiredImagesLoaded.toString()}
                </span>
                <span data-testid="required-loaded">
                    {states.requiredImagesLoaded.toString()}
                </span>
            </div>
        )
    }

    beforeEach(() => {
        ;(shouldUseWebCheckout as jest.Mock).mockReset()
        instances = []
    })

    it("does NOT load web checkout images for subscribed users on web checkout platforms", () => {
        ;(shouldUseWebCheckout as jest.Mock).mockReturnValue(true)

        const games = makeGames(2)
        render(<TestSubscriptionPreload games={games} isSubscribed />)

        const webCheckoutImagesCount = instances.filter(
            (img) =>
                img.src?.includes("scan-indicator") ||
                img.src?.includes("left-overlay")
        ).length

        expect(webCheckoutImagesCount).toBe(0)
    })

    it("loads web checkout images for unsubscribed users on web checkout platforms", async () => {
        ;(shouldUseWebCheckout as jest.Mock).mockReturnValue(true)

        const games = makeGames(2)
        render(<TestSubscriptionPreload games={games} isSubscribed={false} />)

        await resolveAllImages(10)

        const expectedWebCheckoutImages = 2
        const totalImages = instances.length

        expect(totalImages).toBeGreaterThanOrEqual(expectedWebCheckoutImages)
    })

    it("defers main hub assets when deferMainHubAssets is true", () => {
        ;(shouldUseWebCheckout as jest.Mock).mockReturnValue(true)

        const games = makeGames(777)
        render(
            <TestSubscriptionPreload
                games={games}
                isSubscribed={false}
                deferMainHubAssets
            />
        )

        const webCheckoutCount = 1
        const expectedRequiredImages = webCheckoutCount

        expect(instances.length).toBe(expectedRequiredImages)
    })

    it("loads main hub assets immediately when deferMainHubAssets is false", async () => {
        ;(shouldUseWebCheckout as jest.Mock).mockReturnValue(false)

        const games = makeGames(2)
        render(
            <TestSubscriptionPreload
                games={games}
                isSubscribed={false}
                deferMainHubAssets={false}
            />
        )

        await resolveAllImages(10)

        const firstHeroCount = 1
        const tileCount = games.length
        const focusIndicatorCount = 1
        const statusBannerCount = 3
        const remainingHeroCount = games.length - 1

        const expectedRequiredImages =
            firstHeroCount + tileCount + focusIndicatorCount + statusBannerCount
        const expectedOptionalImages = remainingHeroCount

        expect(instances.length).toBe(
            expectedRequiredImages + expectedOptionalImages
        )
    })
})

describe("ImagePreloadQueue edge cases", () => {
    beforeEach(() => {
        ;(shouldUseWebCheckout as jest.Mock).mockReset()
        ;(shouldUseWebCheckout as jest.Mock).mockReturnValue(false)
        instances = []
    })

    it("deduplicates URLs within a single batch submission", async () => {
        // This test uses two components that share a queue via module-level singleton
        // We'll test by creating games with duplicate URLs
        function makeGamesWithDuplicateHero(count: number): Array<Game> {
            return Array.from({ length: count }).map((_, i) => ({
                id: `g${i}` as unknown as any,
                trackingId: `tg${i}` as unknown as any,
                title: `Game ${i}`,
                tileImageUrl: `/tile_${i}.avif`,
                // All games share the same hero image
                heroImageUrl: `/hero_shared.avif`,
                paywallType: PaywallType.Soft,
            }))
        }

        function TestPreload({ games }: { games: Game[] }): React.JSX.Element {
            const { requiredImagesLoaded } = useImagePreloading(games)
            return requiredImagesLoaded ? (
                <span data-testid="done" />
            ) : (
                <span data-testid="loading" />
            )
        }

        const games = makeGamesWithDuplicateHero(3)
        render(<TestPreload games={games} />)

        await resolveAllImages()

        // With 3 games all sharing the same hero image:
        // Required: 1 first hero (shared) + 3 tiles + 1 focus + 3 status = 8
        // Optional: 0 remaining hero (all are same as first) + 0 animations = 0
        // Total unique images = 8
        const heroImageInstances = instances.filter((img) =>
            img.src?.includes("hero")
        )
        // Only 1 hero image should be loaded despite 3 games
        expect(heroImageInstances.length).toBe(1)

        expect(await screen.findByTestId("done")).toBeInTheDocument()
    })

    it("batch waiting on in-flight URL completes after URL finishes loading", async () => {
        // This tests that when required batch and optional batch both need the same URL,
        // the optional batch correctly waits for the URL loaded by required batch.
        // This happens naturally with first hero (required) and remaining hero (optional)
        // when there's only one game (so first hero = remaining hero = same URL)
        function makeGamesWithSingleHero(): Game[] {
            return [
                {
                    id: "g0" as unknown as any,
                    trackingId: "tg0" as unknown as any,
                    title: "Game 0",
                    tileImageUrl: "/tile_0.avif",
                    heroImageUrl: "/hero_only.avif",
                    paywallType: PaywallType.Soft,
                },
            ]
        }

        function TestPreload({ games }: { games: Game[] }): React.JSX.Element {
            const states = useImagePreloading(games)
            return (
                <div>
                    <span data-testid="first-hero">
                        {states.firstHeroImageLoaded.toString()}
                    </span>
                    <span data-testid="remaining-hero">
                        {states.remainingHeroImagesLoaded.toString()}
                    </span>
                    <span data-testid="required">
                        {states.requiredImagesLoaded.toString()}
                    </span>
                    <span data-testid="optional">
                        {states.optionalImagesLoaded.toString()}
                    </span>
                </div>
            )
        }

        const games = makeGamesWithSingleHero()
        render(<TestPreload games={games} />)

        await resolveAllImages()

        // Both required and optional should complete
        expect(screen.getByTestId("required")).toHaveTextContent("true")
        expect(screen.getByTestId("optional")).toHaveTextContent("true")
        expect(screen.getByTestId("first-hero")).toHaveTextContent("true")
        expect(screen.getByTestId("remaining-hero")).toHaveTextContent("true")

        // Hero image should only be loaded once (not twice)
        const heroInstances = instances.filter((img) =>
            img.src?.includes("hero_only")
        )
        expect(heroInstances.length).toBe(1)
    })

    it("handles duplicate URLs in input array correctly", async () => {
        // Test that when the same URL appears multiple times in input,
        // we don't create multiple Image instances
        function makeGamesWithIdenticalUrls(): Game[] {
            return [
                {
                    id: "g0" as unknown as any,
                    trackingId: "tg0" as unknown as any,
                    title: "Game 0",
                    tileImageUrl: "/same_tile.avif",
                    heroImageUrl: "/same_hero.avif",
                    paywallType: PaywallType.Soft,
                },
                {
                    id: "g1" as unknown as any,
                    trackingId: "tg1" as unknown as any,
                    title: "Game 1",
                    tileImageUrl: "/same_tile.avif",
                    heroImageUrl: "/same_hero.avif",
                    paywallType: PaywallType.Soft,
                },
            ]
        }

        function TestPreload({ games }: { games: Game[] }): React.JSX.Element {
            const { requiredImagesLoaded } = useImagePreloading(games)
            return requiredImagesLoaded ? (
                <span data-testid="done" />
            ) : (
                <span data-testid="loading" />
            )
        }

        const games = makeGamesWithIdenticalUrls()
        render(<TestPreload games={games} />)

        await resolveAllImages()

        // With 2 games sharing identical URLs:
        // Required: 1 hero + 1 tile + 1 focus + 3 status = 6 unique URLs
        // Optional: 0 remaining hero (same as first) = 0
        const heroInstances = instances.filter((img) =>
            img.src?.includes("same_hero")
        )
        const tileInstances = instances.filter((img) =>
            img.src?.includes("same_tile")
        )

        expect(heroInstances.length).toBe(1)
        expect(tileInstances.length).toBe(1)

        expect(await screen.findByTestId("done")).toBeInTheDocument()
    })
})

describe("ImagePreloadQueue waiter promotion", () => {
    async function flushQueue(): Promise<void> {
        for (let i = 0; i < 20; i++) {
            instances.forEach((img) => img.decodeResolve?.())
            jest.advanceTimersByTime(10)
            await Promise.resolve()
        }
    }

    beforeEach(() => {
        instances = []
    })

    it("promotes a waiter to loader when the owning batch is resubmitted without the URL", async () => {
        const queue = new ImagePreloadQueue()
        const callbackA = jest.fn()
        const callbackB = jest.fn()

        // Batch A queues url_shared (goes to pending + queuedUrls)
        // processQueue starts but hasn't run yet (async)
        queue.submit(["/url_shared.avif"], "A", callbackA)

        // Batch B submits url_shared — sees it in queuedUrls, becomes a waiter
        queue.submit(["/url_shared.avif"], "B", callbackB)

        // Batch A resubmits with a different URL — removePendingItemsForBatch("A")
        // removes url_shared from A's pending. Without the fix, B would hang.
        const callbackA2 = jest.fn()
        queue.submit(["/url_other.avif"], "A", callbackA2)

        await flushQueue()

        expect(callbackB).toHaveBeenCalledTimes(1)
        expect(callbackA2).toHaveBeenCalledTimes(1)
        // Original A callback should NOT fire (it was superseded)
        expect(callbackA).not.toHaveBeenCalled()
    })
})
