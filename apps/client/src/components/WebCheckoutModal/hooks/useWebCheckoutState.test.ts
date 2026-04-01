import { renderHook, waitFor } from "@testing-library/react"
import { act } from "react"

enum SubscriptionFlowResult {
    Successful = 1,
    Failed = 2,
    AlreadyPurchased = 3,
}

jest.mock("@volley/platform-sdk/lib", () => ({
    SubscriptionFlowResult,
}))

import { PaymentState } from "../webCheckoutModalConstants"
import { useWebCheckoutState } from "./useWebCheckoutState"

describe("useWebCheckoutState", () => {
    const mockOnResult = jest.fn()
    const mockOnModalHide = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
        jest.useFakeTimers()
    })

    afterEach(() => {
        jest.runOnlyPendingTimers()
        jest.useRealTimers()
    })

    it("should initialize with SHOWING_QR state", () => {
        const { result } = renderHook(() =>
            useWebCheckoutState({
                isOpen: true,
                authStatus: null,
                onResult: mockOnResult,
                onModalHide: mockOnModalHide,
            })
        )

        expect(result.current.paymentState).toBe(PaymentState.SHOWING_QR)
        expect(result.current.modalFadingOut).toBe(false)
    })

    it("should reset state when modal opens", () => {
        const { result, rerender } = renderHook(
            ({ isOpen }) =>
                useWebCheckoutState({
                    isOpen,
                    authStatus: null,
                    onResult: mockOnResult,
                    onModalHide: mockOnModalHide,
                }),
            { initialProps: { isOpen: false } }
        )

        act(() => {
            result.current.setPaymentState(PaymentState.PAYMENT_SUCCESS)
        })

        rerender({ isOpen: true })

        expect(result.current.paymentState).toBe(PaymentState.SHOWING_QR)
    })

    it("should handle success complete flow", async () => {
        const { result } = renderHook(() =>
            useWebCheckoutState({
                isOpen: true,
                authStatus: null,
                onResult: mockOnResult,
                onModalHide: mockOnModalHide,
            })
        )

        act(() => {
            result.current.handleSuccessComplete()
        })

        expect(result.current.modalFadingOut).toBe(true)

        act(() => {
            jest.advanceTimersByTime(400)
        })

        await waitFor(() => {
            expect(mockOnResult).toHaveBeenCalledWith(
                SubscriptionFlowResult.Successful
            )
            expect(mockOnModalHide).toHaveBeenCalled()
        })
    })

    it("should cleanup timeout on unmount", () => {
        const { result, unmount } = renderHook(() =>
            useWebCheckoutState({
                isOpen: true,
                authStatus: null,
                onResult: mockOnResult,
                onModalHide: mockOnModalHide,
            })
        )

        act(() => {
            result.current.handleSuccessComplete()
        })

        unmount()
        jest.advanceTimersByTime(400)

        expect(mockOnResult).not.toHaveBeenCalled()
    })

    it("should not reset state on rerender while modal is already open", () => {
        const { result, rerender } = renderHook(
            ({ isOpen }) =>
                useWebCheckoutState({
                    isOpen,
                    authStatus: null,
                    onResult: mockOnResult,
                    onModalHide: mockOnModalHide,
                }),
            { initialProps: { isOpen: true } }
        )

        act(() => {
            result.current.setPaymentState(PaymentState.PAYMENT_SUCCESS)
        })

        expect(result.current.paymentState).toBe(PaymentState.PAYMENT_SUCCESS)

        rerender({ isOpen: true })

        expect(result.current.paymentState).toBe(PaymentState.PAYMENT_SUCCESS)
    })

    it("should prevent reentrancy in handleSuccessComplete", () => {
        const { result } = renderHook(() =>
            useWebCheckoutState({
                isOpen: true,
                authStatus: null,
                onResult: mockOnResult,
                onModalHide: mockOnModalHide,
            })
        )

        act(() => {
            result.current.handleSuccessComplete()
            result.current.handleSuccessComplete()
        })

        act(() => {
            jest.advanceTimersByTime(400)
        })

        expect(mockOnResult).toHaveBeenCalledTimes(1)
        expect(mockOnModalHide).toHaveBeenCalledTimes(1)
    })
})
