import {
    getMobileType,
    getPlatform,
    MobileType,
    Platform,
} from "@volley/platform-sdk/lib"

import {
    agentIsTV,
    getCachedPlatform,
    getDetectedPlatform,
    getStatedPlatform,
    isAndroid,
    isAppClip,
    isFireTV,
    isFireTVUserAgent,
    isIOS,
    isLGOrSamsungTV,
    isLGTV,
    isLGWebOSUserAgent,
    isMobile,
    isMobileWebview,
    isSamsungTizenUserAgent,
    isSamsungTV,
    isStatedTV,
    isWeb,
    matchesTVPlatform,
    resetPlatformCache,
    shouldUseWebCheckout,
} from "./platformDetection"
jest.mock("@volley/platform-sdk/lib")

jest.mock("./devOverrides", () => ({
    SHOULD_FORCE_WEB_CHECKOUT: false,
    SHOULD_SIMULATE_LG: false,
    SHOULD_SIMULATE_SAMSUNG: false,
}))

const mockGetPlatform = getPlatform as jest.MockedFunction<typeof getPlatform>
const mockGetMobileType = getMobileType as jest.MockedFunction<
    typeof getMobileType
>
const mockDevOverrides = jest.requireMock("./devOverrides")

describe("platformDetection", () => {
    let originalUserAgent: string

    beforeAll(() => {
        originalUserAgent = navigator.userAgent
    })

    beforeEach(() => {
        jest.clearAllMocks()
        resetPlatformCache()
        mockDevOverrides.SHOULD_FORCE_WEB_CHECKOUT = false
        mockDevOverrides.SHOULD_SIMULATE_LG = false
        mockDevOverrides.SHOULD_SIMULATE_SAMSUNG = false

        Object.defineProperty(navigator, "userAgent", {
            writable: true,
            configurable: true,
            value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        })
    })

    afterAll(() => {
        Object.defineProperty(navigator, "userAgent", {
            writable: true,
            configurable: true,
            value: originalUserAgent,
        })
    })

    describe("isMobile", () => {
        it("should return true when platform is Mobile", () => {
            mockGetPlatform.mockReturnValue(Platform.Mobile)

            const result = isMobile()

            expect(result).toBe(true)
        })

        it("should return true when platform is Web and userAgent matches mobile device", () => {
            mockGetPlatform.mockReturnValue(Platform.Web)

            const mobileUserAgents = [
                "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/114.0.5735.99 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/114.0.5735.124 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/114.1 Mobile/15E148 Safari/605.1.15",
                "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36",
                "Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/21.0 Chrome/110.0.5481.154 Mobile Safari/537.36",
                "Mozilla/5.0 (Linux; U; Android 11; en-us; itel P661W Build/RP1A.201005.001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.85 Mobile Safari/537.36 PHX/12.9",
                "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Mobile Safari/537.36 EdgA/113.0.1774.63",
                "Mozilla/5.0 (Android 13; Mobile; rv:109.0) Gecko/114.0 Firefox/114.0",
                "Mozilla/5.0 (Linux; Android 5.1.1; KFSUWI) AppleWebKit/537.36 (KHTML, like Gecko) Silk/108.4.6 like Chrome/108.0.5359.220 Safari/537.36",
            ]

            mobileUserAgents.forEach((userAgent) => {
                Object.defineProperty(navigator, "userAgent", {
                    writable: true,
                    configurable: true,
                    value: userAgent,
                })

                const result = isMobile()
                expect(result).toBe(true)
            })
        })

        it("should return false when platform is Web and userAgent is desktop", () => {
            mockGetPlatform.mockReturnValue(Platform.Web)

            const desktopUserAgents = [
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.10 Safari/605.1.1",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.3",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.3",
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.3",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Trailer/93.3.8652.5",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 OPR/117.0.0.",
            ]

            desktopUserAgents.forEach((userAgent) => {
                Object.defineProperty(navigator, "userAgent", {
                    writable: true,
                    configurable: true,
                    value: userAgent,
                })

                const result = isMobile()
                expect(result).toBe(false)
            })
        })

        it("should return false when platform is FireTV", () => {
            mockGetPlatform.mockReturnValue(Platform.FireTV)
            const result = isMobile()

            expect(result).toBe(false)
        })

        it("should handle case-insensitive mobile detection", () => {
            mockGetPlatform.mockReturnValue(Platform.Web)

            // Test lowercase variations
            const lowercaseUserAgents = [
                "mozilla/5.0 (iphone; cpu iphone os 14_7_1 like mac os x) applewebkit/605.1.15",
                "mozilla/5.0 (android 11; sm-g991b) applewebkit/537.36",
            ]

            lowercaseUserAgents.forEach((userAgent) => {
                Object.defineProperty(navigator, "userAgent", {
                    writable: true,
                    configurable: true,
                    value: userAgent,
                })

                const result = isMobile()
                expect(result).toBe(true)
            })
        })

        it("should handle edge cases with partial matches", () => {
            mockGetPlatform.mockReturnValue(Platform.Web)

            // Test partial matches that should still work
            Object.defineProperty(navigator, "userAgent", {
                writable: true,
                configurable: true,
                value: "Some other text iPhone some more text",
            })

            const result = isMobile()
            expect(result).toBe(true)
        })

        it("should return false for empty or undefined userAgent", () => {
            mockGetPlatform.mockReturnValue(Platform.Web)

            Object.defineProperty(navigator, "userAgent", {
                writable: true,
                configurable: true,
                value: "",
            })

            const result = isMobile()
            expect(result).toBe(false)
        })
    })

    describe("isFireTV", () => {
        it("should return true when platform is FireTV", () => {
            mockGetPlatform.mockReturnValue(Platform.FireTV)

            const result = isFireTV()

            expect(result).toBe(true)
        })

        it("should return false when platform is Web", () => {
            mockGetPlatform.mockReturnValue(Platform.Web)

            const result = isFireTV()

            expect(result).toBe(false)
        })

        it("should return false when platform is Mobile", () => {
            mockGetPlatform.mockReturnValue(Platform.Mobile)

            const result = isFireTV()

            expect(result).toBe(false)
        })
    })

    describe("isAndroid", () => {
        it("should return true for Android user agents", () => {
            const androidUserAgents = [
                "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36",
                "Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/21.0 Chrome/110.0.5481.154 Mobile Safari/537.36",
                "Mozilla/5.0 (Linux; U; Android 11; en-us; itel P661W Build/RP1A.201005.001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.85 Mobile Safari/537.36 PHX/12.9",
                "Mozilla/5.0 (Android 13; Mobile; rv:109.0) Gecko/114.0 Firefox/114.0",
            ]

            androidUserAgents.forEach((userAgent) => {
                Object.defineProperty(navigator, "userAgent", {
                    writable: true,
                    configurable: true,
                    value: userAgent,
                })

                const result = isAndroid()
                expect(result).toBe(true)
            })
        })

        it("should return false for iOS user agents", () => {
            const iosUserAgents = [
                "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPod touch; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
            ]

            iosUserAgents.forEach((userAgent) => {
                Object.defineProperty(navigator, "userAgent", {
                    writable: true,
                    configurable: true,
                    value: userAgent,
                })

                const result = isAndroid()
                expect(result).toBe(false)
            })
        })

        it("should return false for desktop user agents", () => {
            const desktopUserAgents = [
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.10 Safari/605.1.1",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.3",
            ]

            desktopUserAgents.forEach((userAgent) => {
                Object.defineProperty(navigator, "userAgent", {
                    writable: true,
                    configurable: true,
                    value: userAgent,
                })

                const result = isAndroid()
                expect(result).toBe(false)
            })
        })

        it("should handle case-insensitive Android detection", () => {
            Object.defineProperty(navigator, "userAgent", {
                writable: true,
                configurable: true,
                value: "mozilla/5.0 (linux; android 11; sm-g991b) applewebkit/537.36",
            })

            const result = isAndroid()
            expect(result).toBe(true)
        })
    })

    describe("isIOS", () => {
        it("should return true for iOS user agents", () => {
            const iosUserAgents = [
                "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPod touch; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/114.0.5735.99 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/114.0.5735.124 Mobile/15E148 Safari/604.1",
            ]

            iosUserAgents.forEach((userAgent) => {
                Object.defineProperty(navigator, "userAgent", {
                    writable: true,
                    configurable: true,
                    value: userAgent,
                })

                const result = isIOS()
                expect(result).toBe(true)
            })
        })

        it("should return false for Android user agents", () => {
            const androidUserAgents = [
                "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36",
                "Mozilla/5.0 (Android 13; Mobile; rv:109.0) Gecko/114.0 Firefox/114.0",
            ]

            androidUserAgents.forEach((userAgent) => {
                Object.defineProperty(navigator, "userAgent", {
                    writable: true,
                    configurable: true,
                    value: userAgent,
                })

                const result = isIOS()
                expect(result).toBe(false)
            })
        })

        it("should return false for desktop user agents", () => {
            const desktopUserAgents = [
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.10 Safari/605.1.1",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.3",
            ]

            desktopUserAgents.forEach((userAgent) => {
                Object.defineProperty(navigator, "userAgent", {
                    writable: true,
                    configurable: true,
                    value: userAgent,
                })

                const result = isIOS()
                expect(result).toBe(false)
            })
        })

        it("should handle case-insensitive iOS detection", () => {
            Object.defineProperty(navigator, "userAgent", {
                writable: true,
                configurable: true,
                value: "mozilla/5.0 (iphone; cpu iphone os 14_7_1 like mac os x) applewebkit/605.1.15",
            })

            const result = isIOS()
            expect(result).toBe(true)
        })
    })

    describe("isWeb", () => {
        it("should return true when platform is Web and userAgent is desktop", () => {
            mockGetPlatform.mockReturnValue(Platform.Web)

            const desktopUserAgents = [
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.10 Safari/605.1.1",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.3",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.3",
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.3",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 OPR/117.0.0.",
            ]

            desktopUserAgents.forEach((userAgent) => {
                Object.defineProperty(navigator, "userAgent", {
                    writable: true,
                    configurable: true,
                    value: userAgent,
                })

                const result = isWeb()
                expect(result).toBe(true)
            })
        })

        it("should return false when platform is Web but userAgent is mobile", () => {
            mockGetPlatform.mockReturnValue(Platform.Web)

            const mobileUserAgents = [
                "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36",
                "Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/21.0 Chrome/110.0.5481.154 Mobile Safari/537.36",
                "Mozilla/5.0 (Android 13; Mobile; rv:109.0) Gecko/114.0 Firefox/114.0",
            ]

            mobileUserAgents.forEach((userAgent) => {
                Object.defineProperty(navigator, "userAgent", {
                    writable: true,
                    configurable: true,
                    value: userAgent,
                })

                const result = isWeb()
                expect(result).toBe(false)
            })
        })

        it("should return false when platform is Mobile", () => {
            mockGetPlatform.mockReturnValue(Platform.Mobile)

            Object.defineProperty(navigator, "userAgent", {
                writable: true,
                configurable: true,
                value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.3",
            })

            const result = isWeb()
            expect(result).toBe(false)
        })

        it("should return false when platform is FireTV", () => {
            mockGetPlatform.mockReturnValue(Platform.FireTV)

            Object.defineProperty(navigator, "userAgent", {
                writable: true,
                configurable: true,
                value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.3",
            })

            const result = isWeb()
            expect(result).toBe(false)
        })

        it("should return false when platform is LGTV", () => {
            mockGetPlatform.mockReturnValue(Platform.LGTV)

            Object.defineProperty(navigator, "userAgent", {
                writable: true,
                configurable: true,
                value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.3",
            })

            const result = isWeb()
            expect(result).toBe(false)
        })

        it("should return false when platform is SamsungTV", () => {
            mockGetPlatform.mockReturnValue(Platform.SamsungTV)

            Object.defineProperty(navigator, "userAgent", {
                writable: true,
                configurable: true,
                value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.3",
            })

            const result = isWeb()
            expect(result).toBe(false)
        })

        it("should handle empty userAgent when platform is Web", () => {
            mockGetPlatform.mockReturnValue(Platform.Web)

            Object.defineProperty(navigator, "userAgent", {
                writable: true,
                configurable: true,
                value: "",
            })

            const result = isWeb()
            expect(result).toBe(true)
        })

        it("should handle case-insensitive mobile detection when platform is Web", () => {
            mockGetPlatform.mockReturnValue(Platform.Web)

            const lowercaseMobileUserAgents = [
                "mozilla/5.0 (iphone; cpu iphone os 14_7_1 like mac os x) applewebkit/605.1.15",
                "mozilla/5.0 (android 11; sm-g991b) applewebkit/537.36",
            ]

            lowercaseMobileUserAgents.forEach((userAgent) => {
                Object.defineProperty(navigator, "userAgent", {
                    writable: true,
                    configurable: true,
                    value: userAgent,
                })

                const result = isWeb()
                expect(result).toBe(false)
            })
        })

        it("should return true for Web platform with desktop user agents that don't match mobile regex", () => {
            mockGetPlatform.mockReturnValue(Platform.Web)

            const nonMobileUserAgents = [
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.3 SomeDesktopApp",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.3",
            ]

            nonMobileUserAgents.forEach((userAgent) => {
                Object.defineProperty(navigator, "userAgent", {
                    writable: true,
                    configurable: true,
                    value: userAgent,
                })

                const result = isWeb()
                expect(result).toBe(true)
            })
        })
    })

    describe("isMobileWebview", () => {
        it("should return true when platform is Mobile", () => {
            mockGetPlatform.mockReturnValue(Platform.Mobile)

            const result = isMobileWebview()

            expect(result).toBe(true)
        })

        it("should return false when platform is Web", () => {
            mockGetPlatform.mockReturnValue(Platform.Web)

            const result = isMobileWebview()

            expect(result).toBe(false)
        })

        it("should return false when platform is FireTV", () => {
            mockGetPlatform.mockReturnValue(Platform.FireTV)

            const result = isMobileWebview()

            expect(result).toBe(false)
        })
    })

    describe("isLGTV", () => {
        it("should return true when platform is LGTV", () => {
            mockGetPlatform.mockReturnValue(Platform.LGTV)

            const result = isLGTV()

            expect(result).toBe(true)
        })

        it("should return false when platform is Web", () => {
            mockGetPlatform.mockReturnValue(Platform.Web)

            const result = isLGTV()

            expect(result).toBe(false)
        })

        it("should return false when platform is Mobile", () => {
            mockGetPlatform.mockReturnValue(Platform.Mobile)

            const result = isLGTV()

            expect(result).toBe(false)
        })

        it("should return false when platform is FireTV", () => {
            mockGetPlatform.mockReturnValue(Platform.FireTV)

            const result = isLGTV()

            expect(result).toBe(false)
        })

        it("should return false when platform is SamsungTV", () => {
            mockGetPlatform.mockReturnValue(Platform.SamsungTV)

            const result = isLGTV()

            expect(result).toBe(false)
        })
    })

    describe("isSamsungTV", () => {
        it("should return true when platform is SamsungTV", () => {
            mockGetPlatform.mockReturnValue(Platform.SamsungTV)

            const result = isSamsungTV()

            expect(result).toBe(true)
        })

        it("should return false when platform is Web", () => {
            mockGetPlatform.mockReturnValue(Platform.Web)

            const result = isSamsungTV()

            expect(result).toBe(false)
        })

        it("should return false when platform is Mobile", () => {
            mockGetPlatform.mockReturnValue(Platform.Mobile)

            const result = isSamsungTV()

            expect(result).toBe(false)
        })

        it("should return false when platform is FireTV", () => {
            mockGetPlatform.mockReturnValue(Platform.FireTV)

            const result = isSamsungTV()

            expect(result).toBe(false)
        })

        it("should return false when platform is LGTV", () => {
            mockGetPlatform.mockReturnValue(Platform.LGTV)

            const result = isSamsungTV()

            expect(result).toBe(false)
        })
    })

    describe("isLGOrSamsungTV", () => {
        it("should return true when platform is LGTV", () => {
            mockGetPlatform.mockReturnValue(Platform.LGTV)

            const result = isLGOrSamsungTV()

            expect(result).toBe(true)
        })

        it("should return true when platform is SamsungTV", () => {
            mockGetPlatform.mockReturnValue(Platform.SamsungTV)

            const result = isLGOrSamsungTV()

            expect(result).toBe(true)
        })

        it("should return false when platform is Web", () => {
            mockGetPlatform.mockReturnValue(Platform.Web)

            const result = isLGOrSamsungTV()

            expect(result).toBe(false)
        })

        it("should return false when platform is Mobile", () => {
            mockGetPlatform.mockReturnValue(Platform.Mobile)

            const result = isLGOrSamsungTV()

            expect(result).toBe(false)
        })

        it("should return false when platform is FireTV", () => {
            mockGetPlatform.mockReturnValue(Platform.FireTV)

            const result = isLGOrSamsungTV()

            expect(result).toBe(false)
        })

        it("should return true when SHOULD_SIMULATE_LG is true", () => {
            mockGetPlatform.mockReturnValue(Platform.Web)
            mockDevOverrides.SHOULD_SIMULATE_LG = true

            const result = isLGOrSamsungTV()

            expect(result).toBe(true)
        })

        it("should return true when SHOULD_SIMULATE_SAMSUNG is true", () => {
            mockGetPlatform.mockReturnValue(Platform.Web)
            mockDevOverrides.SHOULD_SIMULATE_SAMSUNG = true

            const result = isLGOrSamsungTV()

            expect(result).toBe(true)
        })

        it("should return true when both SHOULD_SIMULATE_LG and SHOULD_SIMULATE_SAMSUNG are true", () => {
            mockGetPlatform.mockReturnValue(Platform.Web)
            mockDevOverrides.SHOULD_SIMULATE_LG = true
            mockDevOverrides.SHOULD_SIMULATE_SAMSUNG = true

            const result = isLGOrSamsungTV()

            expect(result).toBe(true)
        })
    })

    describe("shouldUseWebCheckout", () => {
        const mockDevOverrides = jest.requireMock("./devOverrides")

        beforeEach(() => {
            mockDevOverrides.SHOULD_FORCE_WEB_CHECKOUT = false
        })

        it("should return true when isLGTV returns true", () => {
            mockGetPlatform.mockReturnValue(Platform.LGTV)

            const result = shouldUseWebCheckout()
            expect(result).toBe(true)
        })

        it("should return true when isSamsungTV returns true", () => {
            mockGetPlatform.mockReturnValue(Platform.SamsungTV)

            const result = shouldUseWebCheckout()
            expect(result).toBe(true)
        })

        it("should return true when SHOULD_FORCE_WEB_CHECKOUT is true", () => {
            mockDevOverrides.SHOULD_FORCE_WEB_CHECKOUT = true

            const result = shouldUseWebCheckout()

            expect(result).toBe(true)
        })

        it("should return true when isWeb returns true (Web platform with desktop userAgent)", () => {
            mockDevOverrides.SHOULD_FORCE_WEB_CHECKOUT = false
            mockGetPlatform.mockReturnValue(Platform.Web)

            Object.defineProperty(navigator, "userAgent", {
                writable: true,
                configurable: true,
                value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.3",
            })

            const result = shouldUseWebCheckout()

            expect(result).toBe(true)
        })

        it("should return false when platform is Web but userAgent is mobile (isWeb returns false)", () => {
            mockDevOverrides.SHOULD_FORCE_WEB_CHECKOUT = false
            mockGetPlatform.mockReturnValue(Platform.Web)

            // Set a mobile user agent to ensure isWeb returns false
            Object.defineProperty(navigator, "userAgent", {
                writable: true,
                configurable: true,
                value: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
            })

            const result = shouldUseWebCheckout()

            expect(result).toBe(false)
        })

        it("should return true when SHOULD_FORCE_WEB_CHECKOUT is true regardless of other conditions", () => {
            mockDevOverrides.SHOULD_FORCE_WEB_CHECKOUT = true

            const result = shouldUseWebCheckout()

            expect(result).toBe(true)
        })
    })

    describe("devOverrides simulation", () => {
        beforeEach(() => {
            mockGetPlatform.mockReturnValue(Platform.Web)
        })

        describe("isLGTV with SHOULD_SIMULATE_LG", () => {
            it("should return true when SHOULD_SIMULATE_LG is true", () => {
                mockDevOverrides.SHOULD_SIMULATE_LG = true

                const result = isLGTV()
                expect(result).toBe(true)
            })

            it("should return false when SHOULD_SIMULATE_LG is false", () => {
                mockDevOverrides.SHOULD_SIMULATE_LG = false

                const result = isLGTV()
                expect(result).toBe(false)
            })

            it("should return true when both platform and devOverride indicate LG", () => {
                mockGetPlatform.mockReturnValue(Platform.LGTV)
                mockDevOverrides.SHOULD_SIMULATE_LG = true

                const result = isLGTV()
                expect(result).toBe(true)
            })

            it("should return true when platform is LG even if devOverride is false", () => {
                mockGetPlatform.mockReturnValue(Platform.LGTV)
                mockDevOverrides.SHOULD_SIMULATE_LG = false

                const result = isLGTV()
                expect(result).toBe(true)
            })
        })

        describe("isSamsungTV with SHOULD_SIMULATE_SAMSUNG", () => {
            it("should return true when SHOULD_SIMULATE_SAMSUNG is true", () => {
                mockDevOverrides.SHOULD_SIMULATE_SAMSUNG = true

                const result = isSamsungTV()
                expect(result).toBe(true)
            })

            it("should return false when SHOULD_SIMULATE_SAMSUNG is false", () => {
                mockDevOverrides.SHOULD_SIMULATE_SAMSUNG = false

                const result = isSamsungTV()
                expect(result).toBe(false)
            })

            it("should return true when both platform and devOverride indicate Samsung", () => {
                mockGetPlatform.mockReturnValue(Platform.SamsungTV)
                mockDevOverrides.SHOULD_SIMULATE_SAMSUNG = true

                const result = isSamsungTV()
                expect(result).toBe(true)
            })

            it("should return true when platform is Samsung even if devOverride is false", () => {
                mockGetPlatform.mockReturnValue(Platform.SamsungTV)
                mockDevOverrides.SHOULD_SIMULATE_SAMSUNG = false

                const result = isSamsungTV()
                expect(result).toBe(true)
            })
        })

        describe("shouldUseWebCheckout with simulation", () => {
            it("should return true when SHOULD_SIMULATE_LG is true", () => {
                mockDevOverrides.SHOULD_SIMULATE_LG = true

                const result = shouldUseWebCheckout()
                expect(result).toBe(true)
            })

            it("should return true when SHOULD_SIMULATE_SAMSUNG is true", () => {
                mockDevOverrides.SHOULD_SIMULATE_SAMSUNG = true

                const result = shouldUseWebCheckout()
                expect(result).toBe(true)
            })

            it("should return true when both simulations are enabled", () => {
                mockDevOverrides.SHOULD_SIMULATE_LG = true
                mockDevOverrides.SHOULD_SIMULATE_SAMSUNG = true

                const result = shouldUseWebCheckout()
                expect(result).toBe(true)
            })
        })
    })

    describe("getCachedPlatform", () => {
        it("should call getPlatform only once when called multiple times", () => {
            mockGetPlatform.mockReturnValue(Platform.FireTV)

            getCachedPlatform()
            getCachedPlatform()
            getCachedPlatform()

            expect(mockGetPlatform).toHaveBeenCalledTimes(1)
        })

        it("should return the same cached value on subsequent calls", () => {
            mockGetPlatform.mockReturnValue(Platform.Web)

            const result1 = getCachedPlatform()
            const result2 = getCachedPlatform()
            const result3 = getCachedPlatform()

            expect(result1).toBe(Platform.Web)
            expect(result2).toBe(Platform.Web)
            expect(result3).toBe(Platform.Web)
            expect(mockGetPlatform).toHaveBeenCalledTimes(1)
        })

        it("should cache across different platform detection functions", () => {
            mockGetPlatform.mockReturnValue(Platform.FireTV)

            isFireTV()
            isMobile()
            isWeb()
            getCachedPlatform()

            expect(mockGetPlatform).toHaveBeenCalledTimes(1)
        })

        it("should reset cache when resetPlatformCache is called", () => {
            mockGetPlatform.mockReturnValue(Platform.Web)

            getCachedPlatform()
            expect(mockGetPlatform).toHaveBeenCalledTimes(1)

            resetPlatformCache()
            mockGetPlatform.mockReturnValue(Platform.FireTV)

            const result = getCachedPlatform()
            expect(result).toBe(Platform.FireTV)
            expect(mockGetPlatform).toHaveBeenCalledTimes(2)
        })

        it("should return different values for different platforms after reset", () => {
            mockGetPlatform.mockReturnValue(Platform.LGTV)
            const lgResult = getCachedPlatform()
            expect(lgResult).toBe(Platform.LGTV)
            expect(mockGetPlatform).toHaveBeenCalledTimes(1)

            resetPlatformCache()
            mockGetPlatform.mockReturnValue(Platform.SamsungTV)
            const samsungResult = getCachedPlatform()
            expect(samsungResult).toBe(Platform.SamsungTV)
            expect(mockGetPlatform).toHaveBeenCalledTimes(2)
        })
    })
})

