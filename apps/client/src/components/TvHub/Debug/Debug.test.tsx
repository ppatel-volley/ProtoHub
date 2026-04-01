import { render, screen } from "@testing-library/react"

import { ExperimentFlag } from "../../../experiments/experimentSchemata"
import { Debug, SIMULATE_PAYMENT_SUCCESS_TEXT } from "./Debug"

jest.mock("../../../config/envconfig", () => ({
    ENVIRONMENT: "dev",
    getWindowVar: jest.fn((key: string, defaultValue: string) => defaultValue),
}))

jest.mock("../../../config/platformDetection", () => ({
    isMobile: jest.fn(() => false),
    getCachedPlatform: jest.fn(() => "WEB"),
}))

jest.mock("@volley/platform-sdk/react", () => ({
    useAccount: jest.fn(),
    useDeviceInfo: jest.fn(),
    useSessionId: jest.fn(),
}))

jest.mock("../../../hooks/useAccountId", () => ({
    useAccountId: jest.fn(),
}))

jest.mock("../../../../package.json", () => ({
    version: "1.0.0-test",
    dependencies: {
        "@volley/platform-sdk": "7.32.1-test",
    },
}))

jest.mock("../../../hooks/useGameLauncher", () => ({
    getGlobalGameLauncher: jest.fn(),
}))

jest.mock("../../../utils/getMemoryUsage", () => ({
    getMemoryUsage: jest.fn(),
}))

jest.mock("../../../utils/getTvMemoryLimits", () => ({
    getTvMemoryLimits: jest.fn(),
}))

jest.mock("../../../utils/logger", () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
    },
}))

jest.mock("../../../config/devOverrides", () => ({
    SHOULD_FORCE_WEB_CHECKOUT: false,
}))

jest.mock("../../../experiments/ExperimentManager", () => ({
    getExperimentManager: jest.fn(),
}))

