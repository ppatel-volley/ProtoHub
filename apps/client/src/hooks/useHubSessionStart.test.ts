import { renderHook } from "@testing-library/react"

import { type Deeplink } from "../config/deeplink"
import {
    HUB_SESSION_START_DELAY_MS,
    HUB_SESSION_START_TIMESTAMP_OFFSET_MS,
    useHubSessionStart,
} from "./useHubSessionStart"

jest.mock("../utils/logger", () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
    },
}))

jest.mock("./useHubTracking", () => ({
    useHubTracking: jest.fn(),
}))

jest.mock("./useIsJeopardyReload", () => ({
    useIsJeopardyReload: jest.fn(),
}))

jest.mock("@volley/platform-sdk/react", () => ({
    useDeviceInfo: jest.fn(),
}))

jest.mock("../config/platformDetection", () => ({
    isFireTV: jest.fn(),
    isMobile: jest.fn(),
}))

const mockSessionStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
}
Object.defineProperty(window, "sessionStorage", {
    value: mockSessionStorage,
})

const mockUseHubTracking = require("./useHubTracking").useHubTracking
const mockUseDeviceInfo = require("@volley/platform-sdk/react").useDeviceInfo
const mockUseIsJeopardyReload =
    require("./useIsJeopardyReload").useIsJeopardyReload
const mockIsFireTV = require("../config/platformDetection").isFireTV
const mockIsMobile = require("../config/platformDetection").isMobile

