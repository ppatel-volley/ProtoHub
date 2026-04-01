import { expect, test } from "../fixtures"
import {
    COMMON_EXPERIMENTS,
    SELECTORS,
    TIMEOUTS,
    waitForBasicLoad,
} from "../testHelpers"

test.describe("Experiment Mocking Examples", () => {
    test.skip(true, "Sample tests are examples for developers")
    test("should load home page with no experiment overrides", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })
        await waitForBasicLoad(page)
    })

    test("should demonstrate multiple experiments", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            "test-feature": { value: "enabled", payload: { color: "blue" } },
            "another-flag": { value: "control", payload: { theme: "dark" } },
        })
        await waitForBasicLoad(page)
        await expect(page.locator(SELECTORS.identVideo)).toHaveCount(1)
    })

    test("should verify API request interception", async ({
        page,
        mockExperiment,
    }) => {
        const amplitudeRequests: string[] = []

        page.on("request", (request) => {
            if (request.url().includes("api.lab.amplitude.com")) {
                amplitudeRequests.push(request.url())
            }
        })

        await mockExperiment({
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            "test-flag": { value: "intercepted" },
        })

        await waitForBasicLoad(page)
        await page.waitForTimeout(TIMEOUTS.longWait)

        expect(amplitudeRequests.length).toBeGreaterThan(0)
        expect(amplitudeRequests[0]).toContain("api.lab.amplitude.com")
    })
})
