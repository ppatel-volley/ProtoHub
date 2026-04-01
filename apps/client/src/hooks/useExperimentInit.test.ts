import { act, renderHook } from "@testing-library/react"
import { useAccount } from "@volley/platform-sdk/react"

import { useExperimentInit } from "./useExperimentInit"

const mockInitialize = jest.fn().mockResolvedValue(undefined)
const mockOnInitialized = jest.fn()
const mockCreateExperimentIdentity = jest.fn()
const mockGetExperimentManager = jest.fn()

jest.mock("../experiments/ExperimentManager", () => ({
    getExperimentManager: (...args: unknown[]): unknown =>
        mockGetExperimentManager(...args),
    createExperimentIdentity: (...args: unknown[]): unknown =>
        mockCreateExperimentIdentity(...args),
}))

const mockUseAccount = useAccount as jest.Mock

jest.mock("@volley/platform-sdk/react", () => ({
    useAccount: jest.fn(() => ({ account: null })),
    useTracking: jest.fn(() => ({
        getBaseUserProperties: jest.fn(() => ({ platform: "mobile" })),
    })),
}))

jest.mock("../utils/logger", () => ({
    logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}))

const mockAccount = {
    id: "account-789",
    anonymousId: "anon-123",
    isAnonymous: true,
    isSubscribed: false,
}

describe("useExperimentInit", () => {
    let onInitializedCallback: (() => void) | undefined

    beforeEach(() => {
        jest.clearAllMocks()
        onInitializedCallback = undefined

        mockOnInitialized.mockImplementation((cb: () => void) => {
            onInitializedCallback = cb
            return cb
        })

        mockGetExperimentManager.mockReturnValue({
            initialize: mockInitialize,
            onInitialized: mockOnInitialized,
        })

        mockCreateExperimentIdentity.mockImplementation(
            (anonymousId?: string, accountId?: string) => {
                if (anonymousId) return { anonymousId, accountId }
                if (accountId) return { accountId, anonymousId }
                return null
            }
        )

        mockUseAccount.mockReturnValue({ account: null })
    })

    it("returns experimentsReady as false initially", () => {
        const { result } = renderHook(() => useExperimentInit())
        expect(result.current.experimentsReady).toBe(false)
    })

    it("does not initialize when account is null", () => {
        renderHook(() => useExperimentInit())
        expect(mockInitialize).not.toHaveBeenCalled()
    })

    it("initializes when account is available with anonymousId", () => {
        mockUseAccount.mockReturnValue({ account: mockAccount })

        renderHook(() => useExperimentInit())

        expect(mockInitialize).toHaveBeenCalledWith(
            { anonymousId: "anon-123", accountId: "account-789" },
            { platform: "mobile" }
        )
    })

    it("initializes with accountId when anonymousId is not available", () => {
        mockUseAccount.mockReturnValue({
            account: { ...mockAccount, anonymousId: undefined },
        })

        renderHook(() => useExperimentInit())

        expect(mockInitialize).toHaveBeenCalledWith(
            { accountId: "account-789", anonymousId: undefined },
            { platform: "mobile" }
        )
    })

    it("sets experimentsReady when onInitialized callback fires", () => {
        mockUseAccount.mockReturnValue({ account: mockAccount })

        const { result } = renderHook(() => useExperimentInit())

        expect(result.current.experimentsReady).toBe(false)

        act(() => {
            onInitializedCallback?.()
        })

        expect(result.current.experimentsReady).toBe(true)
    })

    it("only initializes once even if account changes", () => {
        mockUseAccount.mockReturnValue({ account: mockAccount })

        const { rerender } = renderHook(() => useExperimentInit())

        expect(mockInitialize).toHaveBeenCalledTimes(1)

        mockInitialize.mockClear()
        mockUseAccount.mockReturnValue({
            account: { ...mockAccount, anonymousId: "anon-456" },
        })
        rerender()

        expect(mockInitialize).not.toHaveBeenCalled()
    })

    it("handles initialization rejection gracefully", async () => {
        const { logger } = require("../utils/logger")
        mockUseAccount.mockReturnValue({ account: mockAccount })
        mockInitialize.mockRejectedValueOnce(new Error("Network error"))

        renderHook(() => useExperimentInit())

        await new Promise((resolve) => setTimeout(resolve, 0))

        expect(logger.error).toHaveBeenCalledWith(
            "Failed to initialize experiment manager",
            new Error("Network error")
        )
    })

    it("initializes when account arrives after initial render (VWR race condition)", () => {
        mockUseAccount.mockReturnValue({ account: null })

        const { rerender } = renderHook(() => useExperimentInit())

        expect(mockInitialize).not.toHaveBeenCalled()

        // Simulate account arriving via RPC after platform is ready
        mockUseAccount.mockReturnValue({ account: mockAccount })
        rerender()

        expect(mockInitialize).toHaveBeenCalledWith(
            { anonymousId: "anon-123", accountId: "account-789" },
            { platform: "mobile" }
        )
    })

    it("does not initialize when account has no identity", () => {
        mockUseAccount.mockReturnValue({
            account: {
                ...mockAccount,
                anonymousId: undefined,
                id: undefined,
            },
        })

        renderHook(() => useExperimentInit())

        expect(mockInitialize).not.toHaveBeenCalled()
    })
})
