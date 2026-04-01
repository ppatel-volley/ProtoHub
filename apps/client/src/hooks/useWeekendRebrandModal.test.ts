import { act, renderHook } from "@testing-library/react"

import type { GameLauncher } from "./useGameLauncher"
import { useWeekendRebrandModal } from "./useWeekendRebrandModal"

const mockIsMobile = jest.fn()
jest.mock("../config/platformDetection", () => ({
    isMobile: (): boolean => mockIsMobile(),
}))

const mockIsSubscribed = jest.fn()
jest.mock("./useIsSubscribed", () => ({
    useIsSubscribed: (): boolean => mockIsSubscribed(),
}))

const mockGetExperimentManager = jest.fn()
jest.mock("../experiments/ExperimentManager", () => ({
    getExperimentManager: (): { getVariant: jest.Mock } =>
        mockGetExperimentManager(),
}))

jest.mock("../experiments/experimentSchemata", () => ({
    ExperimentFlag: {
        WeekendRebrandInformationalModal: "weekend-rebrand-informational-modal",
    },
}))

jest.mock("../utils/logger", () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}))

const mockTrackButtonPress = jest.fn()
jest.mock("./useWeekendRebrandModalTracking", () => ({
    useWeekendRebrandModalTracking: (): {
        screenDisplayedId: string | null
        trackButtonPress: jest.Mock
    } => ({
        screenDisplayedId: "weekend-screen-id",
        trackButtonPress: mockTrackButtonPress,
    }),
}))

const localStorageMock = ((): {
    getItem: jest.Mock
    setItem: jest.Mock
    removeItem: jest.Mock
    clear: jest.Mock
} => {
    let store: Record<string, string> = {}
    return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => {
            store[key] = value
        }),
        removeItem: jest.fn((key: string) => {
            delete store[key]
        }),
        clear: jest.fn(() => {
            store = {}
        }),
    }
})()

Object.defineProperty(window, "localStorage", { value: localStorageMock })

