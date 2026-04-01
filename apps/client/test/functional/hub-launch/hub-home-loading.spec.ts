import { type Page } from "@playwright/test"

import { expect, test } from "../fixtures"
import { COMMON_EXPERIMENTS, SELECTORS, waitForHubToLoad } from "../testHelpers"

async function mockVideoAutoplayFailure(
    page: Page,
    errorName: string,
    errorMessage: string
): Promise<void> {
    await page.addInitScript(
        (config: { errorName: string; errorMessage: string }) => {
            HTMLVideoElement.prototype.play = function (): Promise<void> {
                return Promise.reject(
                    new DOMException(config.errorMessage, config.errorName)
                )
            }
        },
        { errorName, errorMessage }
    )
}

test.describe("Hub Home Loading", () => {
    test("should load hub home within reasonable timeout", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })
        await waitForHubToLoad(page)

        await expect(page.locator(SELECTORS.brandLogo).first()).toBeVisible()
        await expect(page.locator(SELECTORS.errorMessage)).not.toBeVisible()
        await expect(page.locator(SELECTORS.loadingError)).not.toBeVisible()
    })

    test("should load hub in under 10 seconds when video autoplay fails determinately", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })

        await mockVideoAutoplayFailure(
            page,
            "NotAllowedError",
            "Autoplay blocked"
        )

        const startTime = Date.now()
        await waitForHubToLoad(page)
        const loadTime = Date.now() - startTime

        expect(loadTime).toBeLessThan(10000)
        await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()
    })

    test("should load hub in under 10 seconds when video autoplay fails indeterminately", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })

        await mockVideoAutoplayFailure(
            page,
            "BigChungusError",
            "A wascally wabbit has bwoken the autoplay"
        )

        const startTime = Date.now()
        await waitForHubToLoad(page)
        const loadTime = Date.now() - startTime

        expect(loadTime).toBeLessThan(10000)
        await expect(page.locator(SELECTORS.gamesCarousel)).toBeVisible()
    })
})
