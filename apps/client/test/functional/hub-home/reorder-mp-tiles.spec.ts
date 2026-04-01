import { setupSubscribedUser } from "../deviceAuthHelpers"
import { expect, test } from "../fixtures"
import {
    COMMON_EXPERIMENTS,
    SELECTORS,
    waitForCarouselReady,
} from "../testHelpers"

const DEFAULT_GAME_LIST = [
    "jeopardy",
    "song-quiz",
    "cocomelon",
    "wheel-of-fortune",
    "wits-end",
] as const
const DEFAULT_GAME_COUNT = DEFAULT_GAME_LIST.length

test.describe("Reorder MP Tiles Experiment", () => {
    test.beforeEach(async ({ page }) => {
        await setupSubscribedUser(page)
    })

    test("should display games in default order when no reorder experiment is active", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        const gameTiles = page.locator(SELECTORS.gameTile)
        await expect(gameTiles).toHaveCount(DEFAULT_GAME_COUNT)

        const tileImages = page.locator(`${SELECTORS.gameTile} img`)
        const firstTileSrc = await tileImages.first().getAttribute("src")
        expect(firstTileSrc).toContain("games/tiles/jeopardy")
    })

    test("should reorder games based on experiment payload", async ({
        page,
        mockExperiment,
    }) => {
        const experimentPayload = ["song-quiz", "jeopardy", "wheel-of-fortune"]
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            "reorder-mp-tiles": {
                value: "enabled",
                payload: experimentPayload,
            },
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        const gameTiles = page.locator(SELECTORS.gameTile)
        await expect(gameTiles).toHaveCount(experimentPayload.length)

        const tileImages = page.locator(`${SELECTORS.gameTile} img`)
        const firstTileSrc = await tileImages.first().getAttribute("src")
        expect(firstTileSrc).toContain("games/tiles/song-quiz")
    })

    test("should hide games not included in experiment payload", async ({
        page,
        mockExperiment,
    }) => {
        const experimentPayload = ["jeopardy", "song-quiz"]
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            "reorder-mp-tiles": {
                value: "enabled",
                payload: experimentPayload,
            },
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        const gameTiles = page.locator(SELECTORS.gameTile)
        await expect(gameTiles).toHaveCount(experimentPayload.length)

        const allTileImages = await page
            .locator(`${SELECTORS.gameTile} img[src*="/games/tiles/"]`)
            .all()
        const allSrcs = await Promise.all(
            allTileImages.map((img) => img.getAttribute("src"))
        )

        expect(allSrcs).toHaveLength(experimentPayload.length)

        const hasWheelOfFortune = allSrcs.some(
            (src) => src && src.includes("games/tiles/wof")
        )
        expect(hasWheelOfFortune).toBe(false)

        const hasJeopardy = allSrcs.some(
            (src) => src && src.includes("games/tiles/jeopardy")
        )
        const hasSongQuiz = allSrcs.some(
            (src) => src && src.includes("games/tiles/song-quiz")
        )
        expect(hasJeopardy).toBe(true)
        expect(hasSongQuiz).toBe(true)
    })

    test("should show only one game when experiment payload contains single game", async ({
        page,
        mockExperiment,
    }) => {
        const experimentPayload = ["jeopardy"]
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            "reorder-mp-tiles": {
                value: "enabled",
                payload: experimentPayload,
            },
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        const gameTiles = page.locator(SELECTORS.gameTile)
        await expect(gameTiles).toHaveCount(experimentPayload.length)

        const tileImage = page.locator(`${SELECTORS.gameTile} img`).first()
        const src = await tileImage.getAttribute("src")
        expect(src).toContain("games/tiles/jeopardy")
    })

    test("should include cocomelon when specified in experiment payload", async ({
        page,
        mockExperiment,
    }) => {
        const experimentPayload = ["cocomelon", "jeopardy", "song-quiz"]
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            "reorder-mp-tiles": {
                value: "enabled",
                payload: experimentPayload,
            },
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        const gameTiles = page.locator(SELECTORS.gameTile)
        await expect(gameTiles).toHaveCount(experimentPayload.length)

        const tileImages = page.locator(`${SELECTORS.gameTile} img`)
        const firstTileSrc = await tileImages.first().getAttribute("src")
        expect(firstTileSrc).toContain("games/tiles/ccm")
    })

    test("should fallback to default order with invalid payload", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            "reorder-mp-tiles": {
                value: "enabled",
                payload: null,
            },
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        const gameTiles = page.locator(SELECTORS.gameTile)
        await expect(gameTiles).toHaveCount(DEFAULT_GAME_COUNT)

        const tileImages = page.locator(`${SELECTORS.gameTile} img`)
        const firstTileSrc = await tileImages.first().getAttribute("src")
        expect(firstTileSrc).toContain("games/tiles/jeopardy")
    })

    test("should fallback to default order when payload contains invalid game IDs", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            "reorder-mp-tiles": {
                value: "enabled",
                payload: [
                    "invalid-game",
                    "jeopardy",
                    "nonexistent",
                    "song-quiz",
                ],
            },
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        const gameTiles = page.locator(SELECTORS.gameTile)
        await expect(gameTiles).toHaveCount(DEFAULT_GAME_COUNT)

        const tileImages = page.locator(`${SELECTORS.gameTile} img`)
        const firstTileSrc = await tileImages.first().getAttribute("src")
        expect(firstTileSrc).toContain("games/tiles/jeopardy")
    })

    test("should update hero image when focused game changes with reordering", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            "reorder-mp-tiles": {
                value: "enabled",
                payload: ["song-quiz", "jeopardy"],
            },
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        const heroImage = page.locator(SELECTORS.heroImage)
        await expect(heroImage).toBeVisible()

        const firstHeroSrc = await heroImage.getAttribute("src")
        expect(firstHeroSrc).toContain("games/heroes/song-quiz")

        await page.keyboard.press("ArrowRight")

        await expect(heroImage).toHaveAttribute(
            "src",
            /games\/heroes\/jeopardy/,
            {
                timeout: 2000,
            }
        )
    })
})