describe("useWeekendRebrandModal", () => {
    const now = new Date("2026-02-15T12:00:00-08:00").getTime()

    const mockGameLauncher = {
        isGameLaunching: false,
    } as unknown as GameLauncher

    beforeEach(() => {
        jest.clearAllMocks()
        localStorageMock.clear()
        jest.spyOn(Date, "now").mockReturnValue(now)

        mockIsMobile.mockReturnValue(false)
        mockIsSubscribed.mockReturnValue(false)
        mockGetExperimentManager.mockReturnValue({
            getVariant: jest.fn().mockReturnValue(undefined),
        })
        ;(mockGameLauncher as { isGameLaunching: boolean }).isGameLaunching =
            false

        jest.resetModules()
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    const defaultProps = {
        isInitialized: true,
        isInUpsell: false,
        activeGame: null,
        gameLauncher: mockGameLauncher,
    }

    it("should not show modal when not initialized", () => {
        mockIsSubscribed.mockReturnValue(true)
        mockGetExperimentManager.mockReturnValue({
            getVariant: jest.fn().mockReturnValue({ value: "treatment" }),
        })

        const { result } = renderHook(() =>
            useWeekendRebrandModal({ ...defaultProps, isInitialized: false })
        )

        expect(result.current.showWeekendRebrandModal).toBe(false)
    })

    it("should not show modal on mobile platform", () => {
        mockIsMobile.mockReturnValue(true)
        mockIsSubscribed.mockReturnValue(true)
        mockGetExperimentManager.mockReturnValue({
            getVariant: jest.fn().mockReturnValue({ value: "treatment" }),
        })

        const { result } = renderHook(() =>
            useWeekendRebrandModal(defaultProps)
        )

        expect(result.current.showWeekendRebrandModal).toBe(false)
    })

    it("should not show modal when user is not subscribed", () => {
        mockIsSubscribed.mockReturnValue(false)
        mockGetExperimentManager.mockReturnValue({
            getVariant: jest.fn().mockReturnValue({ value: "treatment" }),
        })

        const { result } = renderHook(() =>
            useWeekendRebrandModal(defaultProps)
        )

        expect(result.current.showWeekendRebrandModal).toBe(false)
    })

    it("should not show modal when experiment is control", () => {
        mockIsSubscribed.mockReturnValue(true)
        mockGetExperimentManager.mockReturnValue({
            getVariant: jest.fn().mockReturnValue({ value: "control" }),
        })

        const { result } = renderHook(() =>
            useWeekendRebrandModal(defaultProps)
        )

        expect(result.current.showWeekendRebrandModal).toBe(false)
    })

    it("should not show modal when experiment is not present", () => {
        mockIsSubscribed.mockReturnValue(true)
        mockGetExperimentManager.mockReturnValue({
            getVariant: jest.fn().mockReturnValue(undefined),
        })

        const { result } = renderHook(() =>
            useWeekendRebrandModal(defaultProps)
        )

        expect(result.current.showWeekendRebrandModal).toBe(false)
    })

    it("should show modal when all conditions are met", () => {
        localStorageMock.getItem.mockReturnValue(null)
        mockIsSubscribed.mockReturnValue(true)
        mockGetExperimentManager.mockReturnValue({
            getVariant: jest.fn().mockReturnValue({ value: "treatment" }),
        })

        const { result } = renderHook(() =>
            useWeekendRebrandModal(defaultProps)
        )

        expect(result.current.showWeekendRebrandModal).toBe(true)
    })

    it("should not show modal when in upsell", () => {
        localStorageMock.getItem.mockReturnValue(null)
        mockIsSubscribed.mockReturnValue(true)
        mockGetExperimentManager.mockReturnValue({
            getVariant: jest.fn().mockReturnValue({ value: "treatment" }),
        })

        const { result } = renderHook(() =>
            useWeekendRebrandModal({ ...defaultProps, isInUpsell: true })
        )

        expect(result.current.showWeekendRebrandModal).toBe(false)
    })

    it("should not show modal when game is active", () => {
        localStorageMock.getItem.mockReturnValue(null)
        mockIsSubscribed.mockReturnValue(true)
        mockGetExperimentManager.mockReturnValue({
            getVariant: jest.fn().mockReturnValue({ value: "treatment" }),
        })

        const { result } = renderHook(() =>
            useWeekendRebrandModal({
                ...defaultProps,
                activeGame: { id: "jeopardy" } as never,
            })
        )

        expect(result.current.showWeekendRebrandModal).toBe(false)
    })

    it("should not show modal when game is launching", () => {
        localStorageMock.getItem.mockReturnValue(null)
        mockIsSubscribed.mockReturnValue(true)
        mockGetExperimentManager.mockReturnValue({
            getVariant: jest.fn().mockReturnValue({ value: "treatment" }),
        })
        ;(mockGameLauncher as { isGameLaunching: boolean }).isGameLaunching =
            true

        const { result } = renderHook(() =>
            useWeekendRebrandModal(defaultProps)
        )

        expect(result.current.showWeekendRebrandModal).toBe(false)
    })

    it("should not show modal if already acknowledged", () => {
        localStorageMock.getItem.mockImplementation((key: string) => {
            if (key === "hub_weekend_rebrand_acknowledged") return "true"
            return null
        })
        mockIsSubscribed.mockReturnValue(true)
        mockGetExperimentManager.mockReturnValue({
            getVariant: jest.fn().mockReturnValue({ value: "treatment" }),
        })

        const { result } = renderHook(() =>
            useWeekendRebrandModal(defaultProps)
        )

        expect(result.current.showWeekendRebrandModal).toBe(false)
    })

    it("should close modal and save acknowledgement when handleAcknowledge is called", () => {
        localStorageMock.getItem.mockReturnValue(null)
        mockIsSubscribed.mockReturnValue(true)
        mockGetExperimentManager.mockReturnValue({
            getVariant: jest.fn().mockReturnValue({ value: "treatment" }),
        })

        const { result } = renderHook(() =>
            useWeekendRebrandModal(defaultProps)
        )

        expect(result.current.showWeekendRebrandModal).toBe(true)

        act(() => {
            result.current.handleAcknowledge()
        })

        expect(result.current.showWeekendRebrandModal).toBe(false)
        expect(mockTrackButtonPress).toHaveBeenCalled()
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
            "hub_weekend_rebrand_acknowledged",
            "true"
        )
    })

    it("should close modal on back button", () => {
        localStorageMock.getItem.mockReturnValue(null)
        mockIsSubscribed.mockReturnValue(true)
        mockGetExperimentManager.mockReturnValue({
            getVariant: jest.fn().mockReturnValue({ value: "treatment" }),
        })

        const { result } = renderHook(() =>
            useWeekendRebrandModal(defaultProps)
        )

        expect(result.current.showWeekendRebrandModal).toBe(true)

        act(() => {
            result.current.handleBackButtonInWeekendRebrandModal()
        })

        expect(result.current.showWeekendRebrandModal).toBe(false)
        expect(mockTrackButtonPress).toHaveBeenCalled()
    })

    it("should provide a ref that tracks showWeekendRebrandModal state", () => {
        localStorageMock.getItem.mockReturnValue(null)
        mockIsSubscribed.mockReturnValue(true)
        mockGetExperimentManager.mockReturnValue({
            getVariant: jest.fn().mockReturnValue({ value: "treatment" }),
        })

        const { result } = renderHook(() =>
            useWeekendRebrandModal(defaultProps)
        )

        expect(result.current.showWeekendRebrandModalRef.current).toBe(true)

        act(() => {
            result.current.handleAcknowledge()
        })

        expect(result.current.showWeekendRebrandModalRef.current).toBe(false)
    })

    it("should show modal again if showAgain is true in payload", () => {
        localStorageMock.getItem.mockImplementation((key: string) => {
            if (key === "hub_weekend_rebrand_acknowledged") return "true"
            return null
        })
        mockIsSubscribed.mockReturnValue(true)
        mockGetExperimentManager.mockReturnValue({
            getVariant: jest.fn().mockReturnValue({
                value: "treatment",
                payload: {
                    "hub-modal-display": {
                        showAgain: true,
                    },
                },
            }),
        })

        const { result } = renderHook(() =>
            useWeekendRebrandModal(defaultProps)
        )

        expect(result.current.showWeekendRebrandModal).toBe(true)
    })

    it("should not show modal before start date", () => {
        const beforeStart = new Date("2026-02-10T12:00:00-08:00").getTime()
        jest.spyOn(Date, "now").mockReturnValue(beforeStart)

        localStorageMock.getItem.mockReturnValue(null)
        mockIsSubscribed.mockReturnValue(true)
        mockGetExperimentManager.mockReturnValue({
            getVariant: jest.fn().mockReturnValue({ value: "treatment" }),
        })

        const { result } = renderHook(() =>
            useWeekendRebrandModal(defaultProps)
        )

        expect(result.current.showWeekendRebrandModal).toBe(false)
    })

    it("should not show modal after end date", () => {
        const afterEnd = new Date("2026-02-25T12:00:00-08:00").getTime()
        jest.spyOn(Date, "now").mockReturnValue(afterEnd)

        localStorageMock.getItem.mockReturnValue(null)
        mockIsSubscribed.mockReturnValue(true)
        mockGetExperimentManager.mockReturnValue({
            getVariant: jest.fn().mockReturnValue({ value: "treatment" }),
        })

        const { result } = renderHook(() =>
            useWeekendRebrandModal(defaultProps)
        )

        expect(result.current.showWeekendRebrandModal).toBe(false)
    })

    it("should use custom dates from payload", () => {
        const customStart = new Date("2026-01-01T00:00:00-08:00").getTime()
        const customEnd = new Date("2026-01-31T00:00:00-08:00").getTime()
        const duringCustomWindow = new Date(
            "2026-01-15T12:00:00-08:00"
        ).getTime()
        jest.spyOn(Date, "now").mockReturnValue(duringCustomWindow)

        localStorageMock.getItem.mockReturnValue(null)
        mockIsSubscribed.mockReturnValue(true)
        mockGetExperimentManager.mockReturnValue({
            getVariant: jest.fn().mockReturnValue({
                value: "treatment",
                payload: {
                    "hub-modal-display": {
                        startEpochMs: customStart,
                        endEpochMs: customEnd,
                    },
                },
            }),
        })

        const { result } = renderHook(() =>
            useWeekendRebrandModal(defaultProps)
        )

        expect(result.current.showWeekendRebrandModal).toBe(true)
    })

    it("should show modal when user subscribes and returns to hub", () => {
        localStorageMock.getItem.mockReturnValue(null)
        mockIsSubscribed.mockReturnValue(false)
        mockGetExperimentManager.mockReturnValue({
            getVariant: jest.fn().mockReturnValue({ value: "treatment" }),
        })

        const { result, rerender } = renderHook(
            (props) => useWeekendRebrandModal(props),
            { initialProps: defaultProps }
        )

        expect(result.current.showWeekendRebrandModal).toBe(false)

        mockIsSubscribed.mockReturnValue(true)
        rerender(defaultProps)

        expect(result.current.showWeekendRebrandModal).toBe(true)
    })

    it("should show modal when user returns from game after subscribing", () => {
        localStorageMock.getItem.mockReturnValue(null)
        mockIsSubscribed.mockReturnValue(false)
        mockGetExperimentManager.mockReturnValue({
            getVariant: jest.fn().mockReturnValue({ value: "treatment" }),
        })

        const { result, rerender } = renderHook(
            (props) => useWeekendRebrandModal(props),
            { initialProps: defaultProps }
        )

        expect(result.current.showWeekendRebrandModal).toBe(false)

        rerender({ ...defaultProps, activeGame: { id: "jeopardy" } as never })
        expect(result.current.showWeekendRebrandModal).toBe(false)

        mockIsSubscribed.mockReturnValue(true)
        rerender({ ...defaultProps, activeGame: null })

        expect(result.current.showWeekendRebrandModal).toBe(true)
    })

    it("should show modal when user returns from upsell after subscribing", () => {
        localStorageMock.getItem.mockReturnValue(null)
        mockIsSubscribed.mockReturnValue(false)
        mockGetExperimentManager.mockReturnValue({
            getVariant: jest.fn().mockReturnValue({ value: "treatment" }),
        })

        const { result, rerender } = renderHook(
            (props) => useWeekendRebrandModal(props),
            { initialProps: { ...defaultProps, isInUpsell: true } }
        )

        expect(result.current.showWeekendRebrandModal).toBe(false)

        mockIsSubscribed.mockReturnValue(true)
        rerender({ ...defaultProps, isInUpsell: false })

        expect(result.current.showWeekendRebrandModal).toBe(true)
    })

    it("should not re-show modal after user acknowledges and re-enters hub", () => {
        localStorageMock.getItem.mockReturnValue(null)
        mockIsSubscribed.mockReturnValue(true)
        mockGetExperimentManager.mockReturnValue({
            getVariant: jest.fn().mockReturnValue({ value: "treatment" }),
        })

        const { result, rerender } = renderHook(
            (props) => useWeekendRebrandModal(props),
            { initialProps: defaultProps }
        )

        expect(result.current.showWeekendRebrandModal).toBe(true)

        act(() => {
            result.current.handleAcknowledge()
        })
        expect(result.current.showWeekendRebrandModal).toBe(false)

        rerender({ ...defaultProps, activeGame: { id: "jeopardy" } as never })
        rerender({ ...defaultProps, activeGame: null })

        expect(result.current.showWeekendRebrandModal).toBe(false)
    })
})