describe("getDetectedPlatform", () => {
    beforeEach(() => {
        Object.defineProperty(navigator, "userAgent", {
            writable: true,
            configurable: true,
            value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        })
    })

    it("returns SamsungTV for Samsung Tizen user agents", () => {
        Object.defineProperty(navigator, "userAgent", {
            writable: true,
            configurable: true,
            value: "Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/6.0 TV Safari/537.36",
        })

        expect(getDetectedPlatform()).toBe(Platform.SamsungTV)
    })

    it("returns LGTV for LG webOS user agents", () => {
        Object.defineProperty(navigator, "userAgent", {
            writable: true,
            configurable: true,
            value: "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.270 Safari/537.36 WebAppManager",
        })

        expect(getDetectedPlatform()).toBe(Platform.LGTV)
    })

    it("returns FireTV for Amazon FireTV user agents", () => {
        Object.defineProperty(navigator, "userAgent", {
            writable: true,
            configurable: true,
            value: "Mozilla/5.0 (Linux; Android 9; AFTSS) AppleWebKit/537.36 (KHTML, like Gecko) Silk/120.4.2 like Chrome/120.0.6099.231 Safari/537.36",
        })

        expect(getDetectedPlatform()).toBe(Platform.FireTV)
    })

    it("returns Web for desktop user agents", () => {
        Object.defineProperty(navigator, "userAgent", {
            writable: true,
            configurable: true,
            value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
        })

        expect(getDetectedPlatform()).toBe(Platform.Web)
    })

    it("returns Web when userAgent is empty", () => {
        Object.defineProperty(navigator, "userAgent", {
            writable: true,
            configurable: true,
            value: "",
        })

        expect(getDetectedPlatform()).toBe(Platform.Web)
    })
})

