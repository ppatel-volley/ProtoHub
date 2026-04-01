import type {
    AuthStatus,
    Key,
    SubscribeOptions,
} from "@volley/platform-sdk/lib"
import { SubscriptionFlowResult } from "@volley/platform-sdk/lib"
import { useKeyDown } from "@volley/platform-sdk/react"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { useSyncExternalStore } from "react"

import { getActiveBrand, subscribeToBrand } from "../../config/branding"
import type { DeviceAuthorizationData } from "../../hooks/useDeviceAuthorization"
import { useIsSubscribed } from "../../hooks/useIsSubscribed"
import { useVideoSequenceSegmented } from "../../hooks/useVideoSequenceSegmented"
import { logger } from "../../utils/logger"
import { BackgroundVideo } from "./components/BackgroundVideo"
import { QRCodeSection } from "./components/QRCodeSection"
import { WebCheckoutContent } from "./components/WebCheckoutContent"
import { useModalLifecycle } from "./hooks/useModalLifecycle"
import { useSubscriptionPolling } from "./hooks/useSubscriptionPolling"
import { useWebCheckoutState } from "./hooks/useWebCheckoutState"
import { useWebCheckoutTracking } from "./hooks/useWebCheckoutTracking"
import styles from "./WebCheckoutModal.module.scss"
import { WEEKEND_MODAL_BRAND_STYLES } from "./webCheckoutModalBrandStyles"
import type {
    UpsellContext,
    VideoSegmentRanges,
} from "./webCheckoutModalConfig"
import { PaymentState } from "./webCheckoutModalConstants"

export {
    BACK_BUTTON_TEXT,
    getActivationUrl,
    PaymentState,
    VISIBILITY_DELAY_MS,
} from "./webCheckoutModalConstants"

interface WebCheckoutModalProps {
    isOpen: boolean
    subscribeOptions: SubscribeOptions
    onResult: (result: SubscriptionFlowResult) => void
    onClose: () => void
    onModalHide?: () => void
    videoSrc: string
    posterSrc: string
    mainHeading: string
    subtitle: string
    upsellContext: UpsellContext
    videoSegments: VideoSegmentRanges
    authStatus: AuthStatus | null
    deviceAuth: DeviceAuthorizationData | null
    isDeviceAuthLoading: boolean
    setConnectionId: (connectionId: string) => void
    onQrRendered?: () => void
}

/**
 * This is the modal that is displayed when a user eligible for web checkout initiates an upsell.
 * It is used to display a QR code that the user can scan to complete their subscription.
 * It is also used to poll for subscription completion.
 *
 * @param isOpen - Whether the modal is open
 * @param subscribeOptions - The options for the subscription
 * @param onResult - The function to call when the subscription is complete
 * @param onClose - The function to call when the modal is closed
 * @returns The web checkout modal
 */