describe("useHubSessionStart", () => {
    const mockTrack = jest.fn()
    const mockIdentify = jest.fn()
    const mockGetAdId = jest.fn()
    const mockGetInputDeviceSources = jest.fn()
    const mockDate = new Date("2024-01-01T12:00:00.000Z")
    const mockNow = mockDate.getTime()
    const expectedTimestamp = new Date(
        mockNow - HUB_SESSION_START_TIMESTAMP_OFFSET_MS
    )

    beforeEach(() => {
        jest.clearAllMocks()
        jest.useFakeTimers()

        jest.spyOn(Date, "now").mockReturnValue(mockNow)

        mockUseHubTracking.mockReturnValue({
            track: mockTrack,
            identify: mockIdentify,
        })
        mockUseDeviceInfo.mockReturnValue({
            getAdId: mockGetAdId,
            getInputDeviceSources: mockGetInputDeviceSources,
        })
        mockGetInputDeviceSources.mockResolvedValue({ devices: {} })
        mockSessionStorage.getItem.mockReturnValue(null)
        mockUseIsJeopardyReload.mockReturnValue([false, jest.fn()])
        mockIsFireTV.mockReturnValue(true)
        mockIsMobile.mockReturnValue(false)
    })

    afterEach(() => {
        jest.restoreAllMocks()
        jest.useRealTimers()
    })

    it("should not track when platformReady is false", () => {
        renderHook(() => useHubSessionStart(undefined, false, false))

        jest.advanceTimersByTime(HUB_SESSION_START_DELAY_MS)
        expect(mockTrack).not.toHaveBeenCalled()
    })

    it("should track session start with advertising ID and timestamp when available", async () => {
        mockGetAdId.mockReturnValue({
            advertisingId: "test-advertising-id-123",
        })

        const { rerender } = renderHook(
            ({ platformReady }) =>
                useHubSessionStart(undefined, false, platformReady),
            {
                initialProps: { platformReady: false },
            }
        )

        expect(mockTrack).not.toHaveBeenCalled()

        rerender({ platformReady: true })

        expect(mockTrack).not.toHaveBeenCalled()

        jest.advanceTimersByTime(HUB_SESSION_START_DELAY_MS)

        await jest.runOnlyPendingTimersAsync()

        expect(mockTrack).toHaveBeenCalledWith(
            "Hub Session Start",
            {
                advertisingId: "test-advertising-id-123",
                attributionId: null,
                attributionType: null,
                hasHardwareVoiceRemote: false,
            },
            expectedTimestamp
        )
        expect(mockTrack).toHaveBeenCalledTimes(1)
    })

    it("should track session start with null and timestamp when advertising ID is null", async () => {
        mockGetAdId.mockReturnValue(null)

        renderHook(() => useHubSessionStart(undefined, false, true))

        jest.advanceTimersByTime(HUB_SESSION_START_DELAY_MS)

        await jest.runOnlyPendingTimersAsync()

        expect(mockTrack).toHaveBeenCalledWith(
            "Hub Session Start",
            {
                advertisingId: null,
                attributionId: null,
                attributionType: null,
                hasHardwareVoiceRemote: false,
            },
            expectedTimestamp
        )
        expect(mockTrack).toHaveBeenCalledTimes(1)
    })

    it("should track session start with null and timestamp when advertising ID is undefined", async () => {
        mockGetAdId.mockReturnValue(undefined)

        renderHook(() => useHubSessionStart(undefined, false, true))

        jest.advanceTimersByTime(HUB_SESSION_START_DELAY_MS)

        await jest.runOnlyPendingTimersAsync()

        expect(mockTrack).toHaveBeenCalledWith(
            "Hub Session Start",
            {
                advertisingId: null,
                attributionId: null,
                attributionType: null,
                hasHardwareVoiceRemote: false,
            },
            expectedTimestamp
        )
        expect(mockTrack).toHaveBeenCalledTimes(1)
    })

    it("should track session start with null and timestamp when getAdId returns object without advertisingId", async () => {
        mockGetAdId.mockReturnValue({ someOtherProperty: "value" })

        renderHook(() => useHubSessionStart(undefined, false, true))

        jest.advanceTimersByTime(HUB_SESSION_START_DELAY_MS)

        await jest.runOnlyPendingTimersAsync()

        expect(mockTrack).toHaveBeenCalledWith(
            "Hub Session Start",
            {
                advertisingId: null,
                attributionId: null,
                attributionType: null,
                hasHardwareVoiceRemote: false,
            },
            expectedTimestamp
        )
        expect(mockTrack).toHaveBeenCalledTimes(1)
    })

    it("should track after delay if identified is true on first render", async () => {
        mockGetAdId.mockReturnValue({
            advertisingId: "test-advertising-id-456",
        })

        renderHook(() => useHubSessionStart(undefined, false, true))

        expect(mockTrack).not.toHaveBeenCalled()

        jest.advanceTimersByTime(HUB_SESSION_START_DELAY_MS)

        await jest.runOnlyPendingTimersAsync()

        expect(mockTrack).toHaveBeenCalledWith(
            "Hub Session Start",
            {
                advertisingId: "test-advertising-id-456",
                attributionId: null,
                attributionType: null,
                hasHardwareVoiceRemote: false,
            },
            expectedTimestamp
        )
        expect(mockTrack).toHaveBeenCalledTimes(1)
    })

    it("should only track once even with multiple renders when identified is true", async () => {
        mockGetAdId.mockReturnValue({
            advertisingId: "test-advertising-id-789",
        })

        const { rerender } = renderHook(
            ({ platformReady }) =>
                useHubSessionStart(undefined, false, platformReady),
            {
                initialProps: { platformReady: true },
            }
        )

        jest.advanceTimersByTime(HUB_SESSION_START_DELAY_MS)

        await jest.runOnlyPendingTimersAsync()

        expect(mockTrack).toHaveBeenCalledTimes(1)

        rerender({ platformReady: true })
        rerender({ platformReady: true })
        rerender({ platformReady: true })

        jest.advanceTimersByTime(HUB_SESSION_START_DELAY_MS)

        await jest.runOnlyPendingTimersAsync()

        expect(mockTrack).toHaveBeenCalledTimes(1)
    })

    it("should not track again if identified changes from true to false to true", async () => {
        mockGetAdId.mockReturnValue({
            advertisingId: "test-advertising-id-101",
        })

        const { rerender } = renderHook(
            ({ platformReady }) =>
                useHubSessionStart(undefined, false, platformReady),
            {
                initialProps: { platformReady: true },
            }
        )

        jest.advanceTimersByTime(HUB_SESSION_START_DELAY_MS)

        await jest.runOnlyPendingTimersAsync()

        expect(mockTrack).toHaveBeenCalledTimes(1)

        rerender({ platformReady: false })
        rerender({ platformReady: true })

        jest.advanceTimersByTime(HUB_SESSION_START_DELAY_MS)

        await jest.runOnlyPendingTimersAsync()

        expect(mockTrack).toHaveBeenCalledTimes(1)
    })

    it("should handle tracking errors and allow retry", async () => {
        mockGetAdId.mockReturnValue({
            advertisingId: "test-advertising-id-202",
        })
        const mockError = new Error("Tracking failed")
        mockTrack.mockImplementationOnce(() => {
            throw mockError
        })

        const { rerender } = renderHook(
            ({ platformReady }) =>
                useHubSessionStart(undefined, false, platformReady),
            {
                initialProps: { platformReady: false },
            }
        )

        rerender({ platformReady: true })
        jest.advanceTimersByTime(HUB_SESSION_START_DELAY_MS)

        await jest.runOnlyPendingTimersAsync()

        expect(mockTrack).toHaveBeenCalledTimes(1)

        mockTrack.mockReset()

        rerender({ platformReady: false })
        rerender({ platformReady: true })
        jest.advanceTimersByTime(HUB_SESSION_START_DELAY_MS)

        await jest.runOnlyPendingTimersAsync()

        expect(mockTrack).toHaveBeenCalledWith(
            "Hub Session Start",
            {
                advertisingId: "test-advertising-id-202",
                attributionId: null,
                attributionType: null,
                hasHardwareVoiceRemote: false,
            },
            expectedTimestamp
        )
        expect(mockTrack).toHaveBeenCalledTimes(1)
    })

    it("should call deviceInfo.getAdId() when tracking", async () => {
        mockGetAdId.mockReturnValue({
            advertisingId: "test-advertising-id-303",
        })

        renderHook(() => useHubSessionStart(undefined, false, true))
        jest.advanceTimersByTime(HUB_SESSION_START_DELAY_MS)

        await jest.runOnlyPendingTimersAsync()

        expect(mockGetAdId).toHaveBeenCalledTimes(1)
        expect(mockTrack).toHaveBeenCalledWith(
            "Hub Session Start",
            {
                advertisingId: "test-advertising-id-303",
                attributionId: null,
                attributionType: null,
                hasHardwareVoiceRemote: false,
            },
            expectedTimestamp
        )
    })

    it("should not track when useIsJeopardyReload returns true", () => {
        mockUseIsJeopardyReload.mockReturnValue(true)
        mockGetAdId.mockReturnValue({
            advertisingId: "test-advertising-id-404",
        })

        renderHook(() => useHubSessionStart(undefined, true, true))
        jest.advanceTimersByTime(HUB_SESSION_START_DELAY_MS)

        expect(mockTrack).not.toHaveBeenCalled()
    })

    it("should create timestamp before delay, not when tracking executes", async () => {
        const firstMockNow = new Date("2024-01-01T12:00:00.000Z").getTime()
        const secondMockNow = new Date("2024-01-01T12:01:00.000Z").getTime()
        const expectedTimestampFromFirst = new Date(
            firstMockNow - HUB_SESSION_START_TIMESTAMP_OFFSET_MS
        )

        jest.spyOn(Date, "now")
            .mockReturnValueOnce(firstMockNow)
            .mockReturnValueOnce(secondMockNow)

        mockGetAdId.mockReturnValue({
            advertisingId: "test-advertising-id-timestamp",
        })

        renderHook(() => useHubSessionStart(undefined, false, true))

        jest.advanceTimersByTime(HUB_SESSION_START_DELAY_MS)

        await jest.runOnlyPendingTimersAsync()

        expect(mockTrack).toHaveBeenCalledWith(
            "Hub Session Start",
            {
                advertisingId: "test-advertising-id-timestamp",
                attributionId: null,
                attributionType: null,
                hasHardwareVoiceRemote: false,
            },
            expectedTimestampFromFirst
        )
    })

    it("should track with deeplink attribution when deeplink is provided", async () => {
        mockGetAdId.mockReturnValue({
            advertisingId: "test-advertising-id-deeplink",
        })

        const deeplink: Deeplink = {
            gameId: "jeopardy",
            campaignId: "summer2024",
        }

        renderHook(() => useHubSessionStart(deeplink, false, true))

        jest.advanceTimersByTime(HUB_SESSION_START_DELAY_MS)

        await jest.runOnlyPendingTimersAsync()

        expect(mockTrack).toHaveBeenCalledWith(
            "Hub Session Start",
            {
                advertisingId: "test-advertising-id-deeplink",
                attributionId: "summer2024",
                attributionType: "deeplink",
                hasHardwareVoiceRemote: false,
            },
            expectedTimestamp
        )
        expect(mockTrack).toHaveBeenCalledTimes(1)
    })

    it("should update attribution when deeplink changes", async () => {
        mockGetAdId.mockReturnValue({
            advertisingId: "test-advertising-id-changes",
        })

        const initialDeeplink: Deeplink = {
            gameId: "jeopardy",
            campaignId: "campaign1",
        }

        const { rerender } = renderHook(
            ({ deeplink }) => useHubSessionStart(deeplink, false, true),
            {
                initialProps: { deeplink: initialDeeplink },
            }
        )

        jest.advanceTimersByTime(HUB_SESSION_START_DELAY_MS)

        await jest.runOnlyPendingTimersAsync()

        expect(mockTrack).toHaveBeenCalledWith(
            "Hub Session Start",
            {
                advertisingId: "test-advertising-id-changes",
                attributionId: "campaign1",
                attributionType: "deeplink",
                hasHardwareVoiceRemote: false,
            },
            expectedTimestamp
        )
        expect(mockTrack).toHaveBeenCalledTimes(1)

        mockTrack.mockReset()

        const newDeeplink: Deeplink = {
            gameId: "song-quiz",
            campaignId: "campaign2",
        }

        rerender({ deeplink: newDeeplink })

        jest.advanceTimersByTime(HUB_SESSION_START_DELAY_MS)

        expect(mockTrack).not.toHaveBeenCalled()
    })

    it("should track with undefined deeplink", async () => {
        mockGetAdId.mockReturnValue({
            advertisingId: "test-advertising-id-undefined",
        })

        renderHook(() => useHubSessionStart(undefined, false, true))

        jest.advanceTimersByTime(HUB_SESSION_START_DELAY_MS)

        await jest.runOnlyPendingTimersAsync()

        expect(mockTrack).toHaveBeenCalledWith(
            "Hub Session Start",
            {
                advertisingId: "test-advertising-id-undefined",
                attributionId: null,
                attributionType: null,
                hasHardwareVoiceRemote: false,
            },
            expectedTimestamp
        )
        expect(mockTrack).toHaveBeenCalledTimes(1)
    })
})
