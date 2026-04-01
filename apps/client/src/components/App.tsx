import { useAccount, useSessionId } from "@volley/platform-sdk/react"
import { type FeatureBundle, LazyMotion } from "motion/react"
import {
    type JSX,
    lazy,
    Suspense,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react"

import { getDeeplink } from "../config/deeplink"
import { SHOULD_USE_DEV_UPSELL } from "../config/devOverrides"
import { LOGO_DISPLAY_MILLIS } from "../config/envconfig"
import { shouldUseWebCheckout } from "../config/platformDetection"
import { AppLifecycleVideoProvider } from "../contexts/AppLifecycleVideoContext"
import { useBrandDocumentMeta } from "../hooks/useBrandDocumentMeta"
import { useDatadogIdentity } from "../hooks/useDatadogIdentity"
import { useDeviceAuthorization } from "../hooks/useDeviceAuthorization"
import { DevUpsellProvider } from "../hooks/useDevUpsell"
import { useExperimentInit } from "../hooks/useExperimentInit"
import { useFailedInitializationModal } from "../hooks/useFailedInitializationModal"
import { useHubSessionStart } from "../hooks/useHubSessionStart"
import { useInitializationDatadogRUMEvents } from "../hooks/useInitializationDatadogRUMEvents"
import { useInitializationError } from "../hooks/useInitializationError"
import { useIsJeopardyReload } from "../hooks/useIsJeopardyReload"
import { usePlatformReadiness } from "../hooks/usePlatformReadiness"
import { WebCheckoutUpsellProvider } from "../hooks/useWebCheckoutUpsell"
import { getVideoIdent } from "../utils/getVideoIdent"
import { ChunkLoadErrorBoundary } from "./ChunkLoadErrorBoundary/ChunkLoadErrorBoundary"
import { FailedInitializationModal } from "./FailedInitializationModal"
import { Loading } from "./TvHub/Loading"

const TvHub = lazy(() =>
    import("./TvHub/TvHub").then((module) => ({ default: module.TvHub }))
)

const loadFeatures = (): Promise<FeatureBundle> =>
    import("../features").then((res) => res.default)

function AppBody({
    platformInitializationError,
    qrCodeRendered,
}: {
    platformInitializationError: string | null
    qrCodeRendered: boolean
}): JSX.Element {
    const { experimentsReady } = useExperimentInit()
    useDatadogIdentity()
    useBrandDocumentMeta()

    const [videoComplete, setVideoComplete] = useState<boolean>(false)
    const [assetLoadingStates, setAssetLoadingStates] = useState({
        requiredImagesLoaded: false,
        tileImagesLoaded: false,
        firstHeroImageLoaded: false,
        remainingHeroImagesLoaded: false,
        focusIndicatorLoaded: false,
        webCheckoutRequiredImagesLoaded: false,
        statusBannersLoaded: false,
        tileAnimationsLoaded: false,
        optionalImagesLoaded: false,
    })
    const [completedInitialLoad, setCompletedInitialLoad] =
        useState<boolean>(false)
    const isWebCheckoutPlatform = shouldUseWebCheckout()

    const { account } = useAccount()

    const isPlatformReady = usePlatformReadiness()
    const deeplink = getDeeplink()
    const isJeopardyReload = useIsJeopardyReload()

    const initializationError = useInitializationError({
        platformInitializationError,
        account,
    })

    const { showFailedInitModal, errorMessage, handleExit } =
        useFailedInitializationModal(initializationError)

    const hasInitializedRef = useRef(false)

    useHubSessionStart(deeplink, isJeopardyReload, isPlatformReady)

    const isInitialized = useMemo(() => {
        const isTvLoadingComplete =
            videoComplete &&
            experimentsReady &&
            assetLoadingStates.requiredImagesLoaded &&
            isPlatformReady

        if (isTvLoadingComplete && !hasInitializedRef.current) {
            hasInitializedRef.current = true
        }

        return hasInitializedRef.current || isTvLoadingComplete
    }, [
        videoComplete,
        experimentsReady,
        assetLoadingStates.requiredImagesLoaded,
        isPlatformReady,
    ])

    const loadingComplete =
        isInitialized && assetLoadingStates.optionalImagesLoaded

    useEffect(() => {
        if (!completedInitialLoad && loadingComplete && videoComplete) {
            setCompletedInitialLoad(true)
        }
    }, [completedInitialLoad, loadingComplete, videoComplete])

    const initializationStages = useMemo(
        () => ({
            videoComplete,
            experimentsReady,
            platformReady: isPlatformReady,
            isInitialized,
            ...assetLoadingStates,
            qrCodeRendered,
            isWebCheckoutPlatform,
            isSubscribed: account?.isSubscribed ?? null,
        }),
        [
            videoComplete,
            experimentsReady,
            isPlatformReady,
            isInitialized,
            assetLoadingStates,
            qrCodeRendered,
            isWebCheckoutPlatform,
            account?.isSubscribed,
        ]
    )

    useInitializationDatadogRUMEvents(initializationStages)

    useEffect(() => {
        if (isJeopardyReload) {
            setVideoComplete(true)
        }
    }, [isJeopardyReload])

    const appContent = (
        <>
            {!loadingComplete &&
                !showFailedInitModal &&
                !isJeopardyReload &&
                !completedInitialLoad && (
                    <Loading
                        videoUrl={getVideoIdent()}
                        videoComplete={videoComplete}
                        setVideoComplete={setVideoComplete}
                        logoDisplayMillis={LOGO_DISPLAY_MILLIS}
                    />
                )}

            <FailedInitializationModal
                isOpen={showFailedInitModal}
                onExit={handleExit}
                errorMessage={errorMessage}
            />

            <Suspense fallback={null}>
                {!showFailedInitModal && (
                    <TvHub
                        isInitialized={isInitialized}
                        optionalImagesLoaded={
                            assetLoadingStates.optionalImagesLoaded
                        }
                        setAssetLoadingStates={setAssetLoadingStates}
                        isJeopardyReload={isJeopardyReload}
                        videoComplete={videoComplete}
                        platformReady={isPlatformReady}
                        experimentsReady={experimentsReady}
                    />
                )}
            </Suspense>
        </>
    )

    return appContent
}

/**
 * Root app component that orchestrates providers (error boundary, lifecycle video,
 * device auth for web checkout) and delegates initialization to AppBody.
 */
export function App(): JSX.Element {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [qrCodeRendered, setQrCodeRendered] = useState(false)
    const qrRenderedRef = useRef(false)
    const sessionId = useSessionId()

    const {
        data: deviceAuth,
        isLoading: isDeviceAuthLoading,
        error: platformInitializationError,
        authStatus,
        setConnectionId,
        retry,
    } = useDeviceAuthorization(sessionId, shouldUseWebCheckout() && isModalOpen)

    const handleModalOpenChange = useCallback((isOpen: boolean) => {
        setIsModalOpen(isOpen)
    }, [])

    const handleQrRendered = useCallback(() => {
        if (!qrRenderedRef.current) {
            qrRenderedRef.current = true
            setQrCodeRendered(true)
        }
    }, [])

    const wrappedContent = (
        <ChunkLoadErrorBoundary>
            <AppLifecycleVideoProvider>
                <LazyMotion features={loadFeatures} strict>
                    <AppBody
                        platformInitializationError={
                            platformInitializationError
                        }
                        qrCodeRendered={qrCodeRendered}
                    />
                </LazyMotion>
            </AppLifecycleVideoProvider>
        </ChunkLoadErrorBoundary>
    )

    if (SHOULD_USE_DEV_UPSELL) {
        return <DevUpsellProvider>{wrappedContent}</DevUpsellProvider>
    }

    if (shouldUseWebCheckout()) {
        return (
            <WebCheckoutUpsellProvider
                authStatus={authStatus}
                deviceAuth={deviceAuth}
                isDeviceAuthLoading={isDeviceAuthLoading}
                platformInitializationError={platformInitializationError}
                setConnectionId={setConnectionId}
                retry={retry}
                onQrRendered={handleQrRendered}
                onModalOpenChange={handleModalOpenChange}
            >
                {wrappedContent}
            </WebCheckoutUpsellProvider>
        )
    }

    return wrappedContent
}
