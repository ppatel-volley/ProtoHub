import { expect, test } from "../fixtures"
import {
    COMMON_EXPERIMENTS,
    SELECTORS,
    TIMEOUTS,
    waitForHubToLoad,
} from "../testHelpers"

test.describe("Exit Modal", () => {
    test.beforeEach(async ({ mockExperiment }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })
    })

    test("should verify app loads completely and exit modal appears", async ({
        page,
    }) => {
        await waitForHubToLoad(page)

        await page.keyboard.press("Escape")
        await page.waitForTimeout(TIMEOUTS.modalTransition)

        await expect(page.locator(SELECTORS.exitModalText)).toBeVisible()
        await expect(page.locator(SELECTORS.yesButton)).toBeVisible()
        await expect(page.locator(SELECTORS.noButton)).toBeVisible()
    })

    test("should return to hub when clicking No on exit modal", async ({
        page,
    }) => {
        await waitForHubToLoad(page)

        await page.keyboard.press("Escape")
        await page.waitForTimeout(TIMEOUTS.modalTransition)

        await expect(page.locator(SELECTORS.exitModalText)).toBeVisible()

        await page.locator(SELECTORS.noButton).click()
        await page.waitForTimeout(TIMEOUTS.modalTransition)

        await expect(page.locator(SELECTORS.exitModalText)).not.toBeVisible()
    })

    test("should return to hub when pressing back button on exit modal", async ({
        page,
    }) => {
        await waitForHubToLoad(page)

        await page.keyboard.press("Escape")
        await page.waitForTimeout(TIMEOUTS.modalTransition)

        await expect(page.locator(SELECTORS.exitModalText)).toBeVisible()

        await page.keyboard.press("Escape")
        await page.waitForTimeout(TIMEOUTS.modalTransition)

        await expect(page.locator(SELECTORS.exitModalText)).not.toBeVisible()
    })

    test("should exit the hub when clicking Yes on exit modal", async ({
        page,
    }) => {
        await waitForHubToLoad(page)

        await page.keyboard.press("Escape")
        await page.waitForTimeout(TIMEOUTS.modalTransition)

        await expect(page.locator(SELECTORS.exitModalText)).toBeVisible()

        await page.locator(SELECTORS.yesButton).click()
        await page.waitForTimeout(TIMEOUTS.modalTransition)

        await expect(page.locator(SELECTORS.exitModalText)).not.toBeVisible()
    })
})
