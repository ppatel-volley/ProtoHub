import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"

import { PaymentSuccessIndicator } from "./PaymentSuccessIndicator"

jest.mock("../../utils/AudioManager", () => ({
    useSuccessAudio: jest.fn(() => ({
        play: jest.fn(),
        pause: jest.fn(),
        stop: jest.fn(),
        mute: jest.fn(),
        loop: jest.fn(),
        volume: jest.fn(),
    })),
}))

jest.mock("../../config/envconfig", () => ({
    BASE_URL: "https://test.example.com/",
}))

const mockConsoleError = jest
    .spyOn(console, "error")
    .mockImplementation(() => {})

describe("PaymentSuccessIndicator", () => {
    const mockOnAnimationComplete = jest.fn()
    const mockOnFadeOutComplete = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
        jest.clearAllTimers()
        jest.useFakeTimers()
    })

    afterEach(() => {
        jest.runOnlyPendingTimers()
        jest.useRealTimers()
    })

    afterAll(() => {
        mockConsoleError.mockRestore()
    })

    const defaultProps = {
        isVisible: true,
        onAnimationComplete: mockOnAnimationComplete,
        onFadeOutComplete: mockOnFadeOutComplete,
    }

    it("should not render when not visible", () => {
        render(<PaymentSuccessIndicator {...defaultProps} isVisible={false} />)

        expect(
            screen.queryByLabelText("Payment successful")
        ).not.toBeInTheDocument()
    })

    it("should render checkmark with animate class when visible", () => {
        render(<PaymentSuccessIndicator {...defaultProps} />)

        const checkmark = screen.getByLabelText("Payment successful")
        expect(checkmark).toBeInTheDocument()

        const checkmarkInner = checkmark.firstChild as HTMLElement
        expect(checkmarkInner).toHaveClass("checkmarkInner")
        expect(checkmarkInner).toHaveClass("animate")
    })

    it("should show checkmark after animation frame", () => {
        render(<PaymentSuccessIndicator {...defaultProps} />)

        jest.advanceTimersByTime(16)

        expect(screen.getByLabelText("Payment successful")).toBeInTheDocument()
    })

    it("should play success audio when checkmark appears", () => {
        const { useSuccessAudio } = require("../../utils/AudioManager")
        const mockPlay = jest.fn()
        useSuccessAudio.mockReturnValue({
            play: mockPlay,
            pause: jest.fn(),
            stop: jest.fn(),
            mute: jest.fn(),
            loop: jest.fn(),
            volume: jest.fn(),
        })

        render(<PaymentSuccessIndicator {...defaultProps} />)

        jest.advanceTimersByTime(1)

        expect(mockPlay).toHaveBeenCalled()
    })

    it("should render successfully even with audio system", () => {
        render(<PaymentSuccessIndicator {...defaultProps} />)

        jest.advanceTimersByTime(1)

        expect(screen.getByLabelText("Payment successful")).toBeInTheDocument()
    })

    it("should call onAnimationComplete after animation ends", () => {
        render(<PaymentSuccessIndicator {...defaultProps} />)

        const checkmarkElement = document.querySelector(
            '[class*="checkmarkInner"]'
        ) as HTMLElement

        expect(checkmarkElement).toBeInTheDocument()

        fireEvent.animationEnd(checkmarkElement)

        expect(mockOnAnimationComplete).toHaveBeenCalled()
    })

    it("should display checkmark with correct styling", () => {
        render(<PaymentSuccessIndicator {...defaultProps} />)

        jest.advanceTimersByTime(1)

        const checkmark = screen.getByLabelText("Payment successful")
        expect(checkmark).toBeInTheDocument()
    })

    it("should cleanup timers when component unmounts", () => {
        const { unmount } = render(
            <PaymentSuccessIndicator {...defaultProps} />
        )

        jest.advanceTimersByTime(1)

        unmount()

        jest.advanceTimersByTime(1800)

        expect(mockOnAnimationComplete).not.toHaveBeenCalled()
    })

    it("should cleanup timers when isVisible becomes false", () => {
        const { rerender } = render(
            <PaymentSuccessIndicator {...defaultProps} />
        )

        jest.advanceTimersByTime(1)

        rerender(
            <PaymentSuccessIndicator {...defaultProps} isVisible={false} />
        )

        jest.advanceTimersByTime(1800)

        expect(mockOnAnimationComplete).not.toHaveBeenCalled()
    })
})