describe("matchesTVPlatform", () => {
    it("should return true when platform is FireTV", () => {
        const result = matchesTVPlatform(Platform.FireTV.toString())
        expect(result).toBe(true)
    })

    it("should return true when platform is LGTV", () => {
        const result = matchesTVPlatform(Platform.LGTV.toString())
        expect(result).toBe(true)
    })

    it("should return true when platform is SamsungTV", () => {
        const result = matchesTVPlatform(Platform.SamsungTV.toString())
        expect(result).toBe(true)
    })

    it("should return false when platform is Web", () => {
        const result = matchesTVPlatform(Platform.Web.toString())
        expect(result).toBe(false)
    })

    it("should return false when platform is Mobile", () => {
        const result = matchesTVPlatform(Platform.Mobile.toString())
        expect(result).toBe(false)
    })

    it("should return false when platform is unknown", () => {
        const result = matchesTVPlatform("unknown")
        expect(result).toBe(false)
    })
})

describe("isAppClip", () => {
    it("should return true when mobile type is IosAppClip", () => {
        mockGetMobileType.mockReturnValue(MobileType.IosAppClip)

        const result = isAppClip()

        expect(result).toBe(true)
    })

    it("should return false when mobile type is not IosAppClip", () => {
        mockGetMobileType.mockReturnValue("something else" as MobileType)

        const result = isAppClip()

        expect(result).toBe(false)
    })
})

