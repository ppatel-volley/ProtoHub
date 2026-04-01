import { setupGameLaunchMock, setupSubscribedUser } from "../deviceAuthHelpers"
import { expect, test } from "../fixtures"
import {
    COMMON_EXPERIMENTS,
    createGamePayloadSwap,
    SELECTORS,
    TIMEOUTS,
    waitForCarouselReady,
} from "../testHelpers"

const SELECTORS_STATUS = {
    statusBanner: '[class*="statusTag"]',
} as const

test.describe("Status Banners and Coming Soon Behavior", () => {
    test.beforeEach(async ({ page }) => {
        await setupSubscribedUser(page)
        await setupGameLaunchMock(page)
    })

    test("should display coming-soon status banner when game has coming-soon status", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            "reorder-mp-tiles": {
                value: "enabled",
                payload: ["wheel-of-fortune"],
            },
            ...createGamePayloadSwap("wheel-of-fortune", {
                status: "coming-soon",
            }),
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        const statusBanner = page.locator(SELECTORS_STATUS.statusBanner)
        await expect(statusBanner).toBeVisible()

        const statusBannerImg = statusBanner.locator("img")
        const src = await statusBannerImg.getAttribute("src")
        expect(src).toContain("ui/tags/coming-soon")
    })

    test("should display beta status banner when experiment payload sets status to beta", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            ...createGamePayloadSwap("jeopardy", {
                status: "beta",
            }),
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        const firstTile = page.locator(SELECTORS.gameTile).first()
        const statusBanner = firstTile.locator(SELECTORS_STATUS.statusBanner)
        await expect(statusBanner).toBeVisible()

        const statusBannerImg = statusBanner.locator("img")
        const src = await statusBannerImg.getAttribute("src")
        expect(src).toContain("ui/tags/beta")
    })

    test("should display new status banner when experiment payload sets status to new", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            ...createGamePayloadSwap("jeopardy", {
                status: "new",
            }),
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        const firstTile = page.locator(SELECTORS.gameTile).first()
        const statusBanner = firstTile.locator(SELECTORS_STATUS.statusBanner)
        await expect(statusBanner).toBeVisible()

        const statusBannerImg = statusBanner.locator("img")
        const src = await statusBannerImg.getAttribute("src")
        expect(src).toContain("ui/tags/new")
    })

    test("should hide status banner when experiment payload sets status to false", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            "reorder-mp-tiles": {
                value: "enabled",
                payload: ["wheel-of-fortune"],
            },
            ...createGamePayloadSwap("wheel-of-fortune", {
                status: false,
            }),
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        const firstTile = page.locator(SELECTORS.gameTile).first()
        await expect(firstTile).toBeVisible()

        const statusBanner = firstTile.locator(SELECTORS_STATUS.statusBanner)
        await expect(statusBanner).not.toBeVisible()
    })

    test("should prevent game launch when game has coming-soon status", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            "reorder-mp-tiles": {
                value: "enabled",
                payload: ["wheel-of-fortune"],
            },
            ...createGamePayloadSwap("wheel-of-fortune", {
                status: "coming-soon",
            }),
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        const firstTile = page.locator(SELECTORS.gameTile).first()
        await firstTile.click()

        await page.waitForTimeout(TIMEOUTS.mediumWait)

        const iframe = page.locator("iframe.game-iframe")
        await expect(iframe).toHaveCount(0)

        const carousel = page.locator(SELECTORS.gamesCarousel)
        await expect(carousel).toBeVisible()
    })

    test("should allow game launch when coming-soon status is removed via experiment", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            "reorder-mp-tiles": {
                value: "enabled",
                payload: ["wheel-of-fortune"],
            },
            ...createGamePayloadSwap("wheel-of-fortune", {
                status: false,
            }),
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        const firstTile = page.locator(SELECTORS.gameTile).first()
        await firstTile.click()

        const iframe = page.locator("iframe.game-iframe")
        await expect(iframe).toHaveCount(1, { timeout: TIMEOUTS.longWait })

        await page.waitForFunction(
            () =>
                !(
                    document.querySelector(
                        "iframe.game-iframe"
                    ) as HTMLIFrameElement
                )?.hidden
        )
    })

    test("should launch game with beta status", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            ...createGamePayloadSwap("jeopardy", {
                status: "beta",
            }),
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        const firstTile = page.locator(SELECTORS.gameTile).first()
        const statusBanner = firstTile.locator(SELECTORS_STATUS.statusBanner)
        await expect(statusBanner).toBeVisible()

        await firstTile.click()

        const iframe = page.locator("iframe.game-iframe")
        await expect(iframe).toHaveCount(1, { timeout: TIMEOUTS.longWait })
    })

    test("should launch game with new status", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            ...createGamePayloadSwap("jeopardy", {
                status: "new",
            }),
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        const firstTile = page.locator(SELECTORS.gameTile).first()
        const statusBanner = firstTile.locator(SELECTORS_STATUS.statusBanner)
        await expect(statusBanner).toBeVisible()

        await firstTile.click()

        const iframe = page.locator("iframe.game-iframe")
        await expect(iframe).toHaveCount(1, { timeout: TIMEOUTS.longWait })
    })

    test("should change status from coming-soon to beta via experiment", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            "reorder-mp-tiles": {
                value: "enabled",
                payload: ["wheel-of-fortune"],
            },
            ...createGamePayloadSwap("wheel-of-fortune", {
                status: "beta",
            }),
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        const firstTile = page.locator(SELECTORS.gameTile).first()
        const statusBanner = firstTile.locator(SELECTORS_STATUS.statusBanner)
        await expect(statusBanner).toBeVisible()

        const statusBannerImg = statusBanner.locator("img")
        const src = await statusBannerImg.getAttribute("src")
        expect(src).toContain("ui/tags/beta")
    })

    test("should prevent launch only for coming-soon, not for other statuses", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            "reorder-mp-tiles": {
                value: "enabled",
                payload: ["wheel-of-fortune", "jeopardy"],
            },
            ...createGamePayloadSwap("wheel-of-fortune", {
                status: "coming-soon",
            }),
            ...createGamePayloadSwap("jeopardy", {
                status: "beta",
            }),
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        const firstTile = page.locator(SELECTORS.gameTile).first()
        await firstTile.click()

        await page.waitForTimeout(TIMEOUTS.mediumWait)
        const iframe = page.locator("iframe.game-iframe")
        await expect(iframe).toHaveCount(0)

        await page.keyboard.press("ArrowRight")
        await page.waitForTimeout(300)

        const secondTile = page.locator(SELECTORS.gameTile).nth(1)
        await secondTile.click()

        await expect(iframe).toHaveCount(1, { timeout: TIMEOUTS.longWait })
    })
})
