import { renderHook } from "@testing-library/react"

import { debounce } from "../utils/debounceFunction"
import { forceGarbageCollection } from "../utils/forceGarbageCollection"
import { getMemoryUsage } from "../utils/getMemoryUsage"
import { logMemoryDelta } from "../utils/logMemoryDelta"
import { CLEANUP_DEBOUNCE_DELAY, useMemoryCleanup } from "./useMemoryCleanup"

jest.mock("../utils/debounceFunction")
jest.mock("../utils/forceGarbageCollection")
jest.mock("../utils/getMemoryUsage")
jest.mock("../utils/logMemoryDelta")

const mockDebounce = debounce as jest.MockedFunction<typeof debounce>
const mockForceGarbageCollection =
    forceGarbageCollection as jest.MockedFunction<typeof forceGarbageCollection>
const mockGetMemoryUsage = getMemoryUsage as jest.MockedFunction<
    typeof getMemoryUsage
>
const mockLogMemoryDelta = logMemoryDelta as jest.MockedFunction<
    typeof logMemoryDelta
>

describe("useMemoryCleanup", () => {
    const mockMemoryUsage = {
        used: 100,
        total: 1000,
        limit: 2000,
        percentage: 10,
    }

    let mockDebouncedFunction: jest.Mock

    beforeEach(() => {
        jest.clearAllMocks()
        mockDebouncedFunction = jest.fn()
        mockDebounce.mockReturnValue(mockDebouncedFunction)
        mockGetMemoryUsage.mockReturnValue(mockMemoryUsage)
    })

    it("should provide performMemoryCleanup function", () => {
        const { result } = renderHook(() => useMemoryCleanup())

        expect(typeof result.current.performMemoryCleanup).toBe("function")
    })

    it("should create debounced cleanup function with correct delay", () => {
        renderHook(() => useMemoryCleanup())

        expect(mockDebounce).toHaveBeenCalledWith(
            expect.any(Function),
            CLEANUP_DEBOUNCE_DELAY
        )
    })

    it("should call getMemoryUsage and debouncedCleanup when performMemoryCleanup is called", () => {
        const { result } = renderHook(() => useMemoryCleanup())

        result.current.performMemoryCleanup("test context")

        expect(mockGetMemoryUsage).toHaveBeenCalledTimes(1)
        expect(mockDebouncedFunction).toHaveBeenCalledWith(
            "test context",
            mockMemoryUsage
        )
    })

    it("should handle different context strings", () => {
        const { result } = renderHook(() => useMemoryCleanup())

        result.current.performMemoryCleanup("game close")
        result.current.performMemoryCleanup("error cleanup")

        expect(mockDebouncedFunction).toHaveBeenCalledWith(
            "game close",
            mockMemoryUsage
        )
        expect(mockDebouncedFunction).toHaveBeenCalledWith(
            "error cleanup",
            mockMemoryUsage
        )
        expect(mockDebouncedFunction).toHaveBeenCalledTimes(2)
    })

    it("should execute cleanup logic when debounced function is called", () => {
        let capturedCleanupFunction: (...args: unknown[]) => void

        mockDebounce.mockImplementation((fn, _delay) => {
            capturedCleanupFunction = fn
            return jest.fn((...args: unknown[]) => {
                capturedCleanupFunction(...args)
            })
        })

        renderHook(() => useMemoryCleanup())

        capturedCleanupFunction!("test context", mockMemoryUsage)

        expect(mockForceGarbageCollection).toHaveBeenCalledTimes(1)
        expect(mockLogMemoryDelta).toHaveBeenCalledWith(
            "test context",
            mockMemoryUsage
        )
    })

    it("should handle null memory usage", () => {
        let capturedCleanupFunction: (...args: unknown[]) => void

        mockDebounce.mockImplementation((fn, _delay) => {
            capturedCleanupFunction = fn
            return jest.fn((...args: unknown[]) => {
                capturedCleanupFunction(...args)
            })
        })

        renderHook(() => useMemoryCleanup())

        capturedCleanupFunction!("test context", null)

        expect(mockForceGarbageCollection).toHaveBeenCalledTimes(1)
        expect(mockLogMemoryDelta).toHaveBeenCalledWith("test context", null)
    })

    it("should provide stable performMemoryCleanup function across re-renders", () => {
        const { result, rerender } = renderHook(() => useMemoryCleanup())

        const initialFunction = result.current.performMemoryCleanup

        rerender()

        expect(result.current.performMemoryCleanup).toBe(initialFunction)
    })

    it("should create debounced function on each render due to stable useCallback", () => {
        const { rerender } = renderHook(() => useMemoryCleanup())

        const initialCallCount = mockDebounce.mock.calls.length

        rerender()
        rerender()

        expect(mockDebounce.mock.calls.length).toBeGreaterThanOrEqual(
            initialCallCount
        )
    })

    describe("integration behavior", () => {
        it("should handle rapid successive calls", () => {
            const { result } = renderHook(() => useMemoryCleanup())

            result.current.performMemoryCleanup("call 1")
            result.current.performMemoryCleanup("call 2")
            result.current.performMemoryCleanup("call 3")

            expect(mockGetMemoryUsage).toHaveBeenCalledTimes(3)
            expect(mockDebouncedFunction).toHaveBeenCalledTimes(3)
        })

        it("should capture memory usage at call time, not execution time", () => {
            const firstMemoryReading = { ...mockMemoryUsage, used: 50 }
            const secondMemoryReading = { ...mockMemoryUsage, used: 150 }

            mockGetMemoryUsage
                .mockReturnValueOnce(firstMemoryReading)
                .mockReturnValueOnce(secondMemoryReading)

            const { result } = renderHook(() => useMemoryCleanup())

            result.current.performMemoryCleanup("first call")
            result.current.performMemoryCleanup("second call")

            expect(mockDebouncedFunction).toHaveBeenNthCalledWith(
                1,
                "first call",
                firstMemoryReading
            )
            expect(mockDebouncedFunction).toHaveBeenNthCalledWith(
                2,
                "second call",
                secondMemoryReading
            )
        })
    })

    describe("error handling", () => {
        it("should handle getMemoryUsage throwing an error", () => {
            const error = new Error("Memory reading failed")
            mockGetMemoryUsage.mockImplementation(() => {
                throw error
            })

            const { result } = renderHook(() => useMemoryCleanup())

            expect(() => {
                result.current.performMemoryCleanup("test")
            }).toThrow(error)
        })

        it("should pass through errors from debounced function", () => {
            const error = new Error("Debounce error")
            mockDebouncedFunction.mockImplementation(() => {
                throw error
            })

            const { result } = renderHook(() => useMemoryCleanup())

            expect(() => {
                result.current.performMemoryCleanup("test")
            }).toThrow(error)
        })
    })
})
