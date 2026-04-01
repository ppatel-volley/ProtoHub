import { render, screen } from "@testing-library/react"

import { GameLoadingScreen } from "./GameLoadingScreen"

describe("GameLoadingScreen", () => {
    it("renders the loading spinner", () => {
        render(<GameLoadingScreen />)

        expect(screen.getByAltText("Loading Spinner")).toBeInTheDocument()
    })
})
