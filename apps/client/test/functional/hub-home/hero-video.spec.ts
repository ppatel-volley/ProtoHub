import { expect, test } from "../fixtures"
import {
    COMMON_EXPERIMENTS,
    createGamePayloadSwap,
    SELECTORS,
    setupVideoForAutoplay,
    TIMEOUTS,
    waitForHubToLoad,
} from "../testHelpers"

test.describe("Hero Video Autoplay Functionality", () => {
    test("should play hero video after 2.5 seconds when game has videoUrl in payload", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            ...createGamePayloadSwap("jeopardy", {
                videoUrl: "https://test-cdn.volley.tv/test-hero-video.mp4",
            }),
        })

        await waitForHubToLoad(page)

        const heroVideo = page.locator(SELECTORS.heroVideo)
        await expect(heroVideo).toHaveCount(1)

        const videoElement = heroVideo.first()
        await expect(videoElement).toHaveAttribute(
            "src",
            "https://test-cdn.volley.tv/test-hero-video.mp4"
        )

        const initialState = await videoElement.evaluate(
            (video: HTMLVideoElement) => {
                const style = window.getComputedStyle(video)
                return {
                    visibility: style.visibility,
                    opacity: style.opacity,
                    paused: video.paused,
                    readyState: video.readyState,
                }
            }
        )
        expect(initialState.visibility).toBe("hidden")

        await setupVideoForAutoplay(videoElement)
        await page.waitForTimeout(TIMEOUTS.focusProcessing)
        await page.waitForTimeout(TIMEOUTS.videoAutoplay)

        const finalState = await videoElement.evaluate(
            (video: HTMLVideoElement) => {
                const style = window.getComputedStyle(video)
                return {
                    visibility: style.visibility,
                    opacity: style.opacity,
                    paused: video.paused,
                    readyState: video.readyState,
                }
            }
        )

        expect(finalState.visibility).toBe("visible")
        expect(finalState.opacity).not.toBe("0")
        expect(finalState.paused).toBe(false)
    })

    test("should not play hero video when game has no videoUrl in payload", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            ...createGamePayloadSwap("jeopardy", {
                videoUrl: false,
            }),
        })

        await waitForHubToLoad(page)

        const heroSection = page.locator(SELECTORS.heroSection)
        await expect(heroSection).toBeVisible()

        const heroImage = page.locator(SELECTORS.heroImage)
        await expect(heroImage).toBeVisible()

        const heroVideo = page.locator(SELECTORS.heroVideo)
        await expect(heroVideo).toHaveCount(0)

        await page.waitForTimeout(TIMEOUTS.videoAutoplay + 1000)
        await expect(heroVideo).toHaveCount(0)
        await expect(heroImage).toBeVisible()
    })

    test("should switch between games with and without videos when navigating", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            ...createGamePayloadSwap("jeopardy", {
                videoUrl: "https://test-cdn.volley.tv/jeopardy-video.mp4",
            }),
        })

        await waitForHubToLoad(page)

        let heroVideo = page.locator(SELECTORS.heroVideo)
        await expect(heroVideo).toHaveCount(1)
        await expect(heroVideo).toHaveAttribute(
            "src",
            "https://test-cdn.volley.tv/jeopardy-video.mp4"
        )

        await page.keyboard.press("ArrowRight")
        await page.waitForTimeout(TIMEOUTS.navigation)

        heroVideo = page.locator(SELECTORS.heroVideo)
        await expect(heroVideo).toHaveCount(0)

        const heroImage = page.locator(SELECTORS.heroImage)
        await expect(heroImage).toBeVisible()

        await page.keyboard.press("ArrowLeft")
        await page.waitForTimeout(TIMEOUTS.navigation)

        heroVideo = page.locator(SELECTORS.heroVideo)
        await expect(heroVideo).toHaveCount(1)
        await expect(heroVideo).toHaveAttribute(
            "src",
            "https://test-cdn.volley.tv/jeopardy-video.mp4"
        )
    })

    test("should stop video when navigating away from focused tile", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            ...createGamePayloadSwap("jeopardy", {
                videoUrl: "https://test-cdn.volley.tv/test-video.mp4",
            }),
        })

        await waitForHubToLoad(page)

        const heroVideo = page.locator(SELECTORS.heroVideo)
        await expect(heroVideo).toHaveCount(1)

        const videoElement = heroVideo.first()
        await setupVideoForAutoplay(videoElement)
        await page.waitForTimeout(TIMEOUTS.videoAutoplay)

        const isPlaying = await videoElement.evaluate(
            (video: HTMLVideoElement) => {
                return !video.paused
            }
        )
        expect(isPlaying).toBe(true)

        await page.keyboard.press("ArrowRight")
        await page.waitForTimeout(TIMEOUTS.navigation)

        const videoCount = await page.locator(SELECTORS.heroVideo).count()
        expect(videoCount).toBe(0)
    })

    test("should respect payload override with empty videoUrl", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            ...createGamePayloadSwap("jeopardy", {
                videoUrl: "",
            }),
        })

        await waitForHubToLoad(page)

        const heroVideo = page.locator(SELECTORS.heroVideo)
        await expect(heroVideo).toHaveCount(0)

        const heroImage = page.locator(SELECTORS.heroImage)
        await expect(heroImage).toBeVisible()

        await page.waitForTimeout(TIMEOUTS.videoAutoplay + 1000)
        await expect(heroVideo).toHaveCount(0)
    })

    test("should verify default jeopardy game has no video", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })

        await waitForHubToLoad(page)

        const heroVideo = page.locator(SELECTORS.heroVideo)
        await expect(heroVideo).toHaveCount(0)

        const heroImage = page.locator(SELECTORS.heroImage)
        await expect(heroImage).toBeVisible()
    })
})
