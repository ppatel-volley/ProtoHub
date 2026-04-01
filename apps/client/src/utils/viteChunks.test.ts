import { getManualChunk } from "./viteChunks"

describe("viteChunks", () => {
    const manualChunks = getManualChunk

    describe("React packages", () => {
        it("should put react in react chunk", () => {
            expect(manualChunks("/project/node_modules/react/index.js")).toBe(
                "react"
            )
        })

        it("should put react-dom in react chunk", () => {
            expect(
                manualChunks("/project/node_modules/react-dom/index.js")
            ).toBe("react")
        })

        it("should put nested react dependencies in react chunk", () => {
            expect(
                manualChunks(
                    "/project/node_modules/react/cjs/react.production.min.js"
                )
            ).toBe("react")
        })

        it("should bundle scheduler with react (internal dependency)", () => {
            expect(
                manualChunks("/project/node_modules/scheduler/index.js")
            ).toBe("react")
        })

        it("should NOT bundle packages with 'react' in name but different package into react chunk", () => {
            expect(
                manualChunks(
                    "/project/node_modules/some-react-wrapper/index.js"
                )
            ).toBe("vendor")
        })

        it("should handle react subdirectories correctly", () => {
            expect(
                manualChunks("/project/node_modules/react/jsx-runtime.js")
            ).toBe("react")
        })
    })

    describe("Volley packages - precise matching", () => {
        it("should put @volley/platform-sdk in volley chunk", () => {
            expect(
                manualChunks(
                    "/project/node_modules/@volley/platform-sdk/lib/index.js"
                )
            ).toBe("volley")
        })

        it("should put @volley/tracking in tracking chunk", () => {
            expect(
                manualChunks(
                    "/project/node_modules/@volley/tracking/lib/index.js"
                )
            ).toBe("tracking")
        })

        it("should handle nested paths within @volley/platform-sdk", () => {
            expect(
                manualChunks(
                    "/project/node_modules/@volley/platform-sdk/lib/auth/oauth.js"
                )
            ).toBe("volley")
        })

        it("should NOT confuse packages with 'volley' in path but different scope", () => {
            expect(
                manualChunks(
                    "/project/node_modules/@other-scope/volley-wrapper/index.js"
                )
            ).toBe("vendor")
        })
    })

    describe("DataDog packages", () => {
        it("should put @datadog/browser-rum in datadog chunk", () => {
            expect(
                manualChunks(
                    "/project/node_modules/@datadog/browser-rum/bundle/index.js"
                )
            ).toBe("datadog")
        })

        it("should put @datadog/browser-logs in datadog chunk", () => {
            expect(
                manualChunks(
                    "/project/node_modules/@datadog/browser-logs/index.js"
                )
            ).toBe("datadog")
        })

        it("should handle any @datadog scoped package", () => {
            expect(
                manualChunks(
                    "/project/node_modules/@datadog/some-other-package/index.js"
                )
            ).toBe("datadog")
        })
    })

    describe("Amplitude packages", () => {
        it("should put @amplitude/experiment-js-client in analytics chunk", () => {
            expect(
                manualChunks(
                    "/project/node_modules/@amplitude/experiment-js-client/dist/index.js"
                )
            ).toBe("analytics")
        })

        it("should handle any @amplitude scoped package", () => {
            expect(
                manualChunks(
                    "/project/node_modules/@amplitude/analytics-browser/index.js"
                )
            ).toBe("analytics")
        })
    })

    describe("Rive packages", () => {
        it("should put @rive-app/canvas in rive chunk", () => {
            expect(
                manualChunks("/project/node_modules/@rive-app/canvas/canvas.js")
            ).toBe("rive")
        })

        it("should put @rive-app/react-canvas in rive chunk (precise @rive-app matching)", () => {
            expect(
                manualChunks(
                    "/project/node_modules/@rive-app/react-canvas/dist/index.js"
                )
            ).toBe("rive")
        })

        it("should handle rive- prefixed packages", () => {
            expect(
                manualChunks("/project/node_modules/rive-wasm/index.js")
            ).toBe("rive")
        })
    })

    describe("Lottie packages", () => {
        it("should put lottie-react in lottie chunk (precise lottie matching)", () => {
            expect(
                manualChunks("/project/node_modules/lottie-react/dist/index.js")
            ).toBe("lottie")
        })

        it("should put lottie-web in lottie chunk", () => {
            expect(
                manualChunks("/project/node_modules/lottie-web/build/index.js")
            ).toBe("lottie")
        })
    })

    describe("Motion packages", () => {
        it("should put motion in motion chunk", () => {
            expect(
                manualChunks("/project/node_modules/motion/dist/index.js")
            ).toBe("motion")
        })

        it("should put framer-motion in motion chunk", () => {
            expect(
                manualChunks(
                    "/project/node_modules/framer-motion/dist/index.js"
                )
            ).toBe("motion")
        })
    })

    describe("Audio packages", () => {
        it("should put howler in audio chunk", () => {
            expect(
                manualChunks("/project/node_modules/howler/dist/howler.js")
            ).toBe("audio")
        })
    })

    describe("Vendor fallback", () => {
        it("should put unknown packages in vendor chunk", () => {
            expect(
                manualChunks("/project/node_modules/classnames/index.js")
            ).toBe("vendor")
        })

        it("should put @types/react-modal in vendor chunk (not react despite name)", () => {
            expect(
                manualChunks(
                    "/project/node_modules/@types/react-modal/index.d.ts"
                )
            ).toBe("vendor")
        })

        it("should put other @types packages in vendor chunk", () => {
            expect(
                manualChunks("/project/node_modules/@types/lodash/index.d.ts")
            ).toBe("vendor")
        })
    })

    describe("Nested node_modules (monorepo scenarios)", () => {
        it("should extract package name from nested node_modules", () => {
            expect(
                manualChunks(
                    "/project/node_modules/some-package/node_modules/react/index.js"
                )
            ).toBe("react")
        })

        it("should handle deeply nested scoped packages", () => {
            expect(
                manualChunks(
                    "/project/node_modules/package-a/node_modules/package-b/node_modules/@volley/platform-sdk/lib/index.js"
                )
            ).toBe("volley")
        })

        it("should handle nested @datadog packages", () => {
            expect(
                manualChunks(
                    "/project/node_modules/other-pkg/node_modules/@datadog/browser-rum/index.js"
                )
            ).toBe("datadog")
        })
    })

    describe("Application code (non-node_modules)", () => {
        it("should return app for App.tsx", () => {
            expect(manualChunks("/project/src/components/App.tsx")).toBe("app")
        })

        it("should not match components starting with App prefix", () => {
            expect(
                manualChunks("/project/src/components/AppSettings/index.tsx")
            ).toBe(undefined)
        })

        it("should return tvhub for TvHub components", () => {
            expect(
                manualChunks("/project/src/components/TvHub/TvHub.tsx")
            ).toBe("tvhub")
        })

        it("should return mobilehub for MobileHub components", () => {
            expect(
                manualChunks("/project/src/components/MobileHub/MobileHub.tsx")
            ).toBe("mobilehub")
        })

        it("should return appdownload for AppDownloadLanding components", () => {
            expect(
                manualChunks(
                    "/project/src/components/MobileHub/AppDownloadLanding/AppDownloadLanding.tsx"
                )
            ).toBe("appdownload")
        })

        it("should return appdownload for AppDownloadLandingWithSupport", () => {
            expect(
                manualChunks(
                    "/project/src/components/MobileHub/AppDownloadLanding/AppDownloadLandingWithSupport.tsx"
                )
            ).toBe("appdownload")
        })

        it("should return undefined for other application code", () => {
            expect(manualChunks("/project/src/utils/helpers.ts")).toBe(
                undefined
            )
        })
    })

    describe("Edge cases", () => {
        it("should handle paths with spaces", () => {
            expect(
                manualChunks(
                    "/my project/node_modules/@volley/platform-sdk/index.js"
                )
            ).toBe("volley")
        })

        it("should handle scoped packages correctly", () => {
            expect(
                manualChunks(
                    "/project/node_modules/@noriginmedia/norigin-spatial-navigation/index.js"
                )
            ).toBe("vendor")
        })

        it("should not be fooled by path segments that look like package names", () => {
            expect(
                manualChunks(
                    "/Users/react/projects/hub/node_modules/lodash/index.js"
                )
            ).toBe("vendor")
        })

        it("should handle package names with dashes", () => {
            expect(
                manualChunks("/project/node_modules/react-dom/index.js")
            ).toBe("react")
        })
    })

    describe("Prevents SDK mixups", () => {
        it("should NOT put @volley/platform-sdk in react chunk even if path contains 'react'", () => {
            expect(
                manualChunks(
                    "/project/node_modules/@volley/platform-sdk/lib/react-helpers.js"
                )
            ).toBe("volley")
        })

        it("should correctly chunk @volley packages despite file content", () => {
            expect(
                manualChunks(
                    "/project/node_modules/@volley/tracking/react-tracking.js"
                )
            ).toBe("tracking")
        })
    })
})
