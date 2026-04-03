/**
 * Integration tests for Hub Session Start and Hub Screen Displayed event ordering.
 *
 * These tests verify the critical invariant that Hub Session Start must be tracked
 * before Hub Screen Displayed.
 *
 * The current expected behavior:
 * - Hub Session Start is triggered by platform becoming ready (independent hook)
 * - Hub Screen Displayed is triggered by initialization completing AND hub being visible
 */

import { act, renderHook } from "@testing-library/react"

import type { Game } from "./useGames"
import { useHubScreenTracking } from "./useHubScreenTracking"
import {
    HUB_SESSION_START_DELAY_MS,
    useHubSessionStart,
} from "./useHubSessionStart"

jest.mock("uuid", () => ({
    v4: jest.fn(() => "test-uuid-123"),
}))

jest.mock("../utils/logger", () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        log: jest.fn(),
    },
}))

jest.mock("./useGames", () => ({
    useGames: jest.fn(),
}))

jest.mock("./useHubTracking", () => ({
    useHubTracking: jest.fn(),
}))

jest.mock("@volley/platform-sdk/react", () => ({
    useDeviceInfo: jest.fn(),
}))

jest.mock("../config/platformDetection", () => ({
    isFireTV: jest.fn(() => false),
    isMobile: jest.fn(() => false),
}))

const mockUseGames = require("./useGames").useGames
const mockUseHubTracking = require("./useHubTracking").useHubTracking
const mockUseDeviceInfo = require("@volley/platform-sdk/react").useDeviceInfo

interface TrackedEvent {
    eventName: string
    callOrder: number
    eventTimestamp?: Date
    properties?: Record<string, unknown>
}

