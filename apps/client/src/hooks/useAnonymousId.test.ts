import { renderHook } from "@testing-library/react"
import { useAccount } from "@volley/platform-sdk/react"

import { useAnonymousId } from "./useAnonymousId"

jest.mock("@volley/platform-sdk/react", () => ({
    useAccount: jest.fn(),
}))

describe("useAnonymousId", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it("returns anonymousId when available", () => {
        ;(useAccount as jest.Mock).mockReturnValue({
            account: {
                anonymousId: "anonymous-123",
                id: "user-456",
            },
        })

        const { result } = renderHook(() => useAnonymousId())

        expect(result.current).toBe("anonymous-123")
    })

    it("returns undefined when anonymousId is not available", () => {
        ;(useAccount as jest.Mock).mockReturnValue({
            account: {
                anonymousId: undefined,
                id: "user-456",
            },
        })

        const { result } = renderHook(() => useAnonymousId())

        expect(result.current).toBeUndefined()
    })

    it("returns undefined when neither anonymousId nor id are available", () => {
        ;(useAccount as jest.Mock).mockReturnValue({
            account: {
                anonymousId: undefined,
                id: undefined,
            },
        })

        const { result } = renderHook(() => useAnonymousId())

        expect(result.current).toBeUndefined()
    })

    it("returns undefined when account is null", () => {
        ;(useAccount as jest.Mock).mockReturnValue({
            account: null,
        })

        const { result } = renderHook(() => useAnonymousId())

        expect(result.current).toBeUndefined()
    })
})
