import { act, renderHook } from "@testing-library/react"

import * as branding from "../config/branding"
import { useAsset } from "./useAsset"

jest.mock("../config/branding", () => ({
    ...jest.requireActual("../config/branding"),
    subscribeToBrand: jest.fn(),
    getAsset: jest.fn(),
}))

describe("useAsset", () => {
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
        ;(branding.getAsset as jest.Mock).mockImplementation(
            (key: branding.AssetKey) => branding.BRANDED_ASSETS[key].volley
        )
    })

    it("returns branded asset for the given key", () => {
        const { result } = renderHook(() => useAsset("logo"))

        expect(result.current).toBe(
            "assets/images/branding/volley-logo-image.avif"
        )
    })

    it("subscribes to brand changes", () => {
        renderHook(() => useAsset("logo"))

        expect(branding.subscribeToBrand).toHaveBeenCalled()
    })

    it("updates when brand changes", () => {
        const { result } = renderHook(() => useAsset("logo"))

        expect(result.current).toBe(
            "assets/images/branding/volley-logo-image.avif"
        )
        ;(branding.getAsset as jest.Mock).mockImplementation(
            (key: branding.AssetKey) => branding.BRANDED_ASSETS[key].weekend
        )

        act(() => {
            capturedListener?.()
        })

        expect(result.current).toBe("assets/images/weekend-text.webp")
    })
})
