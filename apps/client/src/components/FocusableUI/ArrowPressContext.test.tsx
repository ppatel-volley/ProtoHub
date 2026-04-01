import "@testing-library/jest-dom"

import { fireEvent, render, screen } from "@testing-library/react"
import { act, type JSX, useState } from "react"

import { ArrowPressProvider, useArrowPress } from "./ArrowPressContext"
import { CAROUSEL_DEBOUNCE_TIME, FocusableItem } from "./FocusableItem"

// Mock the Norigin Spatial Navigation library
let onArrowPressHandler: ((direction: string) => boolean) | undefined
jest.mock("@noriginmedia/norigin-spatial-navigation", () => ({
    useFocusable: (config: {
        onArrowPress?: (direction: string) => boolean
    }): {
        ref: { current: null }
        focused: boolean
    } => {
        onArrowPressHandler = config.onArrowPress
        return {
            ref: { current: null },
            focused: true,
        }
    },
}))

const TestComponent = (): JSX.Element => {
    const { lastArrowPress } = useArrowPress()
    const [, forceUpdate] = useState({})

    const triggerUpdate = (): void => {
        forceUpdate({})
    }

    return (
        <div data-testid="test-component">
            <FocusableItem focusKey="test">
                <div>
                    <span data-testid="direction">
                        {lastArrowPress.current?.direction || "No direction"}
                    </span>
                    <span data-testid="timestamp">
                        {lastArrowPress.current?.timestamp || "No timestamp"}
                    </span>
                    <button onClick={triggerUpdate} data-testid="update-button">
                        Update
                    </button>
                </div>
            </FocusableItem>
        </div>
    )
}

describe("ArrowPressContext", () => {
    beforeEach(() => {
        jest.useFakeTimers()
        onArrowPressHandler = undefined

        render(
            <ArrowPressProvider>
                <TestComponent />
            </ArrowPressProvider>
        )
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    it("should not debounce double taps in the same direction", () => {
        expect(screen.getByTestId("direction")).toHaveTextContent(
            "No direction"
        )
        expect(screen.getByTestId("timestamp")).toHaveTextContent(
            "No timestamp"
        )

        act(() => {
            if (onArrowPressHandler) {
                onArrowPressHandler("right")
            }

            fireEvent.click(screen.getByTestId("update-button"))
        })

        expect(screen.getByTestId("direction")).toHaveTextContent("right")
        const firstTimestamp = parseInt(
            screen.getByTestId("timestamp").textContent || "0"
        )

        // Second arrow press
        act(() => {
            jest.advanceTimersByTime(1)
            if (onArrowPressHandler) {
                onArrowPressHandler("right")
            }

            fireEvent.click(screen.getByTestId("update-button"))
        })

        // Same direction, don't debounce
        expect(screen.getByTestId("direction")).toHaveTextContent("right")
        expect(screen.getByTestId("timestamp")).not.toHaveTextContent(
            firstTimestamp.toString()
        )

        const secondTimestamp = parseInt(
            screen.getByTestId("timestamp").textContent || "0"
        )

        // We're still within the debounce time
        act(() => {
            jest.advanceTimersByTime(1)
            if (onArrowPressHandler) {
                onArrowPressHandler("left")
            }
            fireEvent.click(screen.getByTestId("update-button"))
        })

        // Debounce, so we expect the last timestamp again
        expect(screen.getByTestId("direction")).toHaveTextContent("right")
        expect(screen.getByTestId("timestamp")).toHaveTextContent(
            secondTimestamp.toString()
        )

        // Wait for debounce time
        act(() => {
            jest.advanceTimersByTime(CAROUSEL_DEBOUNCE_TIME)
            if (onArrowPressHandler) {
                onArrowPressHandler("left")
            }
            fireEvent.click(screen.getByTestId("update-button"))
        })

        const thirdTimestamp = parseInt(
            screen.getByTestId("timestamp").textContent || "0"
        )

        // Should show the new press
        expect(screen.getByTestId("direction")).toHaveTextContent("left")
        expect(thirdTimestamp).toBeGreaterThan(secondTimestamp)
    })

    it("should throw error when used outside provider", () => {
        const consoleError = jest
            .spyOn(console, "error")
            .mockImplementation(() => {})

        expect(() => {
            render(<TestComponent />)
        }).toThrow("ArrowPress context must be used within its Provider")

        consoleError.mockRestore()
    })
})
