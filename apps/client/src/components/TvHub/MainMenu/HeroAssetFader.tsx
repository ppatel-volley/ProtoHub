import { AnimatePresence, type MotionProps } from "motion/react"
import * as m from "motion/react-m"
import React, { useEffect, useRef, useState } from "react"

import { useAppLifecycleVideo } from "../../../contexts/AppLifecycleVideoContext"
import type { LaunchedGameState } from "../../../hooks/useLaunchedGameState"
import { attemptVideoAutoplay } from "../../../utils/attemptVideoAutoplay"
import { applyPlatformVideoOptimizations } from "../../../utils/platformVideoOptimizations"
import { FallbackImage } from "../../FallbackImage"
import styles from "./Main.module.scss"

// Crossfade hero images on prop change using Framer Motion
// seconds
const TRANSITION_DURATION_SECS = 0.5
export const HOVER_DELAY_MS = 2500

interface HeroAssetFaderProps {
    image: string
    isCarouselActive: boolean
    videoUrl?: string
    isFocused?: boolean
    launchedGameState: LaunchedGameState | null
    // Workaround for issues observed on LG when video is mounted before ident complete
    shouldWaitForLGIdentComplete: boolean
}

// m.img by default doesn't include img-specific attributes in TS, so we add them
type MotionImgProps = React.ComponentProps<typeof FallbackImage> & MotionProps
type MotionVideoProps = React.ComponentProps<"video"> & MotionProps

const MotionFallbackImage = m.create(
    FallbackImage
) as React.ComponentType<MotionImgProps>
const MotionVideo = m.video as React.ComponentType<MotionVideoProps>

export const HeroAssetFader: React.FC<HeroAssetFaderProps> = ({
    image,
    videoUrl,
    isFocused = false,
    isCarouselActive,
    launchedGameState,
    shouldWaitForLGIdentComplete,
}): React.ReactElement => {
    const [showVideo, setShowVideo] = useState(false)
    const [isVideoReady, setIsVideoReady] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
    const { videosEnabled } = useAppLifecycleVideo()

    const handleVideoEnd = (): void => {
        setShowVideo(false)
        if (videoRef.current) {
            videoRef.current.currentTime = 0
        }
    }

    const handleVideoCanPlay = (): void => {
        setIsVideoReady(true)
    }

    useEffect(() => {
        if (videoUrl && videoRef.current) {
            setIsVideoReady(false)
            applyPlatformVideoOptimizations(videoRef.current)
            videoRef.current.load()
        }
    }, [videoUrl])

    useEffect(() => {
        if (videoRef.current) {
            if (showVideo) {
                videoRef.current.currentTime = 0
                void attemptVideoAutoplay(videoRef.current).then((success) => {
                    if (!success) {
                        setShowVideo(false)
                    }
                })
            } else {
                videoRef.current.pause()
                videoRef.current.currentTime = 0
            }
        }
    }, [showVideo])

    useEffect(() => {
        const shouldStartVideo =
            !shouldWaitForLGIdentComplete &&
            isFocused &&
            videoUrl &&
            isCarouselActive &&
            isVideoReady &&
            launchedGameState === null

        if (shouldStartVideo) {
            timeoutRef.current = setTimeout(() => {
                setShowVideo(true)
            }, HOVER_DELAY_MS)
        } else {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
            setShowVideo(false)
        }

        return (): void => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [
        shouldWaitForLGIdentComplete,
        isFocused,
        videoUrl,
        isCarouselActive,
        isVideoReady,
        launchedGameState,
    ])

    useEffect(() => {
        if (launchedGameState === null) {
            setShowVideo(false)
            setIsVideoReady(false)
            if (videoRef.current) {
                videoRef.current.pause()
                videoRef.current.currentTime = 0
            }
        }
    }, [launchedGameState])

    return (
        <div>
            <AnimatePresence mode="wait">
                <MotionFallbackImage
                    key={image}
                    src={image}
                    alt="Game Hero"
                    className={styles.heroImage}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: showVideo ? 0 : 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: TRANSITION_DURATION_SECS }}
                />
            </AnimatePresence>
            {videoUrl && !shouldWaitForLGIdentComplete && videosEnabled && (
                <MotionVideo
                    key="video"
                    ref={videoRef}
                    src={videoUrl}
                    poster={image}
                    className={styles.heroImage}
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        opacity: 0,
                        visibility: showVideo ? "visible" : "hidden",
                        width: showVideo ? "100%" : "0%",
                        height: showVideo ? "100%" : "0%",
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: showVideo ? 1 : 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: TRANSITION_DURATION_SECS }}
                    muted={false}
                    playsInline
                    onEnded={handleVideoEnd}
                    onCanPlay={handleVideoCanPlay}
                    preload="auto"
                />
            )}
        </div>
    )
}
