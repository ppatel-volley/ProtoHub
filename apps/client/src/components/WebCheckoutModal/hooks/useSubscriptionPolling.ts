import { useEffect, useRef } from "react"

import { logger } from "../../../utils/logger"
import { PaymentState } from "../webCheckoutModalConstants"

interface UseSubscriptionPollingProps {
    isOpen: boolean
    isSubscribed: boolean | undefined
    paymentState: PaymentState
    onPaymentSuccess: () => void
}

/**
 * Handles polling for subscription status changes.
 * @param props - Hook properties
 * @param props.isOpen - Whether the modal is open
 * @param props.isSubscribed - Whether the user is subscribed
 * @param props.paymentState - The current payment state
 * @param props.onPaymentSuccess - A function to call when the payment is successful
 */
export const useSubscriptionPolling = ({
    isOpen,
    isSubscribed,
    paymentState,
    onPaymentSuccess,
}: UseSubscriptionPollingProps): void => {
    const prevIsSubscribedRef = useRef<boolean | undefined>(undefined)

    useEffect(() => {
        if (!isOpen) {
            prevIsSubscribedRef.current = undefined
            return
        }

        if (paymentState !== PaymentState.SHOWING_QR) return

        const wasSubscribed = prevIsSubscribedRef.current
        const isNowSubscribed = isSubscribed

        if (wasSubscribed === false && isNowSubscribed === true) {
            logger.info(
                "[WebCheckout] Subscription status changed to true - triggering payment success"
            )
            onPaymentSuccess()
        }

        prevIsSubscribedRef.current = isNowSubscribed
    }, [isSubscribed, isOpen, paymentState, onPaymentSuccess])
}
