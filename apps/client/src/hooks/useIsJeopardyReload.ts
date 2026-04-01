import { useState } from "react"

/**
 * Jeopardy reload mechanism.
 *
 * Jeopardy's game client leaks WASM memory even after killing the iframe.
 * This is a workaround to prevent OOM crashes.
 * After N consecutive launches (controlled by the
 * `JeopardyReloadThreshold` experiment), `GameLauncher` triggers a full
 * page reload to reclaim memory and prevent OOM crashes.
 *
 * The reload flag is set in sessionStorage before `window.location.reload()`.
 * On the next load, `useIsJeopardyReload` reads and clears the flag so
 * the app can skip the video ident and go straight to the carousel.
 */
const JEOPARDY_RELOAD_KEY = "jeopardy-reload"

/**
 * Checks whether the current page load is a Jeopardy OOM-prevention reload.
 * Called early in the app initialization sequence to detect the reload flag
 * set by {@link triggerJeopardyReload}.
 */
export const checkIsJeopardyReloading = (): boolean => {
    return sessionStorage.getItem(JEOPARDY_RELOAD_KEY) === "true"
}

/**
 * Triggers a full page reload to prevent WebAssembly out-of-memory errors in Jeopardy.
 * Sets a sessionStorage flag so the app can detect the reload on the next load
 * and skip directly to launching the game.
 *
 * @see GameLauncher.launchGame for the threshold logic that calls this
 * @see useIsJeopardyReload for the detection hook
 */
export const triggerJeopardyReload = (): void => {
    sessionStorage.setItem(JEOPARDY_RELOAD_KEY, "true")
    window.location.reload()
}

/**
 * Hook that checks on mount whether the current page load was triggered by a Jeopardy
 * OOM-prevention reload. Consumes the sessionStorage flag (one-shot) so subsequent
 * renders return false.
 */
export const useIsJeopardyReload = (): boolean => {
    const [isJeopardyReload] = useState<boolean>(() => {
        const jeopardyReload = checkIsJeopardyReloading()
        if (jeopardyReload) {
            sessionStorage.removeItem(JEOPARDY_RELOAD_KEY)
            return true
        }
        return false
    })

    return isJeopardyReload
}
