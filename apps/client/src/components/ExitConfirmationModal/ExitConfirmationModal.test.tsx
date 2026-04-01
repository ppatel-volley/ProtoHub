import { act, render, screen } from "@testing-library/react"
import React from "react"

import {
    EXIT_CONFIRMATION_MESSAGE,
    EXIT_CONFIRMATION_NO_TEXT,
    EXIT_CONFIRMATION_YES_TEXT,
    ExitConfirmationModal,
} from "./ExitConfirmationModal"

// Mock react-modal
jest.mock("react-modal", () => {
    return {
        __esModule: true,
        default: ({
            isOpen,
            children,
            className,
            overlayClassName,
            onAfterOpen,
        }: {
            isOpen: boolean
            children: React.ReactNode
            className: string
            overlayClassName: string
            onAfterOpen?: () => void
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
                    </div>
                </div>
            )
        },
    }
})

// Mock spatial navigation
jest.mock("@noriginmedia/norigin-spatial-navigation", () => ({
    useFocusable: jest.fn(),
}))

// Mock FocusableContainer
jest.mock("../FocusableUI/FocusableContainer", () => ({
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

// Mock platform SDK
jest.mock("../../utils/logger", () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
    },
}))

// Mock envconfig to avoid import.meta issues in tests
jest.mock("../../config/envconfig", () => ({
    BASE_URL: "/mock-base-url/",
    LOGO_DISPLAY_MILLIS: 100,
}))

// Mock Rive dependencies
jest.mock("@rive-app/react-canvas", () => ({
    useRive: jest.fn(() => ({
        RiveComponent: ({
            style,
        }: {
            style?: React.CSSProperties
        }): React.ReactElement => (
            <div data-testid="rive-component" style={style} />
        ),
        rive: {},
    })),
    useStateMachineInput: jest.fn(() => ({
        value: 0,
    })),
}))

// Mock RiveButton
jest.mock("../UI/RiveButton", () => ({
    RiveButton: ({
        title,
        onClick,
        focusKey,
        autoFocus,
    }: {
        title: string
        onClick: () => void
        focusKey: string
        autoFocus?: boolean
    }): React.ReactElement => (
        <button
            data-testid={`rive-button-${focusKey}`}
            data-autofocus={autoFocus?.toString()}
            onClick={onClick}
        >
            {title}
        </button>
    ),
}))

// Import the mocked modules
import { useFocusable } from "@noriginmedia/norigin-spatial-navigation"

const mockUseFocusable = useFocusable as jest.Mock

// Mock requestAnimationFrame
Object.defineProperty(window, "requestAnimationFrame", {
    writable: true,
    value: (callback: FrameRequestCallback) => {
        return setTimeout(callback, 0)
    },
})

