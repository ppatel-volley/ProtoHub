import React from "react"

import { useAppLifecycleVideo } from "../../../contexts/AppLifecycleVideoContext"
import styles from "../WebCheckoutModal.module.scss"

interface BackgroundVideoProps {
    videoRef: React.RefObject<HTMLVideoElement | null>
    videoSrc: string
    posterSrc: string
    isVisible: boolean
    muted?: boolean
}

export const BackgroundVideo: React.FC<BackgroundVideoProps> = ({
    videoRef,
    videoSrc,
    posterSrc,
    isVisible,
    muted = false,
}) => {
    const { videosEnabled } = useAppLifecycleVideo()

    /**
     * Use static images when the app is backgrounded on FireTV to reduce
     * memory usage and avoid memory trim warnings. Platform-specific video
     * suppression (e.g. for OLED burn-in) is controlled via Amplitude experiments.
     */
    const shouldUseStaticImage = !videosEnabled

    if (shouldUseStaticImage) {
        return (
            <img
                src={posterSrc}
                alt=""
                className={`${styles.backgroundVideo} ${
                    isVisible
                        ? styles.backgroundVideoVisible
                        : styles.backgroundVideoHidden
                }`}
            />
        )
    }

    return (
        <video
            poster={posterSrc}
            ref={videoRef}
            src={videoSrc}
            className={`${styles.backgroundVideo} ${
                isVisible
                    ? styles.backgroundVideoVisible
                    : styles.backgroundVideoHidden
            }`}
            muted={muted}
            playsInline
            preload="auto"
        />
    )
}