describe("getStatedPlatform", () => {
    const originalSearch = window.location.search

    afterEach(() => {
        Object.defineProperty(window, "location", {
            writable: true,
            configurable: true,
            value: {
                ...window.location,
                search: originalSearch,
            },
        })
    })

    it("should return platform from URL parameter when present", () => {
        Object.defineProperty(window, "location", {
            writable: true,
            configurable: true,
            value: {
                ...window.location,
                search: "?volley_platform=FIRE_TV",
            },
        })

        const result = getStatedPlatform()

        expect(result).toBe("FIRE_TV")
    })

    it("should return Web platform when no URL parameter is present", () => {
        Object.defineProperty(window, "location", {
            writable: true,
            configurable: true,
            value: {
                ...window.location,
                search: "",
            },
        })

        const result = getStatedPlatform()

        expect(result).toBe(Platform.Web.toString())
    })

    it("should return Web platform when URL parameter is null", () => {
        Object.defineProperty(window, "location", {
            writable: true,
            configurable: true,
            value: {
                ...window.location,
                search: "?other_param=value",
            },
        })

        const result = getStatedPlatform()

        expect(result).toBe(Platform.Web.toString())
    })

    it("should handle multiple URL parameters", () => {
        Object.defineProperty(window, "location", {
            writable: true,
            configurable: true,
            value: {
                ...window.location,
                search: "?foo=bar&volley_platform=LG_TV&baz=qux",
            },
        })

        const result = getStatedPlatform()

        expect(result).toBe("LG_TV")
    })
})

