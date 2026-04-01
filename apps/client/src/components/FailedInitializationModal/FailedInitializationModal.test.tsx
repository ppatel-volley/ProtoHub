import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"

import { BRANDED_COPY } from "../../config/branding"
import { FAILURE_MODAL_EXIT_BUTTON_TEXT } from "../UI/FailureModal/FailureModal"
import {
    FAILED_INITIALIZATION_TITLE,
    FailedInitializationModal,
} from "./FailedInitializationModal"

const ERROR_INSTRUCTIONS_PATTERN = BRANDED_COPY.errorInstructions.weekend

jest.mock("@volley/platform-sdk/react", () => ({
    useSupport: jest.fn(() => ({
        getSupportEmail: jest.fn((isWeekend: boolean) =>
            isWeekend ? "support@weekend.com" : "support@volley.tv"
        ),
    })),
}))

import { useSupport } from "@volley/platform-sdk/react"

const mockUseSupport = useSupport as jest.MockedFunction<typeof useSupport>

jest.mock("../../hooks/useBranding")
import { useBranding } from "../../hooks/useBranding"

jest.mock("../../hooks/useCopy", () => ({
    useCopy: (key: string): string => {
        const copy: Record<string, string> = {
            errorInstructions: BRANDED_COPY.errorInstructions.weekend,
        }
        return copy[key] ?? ""
    },
}))
const mockUseBranding = useBranding as jest.MockedFunction<typeof useBranding>

