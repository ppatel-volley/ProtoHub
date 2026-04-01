import { getPlatformRoute, PlatformRoute } from "./platformRoute"

const defaults = {
    isMobile: false,
    isMobileWebview: false,
    isStatedTV: false,
    agentIsTV: false,
    forceAppDownloadPage: false,
    bypassAppDownload: false,
}

describe("getPlatformRoute", () => {
    describe("app-download route", () => {
        it("routes to app-download for mobile web browser", () => {
            expect(
                getPlatformRoute({
                    ...defaults,
                    isMobile: true,
                    isMobileWebview: false,
                })
            ).toBe(PlatformRoute.AppDownload)
        })

        it("routes to app-download when forceAppDownloadPage is true", () => {
            expect(
                getPlatformRoute({
                    ...defaults,
                    forceAppDownloadPage: true,
                })
            ).toBe(PlatformRoute.AppDownload)
        })

        it("routes to app-download when forceAppDownloadPage overrides webview", () => {
            expect(
                getPlatformRoute({
                    ...defaults,
                    isMobile: true,
                    isMobileWebview: true,
                    forceAppDownloadPage: true,
                })
            ).toBe(PlatformRoute.AppDownload)
        })
    })

    describe("mobile-hub route", () => {
        it("routes to mobile-hub for native mobile webview", () => {
            expect(
                getPlatformRoute({
                    ...defaults,
                    isMobile: true,
                    isMobileWebview: true,
                })
            ).toBe(PlatformRoute.MobileHub)
        })

        it("routes to mobile-hub for mobile web with bypassAppDownload", () => {
            expect(
                getPlatformRoute({
                    ...defaults,
                    isMobile: true,
                    isMobileWebview: false,
                    bypassAppDownload: true,
                })
            ).toBe(PlatformRoute.MobileHub)
        })
    })

    describe("invalid-platform route", () => {
        it("routes to invalid-platform when stated TV but agent is not TV", () => {
            expect(
                getPlatformRoute({
                    ...defaults,
                    isStatedTV: true,
                    agentIsTV: false,
                })
            ).toBe(PlatformRoute.InvalidPlatform)
        })

        it("routes to invalid-platform for mobile device with spoofed TV param", () => {
            expect(
                getPlatformRoute({
                    ...defaults,
                    isMobile: true,
                    isStatedTV: true,
                    agentIsTV: false,
                })
            ).toBe(PlatformRoute.InvalidPlatform)
        })

        it("routes to invalid-platform even when forceAppDownloadPage is true", () => {
            expect(
                getPlatformRoute({
                    ...defaults,
                    isStatedTV: true,
                    agentIsTV: false,
                    forceAppDownloadPage: true,
                })
            ).toBe(PlatformRoute.InvalidPlatform)
        })

        it("routes to hub when stated TV and agent is also TV", () => {
            expect(
                getPlatformRoute({
                    ...defaults,
                    isStatedTV: true,
                    agentIsTV: true,
                })
            ).toBe(PlatformRoute.Hub)
        })
    })

    describe("hub route", () => {
        it("routes to hub for desktop web browser", () => {
            expect(getPlatformRoute(defaults)).toBe(PlatformRoute.Hub)
        })

        it("routes to hub for TV platforms", () => {
            expect(
                getPlatformRoute({
                    ...defaults,
                    isStatedTV: true,
                    agentIsTV: true,
                })
            ).toBe(PlatformRoute.Hub)
        })
    })

    describe("gameId mapping", () => {
        it("each route maps to a distinct gameId", () => {
            const routes = new Set([
                getPlatformRoute(defaults),
                getPlatformRoute({
                    ...defaults,
                    isMobile: true,
                    isMobileWebview: false,
                }),
                getPlatformRoute({
                    ...defaults,
                    isMobile: true,
                    isMobileWebview: true,
                }),
            ])
            expect(routes.size).toBe(3)
        })
    })
})
