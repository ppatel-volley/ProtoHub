import { useEffect, useState } from "react"

import { SHOULD_SKIP_VIDEO } from "../../../config/devOverrides"
import { useIsJeopardyReload } from "../../../hooks/useIsJeopardyReload"
import { LoadingScreen } from "../LoadingScreen"

interface LoadingProps {
    logoDisplayMillis: number
    videoUrl?: string
    videoComplete: boolean
    setVideoComplete: (videoComplete: boolean) => void
}

export const Loading: React.FC<LoadingProps> = ({
    logoDisplayMillis,
    videoUrl,
    videoComplete,
    setVideoComplete,
}) => {
    const isJeopardyReload = useIsJeopardyReload()
    useEffect(() => {
        const shouldSkipVideo = isJeopardyReload || SHOULD_SKIP_VIDEO

        if (shouldSkipVideo) {
            setVideoComplete(true)
        }
    }, [isJeopardyReload, setVideoComplete])

    const [logoDisplayFinished, setLogoDisplayFinished] =
        useState<boolean>(false)

    const handleLogoAnimationComplete = (): void => {
        setLogoDisplayFinished(true)
    }

    return (
        <LoadingScreen
            showIdentVideo={!isJeopardyReload}
            displayLogo={!logoDisplayFinished}
            videoUrl={videoUrl}
            videoComplete={videoComplete}
            setVideoComplete={setVideoComplete}
            onLogoAnimationComplete={handleLogoAnimationComplete}
            logoDisplayMillis={logoDisplayMillis}
        />
    )
}