describe("Debug Component", () => {
    const mockUseAccount = jest.mocked(
        require("@volley/platform-sdk/react").useAccount
    )
    const mockUseDeviceInfo = jest.mocked(
        require("@volley/platform-sdk/react").useDeviceInfo
    )
    const mockUseSessionId = jest.mocked(
        require("@volley/platform-sdk/react").useSessionId
    )
    const mockUseAccountId = jest.mocked(
        require("../../../hooks/useAccountId").useAccountId
    )
    const mockIsMobile = jest.mocked(
        require("../../../config/platformDetection").isMobile
    )
    const mockEnvConfig = require("../../../config/envconfig")

    const mockGetFireTvMemoryLimits = jest.mocked(
        require("../../../utils/getTvMemoryLimits").getTvMemoryLimits
    )
    const mockDevOverrides = require("../../../config/devOverrides")
    const mockGetExperimentManager = jest.mocked(
        require("../../../experiments/ExperimentManager").getExperimentManager
    )

    beforeEach(() => {
        jest.clearAllMocks()
        mockUseAccount.mockReturnValue({
            account: { isSubscribed: true },
        })
        mockUseDeviceInfo.mockReturnValue({
            getDeviceId: jest.fn(() => "test-device-id"),
            getModel: jest.fn(() => "test-model"),
            getOSVersion: jest.fn(() => "OS 7.0"),
        })
        mockUseSessionId.mockReturnValue("test-session-id")
        mockUseAccountId.mockReturnValue("test-account-id")
        mockIsMobile.mockReturnValue(false)
        mockEnvConfig.ENVIRONMENT = "dev"
        mockGetFireTvMemoryLimits.mockReturnValue({
            warning: 500 * 1024 * 1024,
            critical: 800 * 1024 * 1024,
            device: "test-device",
        })
        mockDevOverrides.SHOULD_FORCE_WEB_CHECKOUT = false

        mockGetExperimentManager.mockReturnValue({
            getIsInitialized: jest.fn(() => false),
            getAllVariants: jest.fn(() => ({})),
            onInitialized: jest.fn(() => jest.fn()),
        })
    })

    it("does not show up on production environment", () => {
        mockEnvConfig.ENVIRONMENT = "production"

        const { container } = render(<Debug isInitialized />)

        expect(container.firstChild).toBeNull()
    })

    it("renders debug information in non-production environment", () => {
        mockEnvConfig.ENVIRONMENT = "dev"
        render(<Debug isInitialized />)

        expect(screen.getByText("hub client: 1.0.0-test")).toBeInTheDocument()
        expect(screen.getByText("psdk: 7.32.1-test")).toBeInTheDocument()
        expect(screen.getByText("platform: WEB")).toBeInTheDocument()
        expect(screen.getByText("osVersion: OS 7.0")).toBeInTheDocument()
        expect(screen.getByText("model: test-model")).toBeInTheDocument()
        expect(
            screen.getByText("accountId: test-account-id")
        ).toBeInTheDocument()
        expect(screen.getByText("deviceId: test-device-id")).toBeInTheDocument()
        expect(screen.getByText("isSubscribed: true")).toBeInTheDocument()
        expect(screen.getByText("isInitialized: true")).toBeInTheDocument()
        expect(screen.getByText("env: dev")).toBeInTheDocument()
    })

    describe("Debug force-web-checkout functionality", () => {
        it("should show force success button when SHOULD_FORCE_WEB_CHECKOUT is true", () => {
            mockEnvConfig.ENVIRONMENT = "dev"
            mockDevOverrides.SHOULD_FORCE_WEB_CHECKOUT = true

            render(<Debug isInitialized />)

            expect(
                screen.getByText(SIMULATE_PAYMENT_SUCCESS_TEXT)
            ).toBeInTheDocument()
        })

        it("should not show force success button when SHOULD_FORCE_WEB_CHECKOUT is false", () => {
            mockEnvConfig.ENVIRONMENT = "dev"
            mockDevOverrides.SHOULD_FORCE_WEB_CHECKOUT = false

            render(<Debug isInitialized />)

            expect(
                screen.queryByText(SIMULATE_PAYMENT_SUCCESS_TEXT)
            ).not.toBeInTheDocument()
        })
    })

    describe("Experiment Display", () => {
        it("should show experiments not initialized when experiment manager is not initialized", () => {
            mockEnvConfig.ENVIRONMENT = "dev"
            mockGetExperimentManager.mockReturnValue({
                getIsInitialized: jest.fn(() => false),
                getAllVariants: jest.fn(() => ({})),
                onInitialized: jest.fn(() => jest.fn()),
            })

            render(<Debug isInitialized />)

            expect(
                screen.getByText(/experiments:.*not initialized/i)
            ).toBeInTheDocument()
        })

        it("should show experiments initialized when experiment manager is initialized", () => {
            mockEnvConfig.ENVIRONMENT = "dev"
            mockGetExperimentManager.mockReturnValue({
                getIsInitialized: jest.fn(() => true),
                getAllVariants: jest.fn(() => ({})),
                onInitialized: jest.fn(() => jest.fn()),
            })

            render(<Debug isInitialized />)

            expect(
                screen.getByText(/experiments:.*initialized/i)
            ).toBeInTheDocument()
        })

        it("should display experiment values when they are not control", () => {
            mockEnvConfig.ENVIRONMENT = "dev"
            mockGetExperimentManager.mockReturnValue({
                getIsInitialized: jest.fn(() => true),
                getAllVariants: jest.fn(() => ({
                    [ExperimentFlag.SuppressImmediateUpsell]: {
                        value: "true",
                        payload: {},
                    },
                    [ExperimentFlag.ReorderMpTiles]: {
                        value: "treatment",
                        payload: [],
                    },
                })),
                onInitialized: jest.fn(() => jest.fn()),
            })

            render(<Debug isInitialized />)

            expect(
                screen.getByText(
                    `${ExperimentFlag.SuppressImmediateUpsell}: true`
                )
            ).toBeInTheDocument()
            expect(
                screen.getByText(`${ExperimentFlag.ReorderMpTiles}: treatment`)
            ).toBeInTheDocument()
        })

        it("should not display experiments with control values", () => {
            mockEnvConfig.ENVIRONMENT = "dev"
            mockGetExperimentManager.mockReturnValue({
                getIsInitialized: jest.fn(() => true),
                getAllVariants: jest.fn(() => ({
                    [ExperimentFlag.SuppressImmediateUpsell]: {
                        value: "",
                        payload: {},
                    },
                    [ExperimentFlag.ReorderMpTiles]: {
                        value: undefined,
                        payload: undefined,
                    },
                })),
                onInitialized: jest.fn(() => jest.fn()),
            })

            render(<Debug isInitialized />)

            expect(
                screen.queryByText(
                    new RegExp(`${ExperimentFlag.SuppressImmediateUpsell}:`)
                )
            ).not.toBeInTheDocument()
            expect(
                screen.queryByText(
                    new RegExp(`${ExperimentFlag.ReorderMpTiles}:`)
                )
            ).not.toBeInTheDocument()
        })

        it("should display experiments with control values if they have a payload", () => {
            mockEnvConfig.ENVIRONMENT = "dev"
            mockGetExperimentManager.mockReturnValue({
                getIsInitialized: jest.fn(() => true),
                getAllVariants: jest.fn(() => ({
                    [ExperimentFlag.ReorderMpTiles]: {
                        value: "",
                        payload: ["jeopardy", "song-quiz"],
                    },
                })),
                onInitialized: jest.fn(() => jest.fn()),
            })

            render(<Debug isInitialized />)

            expect(
                screen.getByText(`${ExperimentFlag.ReorderMpTiles}: control`)
            ).toBeInTheDocument()
        })

        it("should handle when experiment manager is not available", () => {
            mockEnvConfig.ENVIRONMENT = "dev"
            mockGetExperimentManager.mockImplementation(() => {
                throw new Error("Amplitude experiment key is not set")
            })

            const { container } = render(<Debug isInitialized />)

            expect(container).toBeInTheDocument()
            expect(
                screen.getByText("hub client: 1.0.0-test")
            ).toBeInTheDocument()
        })
    })
})
