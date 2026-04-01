import { act, renderHook } from "@testing-library/react"
import { useAccount, useAuth } from "@volley/platform-sdk/react"

import { SKU_OVERRIDE } from "../config/consts"
import { UpsellEventSubCategory } from "../constants/tracking"
import { getExperimentManager } from "../experiments/ExperimentManager"
import { useImmediateUpsell } from "./useImmediateUpsell"
import { useUpsell } from "./useUpsell"

jest.mock("@volley/platform-sdk/lib", () => ({
    SubscriptionFlowResult: {
        Successful: "Successful",
        Failed: "Failed",
        AlreadyPurchased: "AlreadyPurchased",
        Cancelled: "Cancelled",
    },
}))

jest.mock("@volley/platform-sdk/react", () => ({
    useAccount: jest.fn(),
    useAuth: jest.fn(),
}))

jest.mock("./useUpsell", () => ({
    useUpsell: jest.fn(),
}))

jest.mock("../utils/logger", () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}))

jest.mock("../experiments/ExperimentManager", () => ({
    getExperimentManager: jest.fn(),
}))

jest.mock("../config/platformDetection", () => ({
    shouldUseWebCheckout: jest.fn().mockReturnValue(false),
}))

jest.mock("../config/devOverrides", () => ({
    SHOULD_FORCE_WEB_CHECKOUT: false,
    SHOULD_USE_DEV_UPSELL: false,
    SHOULD_FORCE_UNSUBSCRIBED: false,
}))

