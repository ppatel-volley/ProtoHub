import {
    dismissModal,
    setupSegmentTracking,
    waitForQrCode,
} from "../deviceAuthHelpers"
import { expect, test } from "../fixtures"
import {
    COMMON_EXPERIMENTS,
    findTrackingEvent,
    openExitModal,
    parseDisplayChoices,
    SELECTORS,
    TIMEOUTS,
    waitForHubToLoad,
    waitForLoadingComplete,
} from "../testHelpers"

test.describe("Tracking Flows - Unsubscribed User", () => {
    test("should track events when user views web checkout modal and exits it", async ({
        page,
        mockExperiment,
    }) => {
        const { getEvents } = await setupSegmentTracking(page)

        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
        })

        await page.goto("./")

        await waitForLoadingComplete(page)

        await page.waitForTimeout(1000)

        const modal = page.locator('[data-testid="web-checkout-modal"]')
        await expect(modal).toHaveClass(/modalVisible/, {
            timeout: TIMEOUTS.extraLongWait,
        })

        await waitForQrCode(page)
        await page.waitForTimeout(500)

        await dismissModal(page)

        await page.waitForTimeout(500)

        const events = getEvents()

        const sessionStartEvent = findTrackingEvent(events, "Hub Session Start")
        expect(sessionStartEvent).toBeDefined()

        const webCheckoutScreenDisplayed = events.filter(
            (e) =>
                e.event === "Hub Screen Displayed" &&
                e.properties?.eventCategory === "account pairing"
        )
        expect(webCheckoutScreenDisplayed.length).toBeGreaterThan(0)

        const backButtonPressed = findTrackingEvent(
            events,
            "Hub Button Pressed",
            { eventCategory: "account pairing" }
        )
        expect(backButtonPressed).toBeDefined()
    })

    test("should track events when user opens and closes exit modal", async ({
        page,
        mockExperiment,
    }) => {
        const { getEvents } = await setupSegmentTracking(page)

        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })

        await waitForHubToLoad(page)

        const eventsBeforeModal = getEvents().length

        await openExitModal(page)

        const eventsAfterOpen = getEvents()

        const exitModalScreenDisplayed = findTrackingEvent(
            eventsAfterOpen,
            "Hub Screen Displayed",
            { eventSubCategory: "exit modal selection" }
        )
        expect(exitModalScreenDisplayed).toBeDefined()

        const parsedChoices = parseDisplayChoices(
            exitModalScreenDisplayed?.properties?.displayChoices
        )
        expect(parsedChoices).toEqual(["yes", "no"])

        await page.locator(SELECTORS.noButton).click()
        await page.waitForTimeout(TIMEOUTS.modalTransition)

        await expect(page.locator(SELECTORS.exitModalText)).not.toBeVisible()

        await page.waitForTimeout(500)

        const finalEvents = getEvents()
        expect(finalEvents.length).toBeGreaterThan(eventsBeforeModal)
    })

    test("should track events when user opens exit modal and selects yes", async ({
        page,
        mockExperiment,
    }) => {
        const { getEvents } = await setupSegmentTracking(page)

        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })

        await waitForHubToLoad(page)

        await openExitModal(page)

        const eventsAfterOpen = getEvents()

        const exitModalScreenDisplayed = findTrackingEvent(
            eventsAfterOpen,
            "Hub Screen Displayed",
            { eventSubCategory: "exit modal selection" }
        )
        expect(exitModalScreenDisplayed).toBeDefined()

        const screenDisplayedId =
            exitModalScreenDisplayed?.properties?.screenDisplayedId
        expect(screenDisplayedId).toBeDefined()

        await page.locator(SELECTORS.yesButton).click()
        await page.waitForTimeout(TIMEOUTS.modalTransition)

        await page.waitForTimeout(500)

        const finalEvents = getEvents()

        const yesButtonPressed = findTrackingEvent(
            finalEvents,
            "Hub Button Pressed",
            {
                choiceValue: "yes",
                screenDisplayedId,
            }
        )
        expect(yesButtonPressed).toBeDefined()
    })

    test("should track events when user cycles through games and selects a game", async ({
        page,
        mockExperiment,
    }) => {
        const { getEvents } = await setupSegmentTracking(page)

        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })

        await waitForHubToLoad(page)

        const eventsAfterLoad = getEvents()

        const gameSelectionScreenDisplayed = findTrackingEvent(
            eventsAfterLoad,
            "Hub Screen Displayed",
            { eventSubCategory: "game selection" }
        )
        expect(gameSelectionScreenDisplayed).toBeDefined()

        const parsedChoices = parseDisplayChoices(
            gameSelectionScreenDisplayed?.properties?.displayChoices
        )
        expect(Array.isArray(parsedChoices)).toBe(true)
        expect((parsedChoices as unknown[])?.length).toBeGreaterThan(0)

        const tiles = page.locator(SELECTORS.gameTile)
        const tileCount = await tiles.count()
        expect(tileCount).toBeGreaterThan(1)

        await page.keyboard.press("ArrowRight")
        await page.waitForTimeout(TIMEOUTS.navigation)

        await page.keyboard.press("ArrowRight")
        await page.waitForTimeout(TIMEOUTS.navigation)

        await page.keyboard.press("ArrowLeft")
        await page.waitForTimeout(TIMEOUTS.navigation)

        const eventsAfterCycling = getEvents()

        const hoveredEvents = eventsAfterCycling.filter(
            (e) => e.event === "Hub Button Hovered"
        )
        expect(hoveredEvents.length).toBeGreaterThan(0)

        const firstHoverEvent = hoveredEvents[0]
        expect(firstHoverEvent?.properties?.eventCategory).toBe("menu")
        expect(firstHoverEvent?.properties?.screenDisplayedId).toBeDefined()

        const gameTile = page.locator(SELECTORS.gameTile).first()
        await gameTile.click()

        await page.waitForTimeout(1000)

        const finalEvents = getEvents()

        const gameSelectionEvent = findTrackingEvent(
            finalEvents,
            "Hub Button Pressed",
            { eventSubCategory: "game selection" }
        )
        expect(gameSelectionEvent).toBeDefined()
        expect(gameSelectionEvent?.properties?.choiceValue).toBeDefined()
    })
})

