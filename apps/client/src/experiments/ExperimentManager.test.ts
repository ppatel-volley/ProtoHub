import { Experiment } from "@amplitude/experiment-js-client"

import {
    createExperimentIdentity,
    type ExperimentUserProperties,
    getExperimentManager,
    resetExperimentManager,
} from "./ExperimentManager"
import { ExperimentFlag } from "./experimentSchemata"

const mockUserProperties: ExperimentUserProperties = {
    platform: "lg",
    advertisingId: "ad-123",
    deviceInfoOs: "6.0",
    deviceInfoPlatformModel: "OLED55C1",
    deviceInfoResolution: "1920 1080",
    hasHardwareVoiceRemote: false,
    hubVersion: "1.0.0",
    isSubscribed: false,
    locale: "en-US",
    nativeShellAppVersion: "1.3.3",
}

jest.mock("@amplitude/experiment-js-client")

jest.mock("../config/envconfig", () => ({
    AMPLITUDE_EXPERIMENT_KEY: "test-key",
    getWindowVar: jest.fn(),
}))

jest.mock("../utils/logger", () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
    },
}))

jest.mock("@volley/platform-sdk/lib", () => ({
    getPlatform: jest.fn(),
    Platform: {
        Web: "WEB",
        Mobile: "MOBILE",
        FireTV: "FIRE_TV",
        LGTV: "LGTV",
        SamsungTV: "SAMSUNG_TV",
    },
}))

jest.mock("../config/platformDetection", () => ({
    getCachedPlatform: jest.fn(),
}))

jest.mock("../config/devOverrides", () => ({
    get EXPERIMENT_VARIANT_OVERRIDES(): Record<string, string> {
        return mockOverrides
    },
}))

let mockOverrides: Record<string, string> = {}

jest.mock("@volley/tracking/schemas", () => ({
    Platform: {
        Web: "web",
        LG: "lg",
        Samsung: "samsung",
        FireTV: "firetv",
    },
    GameIdConstant: {
        Hub: "hub",
        SongQuiz: "song-quiz",
        Jeopardy: "jeopardy",
        CoComelon: "cocomelon",
        WheelOfFortune: "wheel-of-fortune",
    },
    GameId: {
        jeopardy: "jeopardy",
        "song-quiz": "song-quiz",
        cocomelon: "cocomelon",
        hub: "hub",
        "wheel-of-fortune": "wheel-of-fortune",
    },
    HUB_EVENT_SCHEMA_MAP: {
        "Hub Screen Displayed": {},
        "Hub Button Pressed": {},
    },
}))

const { logger } = require("../utils/logger")
const { getPlatform, Platform } = require("@volley/platform-sdk/lib")
const { getCachedPlatform } = require("../config/platformDetection")

