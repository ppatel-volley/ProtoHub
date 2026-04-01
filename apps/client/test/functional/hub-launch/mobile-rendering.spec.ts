import type { Page } from "@playwright/test"

import {
    expect,
    type ExperimentMockConfig,
    test,
    testMobileAndroid,
    testMobileIOS,
} from "../fixtures"
import { TIMEOUTS } from "../testHelpers"

test.describe("Mobile Hub Rendering", () => {
    const testMobileAppDownloadLanding = async (
        page: Page,
        mockExperiment: (config: ExperimentMockConfig) => Promise<void>
    ): Promise<void> => {
        await mockExperiment({})
        await page.goto("./")
        await expect(page).toHaveTitle(/Volley|Weekend/)
        const downloadText = page.getByText("Download the Weekend app to play")
        await expect(downloadText).toBeVisible({
            timeout: TIMEOUTS.carouselLoad,
        })
    }

    testMobileIOS(
        "should render AppDownloadLanding on iOS mobile browser",
        async ({ page, mockExperiment }) => {
            await testMobileAppDownloadLanding(page, mockExperiment)
        }
    )

    testMobileAndroid(
        "should render AppDownloadLanding on Android mobile browser",
        async ({ page, mockExperiment }) => {
            await testMobileAppDownloadLanding(page, mockExperiment)
        }
    )
})
