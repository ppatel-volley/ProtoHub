import { renderHook } from "@testing-library/react"

import { useIsSubscribed } from "./useIsSubscribed"

const mockUseAccount = jest.fn()

jest.mock("@volley/platform-sdk/react", () => ({
    useAccount: (): { account: { isSubscribed: boolean } | null } =>
        mockUseAccount(),
}))

jest.mock("../config/devOverrides", () => ({
    SHOULD_USE_DEV_UPSELL: false,
    SHOULD_FORCE_WEB_CHECKOUT: false,
}))

describe("useIsSubscribed", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it("should return true when account is subscribed", () => {
        mockUseAccount.mockReturnValue({ account: { isSubscribed: true } })

        const { result } = renderHook(() => useIsSubscribed())

        expect(result.current).toBe(true)
    })

    it("should return false when account is not subscribed", () => {
        mockUseAccount.mockReturnValue({ account: { isSubscribed: false } })

        const { result } = renderHook(() => useIsSubscribed())

        expect(result.current).toBe(false)
    })

    it("should return false when account is null", () => {
        mockUseAccount.mockReturnValue({ account: null })

        const { result } = renderHook(() => useIsSubscribed())

        expect(result.current).toBe(false)
    })

    it("should return false when account is undefined", () => {
        mockUseAccount.mockReturnValue({ account: undefined })

        const { result } = renderHook(() => useIsSubscribed())

        expect(result.current).toBe(false)
    })
})

describe("useIsSubscribed with dev overrides", () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.resetModules()
    })

    it("should return false when SHOULD_USE_DEV_UPSELL is true even if subscribed", () => {
        jest.doMock("../config/devOverrides", () => ({
            SHOULD_USE_DEV_UPSELL: true,
            SHOULD_FORCE_WEB_CHECKOUT: false,
        }))

        jest.doMock("@volley/platform-sdk/react", () => ({
            useAccount: (): { account: { isSubscribed: boolean } } => ({
                account: { isSubscribed: true },
            }),
        }))

        const {
            useIsSubscribed: useIsSubscribedWithOverride,
        } = require("./useIsSubscribed")

        const { result } = renderHook(() => useIsSubscribedWithOverride())

        expect(result.current).toBe(false)
    })

    it("should return false when SHOULD_FORCE_WEB_CHECKOUT is true even if subscribed", () => {
        jest.doMock("../config/devOverrides", () => ({
            SHOULD_USE_DEV_UPSELL: false,
            SHOULD_FORCE_WEB_CHECKOUT: true,
        }))

        jest.doMock("@volley/platform-sdk/react", () => ({
            useAccount: (): { account: { isSubscribed: boolean } } => ({
                account: { isSubscribed: true },
            }),
        }))

        const {
            useIsSubscribed: useIsSubscribedWithOverride,
        } = require("./useIsSubscribed")

        const { result } = renderHook(() => useIsSubscribedWithOverride())

        expect(result.current).toBe(false)
    })
})
