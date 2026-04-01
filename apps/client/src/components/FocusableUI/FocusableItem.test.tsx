import "@testing-library/jest-dom"

import { fireEvent, render, screen } from "@testing-library/react"
import type { JSX } from "react"

import { ArrowPressProvider } from "./ArrowPressContext"
import {
    CAROUSEL_DEBOUNCE_TIME,
    FocusableItem,
    MOUSE_SUPPRESS_AFTER_KEYPRESS_MS,
} from "./FocusableItem"

let mockFocusable = true
let onFocusHandler: (() => void) | undefined
let onBlurHandler: (() => void) | undefined
let onEnterPressHandler: (() => void) | undefined
let onArrowPressHandler: ((direction: string) => boolean) | undefined

const mockSetFocus = jest.fn()

jest.mock("@noriginmedia/norigin-spatial-navigation", () => ({
    setFocus: (...args: unknown[]): void => mockSetFocus(...args),
    useFocusable: (config: {
        focusable?: boolean
        onFocus?: () => void
        onBlur?: () => void
        onEnterPress?: () => void
        onArrowPress?: (direction: string) => boolean
    }): {
        ref: { current: HTMLDivElement | null }
        focused: boolean
    } => {
        mockFocusable = config.focusable ?? true
        onFocusHandler = config.onFocus
        onBlurHandler = config.onBlur
        onEnterPressHandler = config.onEnterPress
        onArrowPressHandler = config.onArrowPress

        return {
            ref: { current: null },
            focused: mockFocusable,
        }
    },
}))

const defaultProps = {
    focusKey: "test-item",
    children: <div data-testid="child-content">Test Content</div>,
}

const renderWithProvider = (component: JSX.Element): void => {
    render(<ArrowPressProvider>{component}</ArrowPressProvider>)
}

