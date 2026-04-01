import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"

import { BRANDED_COPY } from "../../../config/branding"
import { FAILURE_MODAL_EXIT_BUTTON_TEXT } from "../../UI/FailureModal/FailureModal"
import {
    FAILED_INITIALIZATION_TITLE,
    InvalidPlatformModal,
} from "./InvalidPlatformModal"

const ERROR_INSTRUCTIONS_PATTERN = BRANDED_COPY.errorInstructions.volley

jest.mock("../../../config/branding", () => ({
    ...jest.requireActual("../../../config/branding"),
    getCopy: jest.fn((key: string) => {
        const actual = jest.requireActual("../../../config/branding")
        return actual.BRANDED_COPY[key].volley
    }),
    isWeekendRebrandActive: jest.fn(() => false),
}))

import { getCopy, isWeekendRebrandActive } from "../../../config/branding"

const mockGetCopy = getCopy as jest.MockedFunction<typeof getCopy>
const mockIsWeekendRebrandActive =
    isWeekendRebrandActive as jest.MockedFunction<typeof isWeekendRebrandActive>

jest.mock("../../UI/ConfirmationModal", () => ({
    ConfirmationModal: ({
        isOpen,
        message,
        customContent,
        buttons,
        defaultFocusKey,
        containerId,
    }: {
        isOpen: boolean
        message: string
        customContent?: React.ReactNode
        buttons: Array<{
            title: string
            onClick: () => void
            focusKey: string
            isPrimary?: boolean
        }>
        defaultFocusKey?: string
        containerId?: string
    }): React.ReactElement | null => {
        if (!isOpen) return null

        return (
            <div data-testid="confirmation-modal">
                <div data-testid="modal-container-id">{containerId}</div>
                <div data-testid="modal-default-focus-key">
                    {defaultFocusKey}
                </div>
                <div data-testid="modal-message">{message}</div>
                {customContent && (
                    <div data-testid="modal-custom-content">
                        {customContent}
                    </div>
                )}
                <div data-testid="modal-buttons">
                    {buttons.map((button) => (
                        <button
                            key={button.focusKey}
                            data-testid={`button-${button.focusKey}`}
                            data-is-primary={button.isPrimary?.toString()}
                            onClick={button.onClick}
                        >
                            {button.title}
                        </button>
                    ))}
                </div>
            </div>
        )
    },
}))

