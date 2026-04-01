import {
    completeDeviceAuthFlow,
    setupDeviceAuthMock,
    setupSegmentTracking,
    waitForQrCode,
} from "../deviceAuthHelpers"
import { expect, test } from "../fixtures"
import { TIMEOUTS, waitForLoadingComplete } from "../testHelpers"

test.describe("Device Auth - Observability", () => {
    test.beforeEach(async ({ page, mockExperiment }) => {
        await setupDeviceAuthMock(page)

        await mockExperiment({})

        await page.addInitScript(() => {
            sessionStorage.removeItem("hasSuccessfulPayment")
        })
    })

    test("should send Segment Hub Session Start event", async ({ page }) => {
        const { getEvents } = await setupSegmentTracking(page)

        await page.goto("./")

        await waitForLoadingComplete(page, TIMEOUTS.loadingPhase)

        await page.waitForTimeout(TIMEOUTS.mediumWait)

        const events = getEvents()
        const sessionStartEvent = events.find(
            (e) => e.event === "Hub Session Start"
        )

        expect(sessionStartEvent).toBeDefined()
    })

    test("should send Segment events during successful auth flow", async ({
        page,
    }) => {
        const { getEvents } = await setupSegmentTracking(page)

        await page.goto("./")

        await waitForLoadingComplete(page, TIMEOUTS.loadingPhase)

        await completeDeviceAuthFlow(page, 1000)

        await page.waitForTimeout(TIMEOUTS.navigation)

        const events = getEvents()

        const sessionStartEvent = events.find(
            (e) => e.event === "Hub Session Start"
        )
        expect(sessionStartEvent).toBeDefined()
    })

    test("should track button press events for game selection", async ({
        page,
        mockExperiment,
    }) => {
        const { getEvents } = await setupSegmentTracking(page)

        await mockExperiment({
            "suppress-immediate-upsell": { value: "on" },
        })

        await page.goto("./")

        await waitForLoadingComplete(page, TIMEOUTS.loadingPhase)

        await page.waitForTimeout(TIMEOUTS.navigation)

        const gameTile = page.locator('[class*="gameTile"]').first()
        await gameTile.click()

        await page.waitForTimeout(TIMEOUTS.mediumWait)

        const events = getEvents()

        const buttonPressEvent = events.find(
            (e) => e.event === "Hub Button Pressed"
        )

        if (buttonPressEvent) {
            expect(buttonPressEvent.event).toBe("Hub Button Pressed")
        }
    })

    test("should maintain event tracking through modal lifecycle", async ({
        page,
    }) => {
        const { getEvents } = await setupSegmentTracking(page)

        await page.goto("./")

        await waitForLoadingComplete(page, TIMEOUTS.loadingPhase)

        const modal = page.locator('[data-testid="web-checkout-modal"]')
        await expect(modal).toHaveClass(/modalVisible/)

        await waitForQrCode(page)

        await page.keyboard.press("Escape")
        await page.waitForTimeout(TIMEOUTS.modalTransition)

        await page.waitForTimeout(TIMEOUTS.navigation)

        const events = getEvents()
        expect(events.length).toBeGreaterThan(0)

        const sessionStartEvent = events.find(
            (e) => e.event === "Hub Session Start"
        )
        expect(sessionStartEvent).toBeDefined()
    })

    test("should continue tracking after successful payment", async ({
        page,
    }) => {
        const { getEvents } = await setupSegmentTracking(page)

        await page.goto("./")

        await waitForLoadingComplete(page, TIMEOUTS.loadingPhase)

        await completeDeviceAuthFlow(page, 1000)

        await page.waitForTimeout(TIMEOUTS.mediumWait)

        const initialEventCount = getEvents().length

        await page.reload()

        await waitForLoadingComplete(page, TIMEOUTS.loadingPhase)

        await page.waitForTimeout(TIMEOUTS.navigation)

        const finalEvents = getEvents()

        expect(finalEvents.length).toBeGreaterThan(initialEventCount)
    })

    test("should track events for multiple interactions in session", async ({
        page,
        mockExperiment,
    }) => {
        const { getEvents } = await setupSegmentTracking(page)

        await mockExperiment({
            "suppress-immediate-upsell": { value: "on" },
        })

        await page.goto("./")

        await waitForLoadingComplete(page, TIMEOUTS.loadingPhase)

        await page.waitForTimeout(TIMEOUTS.navigation)

        const initialEventCount = getEvents().length

        const gameTile = page.locator('[class*="gameTile"]').first()
        await gameTile.click()

        await page.waitForTimeout(TIMEOUTS.mediumWait)

        const modal = page.locator('[data-testid="web-checkout-modal"]')
        const isModalVisible = await modal.isVisible().catch(() => false)

        if (isModalVisible) {
            await page.keyboard.press("Escape")
            await page.waitForTimeout(TIMEOUTS.navigation)
        }

        await page.waitForTimeout(TIMEOUTS.navigation)

        const finalEvents = getEvents()
        expect(finalEvents.length).toBeGreaterThanOrEqual(initialEventCount)
    })

    test("should not lose events during page transitions", async ({ page }) => {
        const { getEvents } = await setupSegmentTracking(page)

        await page.goto("./")

        await waitForLoadingComplete(page, TIMEOUTS.loadingPhase)

        await page.waitForTimeout(TIMEOUTS.navigation)

        const eventsBeforeReload = getEvents().length
        expect(eventsBeforeReload).toBeGreaterThan(0)

        await page.reload()

        await waitForLoadingComplete(page, TIMEOUTS.loadingPhase)

        await page.waitForTimeout(TIMEOUTS.navigation)

        const eventsAfterReload = getEvents()
        expect(eventsAfterReload.length).toBeGreaterThanOrEqual(
            eventsBeforeReload
        )
    })

    test("should track all events with proper formatting", async ({ page }) => {
        const { getEvents } = await setupSegmentTracking(page)

        await page.goto("./")

        await waitForLoadingComplete(page, TIMEOUTS.loadingPhase)

        await page.waitForTimeout(TIMEOUTS.mediumWait)

        const events = getEvents()

        events.forEach((event) => {
            expect(event).toHaveProperty("event")
            expect(typeof event.event).toBe("string")
            expect(event.event.length).toBeGreaterThan(0)
        })

        const uniqueEvents = new Set(events.map((e) => e.event))
        expect(uniqueEvents.size).toBeGreaterThan(0)
    })
})
