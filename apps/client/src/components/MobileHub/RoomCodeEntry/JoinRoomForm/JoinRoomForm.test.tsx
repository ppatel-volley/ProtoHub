import { render, screen } from "@testing-library/react"
import React from "react"

import { useBranding } from "../../../../hooks/useBranding"
import { JoinRoomForm } from "./JoinRoomForm"

jest.mock("../../../../hooks/useBranding")

const mockUseBranding = useBranding as jest.MockedFunction<typeof useBranding>

describe("JoinRoomForm", () => {
    const defaultProps = {
        roomCode: "ABC123",
        onRoomCodeChange: jest.fn(),
        onSubmit: jest.fn(),
        error: null,
        isSubmitEnabled: true,
    }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe("weekend rebrand", () => {
        it("displays 'Weekend Hub' helper text when weekend rebrand is active", () => {
            mockUseBranding.mockReturnValue({
                brand: "weekend",
                weekendRebrandActive: true,
            })

            render(<JoinRoomForm {...defaultProps} />)

            expect(
                screen.getByText("Shown in Weekend Hub on TV")
            ).toBeInTheDocument()
        })

        it("displays 'Volley Hub' helper text when weekend rebrand is not active", () => {
            mockUseBranding.mockReturnValue({
                brand: "volley",
                weekendRebrandActive: false,
            })

            render(<JoinRoomForm {...defaultProps} />)

            expect(
                screen.getByText("Shown in Volley Hub on TV")
            ).toBeInTheDocument()
        })
    })

    describe("rendering", () => {
        beforeEach(() => {
            mockUseBranding.mockReturnValue({
                brand: "volley",
                weekendRebrandActive: false,
            })
        })

        it("renders room code input with correct value", () => {
            render(<JoinRoomForm {...defaultProps} roomCode="ABC123" />)

            const input = screen.getByPlaceholderText("____")
            expect(input).toHaveValue("ABC123")
        })

        it("renders room code input with placeholder when roomCode is null", () => {
            render(<JoinRoomForm {...defaultProps} roomCode={null} />)

            const input = screen.getByPlaceholderText("____")
            expect(input).toHaveValue("")
        })

        it("renders submit button", () => {
            render(<JoinRoomForm {...defaultProps} />)

            const button = screen.getByRole("button")
            expect(button).toBeInTheDocument()
        })

        it("disables submit button when isSubmitEnabled is false", () => {
            render(<JoinRoomForm {...defaultProps} isSubmitEnabled={false} />)

            const button = screen.getByRole("button")
            expect(button).toBeDisabled()
        })

        it("enables submit button when isSubmitEnabled is true", () => {
            render(<JoinRoomForm {...defaultProps} isSubmitEnabled />)

            const button = screen.getByRole("button")
            expect(button).not.toBeDisabled()
        })

        it("displays error message when error is present", () => {
            render(<JoinRoomForm {...defaultProps} error="Invalid room code" />)

            expect(screen.getByText("Invalid room code")).toBeInTheDocument()
        })

        it("does not display error message when error is null", () => {
            render(<JoinRoomForm {...defaultProps} error={null} />)

            expect(screen.queryByRole("alert")).not.toBeInTheDocument()
        })
    })
})
