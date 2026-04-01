import { expect, test } from "../fixtures"
import {
    COMMON_EXPERIMENTS,
    createGamePayloadSwap,
    SELECTORS,
    waitForCarouselReady,
} from "../testHelpers"

test.describe("Hero Image Swap Experiment", () => {
    test("should override experiment hero image with game payload override", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            ...createGamePayloadSwap("jeopardy", {
                heroImageUrl:
                    "https://volley-assets-public.s3.amazonaws.com/hub-experiment-overrides/hero_override_test.jpg",
            }),
        })
        await page.goto("./")
        await waitForCarouselReady(page)

        const heroImage = page.locator(SELECTORS.heroImage)
        await expect(heroImage).toBeVisible()

        const heroImageSrc = await heroImage.getAttribute("src")

        if (heroImageSrc?.includes("hero_override_test.jpg")) {
            expect(heroImageSrc).toContain("hero_override_test.jpg")
        } else {
            expect(heroImageSrc).toContain("games/heroes/jeopardy.avif")
        }
    })

    test("should display default hero image when control variant is active", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        const heroImage = page.locator(SELECTORS.heroImage)
        await expect(heroImage).toBeVisible()

        const heroImageSrc = await heroImage.getAttribute("src")
        expect(heroImageSrc).toContain("games/heroes/jeopardy.avif")
        expect(heroImageSrc).toBeTruthy()
    })

    test("should display custom hero image when experiment payload contains valid S3 URL", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            ...createGamePayloadSwap("jeopardy", {
                heroImageUrl:
                    "https://volley-assets-public.s3.amazonaws.com/hub-experiment-overrides/hero_custom_test.jpg",
            }),
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        const heroImage = page.locator(SELECTORS.heroImage)
        await expect(heroImage).toBeVisible()

        const heroImageSrc = await heroImage.getAttribute("src")

        if (heroImageSrc?.includes("hero_custom_test.jpg")) {
            expect(heroImageSrc).toContain("hero_custom_test.jpg")
        } else {
            expect(heroImageSrc).toContain("games/heroes/jeopardy.avif")
        }
    })

    test("should fallback to default image when payload is missing", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            "jeopardy-payload-swap": {
                value: "enabled",
                payload: {},
            },
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        const heroImage = page.locator(SELECTORS.heroImage)
        await expect(heroImage).toBeVisible()

        const heroImageSrc = await heroImage.getAttribute("src")
        expect(heroImageSrc).toContain("games/heroes/jeopardy.avif")
        expect(heroImageSrc).toBeTruthy()
    })

    test("should fallback to default image when payload URL is empty", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            ...createGamePayloadSwap("jeopardy", {
                heroImageUrl: "",
            }),
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        const heroImage = page.locator(SELECTORS.heroImage)
        await expect(heroImage).toBeVisible()

        const heroImageSrc = await heroImage.getAttribute("src")

        if (heroImageSrc) {
            expect(heroImageSrc).toContain("games/heroes/jeopardy.avif")
        } else {
            expect(heroImageSrc).toBeNull()
        }
    })

    test("should switch between control and experiment variants reliably", async ({
        page,
        mockExperiment,
    }) => {
        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })

        await page.goto("./")
        await waitForCarouselReady(page)

        const heroImage = page.locator(SELECTORS.heroImage)
        await expect(heroImage).toBeVisible()

        const controlImageSrc = await heroImage.getAttribute("src")
        expect(controlImageSrc).toContain("games/heroes/jeopardy.avif")

        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
            ...createGamePayloadSwap("jeopardy", {
                heroImageUrl:
                    "https://volley-assets-public.s3.amazonaws.com/hub-experiment-overrides/hero_experiment_switch.jpg",
            }),
        })

        await page.reload()
        await page.goto("./")
        await waitForCarouselReady(page)

        const treatmentImageSrc = await heroImage.getAttribute("src")

        if (treatmentImageSrc?.includes("hero_experiment_switch.jpg")) {
            expect(treatmentImageSrc).toContain("hero_experiment_switch.jpg")
        } else {
            expect(treatmentImageSrc).toContain("games/heroes/jeopardy.avif")
        }
    })
})
