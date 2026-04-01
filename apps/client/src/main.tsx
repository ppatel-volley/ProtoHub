import "./polyfills"
import "./Global.scss"
import "./utils/datadog"

import { init } from "@noriginmedia/norigin-spatial-navigation"
import { PlatformProvider, usePlatformStatus } from "@volley/platform-sdk/react"
import { lazy, Suspense, useEffect } from "react"
import { createRoot } from "react-dom/client"

import packageJson from "../package.json"
import { ChunkLoadErrorBoundary } from "./components/ChunkLoadErrorBoundary/ChunkLoadErrorBoundary"
import { ArrowPressProvider } from "./components/FocusableUI/ArrowPressContext"
import { InvalidPlatformModal } from "./components/TvHub/InvalidPlatformModal/InvalidPlatformModal"
import { SHOULD_FORCE_APP_DOWNLOAD_PAGE } from "./config/devOverrides"
import { SEGMENT_WRITE_KEY } from "./config/envconfig"
import {
    agentIsTV,
    getDetectedPlatform,
    getStatedPlatform,
    isMobile,
    isMobileWebview,
    isStatedTV,
} from "./config/platformDetection"
import {
    PLATFORM_API_URL,
    PLATFORM_AUTH_API_URL,
    PLATFORM_STAGE,
} from "./constants"
import { logger } from "./utils/logger"
import { getPlatformRoute, PlatformRoute } from "./utils/platformRoute"
import { pngDetector } from "./utils/pngDetection"
import { initResourceDetection } from "./utils/resourceDetection"
import { s3Detector } from "./utils/s3Detection"

const App = lazy(() =>
    import("./components/App").then((module) => ({
        default: module.App,
    }))
)
const MobileHub = lazy(() =>
    import("./components/MobileHub/MobileHub").then((module) => ({
        default: module.MobileHub,
    }))
)
const AppDownloadLandingWithSupport = lazy(() =>
    import(
        "./components/MobileHub/AppDownloadLanding/AppDownloadLandingWithSupport"
    ).then((module) => ({
        default: module.AppDownloadLandingWithSupport,
    }))
)

const rootElement = document.getElementById("root")
if (!rootElement) {
    throw new Error("Root element not found")
}

const basePlatformOptions = {
    appVersion: packageJson.version,
    stage: PLATFORM_STAGE,
    platformApiUrl: PLATFORM_API_URL,
    platformAuthApiUrl: PLATFORM_AUTH_API_URL,
    tracking: {
        segmentWriteKey: SEGMENT_WRITE_KEY,
    },
    readyEventTimeoutMs: 30000,
}

const route = getPlatformRoute({
    isMobile: isMobile(),
    isMobileWebview: isMobileWebview(),
    isStatedTV: isStatedTV(),
    agentIsTV: agentIsTV(),
    forceAppDownloadPage: SHOULD_FORCE_APP_DOWNLOAD_PAGE,
    bypassAppDownload:
        new URLSearchParams(window.location.search).get("bypassAppDownload") ===
        "true",
})

switch (route) {
    case PlatformRoute.AppDownload: {
        const url = new URL(window.location.href)
        const addedPlatformParam = !url.searchParams.has("volley_platform")
        if (addedPlatformParam) {
            url.searchParams.set("volley_platform", "MOBILE")
            window.history.replaceState({}, "", url.toString())
        }

        function RemovePlatformParam(): null {
            const { isReady } = usePlatformStatus()
            useEffect(() => {
                if (!isReady || !addedPlatformParam) return
                const currentUrl = new URL(window.location.href)
                currentUrl.searchParams.delete("volley_platform")
                window.history.replaceState({}, "", currentUrl.toString())
            }, [isReady])
            return null
        }

        createRoot(rootElement).render(
            <PlatformProvider
                options={{
                    ...basePlatformOptions,
                    gameId: PlatformRoute.AppDownload,
                }}
            >
                <RemovePlatformParam />
                <ChunkLoadErrorBoundary>
                    <Suspense fallback={null}>
                        <AppDownloadLandingWithSupport />
                    </Suspense>
                </ChunkLoadErrorBoundary>
            </PlatformProvider>
        )
        break
    }
    case PlatformRoute.MobileHub:
        createRoot(rootElement).render(
            <PlatformProvider
                options={{
                    ...basePlatformOptions,
                    gameId: PlatformRoute.MobileHub,
                }}
            >
                <ChunkLoadErrorBoundary>
                    <Suspense fallback={null}>
                        <MobileHub />
                    </Suspense>
                </ChunkLoadErrorBoundary>
            </PlatformProvider>
        )
        break
    case PlatformRoute.InvalidPlatform: {
        const statedPlatform = getStatedPlatform()
        const detectedPlatform = getDetectedPlatform().toString()
        logger.warn("Invalid platform mismatch detected at startup", {
            statedPlatform,
            detectedPlatform,
        })

        createRoot(rootElement).render(
            <InvalidPlatformModal
                isOpen
                onExit={() => {
                    logger.info("User attempted to exit invalid platform modal")
                    window.location.href = window.location.origin
                }}
                errorMessage="Invalid platform"
            />
        )
        break
    }
    case PlatformRoute.Hub:
        init({ throttleKeypresses: true, throttle: 50 })
        initResourceDetection([pngDetector, s3Detector])
        window.addEventListener(
            "keydown",
            (e: KeyboardEvent) => {
                if (
                    e.key === "ArrowUp" ||
                    e.key === "ArrowDown" ||
                    e.key === "ArrowLeft" ||
                    e.key === "ArrowRight"
                ) {
                    e.preventDefault()
                }
            },
            { passive: false }
        )

        createRoot(rootElement).render(
            <PlatformProvider
                options={{
                    ...basePlatformOptions,
                    gameId: PlatformRoute.Hub,
                }}
            >
                <ArrowPressProvider>
                    <ChunkLoadErrorBoundary>
                        <Suspense fallback={null}>
                            <App />
                        </Suspense>
                    </ChunkLoadErrorBoundary>
                </ArrowPressProvider>
            </PlatformProvider>
        )
        break
}