describe("Hub Session Start and Hub Screen Displayed Event Ordering", () => {
    let trackedEvents: TrackedEvent[]
    let eventOrderCounter: number
    const mockTrack = jest.fn()
    const mockGetAdId = jest.fn()
    const mockGetInputDeviceSources = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
        jest.useFakeTimers()

        trackedEvents = []
        eventOrderCounter = 0

        mockTrack.mockImplementation(
            (
                eventName: string,
                properties?: Record<string, unknown>,
                timestamp?: Date
            ): void => {
                trackedEvents.push({
                    eventName,
                    callOrder: eventOrderCounter++,
                    eventTimestamp: timestamp ?? new Date(),
                    properties,
                })
            }
        )

        mockUseHubTracking.mockReturnValue({
            track: mockTrack,
            identify: jest.fn(),
            group: jest.fn(),
        })

        mockUseDeviceInfo.mockReturnValue({
            getAdId: mockGetAdId,
            getInputDeviceSources: mockGetInputDeviceSources,
        })

        mockGetAdId.mockReturnValue({ advertisingId: "test-ad-id" })
        mockGetInputDeviceSources.mockResolvedValue({ devices: {} })

        mockUseGames.mockReturnValue([
            {
                id: "jeopardy",
                title: "Jeopardy",
                tileImageUrl: "test-tile.avif",
                heroImageUrl: "test-hero.avif",
                source: "placeholder" as const,
            },
            {
                id: "song-quiz",
                title: "Song Quiz",
                tileImageUrl: "test-tile-2.avif",
                heroImageUrl: "test-hero-2.avif",
                source: "placeholder" as const,
            },
        ])
    })

    afterEach(() => {
        jest.runOnlyPendingTimers()
        jest.useRealTimers()
    })

    const getHubSessionStartEvent = (): TrackedEvent | undefined =>
        trackedEvents.find((e) => e.eventName === "Hub Session Start")

    const getHubScreenDisplayedEvent = (): TrackedEvent | undefined =>
        trackedEvents.find((e) => e.eventName === "Hub Screen Displayed")

    describe("when both hooks are used together (simulating App + Main)", () => {
        it("Hub Session Start should be tracked before Hub Screen Displayed when platform ready triggers both", async () => {
            const { rerender: rerenderSessionStart } = renderHook(
                ({ platformReady }) =>
                    useHubSessionStart(undefined, false, platformReady),
                { initialProps: { platformReady: false } }
            )

            const { rerender: rerenderScreenTracking } = renderHook(
                ({ isInitialized, activeGame, isInUpsell }) =>
                    useHubScreenTracking(isInitialized, activeGame, isInUpsell),
                {
                    initialProps: {
                        isInitialized: false,
                        activeGame: null as Game | null,
                        isInUpsell: false,
                    },
                }
            )

            expect(getHubSessionStartEvent()).toBeUndefined()
            expect(getHubScreenDisplayedEvent()).toBeUndefined()

            rerenderSessionStart({ platformReady: true })

            act(() => {
                jest.advanceTimersByTime(HUB_SESSION_START_DELAY_MS)
            })

            await act(async () => {
                await jest.runOnlyPendingTimersAsync()
            })

            expect(getHubSessionStartEvent()).toBeDefined()
            expect(getHubScreenDisplayedEvent()).toBeUndefined()

            rerenderScreenTracking({
                isInitialized: true,
                activeGame: null,
                isInUpsell: false,
            })

            const sessionStart = getHubSessionStartEvent()
            const screenDisplayed = getHubScreenDisplayedEvent()

            expect(sessionStart).toBeDefined()
            expect(screenDisplayed).toBeDefined()
            expect(sessionStart!.eventTimestamp).toBeDefined()
            expect(screenDisplayed!.eventTimestamp).toBeDefined()
            expect(sessionStart!.eventTimestamp!.getTime()).toBeLessThan(
                screenDisplayed!.eventTimestamp!.getTime()
            )
        })

        it("Hub Session Start should fire independently and not block Hub Screen Displayed", async () => {
            const { rerender: rerenderSessionStart } = renderHook(
                ({ platformReady }) =>
                    useHubSessionStart(undefined, false, platformReady),
                { initialProps: { platformReady: false } }
            )

            const { rerender: rerenderScreenTracking } = renderHook(
                ({ isInitialized, activeGame, isInUpsell }) =>
                    useHubScreenTracking(isInitialized, activeGame, isInUpsell),
                {
                    initialProps: {
                        isInitialized: false,
                        activeGame: null as Game | null,
                        isInUpsell: false,
                    },
                }
            )

            rerenderSessionStart({ platformReady: true })

            act(() => {
                jest.advanceTimersByTime(HUB_SESSION_START_DELAY_MS / 2)
            })

            expect(getHubSessionStartEvent()).toBeUndefined()

            rerenderScreenTracking({
                isInitialized: true,
                activeGame: null,
                isInUpsell: false,
            })

            expect(getHubScreenDisplayedEvent()).toBeDefined()

            await act(async () => {
                jest.advanceTimersByTime(HUB_SESSION_START_DELAY_MS)
                await jest.runOnlyPendingTimersAsync()
            })

            expect(getHubSessionStartEvent()).toBeDefined()
        })

        it("should maintain ordering when platform ready happens first, then initialization completes", async () => {
            const { rerender: rerenderSessionStart } = renderHook(
                ({ platformReady }) =>
                    useHubSessionStart(undefined, false, platformReady),
                { initialProps: { platformReady: false } }
            )

            const { rerender: rerenderScreenTracking } = renderHook(
                ({ isInitialized, activeGame, isInUpsell }) =>
                    useHubScreenTracking(isInitialized, activeGame, isInUpsell),
                {
                    initialProps: {
                        isInitialized: false,
                        activeGame: null as Game | null,
                        isInUpsell: false,
                    },
                }
            )

            rerenderSessionStart({ platformReady: true })

            act(() => {
                jest.advanceTimersByTime(HUB_SESSION_START_DELAY_MS)
            })

            await act(async () => {
                await jest.runOnlyPendingTimersAsync()
            })

            const sessionStartBeforeScreenDisplay = getHubSessionStartEvent()
            expect(sessionStartBeforeScreenDisplay).toBeDefined()

            rerenderScreenTracking({
                isInitialized: true,
                activeGame: null,
                isInUpsell: false,
            })

            const sessionStart = getHubSessionStartEvent()
            const screenDisplayed = getHubScreenDisplayedEvent()

            expect(sessionStart).toBeDefined()
            expect(screenDisplayed).toBeDefined()
            expect(sessionStart!.eventTimestamp).toBeDefined()
            expect(screenDisplayed!.eventTimestamp).toBeDefined()
            expect(sessionStart!.eventTimestamp!.getTime()).toBeLessThan(
                screenDisplayed!.eventTimestamp!.getTime()
            )
        })

        it("should track Hub Screen Displayed even if Hub Session Start is delayed", () => {
            renderHook(
                ({ platformReady }) =>
                    useHubSessionStart(undefined, false, platformReady),
                { initialProps: { platformReady: false } }
            )

            const { rerender: rerenderScreenTracking } = renderHook(
                ({ isInitialized, activeGame, isInUpsell }) =>
                    useHubScreenTracking(isInitialized, activeGame, isInUpsell),
                {
                    initialProps: {
                        isInitialized: false,
                        activeGame: null as Game | null,
                        isInUpsell: false,
                    },
                }
            )

            rerenderScreenTracking({
                isInitialized: true,
                activeGame: null,
                isInUpsell: false,
            })

            expect(getHubScreenDisplayedEvent()).toBeDefined()
            expect(getHubSessionStartEvent()).toBeUndefined()
        })

        it("Hub Session Start timestamp should be earlier even when it fires after Hub Screen Displayed", async () => {
            const { rerender: rerenderSessionStart } = renderHook(
                ({ platformReady }) =>
                    useHubSessionStart(undefined, false, platformReady),
                { initialProps: { platformReady: false } }
            )

            const { rerender: rerenderScreenTracking } = renderHook(
                ({ isInitialized, activeGame, isInUpsell }) =>
                    useHubScreenTracking(isInitialized, activeGame, isInUpsell),
                {
                    initialProps: {
                        isInitialized: false,
                        activeGame: null as Game | null,
                        isInUpsell: false,
                    },
                }
            )

            rerenderSessionStart({ platformReady: true })

            rerenderScreenTracking({
                isInitialized: true,
                activeGame: null,
                isInUpsell: false,
            })

            const screenDisplayedFirst = getHubScreenDisplayedEvent()
            expect(screenDisplayedFirst).toBeDefined()
            expect(getHubSessionStartEvent()).toBeUndefined()
            expect(screenDisplayedFirst!.callOrder).toBe(0)

            await act(async () => {
                jest.advanceTimersByTime(HUB_SESSION_START_DELAY_MS)
                await jest.runOnlyPendingTimersAsync()
            })

            const sessionStart = getHubSessionStartEvent()
            const screenDisplayed = getHubScreenDisplayedEvent()

            expect(sessionStart).toBeDefined()
            expect(screenDisplayed).toBeDefined()
            expect(sessionStart!.callOrder).toBe(1)
            expect(screenDisplayed!.callOrder).toBe(0)

            expect(sessionStart!.eventTimestamp).toBeDefined()
            expect(screenDisplayed!.eventTimestamp).toBeDefined()
            expect(sessionStart!.eventTimestamp!.getTime()).toBeLessThan(
                screenDisplayed!.eventTimestamp!.getTime()
            )
        })
    })

    describe("regression tests for commit 6117305f8f9f52c957ad7cc2c850d20a3e98494d", () => {
        it("Hub Session Start should NOT be awaited inside Hub Screen Displayed logic", async () => {
            const { rerender: rerenderSessionStart } = renderHook(
                ({ platformReady }) =>
                    useHubSessionStart(undefined, false, platformReady),
                { initialProps: { platformReady: false } }
            )

            const { rerender: rerenderScreenTracking } = renderHook(
                ({ isInitialized, activeGame, isInUpsell }) =>
                    useHubScreenTracking(isInitialized, activeGame, isInUpsell),
                {
                    initialProps: {
                        isInitialized: false,
                        activeGame: null as Game | null,
                        isInUpsell: false,
                    },
                }
            )

            rerenderSessionStart({ platformReady: true })

            rerenderScreenTracking({
                isInitialized: true,
                activeGame: null,
                isInUpsell: false,
            })

            expect(getHubScreenDisplayedEvent()).toBeDefined()
            expect(getHubSessionStartEvent()).toBeUndefined()

            act(() => {
                jest.advanceTimersByTime(HUB_SESSION_START_DELAY_MS)
            })

            await act(async () => {
                await jest.runOnlyPendingTimersAsync()
            })

            expect(getHubSessionStartEvent()).toBeDefined()
        })

        it("Hub Screen Displayed should fire synchronously when conditions are met", () => {
            renderHook(() => useHubScreenTracking(true, null, false))

            expect(getHubScreenDisplayedEvent()).toBeDefined()
        })

        it("Hub Session Start should fire asynchronously after delay when platform is ready", async () => {
            renderHook(() => useHubSessionStart(undefined, false, true))

            expect(getHubSessionStartEvent()).toBeUndefined()

            act(() => {
                jest.advanceTimersByTime(HUB_SESSION_START_DELAY_MS - 1)
            })

            expect(getHubSessionStartEvent()).toBeUndefined()

            act(() => {
                jest.advanceTimersByTime(1)
            })

            await act(async () => {
                await jest.runOnlyPendingTimersAsync()
            })

            expect(getHubSessionStartEvent()).toBeDefined()
        })
    })

    describe("various initialization timing scenarios", () => {
        it("handles rapid succession of platform ready and initialization", async () => {
            const { rerender: rerenderSessionStart } = renderHook(
                ({ platformReady }) =>
                    useHubSessionStart(undefined, false, platformReady),
                { initialProps: { platformReady: false } }
            )

            const { rerender: rerenderScreenTracking } = renderHook(
                ({ isInitialized, activeGame, isInUpsell }) =>
                    useHubScreenTracking(isInitialized, activeGame, isInUpsell),
                {
                    initialProps: {
                        isInitialized: false,
                        activeGame: null as Game | null,
                        isInUpsell: false,
                    },
                }
            )

            rerenderSessionStart({ platformReady: true })
            rerenderScreenTracking({
                isInitialized: true,
                activeGame: null,
                isInUpsell: false,
            })

            expect(getHubScreenDisplayedEvent()).toBeDefined()

            act(() => {
                jest.advanceTimersByTime(HUB_SESSION_START_DELAY_MS)
            })

            await act(async () => {
                await jest.runOnlyPendingTimersAsync()
            })

            expect(getHubSessionStartEvent()).toBeDefined()

            expect(
                trackedEvents.filter((e) => e.eventName === "Hub Session Start")
            ).toHaveLength(1)
            expect(
                trackedEvents.filter(
                    (e) => e.eventName === "Hub Screen Displayed"
                )
            ).toHaveLength(1)
        })

        it("handles isInUpsell delay for Hub Screen Displayed", async () => {
            const { rerender: rerenderSessionStart } = renderHook(
                ({ platformReady }) =>
                    useHubSessionStart(undefined, false, platformReady),
                { initialProps: { platformReady: false } }
            )

            const { rerender: rerenderScreenTracking } = renderHook(
                ({ isInitialized, activeGame, isInUpsell }) =>
                    useHubScreenTracking(isInitialized, activeGame, isInUpsell),
                {
                    initialProps: {
                        isInitialized: false,
                        activeGame: null as Game | null,
                        isInUpsell: true,
                    },
                }
            )

            rerenderSessionStart({ platformReady: true })

            act(() => {
                jest.advanceTimersByTime(HUB_SESSION_START_DELAY_MS)
            })

            await act(async () => {
                await jest.runOnlyPendingTimersAsync()
            })

            expect(getHubSessionStartEvent()).toBeDefined()

            rerenderScreenTracking({
                isInitialized: true,
                activeGame: null,
                isInUpsell: true,
            })

            expect(getHubScreenDisplayedEvent()).toBeUndefined()

            rerenderScreenTracking({
                isInitialized: true,
                activeGame: null,
                isInUpsell: false,
            })

            expect(getHubScreenDisplayedEvent()).toBeDefined()

            const sessionStart = getHubSessionStartEvent()
            const screenDisplayed = getHubScreenDisplayedEvent()
            expect(sessionStart!.eventTimestamp).toBeDefined()
            expect(screenDisplayed!.eventTimestamp).toBeDefined()
            expect(sessionStart!.eventTimestamp!.getTime()).toBeLessThan(
                screenDisplayed!.eventTimestamp!.getTime()
            )
        })
    })
})