describe("agentIsTV", () => {
    beforeEach(() => {
        mockDevOverrides.SHOULD_SIMULATE_LG = false
        mockDevOverrides.SHOULD_SIMULATE_SAMSUNG = false
    })

    it("should return true when user agent is FireTV", () => {
        Object.defineProperty(navigator, "userAgent", {
            writable: true,
            configurable: true,
            value: "Mozilla/5.0 (Linux; Android 5.1.1; AFTM) AppleWebKit/537.36 (KHTML, like Gecko) Silk/70.1.93 like Chrome/70.0.3538.64 Safari/537.36",
        })

        const result = agentIsTV()

        expect(result).toBe(true)
    })

    it("should return true when user agent is LG webOS", () => {
        Object.defineProperty(navigator, "userAgent", {
            writable: true,
            configurable: true,
            value: "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.270 Safari/537.36 WebAppManager",
        })

        const result = agentIsTV()

        expect(result).toBe(true)
    })

    it("should return true when user agent is Samsung Tizen", () => {
        Object.defineProperty(navigator, "userAgent", {
            writable: true,
            configurable: true,
            value: "Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/6.0 TV Safari/537.36",
        })

        const result = agentIsTV()

        expect(result).toBe(true)
    })

    it("should return false when user agent is Web", () => {
        Object.defineProperty(navigator, "userAgent", {
            writable: true,
            configurable: true,
            value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.3",
        })

        const result = agentIsTV()

        expect(result).toBe(false)
    })

    it("should return false when user agent is Mobile", () => {
        Object.defineProperty(navigator, "userAgent", {
            writable: true,
            configurable: true,
            value: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
        })

        const result = agentIsTV()

        expect(result).toBe(false)
    })
})