describe("FocusableItem", () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockFocusable = true
        onFocusHandler = undefined
        onBlurHandler = undefined
        onEnterPressHandler = undefined
        onArrowPressHandler = undefined
    })

    describe("Focusable Prop Behavior", () => {
        it("defaults to focusable=true when prop is not provided", () => {
            renderWithProvider(<FocusableItem {...defaultProps} />)

            expect(mockFocusable).toBe(true)
        })

        it("passes focusable=true to useFocusable hook", () => {
            renderWithProvider(<FocusableItem {...defaultProps} focusable />)

            expect(mockFocusable).toBe(true)
        })

        it("passes focusable=false to useFocusable hook", () => {
            renderWithProvider(
                <FocusableItem {...defaultProps} focusable={false} />
            )

            expect(mockFocusable).toBe(false)
        })

        it("does not apply focused className when focusable=false", () => {
            mockFocusable = false
            renderWithProvider(
                <FocusableItem
                    {...defaultProps}
                    focusable={false}
                    focusedClassName="focused-class"
                />
            )

            const container = screen.getByTestId("child-content").parentElement
            expect(container).not.toHaveClass("focused-class")
        })
    })

    describe("Focus Handlers", () => {
        it("calls onFocus when focus event is triggered", () => {
            const mockOnFocus = jest.fn()
            renderWithProvider(
                <FocusableItem {...defaultProps} onFocus={mockOnFocus} />
            )

            if (onFocusHandler) {
                onFocusHandler()
            }

            expect(mockOnFocus).toHaveBeenCalledTimes(1)
        })

        it("calls onBlur when blur event is triggered", () => {
            const mockOnBlur = jest.fn()
            renderWithProvider(
                <FocusableItem {...defaultProps} onBlur={mockOnBlur} />
            )

            if (onBlurHandler) {
                onBlurHandler()
            }

            expect(mockOnBlur).toHaveBeenCalledTimes(1)
        })
    })

    describe("Click and Enter Handlers", () => {
        it("calls onClick when element is clicked", () => {
            const mockOnClick = jest.fn()
            renderWithProvider(
                <FocusableItem {...defaultProps} onClick={mockOnClick} />
            )

            const container = screen.getByTestId("child-content").parentElement
            if (container) {
                fireEvent.click(container)
            }

            expect(mockOnClick).toHaveBeenCalledTimes(1)
        })

        it("calls onEnterPress when enter key is pressed", () => {
            const mockOnEnterPress = jest.fn()
            renderWithProvider(
                <FocusableItem
                    {...defaultProps}
                    onEnterPress={mockOnEnterPress}
                />
            )

            if (onEnterPressHandler) {
                onEnterPressHandler()
            }

            expect(mockOnEnterPress).toHaveBeenCalledTimes(1)
        })

        it("prevents default on click events", () => {
            const mockOnClick = jest.fn()
            renderWithProvider(
                <FocusableItem {...defaultProps} onClick={mockOnClick} />
            )

            const container = screen.getByTestId("child-content").parentElement
            if (container) {
                const clickEvent = new MouseEvent("click", {
                    bubbles: true,
                    cancelable: true,
                })
                const preventDefaultSpy = jest.spyOn(
                    clickEvent,
                    "preventDefault"
                )

                fireEvent(container, clickEvent)

                expect(preventDefaultSpy).toHaveBeenCalled()
            }
        })
    })

    describe("Arrow Press Handling", () => {
        beforeEach(() => {
            jest.useFakeTimers()
        })

        afterEach(() => {
            jest.useRealTimers()
        })

        it("handles arrow press events correctly", () => {
            const mockOnArrowPress = jest.fn().mockReturnValue(true)
            renderWithProvider(
                <FocusableItem
                    {...defaultProps}
                    onArrowPress={mockOnArrowPress}
                />
            )

            if (onArrowPressHandler) {
                const result = onArrowPressHandler("right")
                expect(result).toBe(true)
            }

            expect(mockOnArrowPress).toHaveBeenCalledWith(
                "right",
                undefined,
                undefined
            )
        })

        it("debounces opposite direction arrow presses", () => {
            const mockOnArrowPress = jest.fn().mockReturnValue(true)
            renderWithProvider(
                <FocusableItem
                    {...defaultProps}
                    onArrowPress={mockOnArrowPress}
                />
            )

            if (onArrowPressHandler) {
                onArrowPressHandler("right")
            }

            jest.advanceTimersByTime(CAROUSEL_DEBOUNCE_TIME / 2)
            if (onArrowPressHandler) {
                const result = onArrowPressHandler("left")
                expect(result).toBe(false)
            }

            expect(mockOnArrowPress).toHaveBeenCalledTimes(1)
        })

        it("allows arrow presses after debounce time", () => {
            const mockOnArrowPress = jest.fn().mockReturnValue(true)
            renderWithProvider(
                <FocusableItem
                    {...defaultProps}
                    onArrowPress={mockOnArrowPress}
                />
            )

            if (onArrowPressHandler) {
                onArrowPressHandler("right")
            }

            jest.advanceTimersByTime(CAROUSEL_DEBOUNCE_TIME * 1.5)
            if (onArrowPressHandler) {
                const result = onArrowPressHandler("left")
                expect(result).toBe(true)
            }

            expect(mockOnArrowPress).toHaveBeenCalledTimes(2)
        })

        it("returns true for arrow press when no custom handler is provided", () => {
            renderWithProvider(<FocusableItem {...defaultProps} />)

            if (onArrowPressHandler) {
                const result = onArrowPressHandler("right")
                expect(result).toBe(true)
            }
        })
    })

    describe("Mouse Hover", () => {
        beforeEach(() => {
            jest.useFakeTimers()
        })

        afterEach(() => {
            jest.useRealTimers()
        })

        it("calls setFocus on mouse enter", () => {
            renderWithProvider(<FocusableItem {...defaultProps} />)

            const container = screen.getByTestId("child-content").parentElement
            if (container) {
                fireEvent.mouseEnter(container)
            }

            expect(mockSetFocus).toHaveBeenCalledWith("test-item")
        })

        it("suppresses mouse enter shortly after an arrow press", () => {
            renderWithProvider(<FocusableItem {...defaultProps} />)

            if (onArrowPressHandler) {
                onArrowPressHandler("right")
            }

            jest.advanceTimersByTime(MOUSE_SUPPRESS_AFTER_KEYPRESS_MS / 2)

            const container = screen.getByTestId("child-content").parentElement
            if (container) {
                fireEvent.mouseEnter(container)
            }

            expect(mockSetFocus).not.toHaveBeenCalled()
        })

        it("allows mouse enter after suppression window expires", () => {
            renderWithProvider(<FocusableItem {...defaultProps} />)

            if (onArrowPressHandler) {
                onArrowPressHandler("right")
            }

            jest.advanceTimersByTime(MOUSE_SUPPRESS_AFTER_KEYPRESS_MS + 1)

            const container = screen.getByTestId("child-content").parentElement
            if (container) {
                fireEvent.mouseEnter(container)
            }

            expect(mockSetFocus).toHaveBeenCalledWith("test-item")
        })
    })
})
