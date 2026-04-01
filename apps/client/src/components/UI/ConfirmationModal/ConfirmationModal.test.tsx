import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"

import {
    CONFIRMATION_MODAL_DEFAULT_MESSAGE,
    CONFIRMATION_MODAL_NO_TEXT,
    CONFIRMATION_MODAL_OK_TEXT,
    CONFIRMATION_MODAL_YES_TEXT,
    type ConfirmationButton,
    ConfirmationModal,
} from "./ConfirmationModal"

jest.mock("react-modal", () => {
    return {
        __esModule: true,
        default: ({
            isOpen,
            children,
            className,
            overlayClassName,
            onAfterOpen,
            onRequestClose,
        }: {
            isOpen: boolean
            children: React.ReactNode
            className: string
            overlayClassName: string
            onAfterOpen?: () => void
            onRequestClose?: () => void
        }): React.ReactElement | null => {
            // eslint-disable-next-line react-hooks/rules-of-hooks
            React.useEffect(() => {
                if (isOpen && onAfterOpen) {
                    onAfterOpen()
                }
            }, [isOpen, onAfterOpen])

            if (!isOpen) return null
            return (
                <div data-testid="modal-overlay" className={overlayClassName}>
                    <div data-testid="modal-content" className={className}>
                        {children}
                        {onRequestClose && (
                            <button
                                data-testid="modal-close"
                                onClick={onRequestClose}
                            >
                                Close
                            </button>
                        )}
                    </div>
                </div>
            )
        },
    }
})

jest.mock("@noriginmedia/norigin-spatial-navigation", () => ({
    useFocusable: jest.fn(),
}))

jest.mock("../../FocusableUI/FocusableContainer", () => ({
    FocusableContainer: ({
        children,
        className,
        autoFocus,
        focusable,
        saveLastFocusedChild,
        defaultFocusKey,
        containerId,
    }: {
        children: React.ReactNode
        className: string
        autoFocus?: boolean
        focusable?: boolean
        saveLastFocusedChild?: boolean
        defaultFocusKey?: string
        containerId?: string
    }): React.ReactElement => (
        <div
            data-testid="focusable-container"
            className={className}
            data-autofocus={autoFocus?.toString()}
            data-focusable={focusable?.toString()}
            data-save-last-focused-child={saveLastFocusedChild?.toString()}
            data-default-focus-key={defaultFocusKey}
            data-container-id={containerId}
        >
            {children}
        </div>
    ),
}))

jest.mock("../RiveButton", () => ({
    RiveButton: ({
        title,
        onClick,
        focusKey,
        autoFocus,
    }: {
        title: string
        onClick: () => void
        focusKey: string
        autoFocus: boolean
    }): React.ReactElement => (
        <button
            data-testid={`button-${focusKey}`}
            data-focus-key={focusKey}
            data-auto-focus={autoFocus?.toString()}
            onClick={onClick}
        >
            {title}
        </button>
    ),
}))