describe("isStatedTV", () => {
    const originalSearch = window.location.search

    afterEach(() => {
        Object.defineProperty(window, "location", {
            writable: true,
            configurable: true,
            value: {
                ...window.location,
                search: originalSearch,
            },
        })
    })

    it("should return true when stated platform is FireTV", () => {
        Object.defineProperty(window, "location", {
            writable: true,
            configurable: true,
            value: {
                ...window.location,
                search: `?volley_platform=${Platform.FireTV}`,
            },
        })

        const result = isStatedTV()

        expect(result).toBe(true)
    })

    it("should return true when stated platform is LGTV", () => {
        Object.defineProperty(window, "location", {
            writable: true,
            configurable: true,
            value: {
                ...window.location,
                search: `?volley_platform=${Platform.LGTV}`,
            },
        })

        const result = isStatedTV()

        expect(result).toBe(true)
    })

    it("should return true when stated platform is SamsungTV", () => {
        Object.defineProperty(window, "location", {
            writable: true,
            configurable: true,
            value: {
                ...window.location,
                search: `?volley_platform=${Platform.SamsungTV}`,
            },
        })

        const result = isStatedTV()

        expect(result).toBe(true)
    })

    it("should return false when stated platform is Web", () => {
        Object.defineProperty(window, "location", {
            writable: true,
            configurable: true,
            value: {
                ...window.location,
                search: `?volley_platform=${Platform.Web}`,
            },
        })

        const result = isStatedTV()

        expect(result).toBe(false)
    })

    it("should return false when stated platform is Mobile", () => {
        Object.defineProperty(window, "location", {
            writable: true,
            configurable: true,
            value: {
                ...window.location,
                search: `?volley_platform=${Platform.Mobile}`,
            },
        })

        const result = isStatedTV()

        expect(result).toBe(false)
    })

    it("should return false when no platform parameter is present", () => {
        Object.defineProperty(window, "location", {
            writable: true,
            configurable: true,
            value: {
                ...window.location,
                search: "",
            },
        })

        const result = isStatedTV()

        expect(result).toBe(false)
    })
})