describe("ExperimentManager", () => {
    let mockExperiment: {
        fetch: jest.Mock
        variant: jest.Mock
    }

    beforeEach(() => {
        resetExperimentManager()
        mockOverrides = {}

        mockExperiment = {
            fetch: jest.fn(),
            variant: jest.fn(),
        }
        ;(Experiment.initialize as jest.Mock).mockReturnValue(mockExperiment)
        ;(getPlatform as jest.Mock).mockReturnValue(Platform.Web)
        ;(getCachedPlatform as jest.Mock).mockReturnValue(Platform.Web)

        jest.clearAllMocks()
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe("constructor", () => {
        it("throws error when amplitude key is missing", () => {
            jest.resetModules()

            jest.doMock("../config/envconfig", () => ({
                AMPLITUDE_EXPERIMENT_KEY: undefined,
                getWindowVar: jest.fn(),
            }))

            const { getExperimentManager: newGetExperimentManager } =
                jest.requireActual<{
                    getExperimentManager: typeof getExperimentManager
                }>("./ExperimentManager")

            resetExperimentManager()

            expect(() => {
                newGetExperimentManager()
            }).toThrow("Amplitude experiment key is not set")
        })
    })

    describe("getInstance", () => {
        it("creates a new instance on first call", () => {
            const instance1 = getExperimentManager()
            expect(instance1).toBeInstanceOf(Object)
        })

        it("returns the same instance on subsequent calls", () => {
            const instance1 = getExperimentManager()
            const instance2 = getExperimentManager()
            expect(instance1).toBe(instance2)
        })
    })

    describe("platform formatting", () => {
        it("maps all platform values correctly", async () => {
            const testCases: Array<{
                platform: (typeof Platform)[keyof typeof Platform]
                expected: "web" | "lg" | "samsung" | "mobile" | "firetv"
            }> = [
                { platform: Platform.Web, expected: "web" },
                { platform: Platform.LGTV, expected: "lg" },
                { platform: Platform.SamsungTV, expected: "samsung" },
                { platform: Platform.Mobile, expected: "mobile" },
                { platform: Platform.FireTV, expected: "firetv" },
            ]

            for (const { platform, expected } of testCases) {
                ;(getCachedPlatform as jest.Mock).mockReturnValue(platform)

                const manager = getExperimentManager()
                await manager.initialize({ anonymousId: "test-anonymous-id" })

                expect(mockExperiment.fetch).toHaveBeenCalledWith({
                    device_id: "test-anonymous-id",
                    user_id: undefined,
                    user_properties: {
                        platform: expected,
                    },
                })

                resetExperimentManager()
                mockExperiment = {
                    fetch: jest.fn(),
                    variant: jest.fn(),
                }
                ;(Experiment.initialize as jest.Mock).mockReturnValue(
                    mockExperiment
                )
            }
        })
    })

    describe("initialize", () => {
        it("fetches experiment data with anonymous ID only", async () => {
            const manager = getExperimentManager()
            await manager.initialize({ anonymousId: "test-anonymous-id" })

            expect(mockExperiment.fetch).toHaveBeenCalledWith({
                device_id: "test-anonymous-id",
                user_id: undefined,
                user_properties: {
                    platform: "web",
                },
            })
        })

        it("fetches experiment data with account ID only (authenticated user)", async () => {
            const manager = getExperimentManager()
            await manager.initialize({ accountId: "test-account-id" })

            expect(getCachedPlatform).toHaveBeenCalled()
            expect(mockExperiment.fetch).toHaveBeenCalledWith({
                device_id: undefined,
                user_id: "test-account-id",
                user_properties: {
                    platform: "web",
                },
            })
        })

        it("uses anonymousId as device_id when only anonymousId is provided", async () => {
            const manager = getExperimentManager()
            await manager.initialize({ anonymousId: "anonymous-device-456" })

            expect(mockExperiment.fetch).toHaveBeenCalledWith(
                expect.objectContaining({
                    device_id: "anonymous-device-456",
                    user_id: undefined,
                })
            )
        })

        it("uses accountId as user_id when only accountId is provided", async () => {
            const manager = getExperimentManager()
            await manager.initialize({ accountId: "test-account-id" })

            expect(mockExperiment.fetch).toHaveBeenCalledWith(
                expect.objectContaining({
                    device_id: undefined,
                    user_id: "test-account-id",
                })
            )
        })

        it("fetches experiment data passing platform as user property", async () => {
            ;(getPlatform as jest.Mock).mockReturnValue(Platform.FireTV)
            ;(getCachedPlatform as jest.Mock).mockReturnValue(Platform.FireTV)

            const manager = getExperimentManager()
            await manager.initialize({ accountId: "test-account-id" })

            expect(mockExperiment.fetch).toHaveBeenCalledWith({
                device_id: undefined,
                user_id: "test-account-id",
                user_properties: {
                    platform: "firetv",
                },
            })
        })

        it("handles fetch errors gracefully", async () => {
            mockExperiment.fetch.mockRejectedValue(new Error("Test error"))
            const manager = getExperimentManager()
            await manager.initialize({ anonymousId: "test-anonymous-id" })

            expect(logger.error).toHaveBeenCalledWith(
                "Failed to initialize experiment manager",
                expect.any(Error)
            )
        })

        it("does not reinitialize if already initialized", async () => {
            const manager = getExperimentManager()
            await manager.initialize({ anonymousId: "test-anonymous-id" })
            mockExperiment.fetch.mockClear()

            await manager.initialize({ anonymousId: "test-anonymous-id" })
            expect(mockExperiment.fetch).not.toHaveBeenCalled()
        })

        it("fetches experiment data passing all user properties", async () => {
            const manager = getExperimentManager()
            await manager.initialize(
                { anonymousId: "test-anonymous-id" },
                mockUserProperties
            )

            expect(mockExperiment.fetch).toHaveBeenCalledWith({
                device_id: "test-anonymous-id",
                user_id: undefined,
                user_properties: {
                    platform: "web",
                    advertisingId: "ad-123",
                    deviceInfoOs: "6.0",
                    deviceInfoPlatformModel: "OLED55C1",
                    deviceInfoResolution: "1920 1080",
                    hasHardwareVoiceRemote: false,
                    hubVersion: "1.0.0",
                    isSubscribed: false,
                    locale: "en-US",
                    nativeShellAppVersion: "1.3.3",
                },
            })
        })

        it("filters out undefined user properties", async () => {
            const manager = getExperimentManager()
            const propsWithUndefined: ExperimentUserProperties = {
                platform: "web",
                advertisingId: undefined,
                deviceInfoOs: "10.0",
                deviceInfoPlatformModel: undefined,
                hubVersion: undefined,
                isSubscribed: undefined,
            }

            await manager.initialize(
                { anonymousId: "test-anonymous-id" },
                propsWithUndefined
            )

            expect(mockExperiment.fetch).toHaveBeenCalledWith({
                device_id: "test-anonymous-id",
                user_id: undefined,
                user_properties: {
                    platform: "web",
                    deviceInfoOs: "10.0",
                },
            })
        })

        it("includes isSubscribed when false", async () => {
            const manager = getExperimentManager()
            const propsWithFalseSubscription: ExperimentUserProperties = {
                platform: "firetv",
                deviceInfoOs: "Fire OS 7.0",
                deviceInfoPlatformModel: "Fire TV Stick",
                hubVersion: "2.0.0",
                isSubscribed: false,
            }

            await manager.initialize(
                { anonymousId: "test-anonymous-id" },
                propsWithFalseSubscription
            )

            expect(mockExperiment.fetch).toHaveBeenCalledWith({
                device_id: "test-anonymous-id",
                user_id: undefined,
                user_properties: expect.objectContaining({
                    isSubscribed: false,
                }),
            })
        })

        it("includes isSubscribed when true", async () => {
            const manager = getExperimentManager()
            const propsWithSubscription: ExperimentUserProperties = {
                ...mockUserProperties,
                isSubscribed: true,
            }

            await manager.initialize(
                { anonymousId: "test-anonymous-id" },
                propsWithSubscription
            )

            expect(mockExperiment.fetch).toHaveBeenCalledWith({
                device_id: "test-anonymous-id",
                user_id: undefined,
                user_properties: expect.objectContaining({
                    isSubscribed: true,
                }),
            })
        })
    })

    describe("getVariant", () => {
        it("throws error if not initialized", () => {
            const manager = getExperimentManager()
            expect(() =>
                manager.getVariant(ExperimentFlag.SuppressImmediateUpsell)
            ).toThrow("Experiment checked before initialization")
        })

        it("returns valid variant when data is correct", async () => {
            const manager = getExperimentManager()
            await manager.initialize({ anonymousId: "test-anonymous-id" })

            const testVariant = { value: "true", payload: { data: "test" } }
            mockExperiment.variant.mockReturnValue(testVariant)

            const result = manager.getVariant(
                ExperimentFlag.SuppressImmediateUpsell
            )
            expect(result).toEqual({ value: "true", payload: { data: "test" } })
            expect(mockExperiment.variant).toHaveBeenCalledWith(
                ExperimentFlag.SuppressImmediateUpsell
            )
        })

        it("returns undefined when validation fails", async () => {
            const manager = getExperimentManager()
            await manager.initialize({ anonymousId: "test-anonymous-id" })

            const testVariant = { value: "invalid", payload: { data: "test" } }
            mockExperiment.variant.mockReturnValue(testVariant)

            const result = manager.getVariant(
                ExperimentFlag.SuppressImmediateUpsell
            )
            expect(result).toBeUndefined()
        })

        describe("QrModalConfig validation", () => {
            beforeEach(async () => {
                const manager = getExperimentManager()
                await manager.initialize({ anonymousId: "test-anonymous-id" })
            })

            it("validates QrModalConfig with immediate-upsell only", () => {
                const testVariant = {
                    value: "variant-a",
                    payload: {
                        "immediate-upsell": {
                            videoIntro: "/test-intro.mp4",
                            videoLooping: "/test-looping.mp4",
                            mainHeading: "Test Header",
                            subtitle: "Test Subtitle",
                        },
                    },
                }
                mockExperiment.variant.mockReturnValue(testVariant)

                const manager = getExperimentManager()
                const result = manager.getVariant(ExperimentFlag.QrModalConfig)

                expect(result).toEqual({
                    value: "variant-a",
                    payload: {
                        "immediate-upsell": {
                            videoIntro: "/test-intro.mp4",
                            videoLooping: "/test-looping.mp4",
                            mainHeading: "Test Header",
                            subtitle: "Test Subtitle",
                        },
                    },
                })
            })

            it("validates QrModalConfig with game-specific configs", () => {
                const testVariant = {
                    value: "variant-b",
                    payload: {
                        "immediate-upsell": {
                            mainHeading: "Immediate Header",
                        },
                        jeopardy: {
                            videoIntro: "/jeopardy-intro.mp4",
                            videoLooping: "/jeopardy-looping.mp4",
                            mainHeading: "Jeopardy Header",
                        },
                        "song-quiz": {
                            subtitle: "Song Quiz Subtitle",
                        },
                    },
                }
                mockExperiment.variant.mockReturnValue(testVariant)

                const manager = getExperimentManager()
                const result = manager.getVariant(ExperimentFlag.QrModalConfig)

                expect(result).toEqual({
                    value: "variant-b",
                    payload: testVariant.payload,
                })
            })

            it("validates QrModalConfig with partial properties", () => {
                const testVariant = {
                    value: "variant-c",
                    payload: {
                        "immediate-upsell": {
                            mainHeading: "Only Header",
                        },
                    },
                }
                mockExperiment.variant.mockReturnValue(testVariant)

                const manager = getExperimentManager()
                const result = manager.getVariant(ExperimentFlag.QrModalConfig)

                expect(result).toEqual({
                    value: "variant-c",
                    payload: {
                        "immediate-upsell": {
                            mainHeading: "Only Header",
                        },
                    },
                })
            })

            it("rejects QrModalConfig with invalid payload structure", () => {
                const testVariant = {
                    value: "variant-invalid",
                    payload: "invalid-payload",
                }
                mockExperiment.variant.mockReturnValue(testVariant)

                const manager = getExperimentManager()
                const result = manager.getVariant(ExperimentFlag.QrModalConfig)

                expect(result).toBeUndefined()
            })

            it("rejects QrModalConfig with invalid game ID", () => {
                const testVariant = {
                    value: "variant-invalid-game",
                    payload: {
                        "immediate-upsell": {
                            mainHeading: "Valid",
                        },
                        "invalid-game-id": {
                            mainHeading: "Invalid Game",
                        },
                    },
                }
                mockExperiment.variant.mockReturnValue(testVariant)

                const manager = getExperimentManager()
                const result = manager.getVariant(ExperimentFlag.QrModalConfig)
                expect(result).toBeUndefined()
            })

            it("allows empty payload object", () => {
                const testVariant = {
                    value: "empty-config",
                    payload: {},
                }
                mockExperiment.variant.mockReturnValue(testVariant)

                const manager = getExperimentManager()
                const result = manager.getVariant(ExperimentFlag.QrModalConfig)

                expect(result).toEqual({
                    value: "empty-config",
                    payload: {},
                })
            })
        })

        describe("WeekendRebrand validation", () => {
            beforeEach(async () => {
                const manager = getExperimentManager()
                await manager.initialize({ anonymousId: "test-anonymous-id" })
            })

            it("validates WeekendRebrand with value only", () => {
                const testVariant = {
                    value: "treatment",
                    payload: undefined,
                }
                mockExperiment.variant.mockReturnValue(testVariant)

                const manager = getExperimentManager()
                const result = manager.getVariant(ExperimentFlag.WeekendRebrand)

                expect(result).toEqual({
                    value: "treatment",
                    payload: undefined,
                })
            })

            it("validates WeekendRebrand with hub-modal-display payload", () => {
                const testVariant = {
                    value: "treatment",
                    payload: {
                        "hub-modal-display": {
                            startEpochMs: 1707840000000,
                            endEpochMs: 1708790400000,
                            showAgain: false,
                        },
                    },
                }
                mockExperiment.variant.mockReturnValue(testVariant)

                const manager = getExperimentManager()
                const result = manager.getVariant(ExperimentFlag.WeekendRebrand)

                expect(result).toEqual({
                    value: "treatment",
                    payload: {
                        "hub-modal-display": {
                            startEpochMs: 1707840000000,
                            endEpochMs: 1708790400000,
                            showAgain: false,
                        },
                    },
                })
            })

            it("validates WeekendRebrand with partial hub-modal-display", () => {
                const testVariant = {
                    value: "variant-a",
                    payload: {
                        "hub-modal-display": {
                            showAgain: true,
                        },
                    },
                }
                mockExperiment.variant.mockReturnValue(testVariant)

                const manager = getExperimentManager()
                const result = manager.getVariant(ExperimentFlag.WeekendRebrand)

                expect(result).toEqual({
                    value: "variant-a",
                    payload: {
                        "hub-modal-display": {
                            showAgain: true,
                        },
                    },
                })
            })

            it("validates WeekendRebrand with empty payload object", () => {
                const testVariant = {
                    value: "treatment",
                    payload: {},
                }
                mockExperiment.variant.mockReturnValue(testVariant)

                const manager = getExperimentManager()
                const result = manager.getVariant(ExperimentFlag.WeekendRebrand)

                expect(result).toEqual({
                    value: "treatment",
                    payload: {},
                })
            })

            it("returns control value correctly", () => {
                const testVariant = {
                    value: "control",
                    payload: undefined,
                }
                mockExperiment.variant.mockReturnValue(testVariant)

                const manager = getExperimentManager()
                const result = manager.getVariant(ExperimentFlag.WeekendRebrand)

                expect(result).toEqual({
                    value: "control",
                    payload: undefined,
                })
            })
        })

        it("handles variant fetch errors gracefully", async () => {
            const manager = getExperimentManager()
            await manager.initialize({ anonymousId: "test-anonymous-id" })

            mockExperiment.variant.mockImplementation(() => {
                throw new Error("Test error")
            })

            const result = manager.getVariant(
                ExperimentFlag.SuppressImmediateUpsell
            )
            expect(result).toBeUndefined()
        })

        describe("override mechanism", () => {
            it("passes parsed JSON as payload for overrides", async () => {
                mockOverrides = {
                    [ExperimentFlag.JeopardyReloadThreshold]:
                        '{"launchesBeforeReload":5}',
                }

                const manager = getExperimentManager()
                await manager.initialize({ anonymousId: "test-anonymous-id" })

                const result = manager.getVariant(
                    ExperimentFlag.JeopardyReloadThreshold
                )

                expect(result).toEqual({
                    value: '{"launchesBeforeReload":5}',
                    payload: { launchesBeforeReload: 5 },
                })
            })
        })
    })

    describe("getIsInitialized", () => {
        it("returns false when not initialized", () => {
            const manager = getExperimentManager()

            expect(manager.getIsInitialized()).toBe(false)
        })

        it("returns true when initialized", async () => {
            const manager = getExperimentManager()
            mockExperiment.fetch.mockResolvedValue(undefined)

            await manager.initialize({ anonymousId: "test-anonymous-id" })

            expect(manager.getIsInitialized()).toBe(true)
        })
    })

    describe("getAllVariants", () => {
        it("returns empty object when not initialized", () => {
            const manager = getExperimentManager()

            const variants = manager.getAllVariants()

            expect(variants).toEqual({})
        })

        it("returns all variants when initialized", async () => {
            const manager = getExperimentManager()
            mockExperiment.fetch.mockResolvedValue(undefined)

            await manager.initialize({ anonymousId: "test-anonymous-id" })

            mockExperiment.variant.mockImplementation((flag: string) => {
                if (
                    flag === (ExperimentFlag.SuppressImmediateUpsell as string)
                ) {
                    return { value: "true", payload: {} }
                }
                if (flag === (ExperimentFlag.ReorderMpTiles as string)) {
                    return { value: "treatment", payload: ["jeopardy"] }
                }
                return null
            })

            const variants = manager.getAllVariants()

            expect(variants[ExperimentFlag.SuppressImmediateUpsell]).toEqual({
                value: "true",
                payload: {},
            })
            expect(variants[ExperimentFlag.ReorderMpTiles]).toEqual({
                value: "treatment",
                payload: ["jeopardy"],
            })
        })

        it("returns undefined for variants that do not exist", async () => {
            const manager = getExperimentManager()
            mockExperiment.fetch.mockResolvedValue(undefined)

            await manager.initialize({ anonymousId: "test-anonymous-id" })

            mockExperiment.variant.mockReturnValue(null)

            const variants = manager.getAllVariants()

            expect(
                variants[ExperimentFlag.SuppressImmediateUpsell]
            ).toBeUndefined()
        })

        it("handles errors when getting variants", async () => {
            const manager = getExperimentManager()
            mockExperiment.fetch.mockResolvedValue(undefined)

            await manager.initialize({ anonymousId: "test-anonymous-id" })

            mockExperiment.variant.mockImplementation(() => {
                throw new Error("Test error")
            })

            const variants = manager.getAllVariants()

            Object.values(ExperimentFlag).forEach((flag) => {
                expect(variants[flag]).toBeUndefined()
            })
        })
    })

    describe("onInitialized", () => {
        it("calls callback immediately if already initialized", async () => {
            const manager = getExperimentManager()
            await manager.initialize({ anonymousId: "test-anonymous-id" })

            const callback = jest.fn()
            manager.onInitialized(callback)

            expect(callback).toHaveBeenCalled()
        })

        it("calls callback when initialized", async () => {
            const manager = getExperimentManager()
            const callback = jest.fn()

            manager.onInitialized(callback)
            expect(callback).not.toHaveBeenCalled()

            await manager.initialize({ anonymousId: "test-anonymous-id" })
            expect(callback).toHaveBeenCalled()
        })

        it("returns cleanup function", () => {
            const manager = getExperimentManager()
            const callback = jest.fn()

            const cleanup = manager.onInitialized(callback)
            expect(typeof cleanup).toBe("function")
        })
    })
})

describe("createExperimentIdentity", () => {
    it("returns identity with anonymousId when only anonymousId is provided", () => {
        const result = createExperimentIdentity("anon-123", undefined)

        expect(result).toEqual({
            anonymousId: "anon-123",
            accountId: undefined,
        })
    })

    it("returns identity with accountId when only accountId is provided", () => {
        const result = createExperimentIdentity(undefined, "account-456")

        expect(result).toEqual({
            accountId: "account-456",
            anonymousId: undefined,
        })
    })

    it("returns identity with both IDs when both are provided", () => {
        const result = createExperimentIdentity("anon-123", "account-456")

        expect(result).toEqual({
            anonymousId: "anon-123",
            accountId: "account-456",
        })
    })

    it("prioritizes anonymousId when both are provided", () => {
        const result = createExperimentIdentity("anon-123", "account-456")

        expect(result).toHaveProperty("anonymousId", "anon-123")
        expect(result).toHaveProperty("accountId", "account-456")
    })

    it("returns null when neither ID is provided", () => {
        const result = createExperimentIdentity(undefined, undefined)

        expect(result).toBeNull()
    })

    it("returns null when both IDs are empty strings", () => {
        const result = createExperimentIdentity("", "")

        expect(result).toBeNull()
    })
})