jest.mock("../UI/ConfirmationModal", () => ({
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

describe("FailedInitializationModal", () => {
    const defaultProps = {
        isOpen: true,
        onExit: jest.fn(),
        errorMessage: "Platform connection failed",
    }

    beforeEach(() => {
        jest.clearAllMocks()
        mockUseBranding.mockReturnValue({
            brand: "volley",
            weekendRebrandActive: false,
        })
        mockUseSupport.mockReturnValue({
            getSupportEmail: jest.fn((isWeekend: boolean) =>
                isWeekend ? "support@weekend.com" : "support@volley.tv"
            ),
            showSupportModal: jest.fn(),
        })
    })

    describe("Basic Rendering", () => {
        it("renders modal when isOpen is true", () => {
            render(<FailedInitializationModal {...defaultProps} />)

            expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument()
        })

        it("does not render modal when isOpen is false", () => {
            render(
                <FailedInitializationModal {...defaultProps} isOpen={false} />
            )

            expect(
                screen.queryByTestId("confirmation-modal")
            ).not.toBeInTheDocument()
        })

        it("uses correct container ID", () => {
            render(<FailedInitializationModal {...defaultProps} />)

            expect(screen.getByTestId("modal-container-id")).toHaveTextContent(
                "failed-initialization-modal-container"
            )
        })

        it("sets correct default focus key", () => {
            render(<FailedInitializationModal {...defaultProps} />)

            expect(
                screen.getByTestId("modal-default-focus-key")
            ).toHaveTextContent("exit-button")
        })
    })

    describe("Custom Content Rendering", () => {
        it("renders custom styled content instead of plain message", () => {
            render(<FailedInitializationModal {...defaultProps} />)

            expect(
                screen.getByTestId("modal-custom-content")
            ).toBeInTheDocument()

            expect(screen.getByTestId("modal-message")).toHaveTextContent("")
        })

        it("displays the main title", () => {
            render(<FailedInitializationModal {...defaultProps} />)

            expect(
                screen.getByText(FAILED_INITIALIZATION_TITLE)
            ).toBeInTheDocument()
        })

        it("displays the instructions with email from platform SDK", () => {
            render(<FailedInitializationModal {...defaultProps} />)

            expect(
                screen.getByText(new RegExp(ERROR_INSTRUCTIONS_PATTERN))
            ).toBeInTheDocument()
            expect(screen.getByText("support@volley.tv")).toBeInTheDocument()
        })

        it("uses email provided by platform SDK useSupport hook", () => {
            const customEmail = "custom-support@example.com"
            mockUseSupport.mockReturnValue({
                getSupportEmail: jest.fn(() => customEmail),
                showSupportModal: jest.fn(),
            })

            render(<FailedInitializationModal {...defaultProps} />)

            expect(screen.getByText(customEmail)).toBeInTheDocument()
        })

        it("displays the error message", () => {
            render(<FailedInitializationModal {...defaultProps} />)

            expect(
                screen.getByText("Error: Platform connection failed")
            ).toBeInTheDocument()
        })

        it("displays different error messages correctly", () => {
            const customErrorMessage = "Network timeout error"
            render(
                <FailedInitializationModal
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
            render(
                <FailedInitializationModal {...defaultProps} errorMessage="" />
            )

            expect(screen.queryByText("Error:")).not.toBeInTheDocument()
        })

        it("handles special characters in error message", () => {
            const specialErrorMessage = "Error with special chars: !@#$%^&*()"
            render(
                <FailedInitializationModal
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
            render(<FailedInitializationModal {...defaultProps} />)

            expect(screen.getByTestId("button-exit-button")).toBeInTheDocument()
            expect(
                screen.getByText(FAILURE_MODAL_EXIT_BUTTON_TEXT)
            ).toBeInTheDocument()
        })

        it("marks Exit App button as primary", () => {
            render(<FailedInitializationModal {...defaultProps} />)

            const exitButton = screen.getByTestId("button-exit-button")
            expect(exitButton.getAttribute("data-is-primary")).toBe("true")
        })

        it("calls onExit when Exit App button is clicked", () => {
            render(<FailedInitializationModal {...defaultProps} />)

            fireEvent.click(screen.getByTestId("button-exit-button"))
            expect(defaultProps.onExit).toHaveBeenCalledTimes(1)
        })

        it("only renders one button", () => {
            render(<FailedInitializationModal {...defaultProps} />)

            const buttonsContainer = screen.getByTestId("modal-buttons")
            const buttons = buttonsContainer.querySelectorAll("button")
            expect(buttons).toHaveLength(1)
        })
    })

    describe("Props Handling", () => {
        it("passes isOpen prop correctly", () => {
            const { rerender } = render(
                <FailedInitializationModal {...defaultProps} isOpen />
            )

            expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument()

            rerender(
                <FailedInitializationModal {...defaultProps} isOpen={false} />
            )

            expect(
                screen.queryByTestId("confirmation-modal")
            ).not.toBeInTheDocument()
        })

        it("handles onExit prop changes", () => {
            const newOnExit = jest.fn()
            const { rerender } = render(
                <FailedInitializationModal {...defaultProps} />
            )

            fireEvent.click(screen.getByTestId("button-exit-button"))
            expect(defaultProps.onExit).toHaveBeenCalledTimes(1)
            expect(newOnExit).not.toHaveBeenCalled()

            rerender(
                <FailedInitializationModal
                    {...defaultProps}
                    onExit={newOnExit}
                />
            )

            fireEvent.click(screen.getByTestId("button-exit-button"))
            expect(newOnExit).toHaveBeenCalledTimes(1)
        })
    })

    describe("Styling Integration", () => {
        it("applies CSS modules classes correctly", () => {
            render(<FailedInitializationModal {...defaultProps} />)

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

    describe("Weekend Rebrand", () => {
        it("displays Volley support email when weekend rebrand is not active", () => {
            mockUseBranding.mockReturnValue({
                brand: "volley",
                weekendRebrandActive: false,
            })

            render(<FailedInitializationModal {...defaultProps} />)

            expect(screen.getByText("support@volley.tv")).toBeInTheDocument()
            expect(
                screen.queryByText("support@weekend.com")
            ).not.toBeInTheDocument()
        })

        it("displays Weekend support email when weekend rebrand is active", () => {
            mockUseBranding.mockReturnValue({
                brand: "weekend",
                weekendRebrandActive: true,
            })

            render(<FailedInitializationModal {...defaultProps} />)

            expect(screen.getByText("support@weekend.com")).toBeInTheDocument()
            expect(
                screen.queryByText("support@volley.tv")
            ).not.toBeInTheDocument()
        })

        it("passes weekendRebrandActive to getSupportEmail", () => {
            const mockGetSupportEmail = jest.fn(() => "support@weekend.com")
            mockUseSupport.mockReturnValue({
                getSupportEmail: mockGetSupportEmail,
                showSupportModal: jest.fn(),
            })
            mockUseBranding.mockReturnValue({
                brand: "weekend",
                weekendRebrandActive: true,
            })

            render(<FailedInitializationModal {...defaultProps} />)

            expect(mockGetSupportEmail).toHaveBeenCalledWith(true)
        })
    })
})
