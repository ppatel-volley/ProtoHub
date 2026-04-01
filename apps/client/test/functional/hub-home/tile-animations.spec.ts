import { expect, test } from "../fixtures"
import {
    COMMON_EXPERIMENTS,
    createGamePayloadSwap,
    SELECTORS,
    TIMEOUTS,
    waitForHubToLoad,
} from "../testHelpers"

test.describe("Tile Animation Functionality", () => {
    test("should show tile animation immediately when hovering game tile with animationUri", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            ...createGamePayloadSwap("jeopardy", {
                animationUri: "https://test-cdn.volley.tv/test-animation.webp",
            }),
        })

        await waitForHubToLoad(page)

        const firstGameTile = page.locator(SELECTORS.gameTile).first()
        await firstGameTile.focus()

        let tileAnimation = page.locator(SELECTORS.tileAnimation)
        await expect(tileAnimation).toHaveCount(1)

        const animationSrc = await tileAnimation.getAttribute("src")
        expect(animationSrc).toMatch(/test-animation\.webp\?_t=\d+/)
        await expect(tileAnimation).toBeVisible()

        await page.keyboard.press("ArrowRight")
        await page.waitForTimeout(TIMEOUTS.navigation)

        await page.keyboard.press("ArrowLeft")
        await page.waitForTimeout(TIMEOUTS.focusProcessing)

        tileAnimation = page.locator(SELECTORS.tileAnimation)
        await expect(tileAnimation).toHaveCount(1)
        await expect(tileAnimation).toBeVisible()
    })

    test("should not show tile animation when game has false animationUri in payload", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            ...createGamePayloadSwap("jeopardy", {
                animationUri: false,
            }),
        })

        await waitForHubToLoad(page)

        const tileAnimation = page.locator(SELECTORS.tileAnimation)
        await expect(tileAnimation).toHaveCount(0)

        await page.waitForTimeout(TIMEOUTS.navigation)

        await expect(tileAnimation).toHaveCount(0)
        const firstGameTile = page.locator(SELECTORS.gameTile).first()
        await expect(firstGameTile).toBeFocused()
    })

    test("should hide tile animation when losing focus", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            ...createGamePayloadSwap("jeopardy", {
                animationUri: "https://test-cdn.volley.tv/test-animation.webp",
            }),
            ...createGamePayloadSwap("song-quiz", {
                animationUri: false,
            }),
        })

        await waitForHubToLoad(page)

        // Ensure first tile focused for deterministic animation
        const firstGameTile = page.locator(SELECTORS.gameTile).first()
        await firstGameTile.focus()

        // First tile should show animation
        const tileAnimation = page.locator(SELECTORS.tileAnimation)
        await expect(tileAnimation).toHaveCount(1)
        await expect(tileAnimation).toBeVisible()

        // Navigate to second game (which has no animation)
        await page.keyboard.press("ArrowRight")
        await page.waitForTimeout(TIMEOUTS.navigation)

        // Wait for animation element to be removed from DOM
        await tileAnimation.waitFor({
            state: "detached",
            timeout: TIMEOUTS.longWait,
        })
        await expect(tileAnimation).toHaveCount(0)
    })

    test("should show different animations when navigating between games with different animationUris", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            ...createGamePayloadSwap("jeopardy", {
                animationUri:
                    "https://test-cdn.volley.tv/jeopardy-animation.webp",
            }),
            ...createGamePayloadSwap("song-quiz", {
                animationUri:
                    "https://test-cdn.volley.tv/song-quiz-animation.webp",
            }),
        })

        await waitForHubToLoad(page)

        const firstGameTile = page.locator(SELECTORS.gameTile).first()
        await firstGameTile.focus()

        let tileAnimation = page.locator(SELECTORS.tileAnimation)
        await expect(tileAnimation).toHaveCount(1)

        let animationSrc = await tileAnimation.getAttribute("src")
        expect(animationSrc).toMatch(/jeopardy-animation\.webp\?_t=\d+/)

        await page.keyboard.press("ArrowRight")
        await page.waitForTimeout(TIMEOUTS.navigation)

        tileAnimation = page.locator(SELECTORS.tileAnimation)
        await expect(tileAnimation).toHaveCount(1)

        animationSrc = await tileAnimation.getAttribute("src")
        expect(animationSrc).toMatch(/song-quiz-animation\.webp\?_t=\d+/)
    })

    test("should switch between games with and without animations", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            ...createGamePayloadSwap("jeopardy", {
                animationUri:
                    "https://test-cdn.volley.tv/jeopardy-animation.webp",
            }),
            ...createGamePayloadSwap("song-quiz", {
                animationUri: false,
            }),
        })

        await waitForHubToLoad(page)

        const tileAnimation = page.locator(SELECTORS.tileAnimation)
        await expect(tileAnimation).toHaveCount(1)

        await page.keyboard.press("ArrowRight")
        await page.waitForTimeout(TIMEOUTS.navigation)

        // Wait for animation element to be removed from DOM
        await tileAnimation.waitFor({
            state: "detached",
            timeout: TIMEOUTS.longWait,
        })
        await expect(tileAnimation).toHaveCount(0)

        await page.keyboard.press("ArrowLeft")
        await page.waitForTimeout(TIMEOUTS.navigation)

        // Wait for animation to reappear (with delay)
        await tileAnimation.waitFor({
            state: "attached",
            timeout: TIMEOUTS.longWait,
        })
        await expect(tileAnimation).toHaveCount(1)

        const animationSrc = await tileAnimation.getAttribute("src")
        expect(animationSrc).toMatch(/jeopardy-animation\.webp\?_t=\d+/)
    })

    test("should respect payload override with empty animationUri", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            ...createGamePayloadSwap("jeopardy", {
                animationUri: "",
            }),
        })

        await waitForHubToLoad(page)

        const firstGameTile3 = page.locator(SELECTORS.gameTile).first()
        await firstGameTile3.focus()

        const tileAnimation = page.locator(SELECTORS.tileAnimation)
        await expect(tileAnimation).toHaveCount(0)

        const firstGameTile = page.locator(SELECTORS.gameTile).first()
        await firstGameTile.focus()
        await page.waitForTimeout(TIMEOUTS.navigation)

        await expect(tileAnimation).toHaveCount(0)
    })

    test("should not show animation when carousel is not active", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            ...createGamePayloadSwap("jeopardy", {
                animationUri: "https://test-cdn.volley.tv/test-animation.webp",
            }),
        })

        await waitForHubToLoad(page)

        const firstGameTile2 = page.locator(SELECTORS.gameTile).first()
        await firstGameTile2.focus()

        let tileAnimation = page.locator(SELECTORS.tileAnimation)
        await expect(tileAnimation).toHaveCount(1)

        await page.keyboard.press("Escape")
        await page.waitForTimeout(TIMEOUTS.modalTransition)

        tileAnimation = page.locator(SELECTORS.tileAnimation)
        await expect(tileAnimation).toHaveCount(0)

        await page.keyboard.press("Escape")
        await page.waitForTimeout(TIMEOUTS.modalTransition)

        tileAnimation = page.locator(SELECTORS.tileAnimation)
        await expect(tileAnimation).toHaveCount(1)
    })
})
