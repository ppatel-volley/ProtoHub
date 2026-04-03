import "./polyfills"
import "./Global.scss"
import "./utils/datadog"

import { init } from "@noriginmedia/norigin-spatial-navigation"
import { PlatformProvider } from "@volley/platform-sdk/react"
import { lazy, Suspense } from "react"
import { createRoot } from "react-dom/client"

/**
 * Inject a fallback hub session ID for local/dev/staging so PlatformProvider
 * doesn't crash. Matches the pattern from emoji-multiplatform and BUILDING_TV_GAMES.md.
 */
function ensureLocalHubSessionId(stage: string): void {
    if (stage !== "local" && stage !== "dev" && stage !== "staging") return
    const url = new URL(window.location.href)
    if (!url.searchParams.has("volley_hub_session_id")) {
        url.searchParams.set("volley_hub_session_id", "local-dev-hub-session")
        // Use both replaceState AND redirect to ensure the SDK picks it up
        // On Fire TV WebView inside VWR, replaceState alone doesn't work
        window.history.replaceState({}, "", url.toString())
        // If we're in a fresh page load (no session ID), redirect to force it
        if (!window.location.search.includes("volley_hub_session_id")) {
            window.location.replace(url.toString())
        }
    }
}

import packageJson from "../package.json"
import { ChunkLoadErrorBoundary } from "./components/ChunkLoadErrorBoundary/ChunkLoadErrorBoundary"
import { ArrowPressProvider } from "./components/FocusableUI/ArrowPressContext"
import {
    PLATFORM_API_URL,
    PLATFORM_AUTH_API_URL,
    PLATFORM_STAGE,
} from "./constants"
import { initResourceDetection } from "./utils/resourceDetection"
import { pngDetector } from "./utils/pngDetection"
import { s3Detector } from "./utils/s3Detection"

const App = lazy(() =>
    import("./components/App").then((module) => ({
        default: module.App,
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
    readyEventTimeoutMs: 30000,
}

// Inject fallback session ID before PlatformProvider mounts
ensureLocalHubSessionId(PLATFORM_STAGE)

// Signal VWR that the app has loaded. Send immediately and repeat
// after a short delay to ensure VWR's message listener is ready.
function signalVwrReady(): void {
    try {
        window.parent.postMessage(
            { type: "ready", source: "platform-sdk-iframe", args: [] },
            "*"
        )
    } catch {
        // Not in an iframe — ignore
    }
}
signalVwrReady()
setTimeout(signalVwrReady, 500)
setTimeout(signalVwrReady, 1500)
setTimeout(signalVwrReady, 3000)

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

// On Fire TV via VWR, PlatformProvider may crash because the session ID
// isn't in the URL params (VWR manages sessions via RPC, not URL).
// Use an error boundary to fall back to rendering without PlatformProvider.
import { Component, type ReactNode } from "react"

class PlatformErrorBoundary extends Component<
    { children: ReactNode; fallback: ReactNode },
    { hasError: boolean }
> {
    state = { hasError: false }
    static getDerivedStateFromError() {
        return { hasError: true }
    }
    componentDidCatch(error: Error) {
        console.warn("PlatformProvider failed, rendering without it:", error.message)
    }
    render() {
        return this.state.hasError ? this.props.fallback : this.props.children
    }
}

const appContent = (
    <ArrowPressProvider>
        <ChunkLoadErrorBoundary>
            <Suspense fallback={null}>
                <App />
            </Suspense>
        </ChunkLoadErrorBoundary>
    </ArrowPressProvider>
)

createRoot(rootElement).render(
    <PlatformErrorBoundary fallback={appContent}>
        <PlatformProvider
            options={{
                ...basePlatformOptions,
                gameId: "proto-hub",
            }}
        >
            {appContent}
        </PlatformProvider>
    </PlatformErrorBoundary>
)