describe("InvalidPlatformModal", () => {
    const defaultProps = {
        isOpen: true,
        onExit: jest.fn(),
        errorMessage: "Platform connection failed",
    }

    beforeEach(() => {
        jest.clearAllMocks()
        mockIsWeekendRebrandActive.mockReturnValue(false)
        mockGetCopy.mockImplementation((key: string) => {
            const actual = jest.requireActual("../../../config/branding")
            return actual.BRANDED_COPY[key].volley
        })
    })

    describe("Basic Rendering", () => {
        it("renders modal when isOpen is true", () => {
            render(<InvalidPlatformModal {...defaultProps} />)

            expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument()
        })

        it("does not render modal when isOpen is false", () => {
            render(<InvalidPlatformModal {...defaultProps} isOpen={false} />)

            expect(
                screen.queryByTestId("confirmation-modal")
            ).not.toBeInTheDocument()
        })

        it("uses correct container ID", () => {
            render(<InvalidPlatformModal {...defaultProps} />)

            expect(screen.getByTestId("modal-container-id")).toHaveTextContent(
                "invalid-platform-modal-container"
            )
        })

        it("sets correct default focus key", () => {
            render(<InvalidPlatformModal {...defaultProps} />)

            expect(
                screen.getByTestId("modal-default-focus-key")
            ).toHaveTextContent("exit-button")
        })
    })

    describe("Custom Content Rendering", () => {
        it("renders custom styled content instead of plain message", () => {
            render(<InvalidPlatformModal {...defaultProps} />)

            expect(
                screen.getByTestId("modal-custom-content")
            ).toBeInTheDocument()

            expect(screen.getByTestId("modal-message")).toHaveTextContent("")
        })

        it("displays the main title", () => {
            render(<InvalidPlatformModal {...defaultProps} />)

            expect(
                screen.getByText(FAILED_INITIALIZATION_TITLE)
            ).toBeInTheDocument()
        })

        it("displays the instructions with Volley support email", () => {
            render(<InvalidPlatformModal {...defaultProps} />)

            expect(
                screen.getByText(new RegExp(ERROR_INSTRUCTIONS_PATTERN))
            ).toBeInTheDocument()
            expect(screen.getByText("support@volley.tv")).toBeInTheDocument()
        })

        it("displays Weekend support email when weekend rebrand is active", () => {
            mockIsWeekendRebrandActive.mockReturnValue(true)

            render(<InvalidPlatformModal {...defaultProps} />)

            expect(screen.getByText("support@weekend.com")).toBeInTheDocument()
            expect(
                screen.queryByText("support@volley.tv")
            ).not.toBeInTheDocument()
        })

        it("displays the error message", () => {
            render(<InvalidPlatformModal {...defaultProps} />)

            expect(
                screen.getByText("Error: Platform connection failed")
            ).toBeInTheDocument()
        })

        it("displays different error messages correctly", () => {
            const customErrorMessage = "Network timeout error"
            render(
                <InvalidPlatformModal
                    {...defaultProps}
                    errorMessage={customErrorMessage}
                />
            )

            expect(
                screen.getByText(`Error: ${customErrorMessage}`)
            ).toBeInTheDocument()
            expect(
                screen.queryByText("Error: Platform connection failed")
            ).not.toBeInTheDocument()
        })

        it("handles empty error message", () => {
            render(<InvalidPlatformModal {...defaultProps} errorMessage="" />)

            expect(screen.queryByText("Error:")).not.toBeInTheDocument()
        })

        it("handles special characters in error message", () => {
            const specialErrorMessage = "Error with special chars: !@#$%^&*()"
            render(
                <InvalidPlatformModal
                    {...defaultProps}
                    errorMessage={specialErrorMessage}
                />
            )

            expect(
                screen.getByText(`Error: ${specialErrorMessage}`)
            ).toBeInTheDocument()
        })
    })

    describe("Button Functionality", () => {
        it("renders Exit App button", () => {
            render(<InvalidPlatformModal {...defaultProps} />)

            expect(screen.getByTestId("button-exit-button")).toBeInTheDocument()
            expect(
                screen.getByText(FAILURE_MODAL_EXIT_BUTTON_TEXT)
            ).toBeInTheDocument()
        })

        it("marks Exit App button as primary", () => {
            render(<InvalidPlatformModal {...defaultProps} />)

            const exitButton = screen.getByTestId("button-exit-button")
            expect(exitButton.getAttribute("data-is-primary")).toBe("true")
        })

        it("calls onExit when Exit App button is clicked", () => {
            render(<InvalidPlatformModal {...defaultProps} />)

            fireEvent.click(screen.getByTestId("button-exit-button"))
            expect(defaultProps.onExit).toHaveBeenCalledTimes(1)
        })

        it("only renders one button", () => {
            render(<InvalidPlatformModal {...defaultProps} />)

            const buttonsContainer = screen.getByTestId("modal-buttons")
            const buttons = buttonsContainer.querySelectorAll("button")
            expect(buttons).toHaveLength(1)
        })
    })

    describe("Props Handling", () => {
        it("passes isOpen prop correctly", () => {
            const { rerender } = render(
                <InvalidPlatformModal {...defaultProps} isOpen />
            )

            expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument()

            rerender(<InvalidPlatformModal {...defaultProps} isOpen={false} />)

            expect(
                screen.queryByTestId("confirmation-modal")
            ).not.toBeInTheDocument()
        })

        it("handles onExit prop changes", () => {
            const newOnExit = jest.fn()
            const { rerender } = render(
                <InvalidPlatformModal {...defaultProps} />
            )

            fireEvent.click(screen.getByTestId("button-exit-button"))
            expect(defaultProps.onExit).toHaveBeenCalledTimes(1)
            expect(newOnExit).not.toHaveBeenCalled()

            rerender(
                <InvalidPlatformModal {...defaultProps} onExit={newOnExit} />
            )

            fireEvent.click(screen.getByTestId("button-exit-button"))
            expect(newOnExit).toHaveBeenCalledTimes(1)
        })
    })

    describe("Styling Integration", () => {
        it("applies CSS modules classes correctly", () => {
            render(<InvalidPlatformModal {...defaultProps} />)

            const customContent = screen.getByTestId("modal-custom-content")
            expect(customContent).toBeInTheDocument()

            const titleElement = screen.getByText(FAILED_INITIALIZATION_TITLE)
            const instructionsElement = screen.getByText(
                new RegExp(ERROR_INSTRUCTIONS_PATTERN)
            )
            const errorElement = screen.getByText(/Error:/)

            expect(titleElement).toBeInTheDocument()
            expect(instructionsElement).toBeInTheDocument()
            expect(errorElement).toBeInTheDocument()
        })
    })
})
