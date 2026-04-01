import type { AuthStatus, SubscribeOptions } from "@volley/platform-sdk/lib"
import { SubscriptionFlowResult } from "@volley/platform-sdk/lib"
import React, { useEffect, useMemo, useRef, useState } from "react"

import { OnboardingModal } from "../components/WebCheckoutModal/OnboardingModal"
import { WebCheckoutModal } from "../components/WebCheckoutModal/WebCheckoutModal"
import type {
    ExtendedSubscribeOptions,
    UpsellContext,
} from "../components/WebCheckoutModal/webCheckoutModalConfig"
import { getWebCheckoutModalContent } from "../components/WebCheckoutModal/webCheckoutModalConfig"
import { PAYMENT_SUCCESS_SESSION_KEY } from "../constants"
import { getExperimentManager } from "../experiments/ExperimentManager"
import { ExperimentFlag } from "../experiments/experimentSchemata"
import { createTypedContext } from "../utils/createTypedContext"
import { logger } from "../utils/logger"
import type { DeviceAuthorizationData } from "./useDeviceAuthorization"
import { useIsSubscribed } from "./useIsSubscribed"
import { useQrLoadWatchdog } from "./useQrLoadWatchdog"

interface WebCheckoutUpsellContextType {
    subscribe: (
        options: ExtendedSubscribeOptions
    ) => Promise<{ status: SubscriptionFlowResult }>
    isModalOpen: boolean
}

const [WebCheckoutUpsellCtx, useWebCheckoutUpsell] =
    createTypedContext<WebCheckoutUpsellContextType>("WebCheckoutUpsell")

interface WebCheckoutUpsellProviderProps {
    children: React.ReactNode
    authStatus: AuthStatus | null
    deviceAuth: DeviceAuthorizationData | null
    isDeviceAuthLoading: boolean
    platformInitializationError: string | null
    setConnectionId: (connectionId: string) => void
    retry: () => void
    onQrRendered?: () => void
    onModalOpenChange?: (isOpen: boolean) => void
}

/**
 * Context provider that implements the subscription upsell flow for web checkout platforms
 * (LG, Samsung, Web). Renders a {@link WebCheckoutModal} and exposes a promise-based
 * `subscribe()` function.
 *
 * How the promise pattern works:
 * 1. Caller invokes `subscribe(options)` → returns a Promise
 * 2. Provider stores the resolve function in a ref and opens the modal
 * 3. User completes/cancels checkout → `handleResult()` or `handleClose()` resolves the promise
 * 4. Successful payments are cached in `sessionStorage` to skip future upsells in the same session
 *
 * Session storage sync: polls `sessionStorage` every 500ms to detect cross-tab payment
 * success (the web-checkout app running in a separate tab writes to sessionStorage on
 * successful Stripe payment).
 */
export const WebCheckoutUpsellProvider: React.FC<
    WebCheckoutUpsellProviderProps
