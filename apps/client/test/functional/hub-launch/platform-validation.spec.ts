import type { Page } from "@playwright/test"

import type { ExperimentMockConfig } from "../fixtures"
import { expect, test, testFireTV, testLgWebOS, testSamsung } from "../fixtures"
import { COMMON_EXPERIMENTS, TIMEOUTS, waitForBasicLoad } from "../testHelpers"

const isStaging = process.env.TEST_ENVIRONMENT === "staging"

test.describe("Platform Validation", () => {
    test.skip(
        isStaging,
        "Platform validation tests use mocked user agents that don't work in staging"
    )
    test("should show error modal when stated platform is TV but agent is not TV", async ({
        page,
        mockExperiment,
    }) => {
        await shouldLoadWithErrorModal(page, mockExperiment, "SAMSUNG_TV")
    })

    test("should show error modal for LG_TV platform parameter when agent is not LG TV", async ({
        page,
        mockExperiment,
    }) => {
        await shouldLoadWithErrorModal(page, mockExperiment, "LG_TV")
    })

    test("should show error modal for SamsungTV platform parameter when agent is not Samsung TV", async ({
        page,
        mockExperiment,
    }) => {
        await shouldLoadWithErrorModal(page, mockExperiment, "SAMSUNG_TV")
    })

    test("should load normally when no platform parameter is provided", async ({
        page,
        mockExperiment,
    }) => {
        await shouldLoadNormally(page, mockExperiment)
    })

    test("should load normally when platform parameter is Web", async ({
        page,
        mockExperiment,
    }) => {
        await shouldLoadNormally(page, mockExperiment, "WEB")
    })

    test("should load normally when platform parameter is Mobile", async ({
        page,
        mockExperiment,
    }) => {
        await shouldLoadNormally(page, mockExperiment, "MOBILE")
    })

    testSamsung(
        "should load normally when platform parameter is Samsung and agent is Samsung",
        async ({ page, mockExperiment }) => {
            await shouldLoadNormally(page, mockExperiment, "SAMSUNG_TV")
        }
    )

    testLgWebOS(
        "should load normally when platform parameter is LG_TV and agent is LG_TV",
        async ({ page, mockExperiment }) => {
            await shouldLoadNormally(page, mockExperiment, "LG_TV")
        }
    )

    testFireTV(
        "should load normally when platform parameter is FireTV and agent is FireTV",
        async ({ page, mockExperiment }) => {
            await shouldLoadNormally(page, mockExperiment, "FIRE_TV")
        }
    )
})

async function shouldLoadNormally(
    page: Page,
    mockExperiment: (config: ExperimentMockConfig) => Promise<void>,
    platform?: string
): Promise<void> {
    await mockExperiment({
        ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
    })

    const platformParam = platform ? `?volley_platform=${platform}` : ""
    await page.goto(`./${platformParam}`)

    await waitForBasicLoad(page)

    const modalContainer = page.locator("#invalid-platform-modal-container")
    await expect(modalContainer).not.toBeVisible()

    await expect(page).toHaveTitle(/Volley|Weekend/)
}

async function shouldLoadWithErrorModal(
    page: Page,
    mockExperiment: (config: ExperimentMockConfig) => Promise<void>,
    platform?: string
): Promise<void> {
    await mockExperiment({
        ...COMMON_EXPERIMENTS.noExperiments,
    })

    const platformParam = platform ? `?volley_platform=${platform}` : ""
    await page.goto(`./${platformParam}`)

    await page.waitForTimeout(TIMEOUTS.longWait)

    const modalContainer = page.locator("#invalid-platform-modal-container")
    await expect(modalContainer).toBeVisible({
        timeout: TIMEOUTS.loadingPhase,
    })

    await expect(
        page.locator('text="Hmm, something went wrong."')
    ).toBeVisible()
    await expect(page.getByText("Error: Invalid platform")).toBeVisible()
}
