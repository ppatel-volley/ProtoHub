import { renderHook } from "@testing-library/react"

import { useBrandDocumentMeta } from "./useBrandDocumentMeta"

const mockUseBranding = jest.fn()
jest.mock("./useBranding", () => ({
    useBranding: (): unknown => mockUseBranding(),
}))

jest.mock("../config/branding", () => ({
    getAsset: jest.fn((key: string) =>
        key === "favicon" ? "weekend-favicon-48x48.png" : ""
    ),
}))

jest.mock("../config/envconfig", () => ({
    BASE_URL: "/",
}))

describe("useBrandDocumentMeta", () => {
    let mockLink: HTMLLinkElement
    let mockParentNode: { replaceChild: jest.Mock }

    beforeEach(() => {
        jest.clearAllMocks()
        document.title = ""
        mockLink = document.createElement("link")
        mockLink.rel = "icon"
        mockLink.href = "/volley-favicon.png"
        mockParentNode = { replaceChild: jest.fn() }
        Object.defineProperty(mockLink, "parentNode", {
            value: mockParentNode,
            configurable: true,
        })
        jest.spyOn(document, "querySelector").mockReturnValue(mockLink)
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    it("sets document title to Weekend when rebrand is active", () => {
        mockUseBranding.mockReturnValue({
            brand: "weekend",
            weekendRebrandActive: true,
        })

        renderHook(() => useBrandDocumentMeta())

        expect(document.title).toBe("Weekend")
    })

    it("sets document title to Volley when rebrand is not active", () => {
        mockUseBranding.mockReturnValue({
            brand: "volley",
            weekendRebrandActive: false,
        })

        renderHook(() => useBrandDocumentMeta())

        expect(document.title).toBe("Volley")
    })

    it("updates favicon href", () => {
        mockUseBranding.mockReturnValue({
            brand: "weekend",
            weekendRebrandActive: true,
        })

        renderHook(() => useBrandDocumentMeta())

        expect(mockParentNode.replaceChild).toHaveBeenCalledWith(
            expect.objectContaining({
                href: expect.stringContaining("weekend-favicon-48x48.png"),
            }),
            mockLink
        )
    })

    it("does not throw when favicon link element is missing", () => {
        jest.spyOn(document, "querySelector").mockReturnValue(null)
        mockUseBranding.mockReturnValue({
            brand: "volley",
            weekendRebrandActive: false,
        })

        expect(() => {
            renderHook(() => useBrandDocumentMeta())
        }).not.toThrow()
    })
})
