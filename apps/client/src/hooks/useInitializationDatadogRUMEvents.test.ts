import { renderHook } from "@testing-library/react"

import { isMobile } from "../config/platformDetection"
import { safeDatadogRum } from "../utils/datadog"
import { logger } from "../utils/logger"
import {
    InitializationStageTracker,
    useInitializationDatadogRUMEvents,
} from "./useInitializationDatadogRUMEvents"

jest.mock("../utils/datadog", () => ({
    safeDatadogRum: {
        startDurationVital: jest.fn(),
        stopDurationVital: jest.fn(),
        addAction: jest.fn(),
        addTiming: jest.fn(),
    },
}))

jest.mock("../utils/logger", () => ({
    logger: {
        info: jest.fn(),
    },
}))

jest.mock("../config/platformDetection", () => ({
    isMobile: jest.fn(),
}))

const mockSessionStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
}

Object.defineProperty(window, "sessionStorage", {
    value: mockSessionStorage,
})

const BASE_INITIALIZATION_STAGES = {
    videoComplete: false,
    experimentsReady: false,
    requiredImagesLoaded: false,
    platformReady: false,
    isInitialized: false,
    tileImagesLoaded: false,
    firstHeroImageLoaded: false,
    remainingHeroImagesLoaded: false,
    focusIndicatorLoaded: false,
    webCheckoutRequiredImagesLoaded: false,
    statusBannersLoaded: false,
    tileAnimationsLoaded: false,
    webCheckoutOptionalImagesLoaded: false,
    optionalImagesLoaded: false,
    qrCodeRendered: false,
    isWebCheckoutPlatform: false,
    isSubscribed: null,
}

