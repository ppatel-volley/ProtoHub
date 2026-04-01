import { useCallback, useEffect, useRef, useState } from "react"

import type { VideoSegmentRanges } from "../components/WebCheckoutModal/webCheckoutModalConfig"
import { attemptVideoAutoplay } from "../utils/attemptVideoAutoplay"
import { applyPlatformVideoOptimizations } from "../utils/platformVideoOptimizations"

export type VideoSequencePhase = "intro" | "looping"

interface UseVideoSequenceSegmentedProps {
    /**
     * Whether the video sequence should be active
     */
    isActive: boolean
    /**
     * Video source URL
     */
    videoSrc: string
    /**
     * Time segments for intro and looping portions
     */
    segments?: VideoSegmentRanges
    /**
     * Dependency that restarts the sequence when changed
     */
    restartKey?: unknown
}

interface UseVideoSequenceSegmentedReturn {
    currentVideo: VideoSequencePhase
    videoRef: React.RefObject<HTMLVideoElement | null>
}

/**
 * Manages a video sequence using a single video file with time-based segments.
 * Plays intro segment first, then seamlessly loops the specified looping segment.
 *
 * @param isActive - Whether the video sequence should be active
 * @param videoSrc - Video source URL
 * @param segments - Time segments for intro and looping portions
 * @param restartKey - Dependency that restarts the sequence when changed
 * @returns The current video phase and video ref
 */
export const useVideoSequenceSegmented = ({
    isActive,
    videoSrc,
    segments,
    restartKey,
}: UseVideoSequenceSegmentedProps): UseVideoSequenceSegmentedReturn => {
    const [currentVideo, setCurrentVideo] =
        useState<VideoSequencePhase>("intro")
    const videoRef = useRef<HTMLVideoElement>(null)
    const hasPlayedIntro = useRef(false)

    const playIntroSegment = useCallback(async (): Promise<void> => {
        const video = videoRef.current
        if (!video || !segments) return

        applyPlatformVideoOptimizations(video)

        // Load video from initial state to ensure poster is visible
        video.load()

        await attemptVideoAutoplay(video)
        hasPlayedIntro.current = false
    }, [segments])

    const resetVideo = (): void => {
        const video = videoRef.current
        if (!video) return

        video.pause()
        video.currentTime = 0
        video.loop = false
        hasPlayedIntro.current = false
    }

    useEffect(() => {
        if (isActive) {
            setCurrentVideo("intro")
            void playIntroSegment()
        } else {
            resetVideo()
        }
    }, [isActive, restartKey, videoSrc, playIntroSegment])

    useEffect(() => {
        const handleTimeUpdate = (): void => {
            const video = videoRef.current
            if (!video || !segments || !isActive) return

            if (currentVideo === "looping") {
                const currentTime = video.currentTime
                const loopEnd = segments.loopEnd
                if (loopEnd && currentTime >= loopEnd) {
                    video.currentTime = segments.loopStart ?? 0
                }
            }
        }

        const handleEnded = (): void => {
            const video = videoRef.current
            if (!video || !segments || !isActive) return

            if (currentVideo === "intro") {
                setCurrentVideo("looping")
                video.currentTime = segments.loopStart ?? 0
                void attemptVideoAutoplay(video)
            } else if (currentVideo === "looping") {
                video.currentTime = segments.loopStart ?? 0
                void attemptVideoAutoplay(video)
            }
        }

        const video = videoRef.current
        if (video && isActive) {
            video.addEventListener("timeupdate", handleTimeUpdate)
            video.addEventListener("ended", handleEnded)
            return (): void => {
                video.removeEventListener("timeupdate", handleTimeUpdate)
                video.removeEventListener("ended", handleEnded)
            }
        }
    }, [isActive, currentVideo, segments])

    return {
        currentVideo,
        videoRef,
    }
}
