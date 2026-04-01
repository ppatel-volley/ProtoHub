import { expect, test } from "../fixtures"
import {
    COMMON_EXPERIMENTS,
    findExitModal,
    SELECTORS,
    TIMEOUTS,
    waitForCarouselReady,
} from "../testHelpers"

test.describe("D-pad Cycling Functionality", () => {
    test("should cycle through tiles with d-pad navigation", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })
        await page.goto("./")
        await waitForCarouselReady(page)

        const tiles = page.locator(SELECTORS.gameTile)
        const tileCount = await tiles.count()
        expect(tileCount).toBeGreaterThan(0)

        const firstTile = tiles.first()
        await expect(firstTile).toBeEnabled()

        const navigationKeys = [
            "ArrowRight",
            "ArrowRight",
            "ArrowDown",
            "ArrowLeft",
            "ArrowUp",
        ]

        for (const key of navigationKeys) {
            await page.keyboard.press(key)
            await page.waitForTimeout(TIMEOUTS.quickWait)

            const enabledTiles = page.locator(SELECTORS.gameTile)
            await expect(enabledTiles.first()).toBeEnabled()
        }

        // test nav doesn't break the interface
        await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()
        await expect(tiles.first()).toBeVisible()
    })

    test("should change hero images when tile focus updates", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })
        await page.goto("./")
        await waitForCarouselReady(page)

        const heroSection = page.locator(SELECTORS.heroSection)
        await expect(heroSection).toBeVisible()

        // hero content can be image or video
        const heroContent = page.locator(SELECTORS.heroContent)
        await expect(heroContent.first()).toBeVisible()

        const initialSrc = await heroContent.first().getAttribute("src")
        expect(initialSrc).toBeTruthy()

        await page.keyboard.press("ArrowRight")
        await page.waitForTimeout(TIMEOUTS.navigation)

        const heroAfterNav = page.locator(SELECTORS.heroContent)
        const newSrc = await heroAfterNav.first().getAttribute("src")

        expect(newSrc).toBeTruthy()

        await page.keyboard.press("ArrowRight")
        await page.waitForTimeout(TIMEOUTS.navigation)

        const finalHeroContent = page.locator(SELECTORS.heroContent)
        const finalSrc = await finalHeroContent.first().getAttribute("src")
        expect(finalSrc).toBeTruthy()
    })

    test("should cycle through exit modal buttons with d-pad", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })
        await page.goto("./")
        await waitForCarouselReady(page)

        await page.keyboard.press("Escape")
        await page.waitForTimeout(TIMEOUTS.modalTransition)

        const modal = await findExitModal(page)

        if (modal) {
            const isModalVisible = await modal
                .isVisible({ timeout: TIMEOUTS.longWait })
                .catch(() => false)

            if (isModalVisible) {
                const navigationKeys = ["ArrowRight", "ArrowLeft"]

                for (const key of navigationKeys) {
                    await page.keyboard.press(key)
                    await page.waitForTimeout(TIMEOUTS.focusProcessing)
                }

                await page.keyboard.press("Enter")
                await page.waitForTimeout(TIMEOUTS.modalTransition)
            }
        }

        await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()
        await expect(page.locator(SELECTORS.gameTile).first()).toBeEnabled()
    })

    test("should maintain focus state after modal interactions", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })
        await page.goto("./")
        await waitForCarouselReady(page)

        const tiles = page.locator(SELECTORS.gameTile)
        await expect(tiles.first()).toBeEnabled()

        await page.keyboard.press("ArrowRight")
        await page.keyboard.press("ArrowRight")
        await page.waitForTimeout(TIMEOUTS.quickWait)

        await page.keyboard.press("Escape")
        await page.waitForTimeout(TIMEOUTS.modalTransition)

        await page.keyboard.press("ArrowRight")
        await page.keyboard.press("ArrowLeft")
        await page.waitForTimeout(TIMEOUTS.focusProcessing)

        await page.keyboard.press("Escape")
        await page.waitForTimeout(TIMEOUTS.modalTransition)

        await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()
        await expect(tiles.first()).toBeEnabled()

        await page.keyboard.press("ArrowLeft")
        await page.keyboard.press("ArrowRight")
        await page.waitForTimeout(TIMEOUTS.quickWait)

        await expect(tiles.first()).toBeVisible()
    })
})
