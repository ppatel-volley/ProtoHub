import { render, screen } from "@testing-library/react"
import React from "react"

import { useBranding } from "../../../../hooks/useBranding"
import { Icon } from "./Icon"

jest.mock("../../../../hooks/useBranding")

const mockUseBranding = useBranding as jest.MockedFunction<typeof useBranding>

describe("Icon - Weekend Rebrand", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe("when weekend rebrand is active", () => {
        beforeEach(() => {
            mockUseBranding.mockReturnValue({
                brand: "weekend",
                weekendRebrandActive: true,
            })
        })

        it("should render Weekend icon SVG with 70x70 viewBox", () => {
            render(<Icon />)
            const svg = screen.getByRole("img", { name: "App Icon" })
            expect(svg).toBeInTheDocument()
            expect(svg.getAttribute("viewBox")).toBe("0 0 70 70")
        })

        it("should have accessibility attributes", () => {
            render(<Icon />)
            const svg = screen.getByRole("img", { name: "App Icon" })
            expect(svg).toHaveAttribute("role", "img")
            expect(svg).toHaveAttribute("aria-label", "App Icon")
        })

        it("should apply weekendIcon CSS class", () => {
            render(<Icon />)
            const svg = screen.getByRole("img", { name: "App Icon" })
            expect(svg.getAttribute("class")).toContain("weekendIcon")
        })

        it("should contain Weekend W path fill color", () => {
            render(<Icon />)
            const svg = screen.getByRole("img", { name: "App Icon" })
            const weekendPath = svg.querySelector('path[fill="#0A0322"]')
            expect(weekendPath).toBeInTheDocument()
        })
    })

    describe("when weekend rebrand is not active", () => {
        beforeEach(() => {
            mockUseBranding.mockReturnValue({
                brand: "volley",
                weekendRebrandActive: false,
            })
        })

        it("should render Volley icon SVG with 70x70 viewBox", () => {
            render(<Icon />)
            const svg = screen.getByRole("img", { name: "App Icon" })
            expect(svg).toBeInTheDocument()
            expect(svg.getAttribute("viewBox")).toBe("0 0 70 70")
        })

        it("should have accessibility attributes", () => {
            render(<Icon />)
            const svg = screen.getByRole("img", { name: "App Icon" })
            expect(svg).toHaveAttribute("role", "img")
            expect(svg).toHaveAttribute("aria-label", "App Icon")
        })

        it("should apply icon CSS class", () => {
            render(<Icon />)
            const svg = screen.getByRole("img", { name: "App Icon" })
            expect(svg.getAttribute("class")).toContain("icon")
        })

        it("should contain Volley yellow background rect", () => {
            render(<Icon />)
            const svg = screen.getByRole("img", { name: "App Icon" })
            const volleyRect = svg.querySelector('rect[fill="#FFEC37"]')
            expect(volleyRect).toBeInTheDocument()
        })
    })
})
