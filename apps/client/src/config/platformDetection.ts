import {
    getMobileType,
    getPlatform,
    MobileType,
    Platform,
} from "@volley/platform-sdk/lib"

import {
    SHOULD_FORCE_WEB_CHECKOUT,
    SHOULD_SIMULATE_LG,
    SHOULD_SIMULATE_SAMSUNG,
} from "./devOverrides"

interface TestPlatformOverrides {
    isWeb?: boolean
    shouldUseWebCheckout?: boolean
    isFunctionalTest?: boolean
}

declare global {
    interface Window {
        __TEST_PLATFORM_OVERRIDES?: TestPlatformOverrides
    }
}

let cachedPlatform: Platform | null = null

/**
 * Returns the cached platform value. getPlatform() is only called once per session.
 * @returns Platform
 */
export function getCachedPlatform(): Platform {
    if (cachedPlatform === null) {
        cachedPlatform = getPlatform()
    }
    return cachedPlatform
}

/**
 * Resets the platform cache. Only for testing purposes.
 */
export function resetPlatformCache(): void {
    cachedPlatform = null
}

/**
 * Checks if the current environment is a mobile webview aka in the mobile app
 * @returns Boolean
 */
export function isMobileWebview(): boolean {
    return getCachedPlatform() === Platform.Mobile
}

/**
 * Checks if the current environment is a FireTV device
 * @returns Boolean
 */
export function isFireTV(): boolean {
    return getCachedPlatform() === Platform.FireTV
}

const mobileRegex =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Opera Mini/i

/**
 * Checks if the current environment is a mobile device
 * with a simple regex against common mobile device user agents
 * @returns Boolean
 */
export function isMobile(): boolean {
    return (
        isMobileWebview() ||
        (getCachedPlatform() === Platform.Web &&
            mobileRegex.test(navigator.userAgent))
    )
}

/**
 * Checks if the current environment is an Android device
 * @returns Boolean
 */
export function isAndroid(): boolean {
    return /Android/i.test(navigator.userAgent)
}

/**
 * Checks if the current environment is an iOS device
 * @returns Boolean
 */
export function isIOS(): boolean {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

/**
 * Checks if the current environment is an LG Smart TV (WebOS)
 * Can be simulated with ?simulateLG URL parameter
 * @returns Boolean
 */
export function isLGTV(): boolean {
    return getCachedPlatform() === Platform.LGTV || SHOULD_SIMULATE_LG
}

/**
 * Checks if the current environment is a Samsung Smart TV (Tizen)
 * Can be simulated with ?simulateSamsung URL parameter
 * @returns Boolean
 */
export function isSamsungTV(): boolean {
    return getCachedPlatform() === Platform.SamsungTV || SHOULD_SIMULATE_SAMSUNG
}

/**
 * Checks if the current platform is LG or Samsung TV
 * @returns Boolean
 */
export function isLGOrSamsungTV(): boolean {
    return isLGTV() || isSamsungTV()
}

/**
 * Checks if the current platform is a local Web Browser
 * @returns Boolean
 */
export function isWeb(): boolean {
    if (
        typeof window !== "undefined" &&
        window.__TEST_PLATFORM_OVERRIDES?.isWeb !== undefined
    ) {
        return window.__TEST_PLATFORM_OVERRIDES.isWeb
    }
    return getCachedPlatform() === Platform.Web && !isMobile()
}

/**
 * Checks if the current platform should use web checkout instead of platform payments
 * @returns Boolean
 */
export function shouldUseWebCheckout(): boolean {
    if (
        typeof window !== "undefined" &&
        window.__TEST_PLATFORM_OVERRIDES?.shouldUseWebCheckout !== undefined
    ) {
        return window.__TEST_PLATFORM_OVERRIDES.shouldUseWebCheckout
    }
    return isLGTV() || isSamsungTV() || isWeb() || SHOULD_FORCE_WEB_CHECKOUT
}

/**
 * Checks if the current environment is an iOS App Clip
 * @returns Boolean
 */
export function isAppClip(): boolean {
    return getMobileType() === MobileType.IosAppClip
}

export const PLATFORM_PARAM = "volley_platform"

/**
 * Gets the stated platform from the URL parameters
 * @returns string | null
 */
export function getStatedPlatform(): string {
    const params = new URLSearchParams(window.location.search)
    const platform = params.get(PLATFORM_PARAM)
    return platform ?? Platform.Web.toString()
}

/**
 * Gets the detected platform from the user agent
 * @returns Platform
 */
export function getDetectedPlatform(): Platform {
    if (isSamsungTizenUserAgent()) {
        return Platform.SamsungTV
    }
    if (isLGWebOSUserAgent()) {
        return Platform.LGTV
    }
    if (isFireTVUserAgent()) {
        return Platform.FireTV
    }
    return Platform.Web
}

/**
 * Checks if a given string matches a TV platform
 * @returns Boolean
 */
export function matchesTVPlatform(platform: string): boolean {
    return [
        Platform.FireTV.toString(),
        Platform.LGTV.toString(),
        Platform.SamsungTV.toString(),
    ].includes(platform)
}

/**
 * Checks if the current agent is an actual TV platform
 * @returns Boolean
 */
export function agentIsTV(): boolean {
    return (
        isFireTVUserAgent() || isLGWebOSUserAgent() || isSamsungTizenUserAgent()
    )
}

/**
 * Checks if the stated platform is a TV platform
 * @returns Boolean
 */
export function isStatedTV(): boolean {
    const platformIsTV = matchesTVPlatform(getStatedPlatform())
    return platformIsTV
}

/**
 * LG WebOS detection via user agent.
 * Detects if the current user agent is from an LG webOS TV.
 * Example: "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.270 Safari/537.36 WebAppManager"
 */
export const isLGWebOSUserAgent = (): boolean => {
    const userAgent = navigator?.userAgent || ""
    return userAgent.includes("Web0S") && userAgent.includes("SmartTV")
}

/**
 * Samsung Tizen detection via user agent.
 * Detects if the current user agent is from a Samsung Tizen TV.
 * Example: "Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/6.0 TV Safari/537.36"
 */
export const isSamsungTizenUserAgent = (): boolean => {
    const userAgent = navigator?.userAgent || ""
    return userAgent.includes("Tizen") && userAgent.includes("SMART-TV")
}

/**
 * FireTV detection via user agent.
 * Detects if the current user agent is from a FireTV device.
 * Example: "Mozilla/5.0 (Linux; Android 5.1.1; AFTM) AppleWebKit/537.36 (KHTML, like Gecko) Silk/70.1.93 like Chrome/70.0.3538.64 Safari/537.36"
 */
export const isFireTVUserAgent = (): boolean => {
    const userAgent = navigator?.userAgent || ""
    return userAgent.includes("Android") && /; AFT[A-Z]+/.test(userAgent)
}
