import type { GameId } from "../hooks/useGames"

export interface Deeplink {
    gameId: GameId
    campaignId: string
}

/**
 * Gets the deeplink parameter from the URL
 * @returns The deeplink value if present in the URL, undefined otherwise
 */
export const getDeeplink = (): Deeplink | undefined => {
    const urlParams = new URLSearchParams(window.location.search)
    const fullDeeplink = urlParams.get("deeplink") || undefined
    if (!fullDeeplink) {
        return undefined
    }
    const [gameId, campaignId] = fullDeeplink.split("_", 2)
    if (!gameId) {
        return undefined
    }
    return { gameId: gameId as GameId, campaignId: campaignId || "" }
}

/**
 * Clears the deeplink parameter from the URL
 * without triggering a page navigation
 */
export const clearDeeplink = (): void => {
    const currentUrl = new URL(window.location.href)
    currentUrl.searchParams.delete("deeplink")
    window.history.replaceState({}, "", currentUrl.toString())
}