/**
 * Event Ordering Tests
 * These tests verify the critical invariant that Hub Session Start must have
 * an earlier timestamp than the first Hub Screen Displayed.
 */
test.describe("Event Ordering - Hub Session Start and Hub Screen Displayed", () => {
    test("Hub Session Start timestamp should be earlier than Hub Screen Displayed timestamp", async ({
        page,
        mockExperiment,
    }) => {
        const { getEvents } = await setupSegmentTracking(page)

        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })

        await waitForHubToLoad(page)
        await page.waitForTimeout(TIMEOUTS.longWait)

        const events = getEvents()

        const sessionStartEvent = events.find(
            (e) => e.event === "Hub Session Start"
        )
        const screenDisplayedEvent = events.find(
            (e) =>
                e.event === "Hub Screen Displayed" &&
                e.properties?.eventSubCategory === "game selection"
        )

        expect(sessionStartEvent).toBeDefined()
        expect(sessionStartEvent?.timestamp).toBeDefined()
        expect(screenDisplayedEvent).toBeDefined()
        expect(screenDisplayedEvent?.timestamp).toBeDefined()

        const sessionStartTimestamp = sessionStartEvent!.timestamp!
        const screenDisplayedTimestamp = screenDisplayedEvent!.timestamp!
        const sessionStartTime = new Date(sessionStartTimestamp).getTime()
        const screenDisplayedTime = new Date(screenDisplayedTimestamp).getTime()
        expect(sessionStartTime).toBeLessThan(screenDisplayedTime)
    })

    test("Hub Session Start should appear exactly once per session", async ({
        page,
        mockExperiment,
    }) => {
        const { getEvents } = await setupSegmentTracking(page)

        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
            ...COMMON_EXPERIMENTS.suppressImmediateUpsell,
        })

        await waitForHubToLoad(page)
        await page.waitForTimeout(TIMEOUTS.longWait)

        await page.keyboard.press("ArrowRight")
        await page.waitForTimeout(TIMEOUTS.navigation)
        await page.keyboard.press("ArrowLeft")
        await page.waitForTimeout(TIMEOUTS.navigation)

        const events = getEvents()
        const sessionStartEvents = events.filter(
            (e) => e.event === "Hub Session Start"
        )

        expect(sessionStartEvents).toHaveLength(1)
    })

    test("Hub Session Start timestamp should be earlier than all Hub Screen Displayed events", async ({
        page,
        mockExperiment,
    }) => {
        const { getEvents } = await setupSegmentTracking(page)

        await mockExperiment({
            ...COMMON_EXPERIMENTS.noExperiments,
        })

        await page.goto("./")

        await waitForLoadingComplete(page)

        await page.waitForTimeout(TIMEOUTS.longWait)

        const events = getEvents()

        const sessionStartEvent = events.find(
            (e) => e.event === "Hub Session Start"
        )
        expect(sessionStartEvent).toBeDefined()
        expect(sessionStartEvent?.timestamp).toBeDefined()

        const allScreenDisplayedEvents = events.filter(
            (e) => e.event === "Hub Screen Displayed"
        )
        expect(allScreenDisplayedEvents.length).toBeGreaterThan(0)

        const sessionStartTimestamp = sessionStartEvent!.timestamp!
        const sessionStartTime = new Date(sessionStartTimestamp).getTime()

        for (const screenEvent of allScreenDisplayedEvents) {
            expect(screenEvent.timestamp).toBeDefined()
            const screenTimestamp = screenEvent.timestamp!
            const screenTime = new Date(screenTimestamp).getTime()
            expect(sessionStartTime).toBeLessThan(screenTime)
        }
    })
})
