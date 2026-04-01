import type { JSX } from "react"

import { getDeeplink } from "../../config/deeplink"
import { useImmediateUpsell } from "../../hooks/useImmediateUpsell"
import type { ImagePreloadingResult } from "../../hooks/usePreloadImages"
import { Background } from "./Background"
import { Main } from "./MainMenu"

export function TvHub({
    setAssetLoadingStates,
    isInitialized,
    optionalImagesLoaded,
    isJeopardyReload,
    videoComplete,
    platformReady,
    experimentsReady,
}: {
    setAssetLoadingStates: (states: ImagePreloadingResult) => void
    isInitialized: boolean
    optionalImagesLoaded: boolean
    isJeopardyReload: boolean
    videoComplete: boolean
    platformReady: boolean
    experimentsReady: boolean
}): JSX.Element {
    const deeplink = getDeeplink()

    const shouldStartUpsell =
        !isJeopardyReload && experimentsReady && videoComplete && platformReady

    const canSubscribe = isInitialized && optionalImagesLoaded

    const { isInImmediateUpsell } = useImmediateUpsell(
        shouldStartUpsell,
        deeplink,
        canSubscribe
    )

    if (isInImmediateUpsell === null) {
        return <Background />
    }

    return (
        <>
            {!isInImmediateUpsell && <Background />}
            <Main
                setAssetLoadingStates={setAssetLoadingStates}
                isInitialized={isInitialized}
                isJeopardyReload={isJeopardyReload}
                isInImmediateUpsell={isInImmediateUpsell}
            />
        </>
    )
}