describe("useImmediateUpsell", () => {
    const mockSubscribe = jest.fn()
    const mockExperimentManager = {
        getVariant: jest.fn(),
    }
    const mockShouldUseWebCheckout = jest.requireMock(
        "../config/platformDetection"
    ).shouldUseWebCheckout

    beforeEach(() => {
        jest.clearAllMocks()
        ;(useUpsell as jest.Mock).mockReturnValue({
            subscribe: mockSubscribe,
        })
        ;(useAuth as jest.Mock).mockReturnValue({
            authStatus: { authenticated: false, authInProgress: false },
        })
        ;(getExperimentManager as jest.Mock).mockReturnValue(
            mockExperimentManager
        )
        mockShouldUseWebCheckout.mockReturnValue(false)

        const devOverrides = jest.requireMock("../config/devOverrides")
        devOverrides.SHOULD_FORCE_WEB_CHECKOUT = false
        devOverrides.SHOULD_USE_DEV_UPSELL = false
        devOverrides.SHOULD_FORCE_UNSUBSCRIBED = false
    })

    it("should remain null when loading is not hidden", async () => {
        ;(useAccount as jest.Mock).mockReturnValue({
            account: { isSubscribed: false },
        })
        mockExperimentManager.getVariant.mockReturnValue({ value: "off" })

        const { result } = renderHook(() =>
            useImmediateUpsell(false, undefined)
        )

        await act(async () => {
            await Promise.resolve()
        })

        expect(result.current.isInImmediateUpsell).toBe(null)
        expect(mockSubscribe).not.toHaveBeenCalled()
    })

    it("should exit upsell state when account is not loaded and not using web checkout", async () => {
        ;(useAccount as jest.Mock).mockReturnValue({
            account: null,
        })
        mockShouldUseWebCheckout.mockReturnValue(false)

        const { result } = renderHook(() => useImmediateUpsell(true, undefined))

        await act(async () => {
            await Promise.resolve()
        })

        expect(result.current.isInImmediateUpsell).toBe(false)
        expect(mockSubscribe).not.toHaveBeenCalled()
    })

    it("should wait for account to load before checking subscription when using web checkout", async () => {
        mockShouldUseWebCheckout.mockReturnValue(true)
        mockExperimentManager.getVariant.mockReturnValue({ value: "off" })
        mockSubscribe.mockResolvedValue({ status: "success" })

        const { result, rerender } = renderHook(() =>
            useImmediateUpsell(true, undefined)
        )

        await act(async () => {
            ;(useAccount as jest.Mock).mockReturnValue({
                account: null,
            })
            rerender()
            await Promise.resolve()
        })

        expect(mockSubscribe).not.toHaveBeenCalled()
        expect(result.current.isInImmediateUpsell).toBe(null)

        await act(async () => {
            ;(useAccount as jest.Mock).mockReturnValue({
                account: { isSubscribed: false },
            })
            rerender()
            await Promise.resolve()
        })

        expect(mockSubscribe).toHaveBeenCalledTimes(1)
        expect(mockSubscribe).toHaveBeenCalledWith({
            overrideSku: SKU_OVERRIDE,
            eventCategory: UpsellEventSubCategory.IMMEDIATE_PRE_ROLL,
            upsellContext: {
                type: "immediate",
            },
        })
    })

    it("should exit upsell state when user is already subscribed", async () => {
        ;(useAccount as jest.Mock).mockReturnValue({
            account: { isSubscribed: true },
        })

        const { result } = renderHook(() => useImmediateUpsell(true, undefined))

        await act(async () => {
            await Promise.resolve()
        })

        expect(result.current.isInImmediateUpsell).toBe(false)
        expect(mockSubscribe).not.toHaveBeenCalled()
    })

    it("should exit upsell state when experiment suppresses immediate upsell", async () => {
        ;(useAccount as jest.Mock).mockReturnValue({
            account: { isSubscribed: false },
        })
        mockExperimentManager.getVariant.mockReturnValue({ value: "on" })

        const { result } = renderHook(() => useImmediateUpsell(true, undefined))

        await act(async () => {
            await Promise.resolve()
        })

        expect(result.current.isInImmediateUpsell).toBe(false)
        expect(mockSubscribe).not.toHaveBeenCalled()
    })

    it("should trigger upsell for non-subscribed users when experiment is disabled", async () => {
        ;(useAccount as jest.Mock).mockReturnValue({
            account: { isSubscribed: false },
        })
        mockExperimentManager.getVariant.mockReturnValue({ value: "off" })
        mockSubscribe.mockResolvedValue({ status: "success" })

        const { result } = renderHook(() => useImmediateUpsell(true, undefined))

        await act(async () => {
            await Promise.resolve()
        })

        expect(mockSubscribe).toHaveBeenCalledTimes(1)
        expect(mockSubscribe).toHaveBeenCalledWith({
            overrideSku: SKU_OVERRIDE,
            eventCategory: UpsellEventSubCategory.IMMEDIATE_PRE_ROLL,
            upsellContext: {
                type: "immediate",
            },
        })
        expect(result.current.isInImmediateUpsell).toBe(false)
    })

    it("should handle subscription failure gracefully", async () => {
        ;(useAccount as jest.Mock).mockReturnValue({
            account: { isSubscribed: false },
        })
        mockExperimentManager.getVariant.mockReturnValue({ value: "off" })
        mockSubscribe.mockRejectedValue(new Error("Subscription failed"))

        const { result } = renderHook(() => useImmediateUpsell(true, undefined))

        await act(async () => {
            await Promise.resolve()
        })

        expect(mockSubscribe).toHaveBeenCalledTimes(1)
        expect(mockSubscribe).toHaveBeenCalledWith({
            overrideSku: SKU_OVERRIDE,
            eventCategory: UpsellEventSubCategory.IMMEDIATE_PRE_ROLL,
            upsellContext: {
                type: "immediate",
            },
        })
        expect(result.current.isInImmediateUpsell).toBe(false)
    })

    it("should only attempt upsell once even when dependencies change", async () => {
        ;(useAccount as jest.Mock).mockReturnValue({
            account: { isSubscribed: false },
        })
        mockExperimentManager.getVariant.mockReturnValue({ value: "off" })
        mockSubscribe.mockResolvedValue({ status: "success" })

        const { result, rerender } = renderHook(() =>
            useImmediateUpsell(true, undefined)
        )

        await act(async () => {
            await Promise.resolve()
        })

        expect(mockSubscribe).toHaveBeenCalledTimes(1)
        expect(mockSubscribe).toHaveBeenCalledWith({
            overrideSku: SKU_OVERRIDE,
            eventCategory: UpsellEventSubCategory.IMMEDIATE_PRE_ROLL,
            upsellContext: {
                type: "immediate",
            },
        })
        expect(result.current.isInImmediateUpsell).toBe(false)
        ;(useAccount as jest.Mock).mockReturnValue({
            account: { isSubscribed: false },
        })
        rerender()

        await act(async () => {
            await Promise.resolve()
        })

        expect(mockSubscribe).toHaveBeenCalledTimes(1)
    })

    it("should only trigger when loading becomes hidden", async () => {
        ;(useAccount as jest.Mock).mockReturnValue({
            account: { isSubscribed: false },
        })
        mockExperimentManager.getVariant.mockReturnValue({ value: "off" })
        mockSubscribe.mockResolvedValue({ status: "success" })

        const { result, rerender } = renderHook(
            ({ shouldStart }) => useImmediateUpsell(shouldStart),
            { initialProps: { shouldStart: false } }
        )

        await act(async () => {
            await Promise.resolve()
        })

        expect(result.current.isInImmediateUpsell).toBe(null)
        expect(mockSubscribe).not.toHaveBeenCalled()

        rerender({ shouldStart: true })

        await act(async () => {
            await Promise.resolve()
        })

        expect(mockSubscribe).toHaveBeenCalledTimes(1)
        expect(mockSubscribe).toHaveBeenCalledWith({
            overrideSku: SKU_OVERRIDE,
            eventCategory: UpsellEventSubCategory.IMMEDIATE_PRE_ROLL,
            upsellContext: {
                type: "immediate",
            },
        })
        expect(result.current.isInImmediateUpsell).toBe(false)
    })

    describe("deferred subscribe (canSubscribe)", () => {
        it("should resolve isInImmediateUpsell to true but defer subscribe until canSubscribe is true", async () => {
            ;(useAccount as jest.Mock).mockReturnValue({
                account: { isSubscribed: false },
            })
            mockExperimentManager.getVariant.mockReturnValue({ value: "off" })
            mockSubscribe.mockResolvedValue({ status: "success" })

            const { result, rerender } = renderHook(
                ({ canSubscribe }) =>
                    useImmediateUpsell(true, undefined, canSubscribe),
                { initialProps: { canSubscribe: false } }
            )

            await act(async () => {
                await Promise.resolve()
            })

            expect(result.current.isInImmediateUpsell).toBe(true)
            expect(mockSubscribe).not.toHaveBeenCalled()

            rerender({ canSubscribe: true })

            await act(async () => {
                await Promise.resolve()
            })

            expect(mockSubscribe).toHaveBeenCalledTimes(1)
            expect(mockSubscribe).toHaveBeenCalledWith({
                overrideSku: SKU_OVERRIDE,
                eventCategory: UpsellEventSubCategory.IMMEDIATE_PRE_ROLL,
                upsellContext: {
                    type: "immediate",
                },
            })
        })

        it("should subscribe immediately when canSubscribe defaults to true", async () => {
            ;(useAccount as jest.Mock).mockReturnValue({
                account: { isSubscribed: false },
            })
            mockExperimentManager.getVariant.mockReturnValue({ value: "off" })
            mockSubscribe.mockResolvedValue({ status: "success" })

            renderHook(() => useImmediateUpsell(true, undefined))

            await act(async () => {
                await Promise.resolve()
            })

            expect(mockSubscribe).toHaveBeenCalledTimes(1)
        })

        it("should resolve immediately to false for subscribed users even with canSubscribe", async () => {
            ;(useAccount as jest.Mock).mockReturnValue({
                account: { isSubscribed: true },
            })

            const { result } = renderHook(() =>
                useImmediateUpsell(true, undefined, false)
            )

            await act(async () => {
                await Promise.resolve()
            })

            expect(result.current.isInImmediateUpsell).toBe(false)
            expect(mockSubscribe).not.toHaveBeenCalled()
        })

        it("should only call subscribe once when canSubscribe becomes true", async () => {
            ;(useAccount as jest.Mock).mockReturnValue({
                account: { isSubscribed: false },
            })
            mockExperimentManager.getVariant.mockReturnValue({ value: "off" })
            mockSubscribe.mockResolvedValue({ status: "success" })

            const { rerender } = renderHook(
                ({ canSubscribe }) =>
                    useImmediateUpsell(true, undefined, canSubscribe),
                { initialProps: { canSubscribe: false } }
            )

            await act(async () => {
                await Promise.resolve()
            })

            rerender({ canSubscribe: true })
            await act(async () => {
                await Promise.resolve()
            })

            rerender({ canSubscribe: true })
            await act(async () => {
                await Promise.resolve()
            })

            expect(mockSubscribe).toHaveBeenCalledTimes(1)
        })
    })

    it("should bypass upsell when deeplink is provided", async () => {
        ;(useAccount as jest.Mock).mockReturnValue({
            account: { isSubscribed: false },
        })
        mockExperimentManager.getVariant.mockReturnValue({ value: "off" })

        const deeplink = { gameId: "jeopardy" as any, campaignId: "test" }
        const { result } = renderHook(() => useImmediateUpsell(true, deeplink))

        await act(async () => {
            await Promise.resolve()
        })

        expect(result.current.isInImmediateUpsell).toBe(false)
        expect(mockSubscribe).not.toHaveBeenCalled()
    })
})
