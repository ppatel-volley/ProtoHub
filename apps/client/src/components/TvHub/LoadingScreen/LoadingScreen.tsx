import { SplashScreen } from "@capacitor/splash-screen"
import * as m from "motion/react-m"
import { type JSX, useEffect, useRef, useState } from "react"

import { SHOULD_FORCE_IDENT_AUTOPLAY_FAIL } from "../../../config/devOverrides"
import { BASE_URL } from "../../../config/envconfig"
import { isSamsungTV } from "../../../config/platformDetection"
import { useAppLifecycleVideo } from "../../../contexts/AppLifecycleVideoContext"
import { useAsset } from "../../../hooks/useAsset"
import { useCopy } from "../../../hooks/useCopy"
import { attemptVideoAutoplay } from "../../../utils/attemptVideoAutoplay"
import { useImageWithFallback } from "../../../utils/imageFormatFallback"
import { logger } from "../../../utils/logger"
import { hidePlatformVideo } from "../../../utils/platformVideoOptimizations"
import { FallbackImage } from "../../FallbackImage"
import { CssSpinner } from "./CssSpinner"
import styles from "./LoadingScreen.module.scss"

interface LoadingScreenProps {
    showIdentVideo: boolean // Should the ident video be shown?
    displayLogo: boolean // Remain on the initial logo display
    videoUrl?: string // URL of the ident video to display
    videoComplete: boolean // Has the ident video completed?
    setVideoComplete: (videoComplete: boolean) => void // Set the video complete state
    onLogoAnimationComplete?: () => void // Called when logo animation completes
    logoDisplayMillis: number
}

export const LOADING_SPINNER_DELAY_MS = 1000

