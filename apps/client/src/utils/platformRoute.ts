export enum PlatformRoute {
    AppDownload = "mobile-download-page",
    MobileHub = "mobile-hub",
    InvalidPlatform = "invalid-platform",
    Hub = "hub",
}

interface PlatformRouteParams {
    isMobile: boolean
    isMobileWebview: boolean
    isStatedTV: boolean
    agentIsTV: boolean
    forceAppDownloadPage: boolean
    bypassAppDownload: boolean
}

export function getPlatformRoute({
    isMobile,
    isMobileWebview,
    isStatedTV,
    agentIsTV,
    forceAppDownloadPage,
    bypassAppDownload,
}: PlatformRouteParams): PlatformRoute {
    if (isStatedTV && !agentIsTV) {
        return PlatformRoute.InvalidPlatform
    }

    const isMobileWeb = isMobile && !isMobileWebview

    if (forceAppDownloadPage || (isMobileWeb && !bypassAppDownload)) {
        return PlatformRoute.AppDownload
    }

    if (isMobileWebview || (isMobileWeb && bypassAppDownload)) {
        return PlatformRoute.MobileHub
    }

    return PlatformRoute.Hub
}
