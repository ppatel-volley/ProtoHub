import "@testing-library/jest-dom"

import { cleanup } from "@testing-library/react"

afterEach(() => {
    cleanup()
})

global.HTMLCanvasElement.prototype.getContext = (): null => null

window.focus = jest.fn()

// Mock import.meta for Jest
Object.defineProperty(global, "import", {
    value: {
        meta: {
            env: {},
        },
    },
    writable: true,
    configurable: true,
})

jest.mock("../../src/config/envconfig.ts", () => ({
    getEnvVar: jest.fn(
        (key: string, defaultValue?: string) => defaultValue ?? ""
    ),
    getWindowVar: jest.fn(
        (key: string, defaultValue?: string) => defaultValue ?? ""
    ),
    getEnvironment: jest.fn(() => "local"),
    LOGO_DISPLAY_MILLIS: 2000,
    AMPLITUDE_EXPERIMENT_KEY: "test-amplitude-key",
    BACKEND_SERVER_ENDPOINT: "http://localhost:3000",
    SEGMENT_WRITE_KEY: "test-key",
    ENVIRONMENT: "local",
    BASE_URL: "/",
    EXPERIMENT_ASSETS_CDN_URL: "https://test-cdn.com",
    DATADOG_APPLICATION_ID: "test-app-id",
    DATADOG_CLIENT_TOKEN: "test-client-token",
}))

jest.mock("@datadog/browser-logs", () => ({
    datadogLogs: {
        logger: {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
        },
        setGlobalContext: jest.fn(),
        setGlobalContextProperty: jest.fn(),
        init: jest.fn(),
    },
}))

jest.mock("@datadog/browser-rum", () => ({
    datadogRum: {
        init: jest.fn(),
        setGlobalContextProperty: jest.fn(),
        startDurationVital: jest.fn(),
        stopDurationVital: jest.fn(),
        addAction: jest.fn(),
        addError: jest.fn(),
    },
}))

jest.mock("@volley/platform-sdk/lib", () => ({
    getPlatform: jest.fn(() => "WEB"),
    getMobileType: jest.fn(),
    getQueryParam: jest.fn(() => ""),
    Platform: {
        Web: "WEB",
        Mobile: "MOBILE",
        FireTV: "FIRE_TV",
        LGTV: "LG_TV",
        SamsungTV: "SAMSUNG_TV",
    },
    MobileType: {
        IosAppClip: "IosAppClip",
    },
}))

jest.mock(
    "canvas",
    () => ({
        createCanvas: jest.fn(() => ({
            getContext: (): null => null,
        })),
        Image: jest.fn(),
        registerFont: jest.fn(),
    }),
    { virtual: true }
)

jest.mock(
    "@rive-app/canvas",
    () => ({
        createCanvas: jest.fn(() => ({
            getContext: (): null => null,
        })),
    }),
    { virtual: true }
)

jest.mock("../../src/utils/imageFormatFallback", () => ({
    isFormatDetectionReady: jest.fn(() => true),
    waitForFormatDetection: jest.fn(() => Promise.resolve()),
    useImageWithFallback: jest.fn((url: string) => [url, false]),
    getImageWithFallbackSync: jest.fn((url: string) => url),
    getCSSBackgroundWithFallback: jest.fn((url: string) =>
        Promise.resolve(`url("${url}")`)
    ),
    supportsAVIF: jest.fn(() => Promise.resolve(true)),
    supportsWebP: jest.fn(() => Promise.resolve(true)),
    getImageWithFallback: jest.fn((url: string) => Promise.resolve(url)),
}))

jest.mock("../../src/utils/datadog", () => ({
    datadogRum: {
        init: jest.fn(),
        setGlobalContextProperty: jest.fn(),
        startDurationVital: jest.fn(),
        stopDurationVital: jest.fn(),
        addAction: jest.fn(),
        addError: jest.fn(),
        addTiming: jest.fn(),
    },
    safeDatadogRum: {
        setUser: jest.fn(),
        startDurationVital: jest.fn(),
        stopDurationVital: jest.fn(),
        addAction: jest.fn(),
        addError: jest.fn(),
        addTiming: jest.fn(),
    },
    addCustomContext: jest.fn(),
    logUserAction: jest.fn(),
}))

jest.mock("../../src/utils/logger", () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        setEndpoint: jest.fn(),
    },
}))
