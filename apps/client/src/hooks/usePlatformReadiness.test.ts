import { renderHook } from "@testing-library/react"

import { usePlatformReadiness } from "./usePlatformReadiness"

const mockUsePlatformStatus = jest.fn()
const mockLoggerError = jest.fn()

jest.mock("@volley/platform-sdk/react", () => ({
    usePlatformStatus: (...args: unknown[]): unknown =>
        mockUsePlatformStatus(...args),
}))

jest.mock("../utils/logger", () => ({
    logger: {
        error: (...args: unknown[]): unknown => mockLoggerError(...args),
    },
}))

describe("usePlatformReadiness", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it("returns true when platform is ready", () => {
        mockUsePlatformStatus.mockReturnValue({
            isReady: true,
            error: null,
        })

        const { result } = renderHook(() => usePlatformReadiness())

        expect(result.current).toBe(true)
        expect(mockLoggerError).not.toHaveBeenCalled()
    })

    it("returns false when platform is not ready", () => {
        mockUsePlatformStatus.mockReturnValue({
            isReady: false,
            error: null,
        })

        const { result } = renderHook(() => usePlatformReadiness())

        expect(result.current).toBe(false)
        expect(mockLoggerError).not.toHaveBeenCalled()
    })

    it("logs error when platform status has error", () => {
        const mockError = new Error("Platform error")
        mockUsePlatformStatus.mockReturnValue({
            isReady: false,
            error: mockError,
        })

        const { result } = renderHook(() => usePlatformReadiness())

        expect(result.current).toBe(false)
        expect(mockLoggerError).toHaveBeenCalledWith(
            "Platform status error:",
            undefined
        )
    })

    it("returns true even when there is an error", () => {
        const mockError = new Error("Platform error")
        mockUsePlatformStatus.mockReturnValue({
            isReady: true,
            error: mockError,
        })

        const { result } = renderHook(() => usePlatformReadiness())

        expect(result.current).toBe(true)
        expect(mockLoggerError).toHaveBeenCalledWith(
            "Platform status error:",
            undefined
        )
    })

    it("logs error only when error changes", () => {
        const mockError = new Error("Platform error")
        mockUsePlatformStatus.mockReturnValue({
            isReady: false,
            error: mockError,
        })

        const { rerender } = renderHook(() => usePlatformReadiness())

        expect(mockLoggerError).toHaveBeenCalledTimes(1)

        rerender()
        expect(mockLoggerError).toHaveBeenCalledTimes(1)

        const newError = new Error("New error")
        mockUsePlatformStatus.mockReturnValue({
            isReady: false,
            error: newError,
        })
        rerender()
        expect(mockLoggerError).toHaveBeenCalledTimes(2)
        expect(mockLoggerError).toHaveBeenLastCalledWith(
            "Platform status error:",
            undefined
        )
    })

    it("stops logging when error is cleared", () => {
        const mockError = new Error("Platform error")
        mockUsePlatformStatus.mockReturnValue({
            isReady: false,
            error: mockError,
        })

        const { rerender } = renderHook(() => usePlatformReadiness())

        expect(mockLoggerError).toHaveBeenCalledTimes(1)

        mockUsePlatformStatus.mockReturnValue({
            isReady: true,
            error: null,
        })
        rerender()
        expect(mockLoggerError).toHaveBeenCalledTimes(1)
    })
})