describe("ConfirmationModal", () => {
    const mockButton1: ConfirmationButton = {
        title: CONFIRMATION_MODAL_YES_TEXT,
        onClick: jest.fn(),
        focusKey: "yes-button",
    }

    const mockButton2: ConfirmationButton = {
        title: CONFIRMATION_MODAL_NO_TEXT,
        onClick: jest.fn(),
        focusKey: "no-button",
        isPrimary: true,
    }

    const defaultProps = {
        isOpen: true,
        message: CONFIRMATION_MODAL_DEFAULT_MESSAGE,
        buttons: [mockButton1, mockButton2],
    }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe("Basic Rendering", () => {
        it("renders modal when isOpen is true", () => {
            render(<ConfirmationModal {...defaultProps} />)

            expect(screen.getByTestId("modal-overlay")).toBeInTheDocument()
            expect(screen.getByTestId("modal-content")).toBeInTheDocument()
            expect(
                screen.getByTestId("focusable-container")
            ).toBeInTheDocument()
        })

        it("does not render modal when isOpen is false", () => {
            render(<ConfirmationModal {...defaultProps} isOpen={false} />)

            expect(
                screen.queryByTestId("modal-overlay")
            ).not.toBeInTheDocument()
            expect(
                screen.queryByTestId("modal-content")
            ).not.toBeInTheDocument()
        })

        it("renders string message correctly", () => {
            render(<ConfirmationModal {...defaultProps} />)

            expect(
                screen.getByText(CONFIRMATION_MODAL_DEFAULT_MESSAGE)
            ).toBeInTheDocument()
        })

        it("renders custom JSX content when provided", () => {
            const customContent = (
                <div>
                    <h2 data-testid="custom-title">Custom Title</h2>
                    <p data-testid="custom-text">Custom message text</p>
                </div>
            )

            render(
                <ConfirmationModal
                    {...defaultProps}
                    message=""
                    customContent={customContent}
                />
            )

            expect(screen.getByTestId("custom-title")).toBeInTheDocument()
            expect(screen.getByTestId("custom-text")).toBeInTheDocument()
            expect(
                screen.queryByText(CONFIRMATION_MODAL_DEFAULT_MESSAGE)
            ).not.toBeInTheDocument()
        })

        it("prefers custom content over string message when both provided", () => {
            const customContent = <div data-testid="custom-content">Custom</div>

            render(
                <ConfirmationModal
                    {...defaultProps}
                    customContent={customContent}
                />
            )

            expect(screen.getByTestId("custom-content")).toBeInTheDocument()
            expect(
                screen.queryByText(CONFIRMATION_MODAL_DEFAULT_MESSAGE)
            ).not.toBeInTheDocument()
        })
    })

    describe("Button Rendering and Interaction", () => {
        it("renders all provided buttons", () => {
            render(<ConfirmationModal {...defaultProps} />)

            expect(screen.getByTestId("button-yes-button")).toBeInTheDocument()
            expect(screen.getByTestId("button-no-button")).toBeInTheDocument()
            expect(
                screen.getByText(CONFIRMATION_MODAL_YES_TEXT)
            ).toBeInTheDocument()
            expect(
                screen.getByText(CONFIRMATION_MODAL_NO_TEXT)
            ).toBeInTheDocument()
        })

        it("calls button onClick when clicked", () => {
            render(<ConfirmationModal {...defaultProps} />)

            fireEvent.click(screen.getByTestId("button-yes-button"))
            expect(mockButton1.onClick).toHaveBeenCalledTimes(1)

            fireEvent.click(screen.getByTestId("button-no-button"))
            expect(mockButton2.onClick).toHaveBeenCalledTimes(1)
        })

        it("sets autoFocus on primary button", () => {
            render(<ConfirmationModal {...defaultProps} />)

            const yesButton = screen.getByTestId("button-yes-button")
            const noButton = screen.getByTestId("button-no-button")

            expect(yesButton.getAttribute("data-auto-focus")).toBe("false")
            expect(noButton.getAttribute("data-auto-focus")).toBe("false")
        })

        it("handles single button correctly", () => {
            const singleButton: ConfirmationButton = {
                title: CONFIRMATION_MODAL_OK_TEXT,
                onClick: jest.fn(),
                focusKey: "ok-button",
            }

            render(
                <ConfirmationModal {...defaultProps} buttons={[singleButton]} />
            )

            expect(screen.getByTestId("button-ok-button")).toBeInTheDocument()
            expect(
                screen.getByText(CONFIRMATION_MODAL_OK_TEXT)
            ).toBeInTheDocument()
            expect(
                screen.queryByTestId("button-yes-button")
            ).not.toBeInTheDocument()
        })
    })

    describe("Focus Management", () => {
        it("uses provided defaultFocusKey", () => {
            render(
                <ConfirmationModal
                    {...defaultProps}
                    defaultFocusKey="no-button"
                />
            )

            const container = screen.getByTestId("focusable-container")
            expect(container.getAttribute("data-default-focus-key")).toBe(
                "no-button"
            )
        })

        it("defaults to first button's focusKey when no defaultFocusKey provided", () => {
            render(<ConfirmationModal {...defaultProps} />)

            const container = screen.getByTestId("focusable-container")
            expect(container.getAttribute("data-default-focus-key")).toBe(
                "yes-button"
            )
        })

        it("uses custom containerId when provided", () => {
            render(
                <ConfirmationModal
                    {...defaultProps}
                    containerId="custom-modal-container"
                />
            )

            const container = screen.getByTestId("focusable-container")
            expect(container.getAttribute("data-container-id")).toBe(
                "custom-modal-container"
            )
        })

        it("uses default containerId when not provided", () => {
            render(<ConfirmationModal {...defaultProps} />)

            const container = screen.getByTestId("focusable-container")
            expect(container.getAttribute("data-container-id")).toBe(
                "confirmation-modal-container"
            )
        })
    })

    describe("Modal Behavior", () => {
        it("calls onRequestClose when modal requests close", () => {
            const onRequestClose = jest.fn()
            render(
                <ConfirmationModal
                    {...defaultProps}
                    onRequestClose={onRequestClose}
                />
            )

            fireEvent.click(screen.getByTestId("modal-close"))
            expect(onRequestClose).toHaveBeenCalledTimes(1)
        })

        it("handles modal without onRequestClose", () => {
            expect(() => {
                render(<ConfirmationModal {...defaultProps} />)
            }).not.toThrow()
        })
    })

    describe("FocusableContainer Props", () => {
        it("sets correct focusable container properties", () => {
            render(<ConfirmationModal {...defaultProps} />)

            const container = screen.getByTestId("focusable-container")
            expect(container.getAttribute("data-autofocus")).toBe("true")
            expect(container.getAttribute("data-focusable")).toBe("true")
            expect(container.getAttribute("data-save-last-focused-child")).toBe(
                "false"
            )
        })
    })
})
