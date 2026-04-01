import { renderHook } from "@testing-library/react"

import type { DurationVitalReference } from "../utils/datadog"
import { safeDatadogRum } from "../utils/datadog"
import { logger } from "../utils/logger"
import { useDatadogLaunchVitalManager } from "./useDatadogLaunchVitalManager"

jest.mock("../utils/datadog", () => ({
    safeDatadogRum: {
        stopDurationVital: jest.fn(),
    },
}))

jest.mock("../utils/logger", () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}))

const mockSafeDatadogRum = safeDatadogRum as jest.Mocked<typeof safeDatadogRum>

describe("useDatadogLaunchVitalManager", () => {
    const mockVitalRef: DurationVitalReference = {
        __dd_vital_reference: true,
    } as DurationVitalReference

    const mockLoggerInfo = jest.fn()
    const mockLoggerWarn = jest.fn()

    beforeAll(() => {
        jest.mocked(logger).info.mockImplementation(mockLoggerInfo)
        jest.mocked(logger).warn.mockImplementation(mockLoggerWarn)
    })

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe("with valid vital reference", () => {
        it("should provide vital management functions", () => {
            const { result } = renderHook(() =>
                useDatadogLaunchVitalManager(mockVitalRef)
            )

            expect(typeof result.current.stopVitalOnSuccess).toBe("function")
            expect(typeof result.current.stopVitalOnError).toBe("function")
            expect(typeof result.current.stopVitalOnUnmount).toBe("function")
            expect(result.current.isVitalStopped).toBe(false)
        })

        it("should stop vital on success", () => {
            const { result } = renderHook(() =>
                useDatadogLaunchVitalManager(mockVitalRef)
            )

            const stopVitalOnSuccess = result.current.stopVitalOnSuccess
            stopVitalOnSuccess()

            expect(mockSafeDatadogRum.stopDurationVital).toHaveBeenCalledWith(
                mockVitalRef,
                {
                    context: {
                        status: "success",
                    },
                }
            )
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                "Datadog vital stopped successfully"
            )
        })

        it("should stop vital on error", () => {
            const { result } = renderHook(() =>
                useDatadogLaunchVitalManager(mockVitalRef)
            )

            const testError = new Error("Test error")
            result.current.stopVitalOnError(testError)

            expect(mockSafeDatadogRum.stopDurationVital).toHaveBeenCalledWith(
                mockVitalRef,
                {
                    context: {
                        status: "error",
                        error: testError,
                    },
                }
            )
            expect(mockLoggerWarn).toHaveBeenCalledWith(
                "Datadog vital stopped with error",
                {
                    error: testError,
                }
            )
        })

        it("should stop vital on unmount", () => {
            const { result } = renderHook(() =>
                useDatadogLaunchVitalManager(mockVitalRef)
            )

            result.current.stopVitalOnUnmount()

            expect(mockSafeDatadogRum.stopDurationVital).toHaveBeenCalledWith(
                mockVitalRef,
                {
                    context: {
                        status: "error",
                        error: expect.any(Error),
                    },
                }
            )
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                "Datadog vital stopped on unmount"
            )
        })

        it("should not stop vital multiple times", () => {
            const { result } = renderHook(() =>
                useDatadogLaunchVitalManager(mockVitalRef)
            )

            result.current.stopVitalOnSuccess()
            result.current.stopVitalOnSuccess()

            expect(mockSafeDatadogRum.stopDurationVital).toHaveBeenCalledTimes(
                1
            )
        })

        it("should not stop vital on unmount if already stopped", () => {
            const { result } = renderHook(() =>
                useDatadogLaunchVitalManager(mockVitalRef)
            )

            result.current.stopVitalOnSuccess()
            result.current.stopVitalOnUnmount()

            expect(mockSafeDatadogRum.stopDurationVital).toHaveBeenCalledTimes(
                1
            )
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                "Datadog vital stopped successfully"
            )
            expect(mockLoggerInfo).not.toHaveBeenCalledWith(
                "Datadog vital stopped on unmount"
            )
        })

        it("should track isVitalStopped status", () => {
            const { result } = renderHook(() =>
                useDatadogLaunchVitalManager(mockVitalRef)
            )

            expect(result.current.isVitalStopped).toBe(false)

            result.current.stopVitalOnSuccess()

            expect(result.current.isVitalStopped).toBe(true)
        })
    })

    describe("with null vital reference", () => {
        it("should not stop vital when vital ref is null", () => {
            const { result } = renderHook(() =>
                useDatadogLaunchVitalManager(null)
            )

            result.current.stopVitalOnSuccess()

            expect(mockSafeDatadogRum.stopDurationVital).not.toHaveBeenCalled()
            expect(mockLoggerInfo).not.toHaveBeenCalled()
            expect(mockLoggerWarn).not.toHaveBeenCalled()
        })

        it("should not stop vital on unmount when vital ref is null", () => {
            const { result } = renderHook(() =>
                useDatadogLaunchVitalManager(null)
            )

            result.current.stopVitalOnUnmount()

            expect(mockSafeDatadogRum.stopDurationVital).not.toHaveBeenCalled()
            expect(mockLoggerInfo).not.toHaveBeenCalled()
        })
    })

    describe("with invalid vital reference", () => {
        it("should handle invalid vital reference gracefully", () => {
            const invalidVitalRef =
                "invalid" as unknown as DurationVitalReference
            const { result } = renderHook(() =>
                useDatadogLaunchVitalManager(invalidVitalRef)
            )

            result.current.stopVitalOnSuccess()

            expect(mockSafeDatadogRum.stopDurationVital).not.toHaveBeenCalled()
            expect(mockLoggerWarn).toHaveBeenCalledWith(
                "Datadog vital reference is invalid, skipping stop"
            )
        })

        it("should handle null-like objects", () => {
            const nullLikeRef = null as unknown as DurationVitalReference
            const { result } = renderHook(() =>
                useDatadogLaunchVitalManager(nullLikeRef)
            )

            result.current.stopVitalOnSuccess()

            expect(mockSafeDatadogRum.stopDurationVital).not.toHaveBeenCalled()
        })
    })

    describe("error handling", () => {
        it("should handle different error types", () => {
            const { result } = renderHook(() =>
                useDatadogLaunchVitalManager(mockVitalRef)
            )

            const customError = new TypeError("Custom error")
            customError.name = "CustomError"

            result.current.stopVitalOnError(customError)

            expect(mockSafeDatadogRum.stopDurationVital).toHaveBeenCalledWith(
                mockVitalRef,
                {
                    context: {
                        status: "error",
                        error: customError,
                    },
                }
            )
        })

        it("should create appropriate error for unmount", () => {
            const { result } = renderHook(() =>
                useDatadogLaunchVitalManager(mockVitalRef)
            )

            result.current.stopVitalOnUnmount()

            expect(mockSafeDatadogRum.stopDurationVital).toHaveBeenCalledWith(
                mockVitalRef,
                {
                    context: {
                        status: "error",
                        error: expect.objectContaining({
                            message: "Component unmounted before completion",
                        }),
                    },
                }
            )
        })
    })

    describe("hook stability", () => {
        it("should provide stable function references", () => {
            const { result, rerender } = renderHook(() =>
                useDatadogLaunchVitalManager(mockVitalRef)
            )

            const initialFunctions = {
                stopVitalOnSuccess: result.current.stopVitalOnSuccess,
                stopVitalOnError: result.current.stopVitalOnError,
                stopVitalOnUnmount: result.current.stopVitalOnUnmount,
            }

            rerender()

            expect(result.current.stopVitalOnSuccess).toBe(
                initialFunctions.stopVitalOnSuccess
            )
            expect(result.current.stopVitalOnError).toBe(
                initialFunctions.stopVitalOnError
            )
            expect(result.current.stopVitalOnUnmount).toBe(
                initialFunctions.stopVitalOnUnmount
            )
        })
    })
})
