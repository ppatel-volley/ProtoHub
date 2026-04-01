import { renderHook } from "@testing-library/react"
import { useAccount } from "@volley/platform-sdk/react"

import { useAccountId } from "./useAccountId"

jest.mock("@volley/platform-sdk/react", () => ({
    useAccount: jest.fn(),
}))

describe("useAccountId", () => {
    const mockAccountId = "account-456"

    beforeEach(() => {
        jest.clearAllMocks()
        ;(useAccount as jest.Mock).mockReturnValue({
            account: { id: mockAccountId },
        })
    })

    it("should return account ID from platform SDK", () => {
        const { result } = renderHook(() => useAccountId())
        expect(result.current).toBe(mockAccountId)
    })

    it("should return undefined when account is null", () => {
        ;(useAccount as jest.Mock).mockReturnValue({
            account: null,
        })
        const { result } = renderHook(() => useAccountId())
        expect(result.current).toBeUndefined()
    })

    it("should return undefined when account id is undefined", () => {
        ;(useAccount as jest.Mock).mockReturnValue({
            account: { id: undefined },
        })
        const { result } = renderHook(() => useAccountId())
        expect(result.current).toBeUndefined()
    })
})
