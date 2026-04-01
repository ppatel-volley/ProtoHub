import { render, screen } from "@testing-library/react"

import { CssSpinner } from "./CssSpinner"

describe("CssSpinner Component", () => {
    it("should render with default dimensions", () => {
        render(<CssSpinner />)

        const container = screen.getByTestId("spinner-container")
        expect(container).toHaveStyle({
            width: "25%",
            height: "45%",
            minWidth: "25%",
            minHeight: "45%",
        })
    })

    it("should render with custom dimensions", () => {
        render(<CssSpinner width="50%" height="75%" />)

        const container = screen.getByTestId("spinner-container")
        expect(container).toHaveStyle({
            width: "50%",
            height: "75%",
            minWidth: "50%",
            minHeight: "75%",
        })
    })
})
