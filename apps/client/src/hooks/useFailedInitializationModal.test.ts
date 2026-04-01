import { act, renderHook } from "@testing-library/react"

import { logger } from "../utils/logger"
import {
    type InitializationError,
    useFailedInitializationModal,
} from "./useFailedInitializationModal"

const mockExitApp = jest.fn()

jest.mock("@volley/platform-sdk/react", () => ({
    useAppLifecycle: (): { exitApp: jest.Mock } => ({
        exitApp: mockExitApp,
    }),
}))

jest.mock("../utils/logger", () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}))

jest.mock("../utils/datadog", () => ({
    safeDatadogRum: {
        addAction: jest.fn(),
        addError: jest.fn(),
    },
}))

import { safeDatadogRum } from "../utils/datadog"
const mockDatadogRum = safeDatadogRum as jest.Mocked<typeof safeDatadogRum>

describe("useFailedInitializationModal", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe("initialization", () => {
        it("should initialize with correct default state", () => {
            const { result } = renderHook(() =>
                useFailedInitializationModal(null)
            )

            expect(result.current.showFailedInitModal).toBe(false)
            expect(result.current.errorMessage).toBe("")
            expect(typeof result.current.handleExit).toBe("function")
        })

        it("should provide all required return values", () => {
            const { result } = renderHook(() =>
                useFailedInitializationModal(null)
            )

            expect(result.current).toHaveProperty("showFailedInitModal")
            expect(result.current).toHaveProperty("errorMessage")
            expect(result.current).toHaveProperty("handleExit")
        })
    })

    describe("platform error detection", () => {
        it("should show modal when platform status has error", () => {
            const platformError = {
                message: "Platform connection failed",
                errorType: "CONNECTION_ERROR",
                name: "PlatformError",
            }
            const initializationError: InitializationError = {
                type: "PLATFORM_ERROR",
                message: "Platform connection failed",
                trigger: "platform_error",
                context: "platform_initialization",
                originalError: platformError,
            }

            const { result } = renderHook(() =>
                useFailedInitializationModal(initializationError)
            )

            expect(result.current.showFailedInitModal).toBe(true)
            expect(result.current.errorMessage).toBe("PLATFORM_ERROR")
        })

        it("should track DataDog RUM events when platform error occurs", () => {
            const platformError = {
                message: "Platform connection failed",
                errorType: "CONNECTION_ERROR",
                name: "PlatformError",
            }
            const initializationError: InitializationError = {
                type: "PLATFORM_ERROR",
                message: "Platform connection failed",
                trigger: "platform_error",
                context: "platform_initialization",
                originalError: platformError,
            }

            renderHook(() => useFailedInitializationModal(initializationError))

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(jest.mocked(logger).error).toHaveBeenCalledWith(
                "Initialization failed (platform_error):",
                platformError,
                {
                    context: "platform_initialization",
                    errorType: "PLATFORM_ERROR",
                }
            )
            expect(mockDatadogRum.addAction).toHaveBeenCalledWith(
                "failed_initialization_modal_displayed",
                {
                    trigger: "platform_error",
                    errorMessage: "Platform connection failed",
                    errorType: "PLATFORM_ERROR",
                }
            )
        })

        it("should handle platform error without message", () => {
            const initializationError: InitializationError = {
                type: "PLATFORM_ERROR",
                message: "",
                trigger: "platform_error",
                context: "platform_initialization",
            }

            const { result } = renderHook(() =>
                useFailedInitializationModal(initializationError)
            )

            expect(result.current.showFailedInitModal).toBe(true)
            expect(result.current.errorMessage).toBe("PLATFORM_ERROR")
        })

        it("should handle platform error with undefined message", () => {
            const initializationError: InitializationError = {
                type: "PLATFORM_ERROR",
                message: "",
                trigger: "platform_error",
                context: "platform_initialization",
            }

            const { result } = renderHook(() =>
                useFailedInitializationModal(initializationError)
            )

            expect(result.current.showFailedInitModal).toBe(true)
            expect(result.current.errorMessage).toBe("PLATFORM_ERROR")
        })

        it("should not show modal when no error is provided", () => {
            const { result } = renderHook(() =>
                useFailedInitializationModal(null)
            )

            expect(result.current.showFailedInitModal).toBe(false)
            expect(result.current.errorMessage).toBe("")
        })
    })

    describe("dev override functionality", () => {
        it("should show modal when dev override is enabled", () => {
            const initializationError: InitializationError = {
                type: "TEST_ERROR",
                message: "TEST_ERROR",
                trigger: "dev_override",
                context: "dev_override",
            }

            const { result } = renderHook(() =>
                useFailedInitializationModal(initializationError)
            )

            expect(result.current.showFailedInitModal).toBe(true)
            expect(result.current.errorMessage).toBe("TEST_ERROR")
        })

        it("should track DataDog RUM events for dev override", () => {
            const initializationError: InitializationError = {
                type: "TEST_ERROR",
                message: "TEST_ERROR",
                trigger: "dev_override",
                context: "dev_override",
            }

            renderHook(() => useFailedInitializationModal(initializationError))

            expect(mockDatadogRum.addAction).toHaveBeenCalledWith(
                "failed_initialization_modal_displayed",
                {
                    trigger: "dev_override",
                    errorMessage: "TEST_ERROR",
                    errorType: "TEST_ERROR",
                }
            )
        })

        it("should handle device auth errors", () => {
            const initializationError: InitializationError = {
                type: "DEVICE_AUTH_ERROR",
                message: "Device authorization failed",
                trigger: "device_auth_error",
                context: "device_authorization",
                originalError: "Device authorization failed",
            }

            const { result } = renderHook(() =>
                useFailedInitializationModal(initializationError)
            )

            expect(result.current.showFailedInitModal).toBe(true)
            expect(result.current.errorMessage).toBe("DEVICE_AUTH_ERROR")
        })
    })

    describe("handleExit functionality", () => {
        it("should call exitApp when handleExit is called", () => {
            const { result } = renderHook(() =>
                useFailedInitializationModal(null)
            )

            act(() => {
                result.current.handleExit()
            })

            expect(mockExitApp).toHaveBeenCalledTimes(1)
        })

        it("should track DataDog RUM event when handleExit is called", () => {
            const { result } = renderHook(() =>
                useFailedInitializationModal(null)
            )

            act(() => {
                result.current.handleExit()
            })

            expect(mockDatadogRum.addAction).toHaveBeenCalledWith(
                "failed_initialization_exit_requested"
            )
        })

        it("handleExit should be stable across re-renders", () => {
            const { result, rerender } = renderHook(() =>
                useFailedInitializationModal(null)
            )

            const firstHandleExit = result.current.handleExit

            rerender()

            const secondHandleExit = result.current.handleExit

            expect(firstHandleExit).toBe(secondHandleExit)
        })
    })

    describe("state updates", () => {
        it("should update when error changes from null to error", () => {
            let currentError: InitializationError | null = null

            const { result, rerender } = renderHook(() =>
                useFailedInitializationModal(currentError)
            )

            expect(result.current.showFailedInitModal).toBe(false)

            currentError = {
                type: "PLATFORM_ERROR",
                message: "Connection lost",
                trigger: "platform_error",
                context: "platform_initialization",
            }

            rerender()

            expect(result.current.showFailedInitModal).toBe(true)
            expect(result.current.errorMessage).toBe("PLATFORM_ERROR")
        })
    })

    describe("edge cases", () => {
        it("should handle when no error is provided", () => {
            const { result } = renderHook(() =>
                useFailedInitializationModal(null)
            )

            expect(result.current.showFailedInitModal).toBe(false)
            expect(result.current.errorMessage).toBe("")
        })

        it("should handle multiple calls to handleExit", () => {
            const { result } = renderHook(() =>
                useFailedInitializationModal(null)
            )

            act(() => {
                result.current.handleExit()
                result.current.handleExit()
                result.current.handleExit()
            })

            expect(mockExitApp).toHaveBeenCalledTimes(3)
        })
    })
})