> = ({
    children,
    authStatus,
    deviceAuth,
    isDeviceAuthLoading,
    platformInitializationError,
    setConnectionId,
    retry,
    onQrRendered,
    onModalOpenChange,
}) => {
    const isSubscribed = useIsSubscribed()
    const [isModalOpen, setIsModalOpen] = useState(false)

    const { wrappedOnQrRendered } = useQrLoadWatchdog({
        isOpen: isModalOpen,
        onQrRendered,
        retry,
    })

    useEffect(() => {
        onModalOpenChange?.(isModalOpen)
    }, [isModalOpen, onModalOpenChange])
    const [currentOptions, setCurrentOptions] = useState<SubscribeOptions>({})
    const [currentContext, setCurrentContext] = useState<UpsellContext>({
        type: "immediate",
    })
    const resolvePromiseRef = useRef<
        ((result: { status: SubscriptionFlowResult }) => void) | null
    >(null)

    const [hasSuccessfulPayment, setHasSuccessfulPayment] = useState(() => {
        try {
            const stored = sessionStorage.getItem(PAYMENT_SUCCESS_SESSION_KEY)
            return stored === "true"
        } catch {
            return false
        }
    })

    useEffect(() => {
        const checkSessionStorage = (): void => {
            try {
                const stored = sessionStorage.getItem(
                    PAYMENT_SUCCESS_SESSION_KEY
                )
                const isStored = stored === "true"
                if (isStored !== hasSuccessfulPayment) {
                    logger.info(
                        `[WebCheckoutProvider] Syncing hasSuccessfulPayment from sessionStorage: ${isStored}`
                    )
                    setHasSuccessfulPayment(isStored)
                }
            } catch (error) {
                logger.warn(
                    `[WebCheckoutProvider] Failed to read from sessionStorage: ${String(
                        error
                    )}`
                )
            }
        }

        checkSessionStorage()
        const interval = setInterval(checkSessionStorage, 500)
        return (): void => {
            clearInterval(interval)
        }
    }, [hasSuccessfulPayment])

    useEffect(() => {
        if (hasSuccessfulPayment && resolvePromiseRef.current) {
            logger.info(
                `[WebCheckoutProvider] hasSuccessfulPayment became true with pending promise - resolving with Successful`
            )
            resolvePromiseRef.current({
                status: SubscriptionFlowResult.Successful,
            })
            resolvePromiseRef.current = null
        }
    }, [hasSuccessfulPayment])

    const subscribe = (
        options: ExtendedSubscribeOptions
    ): Promise<{ status: SubscriptionFlowResult }> => {
        logger.info(
            `[WebCheckoutProvider] subscribe called, hasSuccessfulPayment: ${hasSuccessfulPayment}, isSubscribed: ${isSubscribed}, context: ${options.upsellContext?.type}`
        )
        return new Promise((resolve) => {
            if (hasSuccessfulPayment) {
                logger.info(
                    `[WebCheckoutProvider] Immediately resolving with Successful (cached) - user has already subscribed in this session`
                )
                resolve({ status: SubscriptionFlowResult.Successful })
                return
            }

            if (isSubscribed) {
                logger.info(
                    `[WebCheckoutProvider] Immediately resolving with Successful - user is already subscribed`
                )
                resolve({ status: SubscriptionFlowResult.Successful })
                return
            }

            if (resolvePromiseRef.current) {
                logger.warn(
                    `[WebCheckoutProvider] Subscription already in progress - rejecting concurrent call`
                )
                resolve({ status: SubscriptionFlowResult.Failed })
                return
            }

            logger.info(
                `[WebCheckoutProvider] Setting up promise and opening modal`
            )
            setCurrentOptions(options)

            const context = options.upsellContext
            setCurrentContext(context)

            resolvePromiseRef.current = resolve
            setIsModalOpen(true)
        })
    }

    const handleResult = (status: SubscriptionFlowResult): void => {
        logger.info(
            `[WebCheckoutProvider] handleResult called with status: ${status}`
        )
        if (status === SubscriptionFlowResult.Successful) {
            setHasSuccessfulPayment(true)
            try {
                sessionStorage.setItem(PAYMENT_SUCCESS_SESSION_KEY, "true")
                logger.info(
                    `[WebCheckoutProvider] Saved successful payment to sessionStorage`
                )
            } catch (error) {
                logger.warn(
                    `[WebCheckoutProvider] Failed to save to sessionStorage: ${String(
                        error
                    )}`
                )
            }
        }

        if (resolvePromiseRef.current) {
            logger.info(
                `[WebCheckoutProvider] Resolving promise with status: ${status}`
            )
            resolvePromiseRef.current({ status })
            resolvePromiseRef.current = null
        } else {
            logger.warn(
                `[WebCheckoutProvider] handleResult called but no promise to resolve`
            )
        }
    }

    const handleModalHide = (): void => {
        setIsModalOpen(false)
    }

    const handleClose = (): void => {
        logger.info(`[WebCheckoutProvider] handleClose called`)
        setIsModalOpen(false)
        if (resolvePromiseRef.current) {
            logger.info(
                `[WebCheckoutProvider] Resolving promise with Failed from handleClose`
            )
            resolvePromiseRef.current({ status: SubscriptionFlowResult.Failed })
            resolvePromiseRef.current = null
        } else {
            logger.warn(
                `[WebCheckoutProvider] handleClose called but no promise to resolve`
            )
        }
    }

    const modalContent = useMemo(
        () =>
            currentContext
                ? getWebCheckoutModalContent(currentContext)
                : getWebCheckoutModalContent({ type: "immediate" }),
        [currentContext]
    )

    const [narrationEnabled, setNarrationEnabled] = useState(false)

    useEffect(() => {
        const experimentManager = getExperimentManager()

        const checkFlag = (): void => {
            const variant = experimentManager.getVariant(
                ExperimentFlag.OnboardingNarration
            )
            setNarrationEnabled(variant?.value === "on")
        }

        if (experimentManager.getIsInitialized()) {
            checkFlag()
        }

        return experimentManager.onInitialized(checkFlag)
    }, [])

    const effectiveIsOpen =
        isModalOpen && !hasSuccessfulPayment && !platformInitializationError

    const showOnboarding =
        narrationEnabled && currentContext.type === "immediate"

    return (
        <WebCheckoutUpsellCtx.Provider value={{ subscribe, isModalOpen }}>
            {children}
            {showOnboarding ? (
                <OnboardingModal
                    isOpen={effectiveIsOpen}
                    subscribeOptions={currentOptions}
                    onResult={handleResult}
                    onClose={handleClose}
                    onModalHide={handleModalHide}
                    videoSrc={modalContent.videoSrc}
                    posterSrc={modalContent.posterSrc}
                    mainHeading={modalContent.mainHeading}
                    subtitle={modalContent.subtitle}
                    upsellContext={currentContext}
                    videoSegments={modalContent.videoSegments}
                    authStatus={authStatus}
                    deviceAuth={deviceAuth}
                    isDeviceAuthLoading={isDeviceAuthLoading}
                    setConnectionId={setConnectionId}
                    onQrRendered={wrappedOnQrRendered}
                />
            ) : (
                <WebCheckoutModal
                    isOpen={effectiveIsOpen}
                    subscribeOptions={currentOptions}
                    onResult={handleResult}
                    onClose={handleClose}
                    onModalHide={handleModalHide}
                    videoSrc={modalContent.videoSrc}
                    posterSrc={modalContent.posterSrc}
                    mainHeading={modalContent.mainHeading}
                    subtitle={modalContent.subtitle}
                    upsellContext={currentContext}
                    videoSegments={modalContent.videoSegments}
                    authStatus={authStatus}
                    deviceAuth={deviceAuth}
                    isDeviceAuthLoading={isDeviceAuthLoading}
                    setConnectionId={setConnectionId}
                    onQrRendered={wrappedOnQrRendered}
                />
            )}
        </WebCheckoutUpsellCtx.Provider>
    )
}

export { useWebCheckoutUpsell }