describe("InitializationStageTracker", () => {
    let tracker: InitializationStageTracker
    const mockVitalRef = { id: "test-vital-123" }
    const mockLoggerInfo = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
        ;(isMobile as jest.Mock).mockReturnValue(false)
        mockSessionStorage.getItem.mockReturnValue(null)
        ;(safeDatadogRum.startDurationVital as jest.Mock).mockReturnValue(
            mockVitalRef
        )
        ;(logger.info as jest.Mock).mockImplementation(mockLoggerInfo)

        tracker = new InitializationStageTracker()
    })

    afterEach(() => {
        tracker.reset()
        mockSessionStorage.clear()
    })

    describe("startTracking", () => {
        it("should initialize tracking on TV platform", () => {
            tracker.startTracking()

            expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
                "app_init_tracking_started",
                "true"
            )
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                "App initialization tracking started (session-scoped)"
            )
            expect(safeDatadogRum.startDurationVital).not.toHaveBeenCalled()
        })

        it("should not track on mobile platform", () => {
            ;(isMobile as jest.Mock).mockReturnValue(true)

            tracker.startTracking()

            expect(safeDatadogRum.startDurationVital).not.toHaveBeenCalled()
            expect(mockSessionStorage.setItem).not.toHaveBeenCalled()
        })

        it("should not track if session already exists", () => {
            mockSessionStorage.getItem.mockReturnValue("true")

            tracker.startTracking()

            expect(safeDatadogRum.addAction).not.toHaveBeenCalled()
            expect(mockSessionStorage.setItem).not.toHaveBeenCalled()
        })

        it("should not track multiple times", () => {
            tracker.startTracking()
            tracker.startTracking()

            expect(mockSessionStorage.setItem).toHaveBeenCalledTimes(1)
            expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
                "app_init_tracking_started",
                "true"
            )
        })
    })

    describe("trackStage", () => {
        beforeEach(() => {
            tracker.startTracking()
        })

        it("should track a stage completion", () => {
            tracker.trackStage("video_complete")

            expect(safeDatadogRum.addAction).toHaveBeenCalledWith(
                "app_initialization_video_complete",
                {
                    stage: "video_complete",
                }
            )
            expect(safeDatadogRum.addTiming).toHaveBeenCalledWith(
                "app_initialization_video_complete"
            )
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                "App initialization: video complete"
            )
        })

        it("should track stage with context data", () => {
            const contextData = { customField: "test-value" }
            tracker.trackStage("platform_ready", contextData)

            expect(safeDatadogRum.addAction).toHaveBeenCalledWith(
                "app_initialization_platform_ready",
                {
                    stage: "platform_ready",
                    customField: "test-value",
                }
            )
        })

        it("should not track the same stage twice", () => {
            tracker.trackStage("video_complete")
            tracker.trackStage("video_complete")

            expect(safeDatadogRum.addAction).toHaveBeenCalledTimes(1)
            expect(mockLoggerInfo).toHaveBeenCalledTimes(2)
        })

        it("should not track stage if already tracked in session", () => {
            mockSessionStorage.getItem.mockImplementation((key) => {
                if (key === "app_init_stage_video_complete") {
                    return "completed"
                }
                return null
            })

            tracker.trackStage("video_complete")

            expect(safeDatadogRum.addAction).not.toHaveBeenCalled()
        })

        it("should set sessionStorage when tracking stage", () => {
            tracker.trackStage("video_complete")

            expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
                "app_init_stage_video_complete",
                "completed"
            )
        })

        it("should not track on mobile platform", () => {
            ;(isMobile as jest.Mock).mockReturnValue(true)
            const newTracker = new InitializationStageTracker()

            newTracker.trackStage("video_complete")

            expect(safeDatadogRum.addAction).not.toHaveBeenCalled()
        })

        it("should store completed stages", () => {
            tracker.trackStage("video_complete")
            tracker.trackStage("experiments_ready")

            const completedStages = tracker.getCompletedStages()
            expect(completedStages).toHaveLength(2)
            expect(completedStages[0]).toEqual({
                name: "video_complete",
                timestamp: expect.any(Number),
            })
            expect(completedStages[1]).toEqual({
                name: "experiments_ready",
                timestamp: expect.any(Number),
            })
        })
    })

    describe("evaluateVitals", () => {
        beforeEach(() => {
            tracker.startTracking()
        })

        it("should start app_initialization vital when conditions met", () => {
            const stages = BASE_INITIALIZATION_STAGES

            tracker.evaluateVitals(stages)

            expect(safeDatadogRum.addAction).toHaveBeenCalledWith(
                "app_initialization_started",
                expect.objectContaining({
                    videoComplete: false,
                    experimentsReady: false,
                    requiredImagesLoaded: false,
                    platformReady: false,
                })
            )
            expect(safeDatadogRum.addTiming).toHaveBeenCalledWith(
                "app_initialization_started"
            )
            expect(safeDatadogRum.startDurationVital).toHaveBeenCalledWith(
                "app_initialization",
                {
                    description: "Time from app start to fully initialized",
                }
            )
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                "Started vital: app_initialization"
            )

            const activeVitals = tracker.getActiveVitals()
            expect(activeVitals).toHaveLength(3)
            expect(activeVitals.map((v) => v.name)).toEqual(
                expect.arrayContaining([
                    "app_initialization",
                    "core_ux_availability",
                    "asset_loading",
                ])
            )
        })

        it("should complete app_initialization vital when isInitialized is true", () => {
            const startingStages = BASE_INITIALIZATION_STAGES
            tracker.evaluateVitals(startingStages)

            const completedStages = {
                ...BASE_INITIALIZATION_STAGES,
                videoComplete: true,
                experimentsReady: true,
                requiredImagesLoaded: true,
                platformReady: true,
                isInitialized: true,
            }
            tracker.evaluateVitals(completedStages)

            expect(safeDatadogRum.addAction).toHaveBeenCalledWith(
                "app_initialization_completed",
                {
                    videoComplete: true,
                    experimentsReady: true,
                    requiredImagesLoaded: true,
                    platformReady: true,
                }
            )
            expect(safeDatadogRum.addTiming).toHaveBeenCalledWith(
                "app_initialization_completed"
            )
            expect(safeDatadogRum.stopDurationVital).toHaveBeenCalledWith(
                mockVitalRef,
                {
                    description:
                        "Time from app start to fully initialized - completed",
                    context: {
                        videoComplete: true,
                        experimentsReady: true,
                        requiredImagesLoaded: true,
                        platformReady: true,
                    },
                }
            )
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                "Completed vital: app_initialization"
            )

            const activeVitals = tracker.getActiveVitals()
            expect(activeVitals).toHaveLength(2)
            expect(activeVitals.map((v) => v.name)).toEqual(
                expect.arrayContaining([
                    "core_ux_availability",
                    "asset_loading",
                ])
            )
        })

        it("should not start vitals on mobile platform", () => {
            ;(isMobile as jest.Mock).mockReturnValue(true)
            const newTracker = new InitializationStageTracker()
            newTracker.startTracking()

            const stages = BASE_INITIALIZATION_STAGES

            const callCountBefore = (
                safeDatadogRum.startDurationVital as jest.Mock
            ).mock.calls.length
            newTracker.evaluateVitals(stages)
            const callCountAfter = (
                safeDatadogRum.startDurationVital as jest.Mock
            ).mock.calls.length

            expect(callCountAfter).toBe(callCountBefore)
        })

        it("should not start the same vital twice", () => {
            const stages = BASE_INITIALIZATION_STAGES

            const callCountBefore = (
                safeDatadogRum.startDurationVital as jest.Mock
            ).mock.calls.length
            tracker.evaluateVitals(stages)
            const callCountAfter1 = (
                safeDatadogRum.startDurationVital as jest.Mock
            ).mock.calls.length
            tracker.evaluateVitals(stages)
            const callCountAfter2 = (
                safeDatadogRum.startDurationVital as jest.Mock
            ).mock.calls.length

            expect(callCountAfter1).toBe(callCountBefore + 3)
            expect(callCountAfter2).toBe(callCountAfter1)
        })

        it("should not start vital if already tracked in session", () => {
            mockSessionStorage.getItem.mockImplementation((key) => {
                if (key === "app_init_vital_app_initialization") {
                    return "started"
                }
                return null
            })

            const stages = BASE_INITIALIZATION_STAGES
            tracker.evaluateVitals(stages)

            const appInitCalls = (
                safeDatadogRum.startDurationVital as jest.Mock
            ).mock.calls.filter((call) => call[0] === "app_initialization")

            expect(appInitCalls).toHaveLength(0)
        })

        it("should set sessionStorage when starting vital", () => {
            const stages = BASE_INITIALIZATION_STAGES
            tracker.evaluateVitals(stages)

            expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
                "app_init_vital_app_initialization",
                "started"
            )
            expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
                "app_init_vital_core_ux_availability",
                "started"
            )
            expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
                "app_init_vital_asset_loading",
                "started"
            )
        })

        it("should track tileImagesLoaded stage completion", () => {
            tracker.trackStage("tile_images_loaded")

            expect(safeDatadogRum.addAction).toHaveBeenCalledWith(
                "asset_loading_tile_images_loaded",
                {
                    stage: "tile_images_loaded",
                }
            )
            expect(safeDatadogRum.addTiming).toHaveBeenCalledWith(
                "asset_loading_tile_images_loaded"
            )
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                "Asset loading: tile images loaded"
            )
        })

        it("should not emit duplicate *_started actions", () => {
            const stages = BASE_INITIALIZATION_STAGES
            tracker.evaluateVitals(stages)

            const addActionCalls = (safeDatadogRum.addAction as jest.Mock).mock
                .calls
            const startedActionCalls = addActionCalls.filter((call) =>
                call[0].endsWith("_started")
            )

            const uniqueStartedActions = new Set(
                startedActionCalls.map((call) => call[0])
            )

            expect(startedActionCalls.length).toBe(uniqueStartedActions.size)
            expect(startedActionCalls.length).toBe(3)

            expect(uniqueStartedActions).toEqual(
                new Set([
                    "app_initialization_started",
                    "core_ux_availability_started",
                    "asset_loading_started",
                ])
            )
        })
    })

    describe("vital completion", () => {
        beforeEach(() => {
            tracker.startTracking()
        })

        describe("core_ux_availability vital", () => {
            describe("normal path (non-web-checkout users)", () => {
                it("should complete when required images, status banners, and app are ready", () => {
                    const startingStages = BASE_INITIALIZATION_STAGES
                    tracker.evaluateVitals(startingStages)

                    const completedStages = {
                        ...BASE_INITIALIZATION_STAGES,
                        requiredImagesLoaded: true,
                        statusBannersLoaded: true,
                        isInitialized: true,
                        isWebCheckoutPlatform: false,
                    }
                    tracker.evaluateVitals(completedStages)

                    expect(safeDatadogRum.addAction).toHaveBeenCalledWith(
                        "core_ux_availability_completed",
                        expect.objectContaining({
                            requiredImagesLoaded: true,
                            statusBannersLoaded: true,
                            isInitialized: true,
                            isWebCheckoutPlatform: false,
                            qrCodeRendered: false,
                        })
                    )
                    expect(safeDatadogRum.addTiming).toHaveBeenCalledWith(
                        "core_ux_availability_completed"
                    )
                    expect(
                        safeDatadogRum.stopDurationVital
                    ).toHaveBeenCalledWith(mockVitalRef, {
                        description:
                            "Time from app start to core UX being available (QR code for web checkout or main carousel for others) - completed",
                        context: expect.objectContaining({
                            requiredImagesLoaded: true,
                            statusBannersLoaded: true,
                            isInitialized: true,
                            isWebCheckoutPlatform: false,
                            qrCodeRendered: false,
                        }),
                    })
                    expect(mockLoggerInfo).toHaveBeenCalledWith(
                        "Completed vital: core_ux_availability"
                    )
                })

                it("should NOT wait for QR code on non-web-checkout platforms", () => {
                    const startingStages = BASE_INITIALIZATION_STAGES
                    tracker.evaluateVitals(startingStages)

                    const completedStages = {
                        ...BASE_INITIALIZATION_STAGES,
                        requiredImagesLoaded: true,
                        statusBannersLoaded: true,
                        isInitialized: true,
                        isWebCheckoutPlatform: false,
                        qrCodeRendered: false,
                    }
                    tracker.evaluateVitals(completedStages)

                    expect(safeDatadogRum.stopDurationVital).toHaveBeenCalled()
                    expect(mockLoggerInfo).toHaveBeenCalledWith(
                        "Completed vital: core_ux_availability"
                    )
                })
            })

            describe("QR path (web checkout + unsubscribed users)", () => {
                it("should complete when QR code is rendered for unsubscribed web checkout users", () => {
                    const startingStages = BASE_INITIALIZATION_STAGES
                    tracker.evaluateVitals(startingStages)

                    const completedStages = {
                        ...BASE_INITIALIZATION_STAGES,
                        isWebCheckoutPlatform: true,
                        isSubscribed: false,
                        qrCodeRendered: true,
                    }
                    tracker.evaluateVitals(completedStages)

                    expect(
                        safeDatadogRum.stopDurationVital
                    ).toHaveBeenCalledWith(mockVitalRef, {
                        description:
                            "Time from app start to core UX being available (QR code for web checkout or main carousel for others) - completed",
                        context: expect.objectContaining({
                            qrCodeRendered: true,
                            isWebCheckoutPlatform: true,
                            isSubscribed: false,
                        }),
                    })
                    expect(mockLoggerInfo).toHaveBeenCalledWith(
                        "Completed vital: core_ux_availability"
                    )
                })

                it("should NOT complete early via normal path even if carousel is ready for unsubscribed web checkout users", () => {
                    const startingStages = {
                        ...BASE_INITIALIZATION_STAGES,
                        isWebCheckoutPlatform: true,
                        isSubscribed: false,
                    }
                    tracker.evaluateVitals(startingStages)

                    jest.clearAllMocks()

                    const carouselReadyButNoQR = {
                        ...BASE_INITIALIZATION_STAGES,
                        isWebCheckoutPlatform: true,
                        isSubscribed: false,
                        requiredImagesLoaded: true,
                        statusBannersLoaded: true,
                        isInitialized: true,
                        qrCodeRendered: false,
                    }
                    tracker.evaluateVitals(carouselReadyButNoQR)

                    const coreUxCalls = (
                        safeDatadogRum.stopDurationVital as jest.Mock
                    ).mock.calls.filter((call) =>
                        call[1].description.includes("core UX")
                    )
                    expect(coreUxCalls).toHaveLength(0)
                })

                it("should complete via normal path when subscription status becomes true on web checkout platform", () => {
                    const startingStages = {
                        ...BASE_INITIALIZATION_STAGES,
                        isWebCheckoutPlatform: true,
                        isSubscribed: null,
                    }
                    tracker.evaluateVitals(startingStages)

                    const subscribedUserReady = {
                        ...BASE_INITIALIZATION_STAGES,
                        isWebCheckoutPlatform: true,
                        isSubscribed: true,
                        requiredImagesLoaded: true,
                        statusBannersLoaded: true,
                        isInitialized: true,
                        qrCodeRendered: false,
                    }
                    tracker.evaluateVitals(subscribedUserReady)

                    expect(
                        safeDatadogRum.stopDurationVital
                    ).toHaveBeenCalledWith(mockVitalRef, {
                        description:
                            "Time from app start to core UX being available (QR code for web checkout or main carousel for others) - completed",
                        context: expect.objectContaining({
                            isWebCheckoutPlatform: true,
                            isSubscribed: true,
                            requiredImagesLoaded: true,
                            statusBannersLoaded: true,
                            isInitialized: true,
                            qrCodeRendered: false,
                        }),
                    })
                })
            })
        })

        it("should complete asset_loading vital when all optional images are loaded", () => {
            const startingStages = BASE_INITIALIZATION_STAGES
            tracker.evaluateVitals(startingStages)

            jest.clearAllMocks()

            const completedStages = {
                ...BASE_INITIALIZATION_STAGES,
                isInitialized: true,
                optionalImagesLoaded: true,
            }
            tracker.evaluateVitals(completedStages)

            expect(safeDatadogRum.addAction).toHaveBeenCalledWith(
                "asset_loading_completed",
                expect.objectContaining({
                    isInitialized: true,
                    optionalImagesLoaded: true,
                })
            )
            expect(safeDatadogRum.addTiming).toHaveBeenCalledWith(
                "asset_loading_completed"
            )

            const assetLoadingCalls = (
                safeDatadogRum.stopDurationVital as jest.Mock
            ).mock.calls.filter((call) =>
                call[1].description.includes("all assets loaded")
            )

            expect(assetLoadingCalls).toHaveLength(1)
            expect(assetLoadingCalls[0][1].context).toEqual(
                expect.objectContaining({
                    isInitialized: true,
                    optionalImagesLoaded: true,
                })
            )
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                "Completed vital: asset_loading"
            )
        })
    })

    describe("getCompletedStages", () => {
        it("should return empty array initially", () => {
            const completedStages = tracker.getCompletedStages()
            expect(completedStages).toEqual([])
        })

        it("should return copy of completed stages", () => {
            tracker.startTracking()
            tracker.trackStage("video_complete")

            const completedStages1 = tracker.getCompletedStages()
            const completedStages2 = tracker.getCompletedStages()

            expect(completedStages1).toEqual(completedStages2)
            expect(completedStages1).not.toBe(completedStages2)
        })
    })

    describe("getActiveVitals", () => {
        it("should return empty array initially", () => {
            const activeVitals = tracker.getActiveVitals()
            expect(activeVitals).toEqual([])
        })

        it("should return active vital configurations", () => {
            tracker.startTracking()

            const stages = BASE_INITIALIZATION_STAGES

            tracker.evaluateVitals(stages)

            const activeVitals = tracker.getActiveVitals()
            expect(activeVitals).toHaveLength(3)

            const vitalNames = activeVitals.map((v) => v.name)
            expect(vitalNames).toEqual(
                expect.arrayContaining([
                    "app_initialization",
                    "core_ux_availability",
                    "asset_loading",
                ])
            )

            const appInitVital = activeVitals.find(
                (v) => v.name === "app_initialization"
            )
            expect(appInitVital).toEqual({
                name: "app_initialization",
                description: "Time from app start to fully initialized",
                startCondition: expect.any(Function),
                endCondition: expect.any(Function),
                contextFields: [
                    "videoComplete",
                    "experimentsReady",
                    "requiredImagesLoaded",
                    "platformReady",
                ],
            })
        })
    })

    describe("reset", () => {
        it("should reset all tracker state", () => {
            tracker.startTracking()
            tracker.trackStage("video_complete")

            const stages = BASE_INITIALIZATION_STAGES
            tracker.evaluateVitals(stages)

            expect(tracker.getCompletedStages()).toHaveLength(1)
            expect(tracker.getActiveVitals()).toHaveLength(3) // All 3 vitals are active

            tracker.reset()

            expect(tracker.getCompletedStages()).toHaveLength(0)
            expect(tracker.getActiveVitals()).toHaveLength(0)

            const callCountBefore = (safeDatadogRum.addAction as jest.Mock).mock
                .calls.length
            tracker.startTracking()
            const callCountAfter = (safeDatadogRum.addAction as jest.Mock).mock
                .calls.length

            expect(callCountAfter).toBe(callCountBefore)
        })

        it("should clear sessionStorage for all vitals and stages on reset", () => {
            tracker.startTracking()
            tracker.trackStage("video_complete")
            tracker.trackStage("experiments_ready")

            const stages = BASE_INITIALIZATION_STAGES
            tracker.evaluateVitals(stages)

            tracker.reset()

            expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
                "app_init_tracking_started"
            )
            expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
                "app_init_vital_app_initialization"
            )
            expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
                "app_init_vital_core_ux_availability"
            )
            expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
                "app_init_vital_asset_loading"
            )
            expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
                "app_init_stage_video_complete"
            )
            expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
                "app_init_stage_experiments_ready"
            )
        })

        it("should allow re-tracking after reset", () => {
            tracker.startTracking()
            tracker.trackStage("video_complete")
            const stages = BASE_INITIALIZATION_STAGES
            tracker.evaluateVitals(stages)

            tracker.reset()

            tracker.startTracking()
            tracker.trackStage("video_complete")
            tracker.evaluateVitals(stages)

            const videoCompleteActions = (
                safeDatadogRum.addAction as jest.Mock
            ).mock.calls.filter(
                (call) => call[0] === "app_initialization_video_complete"
            )

            expect(videoCompleteActions).toHaveLength(2)
        })
    })

    describe("backward compatibility", () => {
        it("should maintain exact Datadog event names and structure", () => {
            tracker.startTracking()

            const expectedStageEvents = [
                {
                    stageName: "video_complete",
                    actionName: "app_initialization_video_complete",
                    logMessage: "App initialization: video complete",
                },
                {
                    stageName: "experiments_ready",
                    actionName: "app_initialization_experiments_ready",
                    logMessage: "App initialization: experiments ready",
                },
                {
                    stageName: "images_loaded",
                    actionName: "app_initialization_images_loaded",
                    logMessage: "App initialization: images loaded",
                },
                {
                    stageName: "platform_ready",
                    actionName: "app_initialization_platform_ready",
                    logMessage: "App initialization: platform ready",
                },
            ]

            expectedStageEvents.forEach(
                ({ stageName, actionName, logMessage }) => {
                    tracker.trackStage(stageName)

                    expect(safeDatadogRum.addAction).toHaveBeenCalledWith(
                        actionName,
                        {
                            stage: stageName,
                        }
                    )
                    expect(safeDatadogRum.addTiming).toHaveBeenCalledWith(
                        actionName
                    )
                    expect(mockLoggerInfo).toHaveBeenCalledWith(logMessage)
                }
            )
        })

        it("should maintain platform_ready context data", () => {
            tracker.startTracking()
            tracker.trackStage("platform_ready", { customContext: "test" })

            expect(safeDatadogRum.addAction).toHaveBeenCalledWith(
                "app_initialization_platform_ready",
                {
                    stage: "platform_ready",
                    customContext: "test",
                }
            )
        })

        it("should maintain app_initialization vital behavior", () => {
            tracker.startTracking()

            const startingStages = BASE_INITIALIZATION_STAGES
            tracker.evaluateVitals(startingStages)

            const completedStages = {
                ...BASE_INITIALIZATION_STAGES,
                videoComplete: true,
                experimentsReady: true,
                requiredImagesLoaded: true,
                platformReady: true,
                isInitialized: true,
                tileImagesLoaded: true,
            }
            tracker.evaluateVitals(completedStages)

            expect(safeDatadogRum.stopDurationVital).toHaveBeenCalledWith(
                mockVitalRef,
                {
                    description:
                        "Time from app start to fully initialized - completed",
                    context: {
                        videoComplete: true,
                        experimentsReady: true,
                        requiredImagesLoaded: true,
                        platformReady: true,
                    },
                }
            )
        })
    })
})

