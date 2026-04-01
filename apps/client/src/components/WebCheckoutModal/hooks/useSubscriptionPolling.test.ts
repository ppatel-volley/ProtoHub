import { renderHook } from "@testing-library/react"

import { PaymentState } from "../webCheckoutModalConstants"
import { useSubscriptionPolling } from "./useSubscriptionPolling"

describe("useSubscriptionPolling", () => {
    const mockOnPaymentSuccess = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it("should call onPaymentSuccess when subscription changes from false to true", () => {
        const { rerender } = renderHook(
            ({ isSubscribed }) =>
                useSubscriptionPolling({
                    isOpen: true,
                    isSubscribed,
                    paymentState: PaymentState.SHOWING_QR,
                    onPaymentSuccess: mockOnPaymentSuccess,
                }),
            { initialProps: { isSubscribed: false } }
        )

        rerender({ isSubscribed: true })

        expect(mockOnPaymentSuccess).toHaveBeenCalledTimes(1)
    })

    it("should not call onPaymentSuccess when subscription status is already true on first render", () => {
        renderHook(() =>
            useSubscriptionPolling({
                isOpen: true,
                isSubscribed: true,
                paymentState: PaymentState.SHOWING_QR,
                onPaymentSuccess: mockOnPaymentSuccess,
            })
        )

        expect(mockOnPaymentSuccess).not.toHaveBeenCalled()
    })
})
