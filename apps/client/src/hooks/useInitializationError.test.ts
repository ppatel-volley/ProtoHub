import { renderHook } from "@testing-library/react"
import { usePlatformStatus } from "@volley/platform-sdk/react"

import { isMobile } from "../config/platformDetection"
import { useInitializationError } from "./useInitializationError"

jest.mock("@volley/platform-sdk/react", () => ({
    usePlatformStatus: jest.fn(),
}))

jest.mock("../config/devOverrides", () => ({
    SHOULD_FORCE_PLATFORM_ERROR: false,
}))

jest.mock("../config/platformDetection", () => ({
    isMobile: jest.fn(() => false),
}))

const mockUsePlatformStatus = usePlatformStatus as jest.Mock
const mockIsMobile = isMobile as jest.Mock

const mockAccount = {
    id: "",
    anonymousId: "test-anon-id",
    isAnonymous: true,
    isSubscribed: false,
}

describe("useInitializationError", () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockUsePlatformStatus.mockReturnValue({
            isReady: false,
            error: null,
        })
        mockIsMobile.mockReturnValue(false)
        jest.doMock("../config/devOverrides", () => ({
            SHOULD_FORCE_PLATFORM_ERROR: false,
        }))
    })

    it("returns null when no errors are present", () => {
        const { result } = renderHook(() =>
            useInitializationError({
                platformInitializationError: null,
                account: mockAccount,
            })
        )

        expect(result.current).toBeNull()
    })

    it("returns TEST_ERROR when SHOULD_FORCE_PLATFORM_ERROR is true", () => {
        const originalValue = jest.requireActual(
            "../config/devOverrides"
        ).SHOULD_FORCE_PLATFORM_ERROR

        const devOverrides = require("../config/devOverrides")
        Object.defineProperty(devOverrides, "SHOULD_FORCE_PLATFORM_ERROR", {
            value: true,
            writable: true,
        })

        const { result } = renderHook(() =>
            useInitializationError({
                platformInitializationError: null,
                account: mockAccount,
            })
        )

        expect(result.current).toEqual({
            type: "TEST_ERROR",
            message: "TEST_ERROR",
            trigger: "dev_override",
            context: "dev_override",
        })

        Object.defineProperty(devOverrides, "SHOULD_FORCE_PLATFORM_ERROR", {
            value: originalValue,
            writable: true,
        })
    })

    it("returns PLATFORM_ERROR when platform status has an error", () => {
        const platformError = new Error("Platform connection failed")
        mockUsePlatformStatus.mockReturnValue({
            isReady: false,
            error: platformError,
        })

        const { result } = renderHook(() =>
            useInitializationError({
                platformInitializationError: null,
                account: mockAccount,
            })
        )

        expect(result.current).toEqual({
            type: "PLATFORM_ERROR",
            message: platformError.message,
            trigger: "platform_error",
            context: "platform_initialization",
            originalError: platformError,
        })
    })

    it("prioritizes dev override over platform errors", () => {
        const originalValue = jest.requireActual(
            "../config/devOverrides"
        ).SHOULD_FORCE_PLATFORM_ERROR
        const devOverrides = require("../config/devOverrides")
        Object.defineProperty(devOverrides, "SHOULD_FORCE_PLATFORM_ERROR", {
            value: true,
            writable: true,
        })

        const platformError = new Error("Platform error")
        mockUsePlatformStatus.mockReturnValue({
            isReady: false,
            error: platformError,
        })

        const { result } = renderHook(() =>
            useInitializationError({
                platformInitializationError: null,
                account: mockAccount,
            })
        )

        expect(result.current).toEqual({
            type: "TEST_ERROR",
            message: "TEST_ERROR",
            trigger: "dev_override",
            context: "dev_override",
        })

        Object.defineProperty(devOverrides, "SHOULD_FORCE_PLATFORM_ERROR", {
            value: originalValue,
            writable: true,
        })
    })

    it("updates when platform status error changes", () => {
        const { result, rerender } = renderHook(() =>
            useInitializationError({
                platformInitializationError: null,
                account: mockAccount,
            })
        )

        expect(result.current).toBeNull()

        const platformError = new Error("Platform connection lost")
        mockUsePlatformStatus.mockReturnValue({
            isReady: false,
            error: platformError,
        })

        rerender()

        expect(result.current).toEqual({
            type: "PLATFORM_ERROR",
            message: platformError.message,
            trigger: "platform_error",
            context: "platform_initialization",
            originalError: platformError,
        })
    })

    it("clears error when platform error is resolved", () => {
        const platformError = new Error("Platform error")
        mockUsePlatformStatus.mockReturnValue({
            isReady: false,
            error: platformError,
        })

        const { result, rerender } = renderHook(() =>
            useInitializationError({
                platformInitializationError: null,
                account: mockAccount,
            })
        )

        expect(result.current?.type).toBe("PLATFORM_ERROR")

        mockUsePlatformStatus.mockReturnValue({
            isReady: true,
            error: null,
        })
        rerender()

        expect(result.current).toBeNull()
    })

    it("returns DEVICE_AUTH_ERROR when platformInitializationError is provided", () => {
        const platformInitializationError = "Device authorization failed"
        const { result } = renderHook(() =>
            useInitializationError({
                platformInitializationError,
                account: mockAccount,
            })
        )

        expect(result.current).toEqual({
            type: "DEVICE_AUTH_ERROR",
            message: platformInitializationError,
            trigger: "device_auth_error",
            context: "device_auth_initialization",
        })
    })

    it("returns ANONYMOUS_ID_ERROR when platform is ready and account exists but anonymousId is missing", () => {
        const { result } = renderHook(() =>
            useInitializationError({
                platformInitializationError: null,
                account: {
                    id: "",
                    anonymousId: "",
                    isAnonymous: true,
                    isSubscribed: false,
                },
            })
        )

        expect(result.current).toEqual({
            type: "ANONYMOUS_ID_ERROR",
            message: "Missing anonymous ID for experiment cohorting",
            trigger: "experiment_identity_error",
            context: "experiment_identity_initialization",
        })
    })

    it("does not return ANONYMOUS_ID_ERROR when account is null (still initializing)", () => {
        const { result } = renderHook(() =>
            useInitializationError({
                platformInitializationError: null,
                account: null,
            })
        )

        expect(result.current).toBeNull()
    })

    it("does not return ANONYMOUS_ID_ERROR when on mobile", () => {
        mockIsMobile.mockReturnValue(true)

        const { result } = renderHook(() =>
            useInitializationError({
                platformInitializationError: null,
                account: {
                    id: "",
                    anonymousId: "",
                    isAnonymous: true,
                    isSubscribed: false,
                },
            })
        )

        expect(result.current).toBeNull()

        mockIsMobile.mockReturnValue(false)
    })

    it("prioritizes device auth error over anonymous ID error", () => {
        const platformInitializationError = "Device authorization failed"
        const { result } = renderHook(() =>
            useInitializationError({
                platformInitializationError,
                account: {
                    id: "",
                    anonymousId: "",
                    isAnonymous: true,
                    isSubscribed: false,
                },
            })
        )

        expect(result.current?.type).toBe("DEVICE_AUTH_ERROR")
    })
})
