import { render, screen } from "@testing-library/react"
import React from "react"

import { GameStatus } from "../../constants/game"
import { StatusBanner } from "./StatusBanner"

jest.mock("../../config/envconfig", () => ({
    BASE_URL: "/mock-base-url/",
}))

describe("StatusBanner Component", () => {
    it("renders coming-soon status banner with correct image", () => {
        render(<StatusBanner status={GameStatus.ComingSoon} />)

        const image = screen.getByRole("img", { name: "coming-soon status" })
        expect(image).toBeInTheDocument()
        expect(image).toHaveAttribute(
            "src",
            "/mock-base-url/assets/images/ui/tags/coming-soon.avif"
        )
        expect(image).toHaveAttribute("alt", "coming-soon status")
        expect(image).toHaveStyle({
            width: "100%",
            height: "100%",
            objectFit: "contain",
        })
    })

    it("renders beta status banner with correct image", () => {
        render(<StatusBanner status={GameStatus.Beta} />)

        const image = screen.getByRole("img", { name: "beta status" })
        expect(image).toBeInTheDocument()
        expect(image).toHaveAttribute(
            "src",
            "/mock-base-url/assets/images/ui/tags/beta.avif"
        )
        expect(image).toHaveAttribute("alt", "beta status")
        expect(image).toHaveStyle({
            width: "100%",
            height: "100%",
            objectFit: "contain",
        })
    })

    it("renders new status banner with correct image", () => {
        render(<StatusBanner status={GameStatus.New} />)

        const image = screen.getByRole("img", { name: "new status" })
        expect(image).toBeInTheDocument()
        expect(image).toHaveAttribute(
            "src",
            "/mock-base-url/assets/images/ui/tags/new.avif"
        )
        expect(image).toHaveAttribute("alt", "new status")
        expect(image).toHaveStyle({
            width: "100%",
            height: "100%",
            objectFit: "contain",
        })
    })

    it("applies correct CSS classes for beta status", () => {
        const { container } = render(<StatusBanner status={GameStatus.Beta} />)

        const statusTagDiv = container.querySelector(".statusTag")
        expect(statusTagDiv).toBeInTheDocument()
        expect(statusTagDiv).toHaveClass("statusTag", "beta")
    })

    it("applies correct CSS classes for coming-soon status", () => {
        const { container } = render(
            <StatusBanner status={GameStatus.ComingSoon} />
        )

        const statusTagDiv = container.querySelector(".statusTag")
        expect(statusTagDiv).toBeInTheDocument()
        expect(statusTagDiv).toHaveClass("statusTag", "coming-soon")
    })

    it("applies correct CSS classes for new status", () => {
        const { container } = render(<StatusBanner status={GameStatus.New} />)

        const statusTagDiv = container.querySelector(".statusTag")
        expect(statusTagDiv).toBeInTheDocument()
        expect(statusTagDiv).toHaveClass("statusTag", "new")
    })
})
