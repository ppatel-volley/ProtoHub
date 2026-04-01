import { getSafeAreaValues } from "./getSafeAreaValues"

/**
 * Gets the game iframe controller urls from (in order of priority):
 * 1. url query parameter
 * 2. env variable in file /.env.local
 *    e.g. VITE_GAME_IFRAME_CONTROLLER_URL=https://example-game-iframe-controller.com/
 * 3. default URL
 *
 * @returns The game iframe controller url to use
 */
export const getGameIframeControllerUrl = (): string | undefined => {
    const urlParams = new URLSearchParams(window.location.search)
    const queryParamUrl = urlParams.get("gameIframeControllerUrl")
    if (queryParamUrl) {
        const safeAreaValues = getSafeAreaValues()

        // Append safe area values to the existing URL
        const url = new URL(queryParamUrl)
        url.searchParams.set("safeArea", JSON.stringify(safeAreaValues))
        return url.toString()
    }

    const envUrl = import.meta.env.VITE_GAME_IFRAME_CONTROLLER_URL as
        | string
        | undefined
    if (envUrl) return envUrl
}

/**
 * Clears the gameIframeControllerUrl parameter from the URL
 * without triggering a page navigation
 */
export const clearGameIframeControllerUrl = (): void => {
    const currentUrl = new URL(window.location.href)
    currentUrl.searchParams.delete("gameIframeControllerUrl")
    window.history.replaceState({}, "", currentUrl.toString())
}