function renderLogo(
    logoDisplayMillis: number,
    onLogoAnimationComplete?: () => void
): JSX.Element {
    return (
        <div className={styles.loading} data-testid="loading">
            <Logo
                onAnimationComplete={onLogoAnimationComplete}
                logoDisplayMillis={logoDisplayMillis}
            />
        </div>
    )
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
    showIdentVideo,
    displayLogo,
    videoUrl,
    videoComplete,
    setVideoComplete,
    onLogoAnimationComplete,
    logoDisplayMillis,
}) => {
    const [showSpinner, setShowSpinner] = useState<boolean>(false)
    const videoRef = useRef<HTMLVideoElement>(null)
    const autoplayStartedRef = useRef(false)
    const videoEndHandled = useRef(false)
    const logoPoster = useAsset("logoPoster")
    const [posterUrl] = useImageWithFallback(
        logoPoster ? `${BASE_URL}${logoPoster}` : ""
    )
    const isSamsung = isSamsungTV()
    const { videosEnabled } = useAppLifecycleVideo()

    useEffect(() => {
        SplashScreen?.hide().catch((error: Error) =>
            logger.info(
                "Did not hide splash screen, there was likely no need.",
                error
            )
        )
    }, [])

    useEffect(() => {
        if (!videosEnabled && !videoComplete && videoRef.current) {
            logger.info("LoadingScreen: videos disabled, skipping ident")
            hidePlatformVideo(videoRef.current)
            setVideoComplete(true)
        }
    }, [videosEnabled, videoComplete, setVideoComplete])

    useEffect(() => {
        const playVideo = async (): Promise<void> => {
            if (videoRef.current && !displayLogo) {
                if (SHOULD_FORCE_IDENT_AUTOPLAY_FAIL) {
                    hidePlatformVideo(videoRef.current)
                    setShowSpinner(true)
                    setVideoComplete(true)
                    return
                }
                autoplayStartedRef.current = true
                const success = await attemptVideoAutoplay(videoRef.current, {
                    onVideoComplete: () => {
                        setVideoComplete(true)
                    },
                    onAutoplayNotStarted: () => {
                        setShowSpinner(true)
                    },
                    onAutoplayStarted: () => {
                        setShowSpinner(false)
                    },
                    // Disable autoplay retries on Samsung TVs to avoid flickering
                    maxRetries: isSamsung ? 0 : 2,
                })
                if (!success && videoRef.current) {
                    hidePlatformVideo(videoRef.current)
                    setShowSpinner(true)
                }
            }
        }
        void playVideo()
    }, [displayLogo, videoUrl, setVideoComplete, isSamsung])

    useEffect(() => {
        let timeoutId: NodeJS.Timeout | null = null

        if (videoComplete) {
            timeoutId = setTimeout(() => {
                setShowSpinner(true)
            }, LOADING_SPINNER_DELAY_MS)
        }

        return (): void => {
            if (timeoutId) {
                clearTimeout(timeoutId)
            }
        }
    }, [videoComplete])

    if (!videoUrl) {
        setVideoComplete(true)
        return renderLogo(logoDisplayMillis, onLogoAnimationComplete)
    }
    if (!showIdentVideo) {
        return renderLogo(logoDisplayMillis, onLogoAnimationComplete)
    }

    const handleVideoEnd: () => void = () => {
        if (videoEndHandled.current) return
        videoEndHandled.current = true
        logger.info("LoadingScreen: video ended")
        if (videoRef.current) {
            if (Number.isFinite(videoRef.current.duration)) {
                videoRef.current.currentTime = videoRef.current.duration
            }
            hidePlatformVideo(videoRef.current)
        }
        setVideoComplete(true)
    }

    const handleVideoError = (
        event: React.SyntheticEvent<HTMLVideoElement, Event>
    ): void => {
        const video = event.currentTarget
        const error = video.error
        logger.warn("Video playback failed:", {
            error: error?.code,
            message: error?.message,
            networkState: video.networkState,
            readyState: video.readyState,
            src: video.src,
            canPlayType: video.canPlayType("video/mp4"),
            canPlayTypeH264: video.canPlayType(
                'video/mp4; codecs="avc1.42E01E"'
            ),
            canPlayTypeH264Baseline: video.canPlayType(
                'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'
            ),
            autoplayStarted: autoplayStartedRef.current,
        })
        if (!autoplayStartedRef.current) {
            logger.info(
                "LoadingScreen: ignoring preload error (autoplay not started)"
            )
            return
        }
        hidePlatformVideo(video)
        setShowSpinner(true)
        setVideoComplete(true)
    }

    return (
        <div className={styles.loading} data-testid="loading">
            <Logo
                onAnimationComplete={onLogoAnimationComplete}
                logoDisplayMillis={logoDisplayMillis}
            />

            {videosEnabled && (
                <video
                    ref={videoRef}
                    src={videoUrl}
                    role="identvideo"
                    muted={false}
                    poster={logoPoster ? (posterUrl ?? undefined) : undefined}
                    onEnded={handleVideoEnd}
                    onError={handleVideoError}
                    className={styles.video}
                    preload="auto"
                    hidden={displayLogo}
                    playsInline
                    controls={false}
                    disablePictureInPicture
                />
            )}
            {showSpinner && (
                <div
                    className={styles.spinnerContainer}
                    data-testid="spinner-container"
                >
                    <CssSpinner width="50%" height="50%" />
                </div>
            )}
        </div>
    )
}

function Logo({
    onAnimationComplete,
    logoDisplayMillis,
}: {
    onAnimationComplete?: () => void
    logoDisplayMillis: number
}): JSX.Element {
    const logoPoster = useAsset("logoPoster")
    const logoAlt = useCopy("logoAlt")

    const handleAnimationComplete = (): void => {
        logger.info("Logo fade-in animation completed")
        onAnimationComplete?.()
    }

    return (
        <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
                duration: logoDisplayMillis / 1000,
                ease: "easeInOut",
            }}
            onAnimationComplete={handleAnimationComplete}
        >
            {logoPoster ? (
                <FallbackImage
                    role="logo"
                    src={`${BASE_URL}${logoPoster}`}
                    alt={logoAlt}
                    className={styles.loadingLogo}
                />
            ) : null}
        </m.div>
    )
}
