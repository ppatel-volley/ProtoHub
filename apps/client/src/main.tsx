import "./polyfills"
import "./Global.scss"
import "./utils/datadog"

import { init } from "@noriginmedia/norigin-spatial-navigation"
import { PlatformProvider } from "@volley/platform-sdk/react"
import { lazy, Suspense } from "react"
import { createRoot } from "react-dom/client"

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

// gameId: "hub" is critical. The Platform SDK auto-generates a session ID
// when gameId === "hub" (via isHub() check in getHubSessionId). Any other
// gameId causes a crash when volley_hub_session_id is missing from the URL.
// This also enables VWR RPC integration and automatic ready event emission.
//
// trustedOrigins: Proto-Hub runs at protohub-dev.volley.tv but VWR runs at
// game-clients-dev.volley.tv. BrowserIpc checks event.origin on handshake
// responses — without adding VWR's origin, the RPC connection times out
// and D-pad input doesn't work on Fire TV.
createRoot(rootElement).render(
    <PlatformProvider
        options={{
            ...basePlatformOptions,
            gameId: "hub",
            trustedOrigins: new Set([
                "https://game-clients-dev.volley.tv",
                "https://game-clients-staging.volley.tv",
                "https://game-clients.volley.tv",
            ]),
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