describe("isFireTVUserAgent", () => {
    it("should return true for FireTV user agents", () => {
        const fireTVUserAgents = [
            "Mozilla/5.0 (Linux; Android 5.1.1; AFTM) AppleWebKit/537.36 (KHTML, like Gecko) Silk/70.1.93 like Chrome/70.0.3538.64 Safari/537.36",
            "Mozilla/5.0 (Linux; Android 7.1.2; AFTN) AppleWebKit/537.36 (KHTML, like Gecko) Silk/120.4.2 like Chrome/120.0.6099.231 Safari/537.36",
            "Mozilla/5.0 (Linux; Android 9; AFTSS) AppleWebKit/537.36 (KHTML, like Gecko) Silk/120.4.2 like Chrome/120.0.6099.231 Safari/537.36",
        ]

        fireTVUserAgents.forEach((userAgent) => {
            Object.defineProperty(navigator, "userAgent", {
                writable: true,
                configurable: true,
                value: userAgent,
            })

            const result = isFireTVUserAgent()
            expect(result).toBe(true)
        })
    })

    it("should return false for non-FireTV user agents", () => {
        const nonFireTVUserAgents = [
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.3",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
            "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.270 Safari/537.36 WebAppManager",
            "Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/6.0 TV Safari/537.36",
        ]

        nonFireTVUserAgents.forEach((userAgent) => {
            Object.defineProperty(navigator, "userAgent", {
                writable: true,
                configurable: true,
                value: userAgent,
            })

            const result = isFireTVUserAgent()
            expect(result).toBe(false)
        })
    })
})

