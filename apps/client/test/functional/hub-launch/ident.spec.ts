import { expect, test } from "../fixtures"
import {
    COMMON_EXPERIMENTS,
    SELECTORS,
    waitForLoadingPhase,
} from "../testHelpers"

test.describe("Display or suppress ident video based on experiment", () => {
    test("should display ident video for users", async ({
        mockExperiment,
        page,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })
        await waitForLoadingPhase(page)
        await expect(page.locator(SELECTORS.identVideo)).toHaveCount(1)
        await expect(page.locator(SELECTORS.identVideo)).toHaveAttribute(
            "src",
            /weekend_video_ident_compressed\.mp4/
        )
    })
})
