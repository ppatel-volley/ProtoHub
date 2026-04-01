const mockURLSearchParams = jest.fn()
global.URLSearchParams = mockURLSearchParams as any

let mockIsFireTV = false
jest.mock("./platformDetection", () => ({
    isFireTV: jest.fn(() => mockIsFireTV),
}))

let mockEnvironment = "local"
jest.mock("./envconfig", () => ({
    get ENVIRONMENT(): string {
        return mockEnvironment
    },
}))

jest.mock("./environment", () => ({
    Environment: {
        LOCAL: "local",
        DEVELOPMENT: "dev",
        STAGING: "staging",
        PRODUCTION: "production",
    },
}))

describe("devOverrides", () => {
    beforeEach(() => {
        mockURLSearchParams.mockClear()
        jest.resetModules()
    })

    const setupMocksAndRequire = (
        devUpsellParam: string | null,
        forceWebCheckoutParam: string | null,
        forcePlatformErrorParam: string | null,
        identityApiOverrideParam: string | null,
        environment: string,
        isFireTV = false
    ): any => {
        const mockGet = jest.fn().mockImplementation((param) => {
            if (param === "dev-upsell") return devUpsellParam
            if (param === "force-web-checkout") return forceWebCheckoutParam
            if (param === "force-platform-error") return forcePlatformErrorParam
            if (param === "identity-api-override")
                return identityApiOverrideParam
            return null
        })
        mockURLSearchParams.mockImplementation(() => ({
            get: mockGet,
        }))

        mockIsFireTV = isFireTV

        mockEnvironment = environment

        jest.resetModules()
        return require("./devOverrides")
    }

    describe("SHOULD_USE_DEV_UPSELL", () => {
        it("should return true when dev-upsell=true parameter is present on non-FireTV platform and environment is LOCAL", () => {
            const { SHOULD_USE_DEV_UPSELL } = setupMocksAndRequire(
                "true",
                null,
                null,
                null,
                "local",
                false
            )
            expect(SHOULD_USE_DEV_UPSELL).toBe(true)
        })

        it("should return true when dev-upsell=true parameter is present on non-FireTV platform and environment is DEVELOPMENT", () => {
            const { SHOULD_USE_DEV_UPSELL } = setupMocksAndRequire(
                "true",
                null,
                null,
                null,
                "dev",
                false
            )
            expect(SHOULD_USE_DEV_UPSELL).toBe(true)
        })

        it("should return true when dev-upsell=true parameter is present on non-FireTV platform and environment is STAGING", () => {
            const { SHOULD_USE_DEV_UPSELL } = setupMocksAndRequire(
                "true",
                null,
                null,
                null,
                "staging",
                false
            )
            expect(SHOULD_USE_DEV_UPSELL).toBe(true)
        })

        it("should return false when dev-upsell=true parameter is present on FireTV platform", () => {
            const { SHOULD_USE_DEV_UPSELL } = setupMocksAndRequire(
                "true",
                null,
                null,
                null,
                "local",
                true
            )
            expect(SHOULD_USE_DEV_UPSELL).toBe(false)
        })

        it("should return false when dev-upsell=false parameter is present", () => {
            const { SHOULD_USE_DEV_UPSELL } = setupMocksAndRequire(
                "false",
                null,
                null,
                null,
                "local",
                false
            )
            expect(SHOULD_USE_DEV_UPSELL).toBe(false)
        })

        it("should return false when dev-upsell parameter is not present", () => {
            const { SHOULD_USE_DEV_UPSELL } = setupMocksAndRequire(
                null,
                null,
                null,
                null,
                "local",
                false
            )
            expect(SHOULD_USE_DEV_UPSELL).toBe(false)
        })

        it("should return false when dev-upsell has any other value", () => {
            const { SHOULD_USE_DEV_UPSELL } = setupMocksAndRequire(
                "maybe",
                null,
                null,
                null,
                "local",
                false
            )
            expect(SHOULD_USE_DEV_UPSELL).toBe(false)
        })

        it("should return false when dev-upsell=true but environment is PRODUCTION", () => {
            const { SHOULD_USE_DEV_UPSELL } = setupMocksAndRequire(
                "true",
                null,
                null,
                null,
                "production",
                false
            )
            expect(SHOULD_USE_DEV_UPSELL).toBe(false)
        })
    })

    describe("SHOULD_FORCE_WEB_CHECKOUT", () => {
        it("should return true when force-web-checkout=true parameter is present and environment is LOCAL", () => {
            const { SHOULD_FORCE_WEB_CHECKOUT } = setupMocksAndRequire(
                null,
                "true",
                null,
                null,
                "local",
                false
            )
            expect(SHOULD_FORCE_WEB_CHECKOUT).toBe(true)
        })

        it("should return true when force-web-checkout=true parameter is present and environment is DEVELOPMENT", () => {
            const { SHOULD_FORCE_WEB_CHECKOUT } = setupMocksAndRequire(
                null,
                "true",
                null,
                null,
                "dev",
                false
            )
            expect(SHOULD_FORCE_WEB_CHECKOUT).toBe(true)
        })

        it("should return true when force-web-checkout=true parameter is present and environment is STAGING", () => {
            const { SHOULD_FORCE_WEB_CHECKOUT } = setupMocksAndRequire(
                null,
                "true",
                null,
                null,
                "staging",
                false
            )
            expect(SHOULD_FORCE_WEB_CHECKOUT).toBe(true)
        })

        it("should return false when force-web-checkout=true but environment is PRODUCTION", () => {
            const { SHOULD_FORCE_WEB_CHECKOUT } = setupMocksAndRequire(
                null,
                "true",
                null,
                null,
                "production",
                false
            )
            expect(SHOULD_FORCE_WEB_CHECKOUT).toBe(false)
        })

        it("should return false when force-web-checkout=false parameter is present", () => {
            const { SHOULD_FORCE_WEB_CHECKOUT } = setupMocksAndRequire(
                null,
                "false",
                null,
                null,
                "local",
                false
            )
            expect(SHOULD_FORCE_WEB_CHECKOUT).toBe(false)
        })

        it("should return false when force-web-checkout parameter is not present", () => {
            const { SHOULD_FORCE_WEB_CHECKOUT } = setupMocksAndRequire(
                null,
                null,
                null,
                null,
                "local",
                false
            )
            expect(SHOULD_FORCE_WEB_CHECKOUT).toBe(false)
        })
    })

    describe("SHOULD_FORCE_PLATFORM_ERROR", () => {
        it("should return true when force-platform-error=true parameter is present and environment is LOCAL", () => {
            const { SHOULD_FORCE_PLATFORM_ERROR } = setupMocksAndRequire(
                null,
                null,
                "true",
                null,
                "local",
                false
            )
            expect(SHOULD_FORCE_PLATFORM_ERROR).toBe(true)
        })

        it("should return true when force-platform-error=true parameter is present and environment is DEVELOPMENT", () => {
            const { SHOULD_FORCE_PLATFORM_ERROR } = setupMocksAndRequire(
                null,
                null,
                "true",
                null,
                "dev",
                false
            )
            expect(SHOULD_FORCE_PLATFORM_ERROR).toBe(true)
        })

        it("should return true when force-platform-error=true parameter is present and environment is STAGING", () => {
            const { SHOULD_FORCE_PLATFORM_ERROR } = setupMocksAndRequire(
                null,
                null,
                "true",
                null,
                "staging",
                false
            )
            expect(SHOULD_FORCE_PLATFORM_ERROR).toBe(true)
        })

        it("should return false when force-platform-error=true but environment is PRODUCTION", () => {
            const { SHOULD_FORCE_PLATFORM_ERROR } = setupMocksAndRequire(
                null,
                null,
                "true",
                null,
                "production",
                false
            )
            expect(SHOULD_FORCE_PLATFORM_ERROR).toBe(false)
        })

        it("should return false when force-platform-error=false parameter is present", () => {
            const { SHOULD_FORCE_PLATFORM_ERROR } = setupMocksAndRequire(
                null,
                null,
                "false",
                null,
                "local",
                false
            )
            expect(SHOULD_FORCE_PLATFORM_ERROR).toBe(false)
        })

        it("should return false when force-platform-error parameter is not present", () => {
            const { SHOULD_FORCE_PLATFORM_ERROR } = setupMocksAndRequire(
                null,
                null,
                null,
                null,
                "local",
                false
            )
            expect(SHOULD_FORCE_PLATFORM_ERROR).toBe(false)
        })

        it("should return false when force-platform-error has any other value", () => {
            const { SHOULD_FORCE_PLATFORM_ERROR } = setupMocksAndRequire(
                null,
                null,
                "maybe",
                null,
                "local",
                false
            )
            expect(SHOULD_FORCE_PLATFORM_ERROR).toBe(false)
        })
    })

    describe("SHOULD_USE_IDENTITY_API_OVERRIDE", () => {
        it("should return true when identity-api-override=true parameter is present in non-production environment", () => {
            const { SHOULD_USE_IDENTITY_API_OVERRIDE } = setupMocksAndRequire(
                null,
                null,
                null,
                "true",
                "local",
                false
            )
            expect(SHOULD_USE_IDENTITY_API_OVERRIDE).toBe(true)
        })

        it("should return true when identity-api-override=true parameter is present in development environment", () => {
            const { SHOULD_USE_IDENTITY_API_OVERRIDE } = setupMocksAndRequire(
                null,
                null,
                null,
                "true",
                "dev",
                false
            )
            expect(SHOULD_USE_IDENTITY_API_OVERRIDE).toBe(true)
        })

        it("should return true when identity-api-override=true parameter is present in staging environment", () => {
            const { SHOULD_USE_IDENTITY_API_OVERRIDE } = setupMocksAndRequire(
                null,
                null,
                null,
                "true",
                "staging",
                false
            )
            expect(SHOULD_USE_IDENTITY_API_OVERRIDE).toBe(true)
        })

        it("should return false when identity-api-override=false parameter is present", () => {
            const { SHOULD_USE_IDENTITY_API_OVERRIDE } = setupMocksAndRequire(
                null,
                null,
                null,
                "false",
                "local",
                false
            )
            expect(SHOULD_USE_IDENTITY_API_OVERRIDE).toBe(false)
        })

        it("should return false when identity-api-override parameter is not present", () => {
            const { SHOULD_USE_IDENTITY_API_OVERRIDE } = setupMocksAndRequire(
                null,
                null,
                null,
                null,
                "local",
                false
            )
            expect(SHOULD_USE_IDENTITY_API_OVERRIDE).toBe(false)
        })

        it("should return false when environment is production", () => {
            const { SHOULD_USE_IDENTITY_API_OVERRIDE } = setupMocksAndRequire(
                null,
                null,
                null,
                "true",
                "production",
                false
            )
            expect(SHOULD_USE_IDENTITY_API_OVERRIDE).toBe(false)
        })
    })

    describe("SHOULD_FORCE_APP_DOWNLOAD_PAGE", () => {
        const setupForceAppDownloadPage = (
            forceAppDownloadPageParam: string | null,
            environment: string
        ): any => {
            const mockGet = jest.fn().mockImplementation((param) => {
                if (param === "forceAppDownloadPage")
                    return forceAppDownloadPageParam
                return null
            })
            mockURLSearchParams.mockImplementation(() => ({
                get: mockGet,
            }))

            mockEnvironment = environment
            jest.resetModules()
            return require("./devOverrides")
        }

        it("should return true when forceAppDownloadPage=true parameter is present and environment is LOCAL", () => {
            const { SHOULD_FORCE_APP_DOWNLOAD_PAGE } =
                setupForceAppDownloadPage("true", "local")
            expect(SHOULD_FORCE_APP_DOWNLOAD_PAGE).toBe(true)
        })

        it("should return true when forceAppDownloadPage=true parameter is present and environment is DEVELOPMENT", () => {
            const { SHOULD_FORCE_APP_DOWNLOAD_PAGE } =
                setupForceAppDownloadPage("true", "dev")
            expect(SHOULD_FORCE_APP_DOWNLOAD_PAGE).toBe(true)
        })

        it("should return true when forceAppDownloadPage=true parameter is present and environment is STAGING", () => {
            const { SHOULD_FORCE_APP_DOWNLOAD_PAGE } =
                setupForceAppDownloadPage("true", "staging")
            expect(SHOULD_FORCE_APP_DOWNLOAD_PAGE).toBe(true)
        })

        it("should return false when forceAppDownloadPage=true but environment is PRODUCTION", () => {
            const { SHOULD_FORCE_APP_DOWNLOAD_PAGE } =
                setupForceAppDownloadPage("true", "production")
            expect(SHOULD_FORCE_APP_DOWNLOAD_PAGE).toBe(false)
        })

        it("should return false when forceAppDownloadPage=false parameter is present", () => {
            const { SHOULD_FORCE_APP_DOWNLOAD_PAGE } =
                setupForceAppDownloadPage("false", "local")
            expect(SHOULD_FORCE_APP_DOWNLOAD_PAGE).toBe(false)
        })

        it("should return false when forceAppDownloadPage parameter is not present", () => {
            const { SHOULD_FORCE_APP_DOWNLOAD_PAGE } =
                setupForceAppDownloadPage(null, "local")
            expect(SHOULD_FORCE_APP_DOWNLOAD_PAGE).toBe(false)
        })

        it("should return false when forceAppDownloadPage has any other value", () => {
            const { SHOULD_FORCE_APP_DOWNLOAD_PAGE } =
                setupForceAppDownloadPage("maybe", "local")
            expect(SHOULD_FORCE_APP_DOWNLOAD_PAGE).toBe(false)
        })
    })
})
