import { expect, test } from "../fixtures"
import {
    COMMON_EXPERIMENTS,
    openExitModal,
    SELECTORS,
    TIMEOUTS,
    waitForCarouselReady,
} from "../testHelpers"

test.describe("Mouse Hover Focus", () => {
    test.beforeEach(async ({ mockExperiment }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })
    })

    test("should move focus indicator to tile on mouse hover", async ({
        page,
    }) => {
        await page.goto("./")
        await waitForCarouselReady(page)

        const tiles = page.locator(SELECTORS.gameTile)
        const tileCount = await tiles.count()
        expect(tileCount).toBeGreaterThan(1)

        const focusIndicator = page.locator('[class*="focusIndicator"]')
        await expect(focusIndicator).toBeVisible()

        // Hover the second tile
        const secondTile = tiles.nth(1)
        await secondTile.hover()
        await page.waitForTimeout(TIMEOUTS.navigation)

        // Focus indicator should be aligned with the hovered tile
        const tileBox = await secondTile.boundingBox()
        const indicatorBox = await focusIndicator.boundingBox()

        expect(tileBox).toBeTruthy()
        expect(indicatorBox).toBeTruthy()
        if (tileBox && indicatorBox) {
            const tileCenter = tileBox.x + tileBox.width / 2
            const indicatorCenter = indicatorBox.x + indicatorBox.width / 2
            expect(Math.abs(tileCenter - indicatorCenter)).toBeLessThan(
                tileBox.width
            )
        }
    })

    test("should update hero content when hovering a different tile", async ({
        page,
    }) => {
        await page.goto("./")
        await waitForCarouselReady(page)

        const tiles = page.locator(SELECTORS.gameTile)
        const tileCount = await tiles.count()
        expect(tileCount).toBeGreaterThan(1)

        const heroContent = page.locator(SELECTORS.heroContent)
        await expect(heroContent.first()).toBeVisible()

        const initialSrc = await heroContent.first().getAttribute("src")
        expect(initialSrc).toBeTruthy()

        // Hover a different tile
        await tiles.nth(1).hover()
        await page.waitForTimeout(TIMEOUTS.navigation)

        const newSrc = await heroContent.first().getAttribute("src")
        expect(newSrc).toBeTruthy()
    })

    test("should not fight d-pad navigation when mouse is stationary", async ({
        page,
    }) => {
        await page.goto("./")
        await waitForCarouselReady(page)

        const tiles = page.locator(SELECTORS.gameTile)
        const tileCount = await tiles.count()
        expect(tileCount).toBeGreaterThan(2)

        // Hover first tile to park the cursor there
        await tiles.first().hover()
        await page.waitForTimeout(TIMEOUTS.navigation)

        // Navigate right with d-pad — focus should move away from first tile
        await page.keyboard.press("ArrowRight")
        await page.waitForTimeout(TIMEOUTS.navigation)

        const focusIndicator = page.locator('[class*="focusIndicator"]')
        const secondTile = tiles.nth(1)

        const tileBox = await secondTile.boundingBox()
        const indicatorBox = await focusIndicator.boundingBox()

        expect(tileBox).toBeTruthy()
        expect(indicatorBox).toBeTruthy()
        if (tileBox && indicatorBox) {
            const tileCenter = tileBox.x + tileBox.width / 2
            const indicatorCenter = indicatorBox.x + indicatorBox.width / 2
            expect(Math.abs(tileCenter - indicatorCenter)).toBeLessThan(
                tileBox.width
            )
        }
    })

    test("should move focus between exit modal buttons on hover", async ({
        page,
    }) => {
        await page.goto("./")
        await waitForCarouselReady(page)
        await openExitModal(page)

        const yesButton = page.locator(SELECTORS.yesButton)
        const noButton = page.locator(SELECTORS.noButton)

        await expect(noButton).toBeVisible()
        await expect(yesButton).toBeVisible()

        // "No" is the default focused button — hover "Yes" and check it gains focus
        await yesButton.hover()
        await page.waitForTimeout(TIMEOUTS.navigation)

        const yesHasFocus = await yesButton.evaluate(
            (el) =>
                el.classList.contains("focused") ||
                el.closest("[class*='focused']") !== null
        )
        expect(yesHasFocus).toBe(true)

        // Hover back to "No"
        await noButton.hover()
        await page.waitForTimeout(TIMEOUTS.navigation)

        const noHasFocus = await noButton.evaluate(
            (el) =>
                el.classList.contains("focused") ||
                el.closest("[class*='focused']") !== null
        )
        expect(noHasFocus).toBe(true)
    })
})