describe("isLGWebOSUserAgent", () => {
    it("should return true for LG webOS user agents", () => {
        const lgUserAgents = [
            "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.270 Safari/537.36 WebAppManager",
            "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.128 Safari/537.36 WebAppManager",
        ]

        lgUserAgents.forEach((userAgent) => {
            Object.defineProperty(navigator, "userAgent", {
                writable: true,
                configurable: true,
                value: userAgent,
            })

            const result = isLGWebOSUserAgent()
            expect(result).toBe(true)
        })
    })

    it("should return false when only Web0S is present", () => {
        Object.defineProperty(navigator, "userAgent", {
            writable: true,
            configurable: true,
            value: "Mozilla/5.0 (Web0S; Linux) AppleWebKit/537.36",
        })

        const result = isLGWebOSUserAgent()
        expect(result).toBe(false)
    })

    it("should return false when only SmartTV is present", () => {
        Object.defineProperty(navigator, "userAgent", {
            writable: true,
            configurable: true,
            value: "Mozilla/5.0 (Linux/SmartTV) AppleWebKit/537.36",
        })

        const result = isLGWebOSUserAgent()
        expect(result).toBe(false)
    })

    it("should return false for non-LG user agents", () => {
        const nonLGUserAgents = [
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.3",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
            "Mozilla/5.0 (Linux; Android 5.1.1; AFTM) AppleWebKit/537.36 (KHTML, like Gecko) Silk/70.1.93 like Chrome/70.0.3538.64 Safari/537.36",
            "Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/6.0 TV Safari/537.36",
        ]

        nonLGUserAgents.forEach((userAgent) => {
            Object.defineProperty(navigator, "userAgent", {
                writable: true,
                configurable: true,
                value: userAgent,
            })

            const result = isLGWebOSUserAgent()
            expect(result).toBe(false)
        })
    })
})

describe("isSamsungTizenUserAgent", () => {
    it("should return true for Samsung Tizen user agents", () => {
        const samsungUserAgents = [
            "Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/6.0 TV Safari/537.36",
            "Mozilla/5.0 (SMART-TV; LINUX; Tizen 5.5) AppleWebKit/537.36 (KHTML, like Gecko) Version/5.5 TV Safari/537.36",
            "Mozilla/5.0 (SMART-TV; LINUX; Tizen 4.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 TV Safari/537.36",
        ]

        samsungUserAgents.forEach((userAgent) => {
            Object.defineProperty(navigator, "userAgent", {
                writable: true,
                configurable: true,
                value: userAgent,
            })

            const result = isSamsungTizenUserAgent()
            expect(result).toBe(true)
        })
    })

    it("should return false when only Tizen is present", () => {
        Object.defineProperty(navigator, "userAgent", {
            writable: true,
            configurable: true,
            value: "Mozilla/5.0 (Linux; Tizen 6.0) AppleWebKit/537.36",
        })

        const result = isSamsungTizenUserAgent()
        expect(result).toBe(false)
    })

    it("should return false when only SMART-TV is present", () => {
        Object.defineProperty(navigator, "userAgent", {
            writable: true,
            configurable: true,
            value: "Mozilla/5.0 (SMART-TV; LINUX) AppleWebKit/537.36",
        })

        const result = isSamsungTizenUserAgent()
        expect(result).toBe(false)
    })

    it("should return false for non-Samsung user agents", () => {
        const nonSamsungUserAgents = [
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.3",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
            "Mozilla/5.0 (Linux; Android 5.1.1; AFTM) AppleWebKit/537.36 (KHTML, like Gecko) Silk/70.1.93 like Chrome/70.0.3538.64 Safari/537.36",
            "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.270 Safari/537.36 WebAppManager",
        ]

        nonSamsungUserAgents.forEach((userAgent) => {
            Object.defineProperty(navigator, "userAgent", {
                writable: true,
                configurable: true,
                value: userAgent,
            })

            const result = isSamsungTizenUserAgent()
            expect(result).toBe(false)
        })
    })
})