describe("ExitConfirmationModal", () => {
    const mockOnConfirm = jest.fn()
    const mockOnCancel = jest.fn()
    const mockFocusSelf = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
        jest.useFakeTimers()

        // Setup default mock returns for useFocusable
        mockUseFocusable.mockImplementation(() => ({
            ref: { current: null },
            focused: false,
            focusSelf: mockFocusSelf,
        }))
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    it("should not render when isOpen is false", () => {
        render(
            <ExitConfirmationModal
                isOpen={false}
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
            />
        )

        expect(screen.queryByTestId("modal-overlay")).not.toBeInTheDocument()
    })

    it("should render when isOpen is true", () => {
        render(
            <ExitConfirmationModal
                isOpen
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
            />
        )

        expect(screen.getByTestId("modal-overlay")).toBeInTheDocument()
        expect(screen.getByTestId("modal-content")).toBeInTheDocument()
        expect(screen.getByTestId("focusable-container")).toBeInTheDocument()
        expect(screen.getByText(EXIT_CONFIRMATION_MESSAGE)).toBeInTheDocument()
        expect(
            screen.getByTestId("rive-button-confirm-button")
        ).toBeInTheDocument()
        expect(
            screen.getByTestId("rive-button-cancel-button")
        ).toBeInTheDocument()
    })

    it("should call onConfirm when confirm button is clicked", () => {
        render(
            <ExitConfirmationModal
                isOpen
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
            />
        )

        const confirmButton = screen.getByTestId("rive-button-confirm-button")
        confirmButton.click()

        expect(mockOnConfirm).toHaveBeenCalled()
    })

    it("should call onCancel when cancel button is clicked", () => {
        render(
            <ExitConfirmationModal
                isOpen
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
            />
        )

        const cancelButton = screen.getByTestId("rive-button-cancel-button")
        cancelButton.click()

        expect(mockOnCancel).toHaveBeenCalled()
    })

    it("should render correct button text", () => {
        render(
            <ExitConfirmationModal
                isOpen
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
            />
        )

        expect(screen.getByText(EXIT_CONFIRMATION_YES_TEXT)).toBeInTheDocument()
        expect(screen.getByText(EXIT_CONFIRMATION_NO_TEXT)).toBeInTheDocument()
    })

    it("should set autoFocus to false for cancel button", () => {
        render(
            <ExitConfirmationModal
                isOpen
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
            />
        )

        const cancelButton = screen.getByTestId("rive-button-cancel-button")
        expect(cancelButton).toHaveAttribute("data-autofocus", "false")
    })

    it("should enable autoFocus for cancel button after delay", () => {
        render(
            <ExitConfirmationModal
                isOpen
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
            />
        )

        let cancelButton = screen.getByTestId("rive-button-cancel-button")
        expect(cancelButton).toHaveAttribute("data-autofocus", "false")

        act(() => {
            jest.runAllTimers()
        })

        cancelButton = screen.getByTestId("rive-button-cancel-button")
        expect(cancelButton).toHaveAttribute("data-autofocus", "true")
    })

    it("should never enable autoFocus for confirm button", () => {
        render(
            <ExitConfirmationModal
                isOpen
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
            />
        )

        const confirmButton = screen.getByTestId("rive-button-confirm-button")
        expect(confirmButton).toHaveAttribute("data-autofocus", "false")

        act(() => {
            jest.runAllTimers()
        })

        expect(confirmButton).toHaveAttribute("data-autofocus", "false")
    })

    it("should reset state when modal closes and reopens", () => {
        const { rerender } = render(
            <ExitConfirmationModal
                isOpen
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
            />
        )

        act(() => {
            jest.runAllTimers()
        })

        let cancelButton = screen.getByTestId("rive-button-cancel-button")
        expect(cancelButton).toHaveAttribute("data-autofocus", "true")

        rerender(
            <ExitConfirmationModal
                isOpen={false}
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
            />
        )

        expect(screen.queryByTestId("modal-overlay")).not.toBeInTheDocument()

        rerender(
            <ExitConfirmationModal
                isOpen
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
            />
        )

        cancelButton = screen.getByTestId("rive-button-cancel-button")
        expect(cancelButton).toHaveAttribute("data-autofocus", "false")
    })

    it("should use correct container ID for FocusableContainer", () => {
        render(
            <ExitConfirmationModal
                isOpen
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
            />
        )

        const focusableContainer = screen.getByTestId("focusable-container")
        expect(focusableContainer).toBeInTheDocument()
    })

    it("should pass correct props to FocusableContainer", () => {
        render(
            <ExitConfirmationModal
                isOpen
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
            />
        )

        const focusableContainer = screen.getByTestId("focusable-container")
        expect(focusableContainer).toHaveAttribute("data-autofocus", "true")
        expect(focusableContainer).toHaveAttribute("data-focusable", "true")
        expect(focusableContainer).toHaveAttribute(
            "data-save-last-focused-child",
            "false"
        )
        expect(focusableContainer).toHaveAttribute(
            "data-default-focus-key",
            "cancel-button"
        )
        expect(focusableContainer).toHaveAttribute(
            "data-container-id",
            "exit-confirmation-modal-container"
        )
    })
})
