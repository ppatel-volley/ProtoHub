import { act, renderHook } from "@testing-library/react"

import { useQrLoadWatchdog } from "./useQrLoadWatchdog"

jest.mock("../utils/logger", () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}))

jest.mock("@datadog/browser-rum", () => ({
    datadogRum: {
        init: jest.fn(),
        addAction: jest.fn(),
        addTiming: jest.fn(),
        setGlobalContextProperty: jest.fn(),
    },
}))

jest.mock("@datadog/browser-logs", () => ({
    datadogLogs: {
        init: jest.fn(),
        setGlobalContextProperty: jest.fn(),
        logger: {
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            debug: jest.fn(),
        },
    },
}))

jest.mock("@volley/platform-sdk/lib", () => ({
    getPlatform: (): string => "web",
}))

describe("useQrLoadWatchdog", () => {
    beforeEach(() => {
        jest.useFakeTimers()
        jest.clearAllMocks()
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    it("starts timer when isOpen becomes true", () => {
        const retry = jest.fn()

        renderHook(() =>
            useQrLoadWatchdog({
                isOpen: true,
                retry,
                timeoutMs: 5000,
            })
        )

        expect(retry).not.toHaveBeenCalled()

        act(() => {
            jest.advanceTimersByTime(5000)
        })

        expect(retry).toHaveBeenCalledTimes(1)
    })

    it("cancels timer when wrappedOnQrRendered fires before timeout", () => {
        const retry = jest.fn()
        const onQrRendered = jest.fn()

        const { result } = renderHook(() =>
            useQrLoadWatchdog({
                isOpen: true,
                onQrRendered,
                retry,
                timeoutMs: 5000,
            })
        )

        act(() => {
            jest.advanceTimersByTime(2000)
        })

        act(() => {
            result.current.wrappedOnQrRendered()
        })

        expect(onQrRendered).toHaveBeenCalledTimes(1)

        act(() => {
            jest.advanceTimersByTime(10000)
        })

        expect(retry).not.toHaveBeenCalled()
    })

    it("calls retry on timeout", () => {
        const retry = jest.fn()

        renderHook(() =>
            useQrLoadWatchdog({
                isOpen: true,
                retry,
                timeoutMs: 5000,
                maxRetries: 3,
            })
        )

        act(() => {
            jest.advanceTimersByTime(5000)
        })

        expect(retry).toHaveBeenCalledTimes(1)
    })

    it("stops retrying after maxRetries", () => {
        const retry = jest.fn()

        renderHook(() =>
            useQrLoadWatchdog({
                isOpen: true,
                retry,
                timeoutMs: 1000,
                maxRetries: 2,
            })
        )

        // First timeout → retry #1
        act(() => {
            jest.advanceTimersByTime(1000)
        })
        expect(retry).toHaveBeenCalledTimes(1)

        // Second timeout → retry #2
        act(() => {
            jest.advanceTimersByTime(1000)
        })
        expect(retry).toHaveBeenCalledTimes(2)

        // Third timeout would exceed maxRetries — no more retries
        act(() => {
            jest.advanceTimersByTime(5000)
        })
        expect(retry).toHaveBeenCalledTimes(2)
    })

    it("resets retry count when modal closes and reopens", () => {
        const retry = jest.fn()

        const { rerender } = renderHook(
            ({ isOpen }) =>
                useQrLoadWatchdog({
                    isOpen,
                    retry,
                    timeoutMs: 1000,
                    maxRetries: 1,
                }),
            { initialProps: { isOpen: true } }
        )

        // Exhaust the single retry
        act(() => {
            jest.advanceTimersByTime(1000)
        })
        expect(retry).toHaveBeenCalledTimes(1)

        // Close modal
        rerender({ isOpen: false })

        // Reopen — should get fresh retries
        rerender({ isOpen: true })

        act(() => {
            jest.advanceTimersByTime(1000)
        })
        expect(retry).toHaveBeenCalledTimes(2)
    })

    it("cleans up timer on unmount", () => {
        const retry = jest.fn()

        const { unmount } = renderHook(() =>
            useQrLoadWatchdog({
                isOpen: true,
                retry,
                timeoutMs: 5000,
            })
        )

        unmount()

        act(() => {
            jest.advanceTimersByTime(10000)
        })

        expect(retry).not.toHaveBeenCalled()
    })

    it("does not start timer when isOpen is false", () => {
        const retry = jest.fn()

        renderHook(() =>
            useQrLoadWatchdog({
                isOpen: false,
                retry,
                timeoutMs: 1000,
            })
        )

        act(() => {
            jest.advanceTimersByTime(5000)
        })

        expect(retry).not.toHaveBeenCalled()
    })
})
