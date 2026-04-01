import type { AuthStatus } from "@volley/platform-sdk/lib"
import { SubscriptionFlowResult } from "@volley/platform-sdk/lib"
import { useEffect, useRef, useState } from "react"

import { SHOULD_FORCE_WEB_CHECKOUT } from "../../../config/devOverrides"
import { AudioManager } from "../../../utils/AudioManager"
import { logger } from "../../../utils/logger"
import {
    PAYMENT_SUCCESS_TRANSITION_DELAY_MS,
    PaymentState,
} from "../webCheckoutModalConstants"

interface UseWebCheckoutStateProps {
    isOpen: boolean
    authStatus: AuthStatus | null
    onResult: (result: SubscriptionFlowResult) => void
    onModalHide?: () => void
}

interface UseWebCheckoutStateReturn {
    paymentState: PaymentState
    setPaymentState: (state: PaymentState) => void
    modalFadingOut: boolean
    forceSuccess: boolean
    setForceSuccess: (value: boolean) => void
    handleSuccessComplete: () => void
    resetState: () => void
}

/**
 * Handles keeping track of the payment state and the success animation.
 * @param props - Hook properties
 * @param props.isOpen - Whether the modal is open
 * @param props.authStatus - The authentication status
 * @param props.onResult - A function to call when the result is received
 * @param props.onModalHide - A function to call when the modal is hidden
 * @returns State and handlers for managing payment flow and success animations
 */
export const useWebCheckoutState = ({
    isOpen,
    authStatus,
    onResult,
    onModalHide,
}: UseWebCheckoutStateProps): UseWebCheckoutStateReturn => {
    const [paymentState, setPaymentState] = useState<PaymentState>(
        PaymentState.SHOWING_QR
    )
    const [forceSuccess, setForceSuccess] = useState(false)
    const [modalFadingOut, setModalFadingOut] = useState(false)
    const successTimeoutRef = useRef<number | undefined>(undefined)
    const prevIsOpenRef = useRef(false)

    useEffect(() => {
        if (SHOULD_FORCE_WEB_CHECKOUT) {
            ;(
                window as unknown as Window & {
                    simulatePaymentSuccess: () => void
                }
            ).simulatePaymentSuccess = (): void => {
                logger.info("🎯 Simulating payment success...")
                setForceSuccess(true)
                setPaymentState(PaymentState.PAYMENT_SUCCESS)
            }
        }
    }, [])

    useEffect(() => {
        if (authStatus?.authInProgress) return

        if (forceSuccess) {
            setPaymentState(PaymentState.PAYMENT_SUCCESS)
        }
    }, [authStatus, forceSuccess])

    useEffect(() => {
        const hasModalOpened = isOpen && !prevIsOpenRef.current
        const hasModalClosed = !isOpen && prevIsOpenRef.current

        if (hasModalOpened) {
            setPaymentState(PaymentState.SHOWING_QR)
            setModalFadingOut(false)
            setForceSuccess(false)
        } else if (hasModalClosed) {
            if (successTimeoutRef.current) {
                clearTimeout(successTimeoutRef.current)
                successTimeoutRef.current = undefined
            }
        }

        prevIsOpenRef.current = isOpen
    }, [isOpen])

    useEffect(() => {
        return (): void => {
            if (successTimeoutRef.current) {
                clearTimeout(successTimeoutRef.current)
            }
        }
    }, [])

    const handleSuccessComplete = (): void => {
        if (successTimeoutRef.current !== undefined) {
            logger.warn(
                "[WebCheckout] handleSuccessComplete called while transition already pending"
            )
            return
        }

        logger.info("[WebCheckout] Success animation complete, closing modal")
        setModalFadingOut(true)
        AudioManager.clearCache()
        successTimeoutRef.current = window.setTimeout(() => {
            logger.info(
                "[WebCheckout] Resolving with Successful and closing modal"
            )
            setPaymentState(PaymentState.TRANSITIONING)
            onResult(SubscriptionFlowResult.Successful)
            onModalHide?.()
            successTimeoutRef.current = undefined
        }, PAYMENT_SUCCESS_TRANSITION_DELAY_MS)
    }

    const resetState = (): void => {
        setPaymentState(PaymentState.SHOWING_QR)
        setModalFadingOut(false)
        setForceSuccess(false)
    }

    return {
        paymentState,
        setPaymentState,
        modalFadingOut,
        forceSuccess,
        setForceSuccess,
        handleSuccessComplete,
        resetState,
    }
}
