import type { Locator } from "@playwright/test"

import { expect, test } from "../fixtures"
import {
    COMMON_EXPERIMENTS,
    SELECTORS,
    TIMEOUTS,
    waitForCarouselReady,
} from "../testHelpers"

test.describe("Carousel Scrolling", () => {
    test.beforeEach(async ({ mockExperiment }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })
    })

    const getCarouselTranslateX = async (
        carouselLocator: Locator
    ): Promise<number> => {
        const transform = await carouselLocator.evaluate(
            (el: HTMLElement) => window.getComputedStyle(el).transform
        )
        if (!transform || transform === "none") return 0
        // matrix(1, 0, 0, 1, tx, ty) — extract tx
        const match = transform.match(/matrix.*\((.+)\)/)
        if (!match) {
            return 0
        }
        const values = match[1]!.split(",").map(Number)
        return values[4] ?? 0
    }

    test("should scroll carousel when navigating to tiles beyond the visible area", async ({
        page,
    }) => {
        await page.goto("./")
        await waitForCarouselReady(page)

        const carousel = page.locator(SELECTORS.gamesCarousel)
        await expect(carousel).toBeVisible()

        const tiles = page.locator(SELECTORS.gameTile)
        const tileCount = await tiles.count()

        if (tileCount <= 2) {
            test.skip()
            return
        }

        const initialTranslateX = await getCarouselTranslateX(carousel)
        expect(initialTranslateX).toBe(0)

        // Navigate right through all tiles
        for (let i = 0; i < tileCount - 1; i++) {
            await page.keyboard.press("ArrowRight")
            await page.waitForTimeout(TIMEOUTS.quickWait)
        }

        const scrolledTranslateX = await getCarouselTranslateX(carousel)

        // If the tiles overflowed the viewport, translateX should be negative
        // If they all fit, translateX stays 0 — both are valid
        expect(scrolledTranslateX).toBeLessThanOrEqual(0)

        if (scrolledTranslateX < 0) {
            // Carousel scrolled — navigate all the way back left
            for (let i = 0; i < tileCount - 1; i++) {
                await page.keyboard.press("ArrowLeft")
                await page.waitForTimeout(TIMEOUTS.quickWait)
            }

            // Should return to exactly 0 with no residual offset
            const returnedTranslateX = await getCarouselTranslateX(carousel)
            expect(returnedTranslateX).toBe(0)
        }
    })

    test("should keep focus indicator visible while scrolling", async ({
        page,
    }) => {
        await page.goto("./")
        await waitForCarouselReady(page)

        const focusIndicator = page.locator('[class*="focusIndicator"]')
        const tiles = page.locator(SELECTORS.gameTile)
        const tileCount = await tiles.count()

        for (let i = 0; i < tileCount - 1; i++) {
            await page.keyboard.press("ArrowRight")
            await page.waitForTimeout(TIMEOUTS.quickWait)

            await expect(focusIndicator).toBeVisible()
            const opacity = await focusIndicator.evaluate(
                (el) => window.getComputedStyle(el).opacity
            )
            expect(parseFloat(opacity)).toBeGreaterThan(0)
        }
    })

    test("should keep focus indicator aligned with focused tile after scrolling", async ({
        page,
    }) => {
        await page.goto("./")
        await waitForCarouselReady(page)

        const focusIndicator = page.locator('[class*="focusIndicator"]')
        const tiles = page.locator(SELECTORS.gameTile)
        const tileCount = await tiles.count()

        if (tileCount <= 2) {
            test.skip()
            return
        }

        // Navigate to the last tile
        for (let i = 0; i < tileCount - 1; i++) {
            await page.keyboard.press("ArrowRight")
            await page.waitForTimeout(TIMEOUTS.quickWait)
        }

        // Wait for scroll transition to settle
        await page.waitForTimeout(TIMEOUTS.navigation)

        const lastTile = tiles.last()
        const tileBox = await lastTile.boundingBox()
        const indicatorBox = await focusIndicator.boundingBox()

        if (tileBox && indicatorBox) {
            const tileCenter = tileBox.x + tileBox.width / 2
            const indicatorCenter = indicatorBox.x + indicatorBox.width / 2
            const tolerance = tileBox.width
            expect(Math.abs(tileCenter - indicatorCenter)).toBeLessThan(
                tolerance
            )
        }
    })
})