export const WebCheckoutModal: React.FC<WebCheckoutModalProps> = ({
    isOpen,
    subscribeOptions,
    onResult,
    onClose,
    onModalHide,
    videoSrc,
    mainHeading,
    subtitle,
    upsellContext,
    videoSegments,
    authStatus,
    deviceAuth,
    isDeviceAuthLoading,
    setConnectionId,
    posterSrc,
    onQrRendered,
}) => {
    const [hasEverOpened, setHasEverOpened] = useState(false)
    const isSubscribed = useIsSubscribed()
    const prevIsOpenRef = useRef(false)
    const brand = useSyncExternalStore(
        subscribeToBrand,
        getActiveBrand,
        getActiveBrand
    )
    const modalBrandStyle =
        brand === "weekend" ? WEEKEND_MODAL_BRAND_STYLES : undefined

    const videoSequence = useVideoSequenceSegmented({
        isActive: isOpen,
        videoSrc,
        segments: videoSegments,
        restartKey: subscribeOptions,
    })

    const { isVisible, screenDisplayedId } = useModalLifecycle({
        isOpen,
    })

    const {
        paymentState,
        setPaymentState,
        modalFadingOut,
        handleSuccessComplete,
    } = useWebCheckoutState({
        isOpen,
        authStatus,
        onResult,
        onModalHide,
    })

    const { trackBackButton } = useWebCheckoutTracking({
        isOpen,
        screenDisplayedId,
        upsellContext,
        subscribeOptions,
        setConnectionId,
        mainHeading,
        subtitle,
    })

    // Defensive fallback: the provider should already prevent opening the modal for
    // subscribed users, but this ensures we close immediately if that check is bypassed
    // before isVisible becomes true.
    useEffect(() => {
        const hasModalOpened = isOpen && !prevIsOpenRef.current

        if (hasModalOpened && isSubscribed) {
            logger.warn(
                "[WebCheckout] User already subscribed on modal open - returning Successful (fallback)"
            )
            onResult(SubscriptionFlowResult.Successful)
            onClose()
        }

        prevIsOpenRef.current = isOpen
    }, [isOpen, isSubscribed, onResult, onClose])

    useEffect(() => {
        if (isOpen && !hasEverOpened) {
            setHasEverOpened(true)
        }
    }, [isOpen, hasEverOpened])

    useSubscriptionPolling({
        isOpen,
        isSubscribed,
        paymentState,
        onPaymentSuccess: () => setPaymentState(PaymentState.PAYMENT_SUCCESS),
    })

    const handleBackButton = useCallback((): void => {
        trackBackButton()
        onResult(SubscriptionFlowResult.Failed)
        onClose()
    }, [trackBackButton, onResult, onClose])

    useKeyDown("Back", handleBackButton)
    useKeyDown("Escape" as Key, handleBackButton)
    useKeyDown("Backspace" as Key, handleBackButton)

    const userCode = deviceAuth?.userCode
    const verificationUri = deviceAuth?.verificationUri

    const getModalStyles = (
        state: PaymentState,
        fadingOut: boolean,
        visible: boolean
    ): {
        modalClasses: string
        qrFrameStyle: React.CSSProperties
        qrContentClasses?: string
        qrWrapperClasses?: string
        isPaymentSuccess: boolean
    } => {
        const modalClasses = `${styles.modal} ${
            fadingOut ? styles.modalFadeOut : ""
        } ${visible ? styles.modalVisible : styles.modalHidden}`

        switch (state) {
            case PaymentState.SHOWING_QR:
            case PaymentState.TRANSITIONING:
                return {
                    modalClasses,
                    qrFrameStyle: { display: "block" },
                    qrContentClasses: styles.paymentQrContent,
                    qrWrapperClasses: styles.paymentQrWrapper,
                    isPaymentSuccess: false,
                }

            case PaymentState.PAYMENT_SUCCESS:
                return {
                    modalClasses,
                    qrFrameStyle: { display: "none" },
                    qrContentClasses: `${styles.paymentQrContent} ${styles.paymentQrContentSuccess}`,
                    qrWrapperClasses: `${styles.paymentQrWrapper} ${styles.paymentQrFadeOut}`,
                    isPaymentSuccess: true,
                }

            default: {
                const _exhaustiveCheck: never = state
                return _exhaustiveCheck
            }
        }
    }

    const modalStyles = getModalStyles(paymentState, modalFadingOut, isVisible)

    return (
        <div
            className={modalStyles.modalClasses}
            data-testid="web-checkout-modal"
            style={modalBrandStyle}
        >
            {(isOpen || !hasEverOpened) && (
                <BackgroundVideo
                    videoRef={videoSequence.videoRef}
                    videoSrc={videoSrc}
                    posterSrc={posterSrc}
                    isVisible={isVisible}
                />
            )}
            <WebCheckoutContent mainHeading={mainHeading} subtitle={subtitle}>
                <QRCodeSection
                    paymentState={paymentState}
                    isDeviceAuthLoading={isDeviceAuthLoading}
                    userCode={userCode}
                    verificationUri={verificationUri}
                    qrWrapperClasses={modalStyles.qrWrapperClasses}
                    onQrRendered={onQrRendered}
                    onSuccessComplete={handleSuccessComplete}
                />
            </WebCheckoutContent>
        </div>
    )
}
