// This file duplicates much of WebCheckoutModal.tsx for the onboarding-narration experiment.
// Delete this file (and OnboardingContent.tsx / OnboardingContent.module.scss) once the experiment concludes.
import type {
    AuthStatus,
    Key,
    SubscribeOptions,
} from "@volley/platform-sdk/lib"
import { SubscriptionFlowResult } from "@volley/platform-sdk/lib"
import { useKeyDown } from "@volley/platform-sdk/react"
import React, {
    useCallback,
    useEffect,
    useRef,
    useState,
    useSyncExternalStore,
} from "react"

import { getActiveBrand, subscribeToBrand } from "../../config/branding"
import { BASE_URL } from "../../config/envconfig"
import type { DeviceAuthorizationData } from "../../hooks/useDeviceAuthorization"
import { useIsSubscribed } from "../../hooks/useIsSubscribed"
import { useVideoSequenceSegmented } from "../../hooks/useVideoSequenceSegmented"
import { useOnboardingAudio } from "../../utils/AudioManager"
import { logger } from "../../utils/logger"
import { FallbackImage } from "../FallbackImage"
import { PaymentSuccessIndicator } from "../PaymentSuccessIndicator/PaymentSuccessIndicator"
import { QrWithPlaceholder } from "../QrWithPlaceholder/QrWithPlaceholder"
import { BackgroundVideo } from "./components/BackgroundVideo"
import { OnboardingContent } from "./components/OnboardingContent"
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

const ANIMATION_DELAY_MS = 500
const QR_HIGHLIGHT_DELAY_MS = 3000

interface OnboardingModalProps {
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

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
    isOpen,
    subscribeOptions,
    onResult,
    onClose,
    onModalHide,
    videoSrc,
    posterSrc,
    mainHeading,
    subtitle,
    upsellContext,
    videoSegments,
    authStatus,
    deviceAuth,
    isDeviceAuthLoading,
    setConnectionId,
    onQrRendered,
}) => {
    const [animate, setAnimate] = useState(false)
    const [videoMuted, setVideoMuted] = useState(true)
    const [qrHighlightActive, setQrHighlightActive] = useState(false)
    const isSubscribed = useIsSubscribed()
    const prevIsOpenRef = useRef(false)
    const hasStartedRef = useRef(false)
    const qrHighlightRef = useRef<HTMLDivElement>(null)

    const brand = useSyncExternalStore(
        subscribeToBrand,
        getActiveBrand,
        getActiveBrand
    )
    const modalBrandStyle =
        brand === "weekend" ? WEEKEND_MODAL_BRAND_STYLES : undefined

    const onboardingAudio = useOnboardingAudio()

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

    useEffect(() => {
        const hasModalOpened = isOpen && !prevIsOpenRef.current

        if (hasModalOpened && isSubscribed) {
            logger.warn(
                "[OnboardingModal] User already subscribed on modal open - returning Successful (fallback)"
            )
            onResult(SubscriptionFlowResult.Successful)
            onClose()
        }

        prevIsOpenRef.current = isOpen
    }, [isOpen, isSubscribed, onResult, onClose])

    useEffect(() => {
        if (!isOpen) {
            hasStartedRef.current = false
            setAnimate(false)
            setVideoMuted(true)
            setQrHighlightActive(false)
        }
    }, [isOpen])

    const triggerQrHighlight = useCallback((): void => {
        const el = qrHighlightRef.current
        if (!el) return
        const cls = styles.qrHighlight ?? ""
        el.classList.remove(cls)
        void el.offsetWidth
        el.classList.add(cls)
        setQrHighlightActive(true)
    }, [])

    useEffect(() => {
        if (!isVisible || hasStartedRef.current) return
        hasStartedRef.current = true

        onboardingAudio.play()

        const animationTimer = setTimeout(() => {
            setAnimate(true)
        }, ANIMATION_DELAY_MS)

        const qrTimer = setTimeout(triggerQrHighlight, QR_HIGHLIGHT_DELAY_MS)

        const removeOnEnded = onboardingAudio.onEnded(() => {
            triggerQrHighlight()
            setVideoMuted(false)
        })

        return (): void => {
            clearTimeout(animationTimer)
            clearTimeout(qrTimer)
            removeOnEnded()
            onboardingAudio.stop()
        }
    }, [isVisible, onboardingAudio, triggerQrHighlight])

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

    const isPaymentSuccess = paymentState === PaymentState.PAYMENT_SUCCESS

    let activationUrl = ""
    let qrUrl = ""

    if (verificationUri) {
        try {
            activationUrl = new URL(verificationUri).hostname
            qrUrl = `${verificationUri}/?pairing=${userCode}`
        } catch (error) {
            logger.error("Invalid verification URI", error, {
                verificationUri,
            })
            activationUrl = verificationUri
        }
    }

    const modalClasses = `${styles.modal} ${
        modalFadingOut ? styles.modalFadeOut : ""
    } ${isVisible ? styles.modalVisible : styles.modalHidden}`

    const qrWrapperClasses =
        paymentState === PaymentState.PAYMENT_SUCCESS
            ? `${styles.paymentQrWrapper} ${styles.paymentQrFadeOut}`
            : styles.paymentQrWrapper

    return (
        <div
            className={modalClasses}
            data-testid="web-checkout-modal"
            style={modalBrandStyle}
        >
            <BackgroundVideo
                videoRef={videoSequence.videoRef}
                videoSrc={videoSrc}
                posterSrc={posterSrc}
                isVisible={isVisible}
                muted={videoMuted}
            />
            <OnboardingContent
                animate={animate}
                mainHeading={mainHeading}
                subtitle={subtitle}
            >
                <div className={styles.qrSectionContainer}>
                    <div className={styles.qrSection}>
                        <div
                            ref={qrHighlightRef}
                            className={
                                qrHighlightActive ? styles.qrHighlight : ""
                            }
                        >
                            <div
                                className={`${styles.rim} ${
                                    isPaymentSuccess ? styles.rimSuccess : ""
                                }`}
                            >
                                <div className={styles.qrCodeBox}>
                                    <div className={qrWrapperClasses}>
                                        {isDeviceAuthLoading ? (
                                            <div
                                                className={
                                                    styles.refreshingCode
                                                }
                                            >
                                                <div
                                                    className={
                                                        styles.refreshingSpinner
                                                    }
                                                />
                                            </div>
                                        ) : userCode ? (
                                            <QrWithPlaceholder
                                                url={qrUrl}
                                                onQrRendered={onQrRendered}
                                            />
                                        ) : (
                                            <div
                                                className={
                                                    styles.refreshingCode
                                                }
                                            >
                                                <div
                                                    className={
                                                        styles.refreshingSpinner
                                                    }
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {isPaymentSuccess && (
                                        <PaymentSuccessIndicator
                                            isVisible
                                            onAnimationComplete={
                                                handleSuccessComplete
                                            }
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                        <div>
                            <div
                                className={
                                    styles.scanIndicatorAnimationContainer
                                }
                            >
                                <FallbackImage
                                    src={`${BASE_URL}assets/images/ui/scan-indicator.avif`}
                                    alt="Scan Indicator"
                                    className={styles.scanIndicator}
                                />
                            </div>
                            <div className={styles.activationText}>
                                Or go to{" "}
                                <span className={styles.highlight}>
                                    {activationUrl}
                                </span>{" "}
                                <br />
                                <br />
                                and enter this code{" "}
                                <span className={styles.highlight}>
                                    {isDeviceAuthLoading
                                        ? "------"
                                        : userCode || "------"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </OnboardingContent>
        </div>
    )
}
