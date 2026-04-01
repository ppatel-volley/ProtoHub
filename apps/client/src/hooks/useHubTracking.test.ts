import { renderHook } from "@testing-library/react"

import { useHubTracking } from "./useHubTracking"

jest.mock("@volley/platform-sdk/react", () => ({
    useTracking: jest.fn(),
}))

jest.mock("@volley/tracking/lib", () => ({
    TrackingEventBuilder: jest.fn(),
}))

jest.mock("@volley/tracking/schemas", () => ({
    HUB_EVENT_SCHEMA_MAP: {
        "Hub Screen Displayed": {},
        "Hub Button Pressed": {},
    },
}))

jest.mock("../utils/logger", () => ({
    logger: {
        warn: jest.fn(),
        error: jest.fn(),
    },
}))

const mockUseTracking = require("@volley/platform-sdk/react").useTracking
const MockTrackingEventBuilder =
    require("@volley/tracking/lib").TrackingEventBuilder

describe("useHubTracking", () => {
    const mockTrack = jest.fn()
    const mockIdentify = jest.fn()
    const mockUpdateBaseEventProperties = jest.fn()
    const mockBuild = jest.fn()
    const mockEventBuilder = {
        build: mockBuild,
    }

    beforeEach(() => {
        jest.useFakeTimers()
        jest.clearAllMocks()
        mockUseTracking.mockReturnValue({
            track: mockTrack,
            updateBaseEventProperties: mockUpdateBaseEventProperties,
        })
        MockTrackingEventBuilder.mockImplementation(() => mockEventBuilder)
        mockBuild.mockReturnValue({
            eventName: "test-event",
            properties: { test: "properties" },
        })
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    it("should return a track function", () => {
        const { result } = renderHook(() => useHubTracking())

        expect(result.current).toHaveProperty("track")
        expect(typeof result.current.track).toBe("function")
    })

    it("should load SDK asynchronously (not immediately)", () => {
        renderHook(() => useHubTracking())

        expect(MockTrackingEventBuilder).not.toHaveBeenCalled()
    })

    it("should build and track events correctly without timestamp", async () => {
        const { result } = renderHook(() => useHubTracking())

        const eventName = "Hub Screen Displayed"
        const eventProperties = {
            screenDisplayedId: "test-id",
            displayChoices: ["jeopardy", "song-quiz"],
            eventCategory: "menu" as const,
            eventSubCategory: "game selection",
            text: "",
        }

        const beforeTrack = new Date()
        result.current.track(eventName, eventProperties)
        const afterTrack = new Date()

        await jest.runAllTimersAsync()

        expect(mockBuild).toHaveBeenCalledWith(eventName, eventProperties)
        expect(mockTrack).toHaveBeenCalledWith(
            "test-event",
            { test: "properties" },
            { timestamp: expect.any(Date) }
        )

        const capturedTimestamp = mockTrack.mock.calls[0][2].timestamp
        expect(capturedTimestamp.getTime()).toBeGreaterThanOrEqual(
            beforeTrack.getTime()
        )
        expect(capturedTimestamp.getTime()).toBeLessThanOrEqual(
            afterTrack.getTime()
        )
    })

    it("should build and track events correctly with timestamp", async () => {
        const { result } = renderHook(() => useHubTracking())
        const testTimestamp = new Date("2024-01-01T12:00:00.000Z")

        const eventName = "Hub Screen Displayed"
        const eventProperties = {
            screenDisplayedId: "test-id",
            displayChoices: ["jeopardy", "song-quiz"],
            eventCategory: "menu" as const,
            eventSubCategory: "game selection",
            text: "",
        }

        result.current.track(eventName, eventProperties, testTimestamp)

        await jest.runAllTimersAsync()

        expect(mockBuild).toHaveBeenCalledWith(eventName, eventProperties)
        expect(mockTrack).toHaveBeenCalledWith(
            "test-event",
            { test: "properties" },
            { timestamp: testTimestamp }
        )
    })

    it("should maintain stable references across re-renders", () => {
        const { result, rerender } = renderHook(() => useHubTracking())

        const firstTrackFunction = result.current.track
        const firstReturnObject = result.current

        rerender()

        const secondTrackFunction = result.current.track
        const secondReturnObject = result.current

        expect(firstTrackFunction).toBe(secondTrackFunction)
        expect(firstReturnObject).toBe(secondReturnObject)
    })

    it("should create EventBuilder only once across re-renders", async () => {
        const { result, rerender } = renderHook(() => useHubTracking())

        result.current.track("test", {})

        await jest.runAllTimersAsync()

        const callsAfterFirst = MockTrackingEventBuilder.mock.calls.length

        rerender()
        rerender()
        rerender()

        expect(MockTrackingEventBuilder.mock.calls.length).toBe(callsAfterFirst)
    })

    it("should handle multiple different event types", async () => {
        const { result } = renderHook(() => useHubTracking())

        mockBuild.mockReturnValueOnce({
            eventName: "Hub Screen Displayed",
            properties: { screenDisplayedId: "test-id" },
        })

        result.current.track("Hub Screen Displayed", {
            screenDisplayedId: "test-id",
            displayChoices: ["jeopardy", "song-quiz"],
            eventCategory: "menu" as const,
            eventSubCategory: "game selection",
            text: "",
        })

        await jest.runAllTimersAsync()

        expect(mockBuild).toHaveBeenCalledWith("Hub Screen Displayed", {
            screenDisplayedId: "test-id",
            displayChoices: ["jeopardy", "song-quiz"],
            eventCategory: "menu",
            eventSubCategory: "game selection",
            text: "",
        })
        expect(mockTrack).toHaveBeenCalledWith(
            "Hub Screen Displayed",
            { screenDisplayedId: "test-id" },
            { timestamp: expect.any(Date) }
        )

        mockBuild.mockReturnValueOnce({
            eventName: "Hub Button Pressed",
            properties: { choiceValue: "jeopardy" },
        })

        result.current.track("Hub Button Pressed", {
            choiceValue: "jeopardy",
            eventCategory: "menu" as const,
            eventSubCategory: "game selection",
            screenDisplayedId: "test-id",
            displayChoices: ["jeopardy", "song-quiz"],
            text: "",
        })

        await jest.runAllTimersAsync()

        expect(mockBuild).toHaveBeenCalledWith("Hub Button Pressed", {
            choiceValue: "jeopardy",
            eventCategory: "menu",
            eventSubCategory: "game selection",
            screenDisplayedId: "test-id",
            displayChoices: ["jeopardy", "song-quiz"],
            text: "",
        })
        expect(mockTrack).toHaveBeenCalledWith(
            "Hub Button Pressed",
            { choiceValue: "jeopardy" },
            { timestamp: expect.any(Date) }
        )
    })

    it("should recreate track function when underlying track changes", async () => {
        const { result, rerender } = renderHook(() => useHubTracking())

        const firstTrackFunction = result.current.track

        const newMockTrack = jest.fn()
        mockUseTracking.mockReturnValue({
            track: newMockTrack,
            identify: mockIdentify,
            updateBaseEventProperties: mockUpdateBaseEventProperties,
        })

        rerender()

        const secondTrackFunction = result.current.track

        expect(firstTrackFunction).not.toBe(secondTrackFunction)

        mockBuild.mockReturnValue({
            eventName: "test-event-new",
            properties: { test: "new-properties" },
        })

        result.current.track("Hub Screen Displayed", {
            screenDisplayedId: "test-id",
            displayChoices: ["jeopardy"],
            eventCategory: "menu" as const,
            eventSubCategory: "game selection",
            text: "",
        })

        await jest.runAllTimersAsync()

        expect(newMockTrack).toHaveBeenCalledWith(
            "test-event-new",
            { test: "new-properties" },
            { timestamp: expect.any(Date) }
        )
        expect(mockTrack).not.toHaveBeenCalled()
    })

    describe("updateBaseEventProperties", () => {
        it("should expose updateBaseEventProperties function", () => {
            const { result } = renderHook(() => useHubTracking())

            expect(typeof result.current.updateBaseEventProperties).toBe(
                "function"
            )
        })

        it("should call underlying SDK updateBaseEventProperties with provided object", () => {
            const { result } = renderHook(() => useHubTracking())

            const payload = {
                attributionId: "abc",
                attributionType: "deeplink",
            }
            result.current.updateBaseEventProperties(payload)

            expect(mockUpdateBaseEventProperties).toHaveBeenCalledWith(payload)
            expect(mockUpdateBaseEventProperties).toHaveBeenCalledTimes(1)
        })

        it("should keep stable reference across re-renders", () => {
            const { result, rerender } = renderHook(() => useHubTracking())
            const firstRef = result.current.updateBaseEventProperties

            rerender()

            const secondRef = result.current.updateBaseEventProperties
            expect(firstRef).toBe(secondRef)
        })
    })

    it("should handle timestamp with multiple event types", async () => {
        const { result } = renderHook(() => useHubTracking())
        const testTimestamp1 = new Date("2024-01-01T12:00:00.000Z")
        const testTimestamp2 = new Date("2024-01-01T12:01:00.000Z")

        mockBuild.mockReturnValueOnce({
            eventName: "Hub Screen Displayed",
            properties: { screenDisplayedId: "test-id" },
        })

        result.current.track(
            "Hub Screen Displayed",
            {
                screenDisplayedId: "test-id",
                displayChoices: ["jeopardy", "song-quiz"],
                eventCategory: "menu" as const,
                eventSubCategory: "game selection",
                text: "",
            },
            testTimestamp1
        )

        await jest.runAllTimersAsync()

        expect(mockTrack).toHaveBeenCalledWith(
            "Hub Screen Displayed",
            { screenDisplayedId: "test-id" },
            { timestamp: testTimestamp1 }
        )

        mockBuild.mockReturnValueOnce({
            eventName: "Hub Button Pressed",
            properties: { choiceValue: "jeopardy" },
        })

        result.current.track(
            "Hub Button Pressed",
            {
                choiceValue: "jeopardy",
                eventCategory: "menu" as const,
                eventSubCategory: "game selection",
                screenDisplayedId: "test-id",
                displayChoices: ["jeopardy", "song-quiz"],
                text: "",
            },
            testTimestamp2
        )

        await jest.runAllTimersAsync()

        expect(mockTrack).toHaveBeenCalledWith(
            "Hub Button Pressed",
            { choiceValue: "jeopardy" },
            { timestamp: testTimestamp2 }
        )
    })

    describe("lazy loading behavior", () => {
        it("should load tracking SDK lazily on first track call", async () => {
            const { result } = renderHook(() => useHubTracking())

            expect(MockTrackingEventBuilder).not.toHaveBeenCalled()

            result.current.track("Hub Screen Displayed", {
                screenDisplayedId: "test-id",
                displayChoices: ["jeopardy"],
                eventCategory: "menu" as const,
                eventSubCategory: "game selection",
                text: "",
            })

            await jest.runAllTimersAsync()

            expect(MockTrackingEventBuilder).toHaveBeenCalledWith(
                {
                    "Hub Screen Displayed": {},
                    "Hub Button Pressed": {},
                },
                { throwOnValidationError: false }
            )
        })

        it("should handle multiple track calls before SDK loads", async () => {
            const { result } = renderHook(() => useHubTracking())

            result.current.track("Hub Screen Displayed", {
                screenDisplayedId: "screen-1",
                displayChoices: [],
                eventCategory: "menu" as const,
                eventSubCategory: "game selection",
                text: "",
            })

            result.current.track("Hub Button Pressed", {
                choiceValue: "jeopardy",
                eventCategory: "menu" as const,
                eventSubCategory: "game selection",
                screenDisplayedId: "screen-1",
                displayChoices: [],
                text: "",
            })

            await jest.runAllTimersAsync()

            expect(mockBuild).toHaveBeenCalledTimes(2)
            expect(mockTrack).toHaveBeenCalledTimes(2)
        })

        it("should create TrackingEventBuilder only once despite multiple track calls", async () => {
            const { result } = renderHook(() => useHubTracking())

            result.current.track("test-event-1", {})
            result.current.track("test-event-2", {})
            result.current.track("test-event-3", {})

            await jest.runAllTimersAsync()

            expect(MockTrackingEventBuilder).toHaveBeenCalledTimes(1)
        })
    })

    describe("timestamp preservation", () => {
        it("should preserve original timestamps for queued events during async SDK loading", async () => {
            const { result } = renderHook(() => useHubTracking())

            const timestamp1 = new Date("2024-01-01T10:00:00.000Z")
            const timestamp2 = new Date("2024-01-01T10:01:00.000Z")
            const timestamp3 = new Date("2024-01-01T10:02:00.000Z")

            result.current.track(
                "Hub Screen Displayed",
                {
                    screenDisplayedId: "test-id-1",
                    displayChoices: ["jeopardy"],
                    eventCategory: "menu" as const,
                    eventSubCategory: "game selection",
                    text: "",
                },
                timestamp1
            )

            result.current.track(
                "Hub Button Pressed",
                {
                    choiceValue: "jeopardy",
                    eventCategory: "menu" as const,
                    eventSubCategory: "game selection",
                    screenDisplayedId: "test-id-1",
                    displayChoices: ["jeopardy"],
                    text: "",
                },
                timestamp2
            )

            result.current.track(
                "Hub Screen Displayed",
                {
                    screenDisplayedId: "test-id-2",
                    displayChoices: ["song-quiz"],
                    eventCategory: "menu" as const,
                    eventSubCategory: "game selection",
                    text: "",
                },
                timestamp3
            )

            expect(mockTrack).not.toHaveBeenCalled()

            await jest.runAllTimersAsync()

            expect(mockTrack).toHaveBeenCalledTimes(3)

            expect(mockTrack).toHaveBeenNthCalledWith(
                1,
                "test-event",
                { test: "properties" },
                { timestamp: timestamp1 }
            )

            expect(mockTrack).toHaveBeenNthCalledWith(
                2,
                "test-event",
                { test: "properties" },
                { timestamp: timestamp2 }
            )

            expect(mockTrack).toHaveBeenNthCalledWith(
                3,
                "test-event",
                { test: "properties" },
                { timestamp: timestamp3 }
            )
        })

        it("should preserve timestamps for events sent after SDK is already loaded", async () => {
            const { result } = renderHook(() => useHubTracking())

            result.current.track(
                "initial-event",
                {},
                new Date("2024-01-01T09:00:00.000Z")
            )
            await jest.runAllTimersAsync()

            mockTrack.mockClear()

            const timestamp1 = new Date("2024-01-01T11:00:00.000Z")
            const timestamp2 = new Date("2024-01-01T11:01:00.000Z")

            result.current.track(
                "Hub Screen Displayed",
                {
                    screenDisplayedId: "test-id-1",
                    displayChoices: ["jeopardy"],
                    eventCategory: "menu" as const,
                    eventSubCategory: "game selection",
                    text: "",
                },
                timestamp1
            )

            result.current.track(
                "Hub Button Pressed",
                {
                    choiceValue: "jeopardy",
                    eventCategory: "menu" as const,
                    eventSubCategory: "game selection",
                    screenDisplayedId: "test-id-1",
                    displayChoices: ["jeopardy"],
                    text: "",
                },
                timestamp2
            )

            await jest.runAllTimersAsync()

            expect(mockTrack).toHaveBeenCalledTimes(2)
            expect(mockTrack).toHaveBeenNthCalledWith(
                1,
                "test-event",
                { test: "properties" },
                { timestamp: timestamp1 }
            )
            expect(mockTrack).toHaveBeenNthCalledWith(
                2,
                "test-event",
                { test: "properties" },
                { timestamp: timestamp2 }
            )
        })

        it("should handle mixed timestamp and non-timestamp events correctly", async () => {
            const { result } = renderHook(() => useHubTracking())

            const specificTimestamp = new Date("2024-01-01T12:00:00.000Z")

            const beforeFirstEvent = new Date()
            result.current.track("Hub Screen Displayed", {
                screenDisplayedId: "test-id-1",
                displayChoices: ["jeopardy"],
                eventCategory: "menu" as const,
                eventSubCategory: "game selection",
                text: "",
            })
            const afterFirstEvent = new Date()

            result.current.track(
                "Hub Button Pressed",
                {
                    choiceValue: "jeopardy",
                    eventCategory: "menu" as const,
                    eventSubCategory: "game selection",
                    screenDisplayedId: "test-id-1",
                    displayChoices: ["jeopardy"],
                    text: "",
                },
                specificTimestamp
            )

            const beforeThirdEvent = new Date()
            result.current.track("Hub Screen Displayed", {
                screenDisplayedId: "test-id-2",
                displayChoices: ["song-quiz"],
                eventCategory: "menu" as const,
                eventSubCategory: "game selection",
                text: "",
            })
            const afterThirdEvent = new Date()

            await jest.runAllTimersAsync()

            expect(mockTrack).toHaveBeenCalledTimes(3)

            const firstEventTimestamp = mockTrack.mock.calls[0][2].timestamp
            expect(firstEventTimestamp.getTime()).toBeGreaterThanOrEqual(
                beforeFirstEvent.getTime()
            )
            expect(firstEventTimestamp.getTime()).toBeLessThanOrEqual(
                afterFirstEvent.getTime()
            )

            expect(mockTrack).toHaveBeenNthCalledWith(
                2,
                "test-event",
                { test: "properties" },
                { timestamp: specificTimestamp }
            )

            const thirdEventTimestamp = mockTrack.mock.calls[2][2].timestamp
            expect(thirdEventTimestamp.getTime()).toBeGreaterThanOrEqual(
                beforeThirdEvent.getTime()
            )
            expect(thirdEventTimestamp.getTime()).toBeLessThanOrEqual(
                afterThirdEvent.getTime()
            )
        })

        it("should preserve timestamps across multiple hook instances", async () => {
            const { result: result1 } = renderHook(() => useHubTracking())
            const { result: result2 } = renderHook(() => useHubTracking())

            const timestamp1 = new Date("2024-01-01T10:00:00.000Z")
            const timestamp2 = new Date("2024-01-01T10:01:00.000Z")
            const timestamp3 = new Date("2024-01-01T10:02:00.000Z")

            result1.current.track("event-from-hook-1", {}, timestamp1)
            result2.current.track("event-from-hook-2", {}, timestamp2)
            result1.current.track("event-from-hook-1-again", {}, timestamp3)

            await jest.runAllTimersAsync()

            expect(mockTrack).toHaveBeenCalledTimes(3)
            expect(mockTrack).toHaveBeenNthCalledWith(
                1,
                "test-event",
                { test: "properties" },
                { timestamp: timestamp1 }
            )
            expect(mockTrack).toHaveBeenNthCalledWith(
                2,
                "test-event",
                { test: "properties" },
                { timestamp: timestamp2 }
            )
            expect(mockTrack).toHaveBeenNthCalledWith(
                3,
                "test-event",
                { test: "properties" },
                { timestamp: timestamp3 }
            )
        })

        it("should preserve timestamps even when events are sent rapidly in sequence", async () => {
            const { result } = renderHook(() => useHubTracking())

            const timestamps = [
                new Date("2024-01-01T10:00:00.000Z"),
                new Date("2024-01-01T10:00:00.100Z"),
                new Date("2024-01-01T10:00:00.200Z"),
                new Date("2024-01-01T10:00:00.300Z"),
                new Date("2024-01-01T10:00:00.400Z"),
            ]

            timestamps.forEach((timestamp, index) => {
                result.current.track(
                    "Hub Button Pressed",
                    {
                        choiceValue: `button-${index}`,
                        eventCategory: "menu" as const,
                        eventSubCategory: "game selection",
                        screenDisplayedId: "test-id",
                        displayChoices: ["jeopardy"],
                        text: "",
                    },
                    timestamp
                )
            })

            await jest.runAllTimersAsync()

            expect(mockTrack).toHaveBeenCalledTimes(5)
            timestamps.forEach((timestamp, index) => {
                expect(mockTrack).toHaveBeenNthCalledWith(
                    index + 1,
                    "test-event",
                    { test: "properties" },
                    { timestamp }
                )
            })
        })

        it("should capture timestamp at trigger time during lazy loading to prevent event stream issues", async () => {
            const { result } = renderHook(() => useHubTracking())

            const triggerTime = new Date("2024-01-01T10:00:00.000Z")
            jest.setSystemTime(triggerTime)

            result.current.track("Hub Screen Displayed", {
                screenDisplayedId: "test-id",
                displayChoices: ["jeopardy"],
                eventCategory: "menu" as const,
                eventSubCategory: "game selection",
                text: "",
            })

            const laterTime = new Date("2024-01-01T10:00:05.000Z")
            jest.setSystemTime(laterTime)

            await jest.runAllTimersAsync()

            expect(mockTrack).toHaveBeenCalledTimes(1)
            expect(mockTrack).toHaveBeenCalledWith(
                "test-event",
                { test: "properties" },
                { timestamp: triggerTime }
            )

            jest.useRealTimers()
        })
    })

    describe("error recovery", () => {
        it("should handle SDK load failures gracefully", async () => {
            const { result } = renderHook(() => useHubTracking())

            result.current.track("Hub Screen Displayed", {
                screenDisplayedId: "test-id",
                displayChoices: [],
                eventCategory: "menu" as const,
                eventSubCategory: "game selection",
                text: "",
            })

            await jest.runAllTimersAsync()

            expect(() => {
                result.current.track("Hub Button Pressed", {
                    choiceValue: "test",
                    eventCategory: "menu" as const,
                    eventSubCategory: "game selection",
                    screenDisplayedId: "test-id",
                    displayChoices: [],
                    text: "",
                })
            }).not.toThrow()
        })

        it("should allow multiple tracking calls without errors", async () => {
            const { result } = renderHook(() => useHubTracking())

            expect(() => {
                result.current.track("event-1", {})
                result.current.track("event-2", {})
                result.current.track("event-3", {})
                result.current.track("event-4", {})
                result.current.track("event-5", {})
            }).not.toThrow()

            await jest.runAllTimersAsync()

            expect(mockTrack).toHaveBeenCalledTimes(5)
        })

        it("should maintain queue integrity across multiple hook instances", async () => {
            const { result: result1 } = renderHook(() => useHubTracking())

            result1.current.track("event-from-hook-1", {})

            const { result: result2 } = renderHook(() => useHubTracking())

            result2.current.track("event-from-hook-2", {})

            await jest.runAllTimersAsync()

            expect(mockTrack).toHaveBeenCalledTimes(2)

            expect(MockTrackingEventBuilder).toHaveBeenCalledTimes(2)
        })
    })
})
