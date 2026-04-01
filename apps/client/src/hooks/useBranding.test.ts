import { act, renderHook } from "@testing-library/react"

import * as branding from "../config/branding"
import { useBranding } from "./useBranding"

jest.mock("../config/branding", () => ({
    ...jest.requireActual("../config/branding"),
    subscribeToBrand: jest.fn(),
    getActiveBrand: jest.fn(),
    isWeekendRebrandActive: jest.fn(),
}))

describe("useBranding", () => {
    let capturedListener: (() => void) | undefined

    beforeEach(() => {
        jest.clearAllMocks()
        capturedListener = undefined
        ;(branding.subscribeToBrand as jest.Mock).mockImplementation(
            (listener: () => void): (() => void) => {
                capturedListener = listener
                return (): void => {
                    capturedListener = undefined
                }
            }
        )
        ;(branding.getActiveBrand as jest.Mock).mockReturnValue("volley")
        ;(branding.isWeekendRebrandActive as jest.Mock).mockReturnValue(false)
    })

    it("returns initial brand from getActiveBrand", () => {
        const { result } = renderHook(() => useBranding())

        expect(result.current.brand).toBe("volley")
    })

    it("returns weekendRebrandActive from isWeekendRebrandActive", () => {
        const { result } = renderHook(() => useBranding())

        expect(result.current.weekendRebrandActive).toBe(false)
    })

    it("subscribes to brand changes via subscribeToBrand", () => {
        renderHook(() => useBranding())

        expect(branding.subscribeToBrand).toHaveBeenCalled()
    })

    it("updates brand when brand subscription notifies", () => {
        const { result } = renderHook(() => useBranding())

        expect(result.current.brand).toBe("volley")
        ;(branding.getActiveBrand as jest.Mock).mockReturnValue("weekend")
        ;(branding.isWeekendRebrandActive as jest.Mock).mockReturnValue(true)

        act(() => {
            capturedListener?.()
        })

        expect(result.current.brand).toBe("weekend")
        expect(result.current.weekendRebrandActive).toBe(true)
    })

    it("cleans up subscription on unmount", () => {
        const { unmount } = renderHook(() => useBranding())

        expect(capturedListener).toBeDefined()

        unmount()

        expect(capturedListener).toBeUndefined()
    })
})
