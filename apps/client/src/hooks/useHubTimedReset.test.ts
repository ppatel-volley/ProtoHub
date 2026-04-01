import { act, renderHook } from "@testing-library/react"

import { RESET_DELAY, useHubTimedReset } from "./useHubTimedReset"

const mockAppLifecycleEvent = {
    BACKGROUNDING: "BACKGROUNDING",
    FOREGROUNDED: "FOREGROUNDED",
}

// Allow tests to control current lifecycle state seen by the hook
let mockCurrentState: string = mockAppLifecycleEvent.FOREGROUNDED

jest.mock("@volley/platform-sdk/lib", () => ({
    AppLifecycleEvent: {
        BACKGROUNDING: "BACKGROUNDING",
        FOREGROUNDED: "FOREGROUNDED",
    },
}))

jest.mock("@volley/platform-sdk/react", () => ({
    useAppLifecycle: (): { currentState: string } => ({
        currentState: mockCurrentState,
    }),
}))

jest.mock("../utils/logger", () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}))

describe("useHubTimedReset", () => {
    beforeEach(() => {
        jest.useFakeTimers()
        jest.clearAllMocks()
        mockCurrentState = mockAppLifecycleEvent.FOREGROUNDED
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    it("calls onTimedReset after delay if app remains backgrounded", () => {
        const onTimedReset = jest.fn()

        const { rerender } = renderHook(() => useHubTimedReset(onTimedReset))

        mockCurrentState = mockAppLifecycleEvent.BACKGROUNDING
        rerender()

        act(() => {
            jest.advanceTimersByTime(RESET_DELAY - 1)
        })
        expect(onTimedReset).not.toHaveBeenCalled()

        act(() => {
            jest.advanceTimersByTime(1)
        })
        expect(onTimedReset).toHaveBeenCalledTimes(1)
    })

    it("clears timer when app is foregrounded before delay", () => {
        const onTimedReset = jest.fn()

        const { rerender, result } = renderHook(() =>
            useHubTimedReset(onTimedReset)
        )

        mockCurrentState = mockAppLifecycleEvent.BACKGROUNDING
        rerender()

        act(() => {
            jest.advanceTimersByTime(Math.floor(RESET_DELAY / 2))
        })

        mockCurrentState = mockAppLifecycleEvent.FOREGROUNDED
        rerender()

        act(() => {
            jest.advanceTimersByTime(RESET_DELAY)
        })

        expect(onTimedReset).not.toHaveBeenCalled()
        rerender()
        expect(result.current).toBeNull()
    })
})
