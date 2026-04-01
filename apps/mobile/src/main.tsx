import "./polyfills"
import "./Global.scss"
import "./utils/datadog"

import { PlatformProvider, usePlatformStatus } from "@volley/platform-sdk/react"
import { lazy, Suspense, useEffect } from "react"
import { createRoot } from "react-dom/client"

import packageJson from "../package.json"
import { SEGMENT_WRITE_KEY } from "./config/envconfig"
import { PLATFORM_API_URL, PLATFORM_AUTH_API_URL } from "./constants"
import { PLATFORM_STAGE } from "./constants/PLATFORM_STAGE"

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

const params = new URLSearchParams(window.location.search)
const isNativeApp = params.get("volley_platform") === "MOBILE"

if (isNativeApp) {
    // Loaded inside VWR native app iframe — show controller
    createRoot(rootElement).render(
        <PlatformProvider
            options={{ ...basePlatformOptions, gameId: "mobile-hub" }}
        >
            <Suspense fallback={null}>
                <MobileHub />
            </Suspense>
        </PlatformProvider>
    )
} else {
    // Web browser, no volley_platform=MOBILE — show app download page
    // Inject volley_platform=MOBILE for PSDK init, remove after ready
    const url = new URL(window.location.href)
    url.searchParams.set("volley_platform", "MOBILE")
    window.history.replaceState({}, "", url.toString())

    function RemovePlatformParam(): null {
        const { isReady } = usePlatformStatus()
        useEffect(() => {
            if (!isReady) return
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
                gameId: "mobile-download-page",
            }}
        >
            <RemovePlatformParam />
            <Suspense fallback={null}>
                <AppDownloadLandingWithSupport />
            </Suspense>
        </PlatformProvider>
    )
}
