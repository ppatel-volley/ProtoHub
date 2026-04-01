import { act, renderHook } from "@testing-library/react"

import * as branding from "../config/branding"
import { useCopy } from "./useCopy"

jest.mock("../config/branding", () => ({
    ...jest.requireActual("../config/branding"),
    subscribeToBrand: jest.fn(),
    getCopy: jest.fn(),
}))

describe("useCopy", () => {
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
        ;(branding.getCopy as jest.Mock).mockImplementation(
            (key: branding.CopyKey) => branding.BRANDED_COPY[key].volley
        )
    })

    it("returns branded copy for the given key", () => {
        const { result } = renderHook(() => useCopy("logoAlt"))

        expect(result.current).toBe("Volley Logo")
    })

    it("subscribes to brand changes", () => {
        renderHook(() => useCopy("logoAlt"))

        expect(branding.subscribeToBrand).toHaveBeenCalled()
    })

    it("updates when brand changes", () => {
        const { result } = renderHook(() => useCopy("logoAlt"))

        expect(result.current).toBe("Volley Logo")
        ;(branding.getCopy as jest.Mock).mockImplementation(
            (key: branding.CopyKey) => branding.BRANDED_COPY[key].weekend
        )

        act(() => {
            capturedListener?.()
        })

        expect(result.current).toBe("Weekend Logo")
    })
})