describe("useInitializationDatadogRUMEvents Hook Integration", () => {
    const mockHookVitalRef = { __dd_vital_reference: true } as const
    const mockLoggerInfo = jest.fn()

    const defaultStages = BASE_INITIALIZATION_STAGES

    beforeEach(() => {
        jest.clearAllMocks()
        mockSessionStorage.clear()
        ;(isMobile as jest.Mock).mockReturnValue(false)
        ;(safeDatadogRum.startDurationVital as jest.Mock).mockReturnValue(
            mockHookVitalRef
        )
        ;(logger.info as jest.Mock).mockImplementation(mockLoggerInfo)

        jest.spyOn(Date, "now").mockReturnValue(1234567890)

        mockSessionStorage.getItem.mockReturnValue(null)
        mockSessionStorage.setItem.mockClear()
    })

    describe("TV Platform Behavior", () => {
        beforeEach(() => {
            ;(isMobile as jest.Mock).mockReturnValue(false)
        })

        it("should start duration vital on mount for TV platform", () => {
            renderHook(() => useInitializationDatadogRUMEvents(defaultStages))

            expect(safeDatadogRum.startDurationVital).toHaveBeenCalledWith(
                "app_initialization",
                {
                    description: "Time from app start to fully initialized",
                }
            )
            expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
                "app_init_tracking_started",
                "true"
            )
            expect(safeDatadogRum.addAction).toHaveBeenCalledWith(
                "app_initialization_started",
                expect.any(Object)
            )
            expect(safeDatadogRum.addTiming).toHaveBeenCalledWith(
                "app_initialization_started"
            )
        })

        it("should not start duration vital if session already exists", () => {
            mockSessionStorage.getItem.mockReturnValue("true")

            renderHook(() => useInitializationDatadogRUMEvents(defaultStages))

            expect(safeDatadogRum.startDurationVital).not.toHaveBeenCalled()
            expect(mockSessionStorage.setItem).not.toHaveBeenCalled()
        })

        it("should not re-track stages if component remounts", () => {
            const stages = { ...defaultStages, videoComplete: true }

            const { unmount } = renderHook(() =>
                useInitializationDatadogRUMEvents(stages)
            )

            const callCountAfterFirst = (safeDatadogRum.addAction as jest.Mock)
                .mock.calls.length

            unmount()

            mockSessionStorage.getItem.mockImplementation((key) => {
                if (
                    key === "app_init_tracking_started" ||
                    key === "app_init_stage_video_complete"
                ) {
                    return "true"
                }
                return null
            })

            renderHook(() => useInitializationDatadogRUMEvents(stages))

            const callCountAfterSecond = (safeDatadogRum.addAction as jest.Mock)
                .mock.calls.length

            expect(callCountAfterSecond).toBe(callCountAfterFirst)
        })

        it("should not re-start vitals if component remounts", () => {
            const { unmount } = renderHook(() =>
                useInitializationDatadogRUMEvents(defaultStages)
            )

            const vitalCallsAfterFirst = (
                safeDatadogRum.startDurationVital as jest.Mock
            ).mock.calls.length

            unmount()

            mockSessionStorage.getItem.mockImplementation((key) => {
                if (key.startsWith("app_init_vital_")) {
                    return "started"
                }
                return null
            })

            renderHook(() => useInitializationDatadogRUMEvents(defaultStages))

            const vitalCallsAfterSecond = (
                safeDatadogRum.startDurationVital as jest.Mock
            ).mock.calls.length

            expect(vitalCallsAfterSecond).toBe(vitalCallsAfterFirst)
        })

        it("should not cleanup duration vital on unmount (session-scoped)", () => {
            const { unmount } = renderHook(() =>
                useInitializationDatadogRUMEvents(defaultStages)
            )

            unmount()

            expect(safeDatadogRum.stopDurationVital).not.toHaveBeenCalled()
        })

        it("should track video completion stage", () => {
            const { rerender } = renderHook(
                ({ stages }) => useInitializationDatadogRUMEvents(stages),
                { initialProps: { stages: defaultStages } }
            )

            rerender({
                stages: { ...defaultStages, videoComplete: true },
            })

            expect(safeDatadogRum.addAction).toHaveBeenCalledWith(
                "app_initialization_video_complete",
                {
                    stage: "video_complete",
                }
            )
            expect(safeDatadogRum.addTiming).toHaveBeenCalledWith(
                "app_initialization_video_complete"
            )
        })

        it("should track experiments ready stage", () => {
            const { rerender } = renderHook(
                ({ stages }) => useInitializationDatadogRUMEvents(stages),
                { initialProps: { stages: defaultStages } }
            )

            rerender({
                stages: { ...defaultStages, experimentsReady: true },
            })

            expect(safeDatadogRum.addAction).toHaveBeenCalledWith(
                "app_initialization_experiments_ready",
                {
                    stage: "experiments_ready",
                }
            )
            expect(safeDatadogRum.addTiming).toHaveBeenCalledWith(
                "app_initialization_experiments_ready"
            )
        })

        it("should track images loaded stage", () => {
            const { rerender } = renderHook(
                ({ stages }) => useInitializationDatadogRUMEvents(stages),
                { initialProps: { stages: defaultStages } }
            )

            rerender({
                stages: { ...defaultStages, requiredImagesLoaded: true },
            })

            expect(safeDatadogRum.addAction).toHaveBeenCalledWith(
                "app_initialization_images_loaded",
                {
                    stage: "images_loaded",
                }
            )
            expect(safeDatadogRum.addTiming).toHaveBeenCalledWith(
                "app_initialization_images_loaded"
            )
        })

        it("should track platform ready stage", () => {
            const { rerender } = renderHook(
                ({ stages }) => useInitializationDatadogRUMEvents(stages),
                { initialProps: { stages: defaultStages } }
            )

            rerender({
                stages: { ...defaultStages, platformReady: true },
            })

            expect(safeDatadogRum.addAction).toHaveBeenCalledWith(
                "app_initialization_platform_ready",
                {
                    stage: "platform_ready",
                }
            )
            expect(safeDatadogRum.addTiming).toHaveBeenCalledWith(
                "app_initialization_platform_ready"
            )
        })

        it("should track tile images loaded stage", () => {
            const { rerender } = renderHook(
                ({ stages }) => useInitializationDatadogRUMEvents(stages),
                { initialProps: { stages: defaultStages } }
            )

            rerender({
                stages: { ...defaultStages, tileImagesLoaded: true },
            })

            expect(safeDatadogRum.addAction).toHaveBeenCalledWith(
                "asset_loading_tile_images_loaded",
                {
                    stage: "tile_images_loaded",
                }
            )
            expect(safeDatadogRum.addTiming).toHaveBeenCalledWith(
                "asset_loading_tile_images_loaded"
            )
        })

        it("should track fully initialized stage and stop vital", () => {
            const { rerender } = renderHook(
                ({ stages }) => useInitializationDatadogRUMEvents(stages),
                { initialProps: { stages: defaultStages } }
            )

            const finalStages = {
                ...BASE_INITIALIZATION_STAGES,
                videoComplete: true,
                experimentsReady: true,
                requiredImagesLoaded: true,
                platformReady: true,
                isInitialized: true,
                tileImagesLoaded: true,
            }

            rerender({ stages: finalStages })

            expect(safeDatadogRum.addAction).toHaveBeenCalledWith(
                "app_initialization_fully_complete",
                {
                    stage: "fully_complete",
                }
            )

            expect(safeDatadogRum.addTiming).toHaveBeenCalledWith(
                "app_initialization_fully_complete"
            )

            expect(safeDatadogRum.stopDurationVital).toHaveBeenCalledWith(
                mockHookVitalRef,
                {
                    description:
                        "Time from app start to fully initialized - completed",
                    context: {
                        videoComplete: true,
                        experimentsReady: true,
                        requiredImagesLoaded: true,
                        platformReady: true,
                    },
                }
            )
        })
    })

    describe("Mobile Platform Behavior", () => {
        beforeEach(() => {
            ;(isMobile as jest.Mock).mockReturnValue(true)
        })

        it("should not start duration vital on mobile platform", () => {
            renderHook(() => useInitializationDatadogRUMEvents(defaultStages))

            expect(safeDatadogRum.startDurationVital).not.toHaveBeenCalled()
        })

        it("should not track any stages on mobile platform", () => {
            const { rerender } = renderHook(
                ({ stages }) => useInitializationDatadogRUMEvents(stages),
                { initialProps: { stages: defaultStages } }
            )

            const allStagesComplete = {
                ...BASE_INITIALIZATION_STAGES,
                videoComplete: true,
                experimentsReady: true,
                requiredImagesLoaded: true,
                platformReady: true,
                isInitialized: true,
                tileImagesLoaded: true,
            }

            rerender({ stages: allStagesComplete })

            expect(safeDatadogRum.addAction).not.toHaveBeenCalled()
        })
    })
})
