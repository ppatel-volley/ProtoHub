import type {
    GameLaunchResponse,
    IGameOrchestration,
} from "@volley/platform-sdk/lib"
import { Platform } from "@volley/platform-sdk/lib"

import { GameStatus, PaywallType } from "../constants/game"
import type { ExperimentManager } from "../experiments/ExperimentManager"
import type { Game, GameId } from "./useGames"
import { LaunchedGameState } from "./useLaunchedGameState"

jest.mock("../utils/logger", () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
    },
}))

jest.mock("../experiments/ExperimentManager", () => ({
    getExperimentManager: jest.fn(),
}))

jest.mock("../utils/datadog", () => ({
    safeDatadogRum: {
        startDurationVital: jest.fn(),
        stopDurationVital: jest.fn(),
        addAction: jest.fn(),
        addError: jest.fn(),
    },
    addCustomContext: jest.fn(),
    logUserAction: jest.fn(),
    datadogRum: {
        init: jest.fn(),
        startDurationVital: jest.fn(),
        stopDurationVital: jest.fn(),
        addAction: jest.fn(),
        addError: jest.fn(),
    },
}))

jest.mock("../utils/getMemoryUsage", () => ({
    getMemoryUsage: jest.fn(() => ({
        used: 100,
        total: 500,
        limit: 1000,
        percentage: 10,
    })),
}))

jest.mock("../utils/logMemoryDelta", () => ({
    logMemoryDelta: jest.fn(),
}))

jest.mock("./useIsJeopardyReload", () => ({
    triggerJeopardyReload: jest.fn(),
    checkIsJeopardyReloading: jest.fn(),
    useIsJeopardyReload: jest.fn(),
}))

jest.mock("../config/platformDetection", () => ({
    getCachedPlatform: jest.fn(),
}))

import { getCachedPlatform } from "../config/platformDetection"
import { GAME_LAUNCHER_ERROR_DIAGNOSTICS } from "../constants"
import { getExperimentManager } from "../experiments/ExperimentManager"
import { logger } from "../utils/logger"
import {
    DEFAULT_CIRCUIT_BREAKER_COOLDOWN_MS,
    DEFAULT_MAX_CONSECUTIVE_FAILURES,
    DEFAULT_MIN_LAUNCH_INTERVAL_MS,
    DEFAULT_RELOAD_THRESHOLD,
    GameLauncher,
} from "./useGameLauncher"
import { triggerJeopardyReload } from "./useIsJeopardyReload"

const mockTriggerJeopardyReload = triggerJeopardyReload as jest.MockedFunction<
    typeof triggerJeopardyReload
>

jest.mock("@datadog/browser-rum", () => ({
    datadogRum: {
        init: jest.fn(),
        startDurationVital: jest.fn(),
        stopDurationVital: jest.fn(),
        addAction: jest.fn(),
        addError: jest.fn(),
    },
}))

jest.mock("@datadog/browser-logs", () => ({
    datadogLogs: {
        logger: {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
        },
        setGlobalContext: jest.fn(),
        init: jest.fn(),
    },
}))

const mockLogger = logger as jest.Mocked<typeof logger>

import type { datadogRum } from "../utils/datadog"
import { safeDatadogRum } from "../utils/datadog"

const TEST_USER_AGENT =
    "Mozilla/5.0 (Linux; Android 9; AFTS Build/HubTest) AppleWebKit/537.36 (KHTML, like Gecko) Silk/80.3 like Chrome/80.0 Safari/537.36"

const mockGetCachedPlatform = getCachedPlatform as jest.MockedFunction<
    typeof getCachedPlatform
>

const getLatestDiagnostics = (): Record<string, unknown> => {
    const lastCall =
        mockLogger.error.mock.calls[mockLogger.error.mock.calls.length - 1]
    if (!lastCall) {
        throw new Error("No diagnostics logged")
    }
    return lastCall[2] as Record<string, unknown>
}

const mockDateNowSequence = (
    start: number,
    latency: number
): jest.SpyInstance<number, []> => {
    const dateSpy = jest.spyOn(Date, "now")
    dateSpy
        .mockImplementationOnce(() => start)
        .mockImplementationOnce(() => start + latency)
        .mockImplementation(() => start + latency)
    return dateSpy
}

const mockDatadogRum = safeDatadogRum as jest.Mocked<typeof safeDatadogRum>

describe("GameLauncher", () => {
    let mockGameOrchestration: jest.Mocked<IGameOrchestration>
    let mockIsGamePaywallSatisfied: jest.Mock<Promise<boolean>, [Game]>
    let mockSetLaunchedGameState: jest.Mock<void, [LaunchedGameState | null]>
    let gameLauncher: GameLauncher
    let mockVitalRef: ReturnType<typeof datadogRum.startDurationVital>
    let mockSessionStorageSetItem: jest.Mock
    let userAgentSpy: jest.SpyInstance<string, []>

    const mockExperimentManager = {
        getVariant: jest.fn(),
        initialize: jest.fn().mockResolvedValue(undefined),
        onInitialized: jest.fn().mockReturnValue(() => {}),
    } satisfies Partial<ExperimentManager>

    const mockGame: Game = {
        id: "jeopardy" as GameId,
        title: "Test Game",
        trackingId: "jeopardy",
        tileImageUrl: "test-tile.avif",
        heroImageUrl: "test-hero.avif",
        animationUri: "test-animation.riv",
        paywallType: PaywallType.None,
        status: GameStatus.New,
    }

    const mockComingSoonGame: Game = {
        ...mockGame,
        id: "coming-soon-game" as GameId,
        title: "Coming Soon Game",
        status: GameStatus.ComingSoon,
    }

    const mockLaunchResponse = {
        url: "https://game-session.com/session-123",
        partyId: "session-123",
    }

    beforeEach(() => {
        jest.clearAllMocks()
        mockTriggerJeopardyReload.mockClear()
        userAgentSpy = jest.spyOn(window.navigator, "userAgent", "get")
        userAgentSpy.mockReturnValue(TEST_USER_AGENT)
        mockGetCachedPlatform.mockReturnValue(Platform.FireTV)

        const mocksessionStorage = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn(),
            clear: jest.fn(),
        }
        Object.defineProperty(window, "sessionStorage", {
            value: mocksessionStorage,
            writable: true,
        })

        mockSessionStorageSetItem = jest.fn()
        const mockSessionStorage = {
            getItem: jest.fn(),
            setItem: mockSessionStorageSetItem,
            removeItem: jest.fn(),
            clear: jest.fn(),
        }
        Object.defineProperty(window, "sessionStorage", {
            value: mockSessionStorage,
            writable: true,
        })

        mockVitalRef = "test-vital-ref" as unknown as ReturnType<
            typeof datadogRum.startDurationVital
        >
        mockDatadogRum.startDurationVital.mockReturnValue(mockVitalRef)

        mockGameOrchestration = {
            launchGame: jest.fn(),
            exitGame: jest.fn(),
        } as jest.Mocked<IGameOrchestration>

        mockIsGamePaywallSatisfied = jest.fn()
        mockSetLaunchedGameState = jest.fn()
        ;(getExperimentManager as jest.Mock).mockReturnValue(
            mockExperimentManager
        )

        gameLauncher = new GameLauncher(
            mockGameOrchestration,
            mockSetLaunchedGameState,
            mockIsGamePaywallSatisfied,
            {
                minLaunchIntervalMs: 0,
                maxConsecutiveFailures: 3,
                circuitBreakerCooldownMs: 30000,
            }
        )

        jest.spyOn(console, "log").mockImplementation(() => {})

        Object.defineProperty(window, "location", {
            value: { reload: jest.fn() },
            writable: true,
        })
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    describe("constructor", () => {
        it("should create GameLauncher instance with provided dependencies", () => {
            expect(gameLauncher).toBeInstanceOf(GameLauncher)
        })
    })

    describe("launchGame", () => {
        describe("when game status is coming-soon", () => {
            it("should return early without launching", async () => {
                await gameLauncher.launchGame(mockComingSoonGame)

                expect(mockDatadogRum.startDurationVital).not.toHaveBeenCalled()
                expect(mockDatadogRum.stopDurationVital).not.toHaveBeenCalled()
                expect(mockIsGamePaywallSatisfied).not.toHaveBeenCalled()
                expect(
                    mockGameOrchestration["launchGame"]
                ).not.toHaveBeenCalled()
                expect(mockSetLaunchedGameState).not.toHaveBeenCalled()
            })
        })

        describe("when paywall is not satisfied", () => {
            it("should log message and return without launching or starting duration vital", async () => {
                mockIsGamePaywallSatisfied.mockResolvedValue(false)

                await gameLauncher.launchGame(mockGame)

                expect(mockDatadogRum.startDurationVital).not.toHaveBeenCalled()
                expect(mockDatadogRum.stopDurationVital).not.toHaveBeenCalled()
                expect(mockIsGamePaywallSatisfied).toHaveBeenCalledWith(
                    mockGame
                )
                expect(mockLogger["info"]).toHaveBeenCalledWith(
                    "GameLauncher - Game launch blocked by paywall requirements"
                )
                expect(
                    mockGameOrchestration["launchGame"]
                ).not.toHaveBeenCalled()
                expect(mockSetLaunchedGameState).not.toHaveBeenCalled()
            })
        })

        describe("when paywall is satisfied", () => {
            beforeEach(() => {
                mockIsGamePaywallSatisfied.mockResolvedValue(true)
                mockGameOrchestration.launchGame.mockResolvedValue(
                    mockLaunchResponse
                )
            })

            it("should start duration vital with correct parameters", async () => {
                await gameLauncher.launchGame(mockGame)

                expect(mockDatadogRum.startDurationVital).toHaveBeenCalledWith(
                    "launchGame",
                    {
                        context: {
                            gameId: mockGame.id,
                        },
                        description:
                            "Time from game launch initated to game ready",
                    }
                )
            })

            it("should successfully launch game and set launched state", async () => {
                await gameLauncher.launchGame(mockGame)

                expect(mockIsGamePaywallSatisfied).toHaveBeenCalledWith(
                    mockGame
                )
                expect(
                    mockGameOrchestration["launchGame"]
                ).toHaveBeenCalledWith(mockGame.id)
                expect(mockLogger["info"]).toHaveBeenCalledWith(
                    `GameLauncher - launchGame response: ${mockLaunchResponse.url}`
                )

                expect(mockSetLaunchedGameState).toHaveBeenCalledWith(
                    expect.objectContaining({
                        urlWithSessionId: mockLaunchResponse.url,
                        activeGame: mockGame,
                    })
                )

                // Verify the LaunchedGameState was created correctly
                const calledWithState = mockSetLaunchedGameState.mock
                    .calls[0]?.[0] as LaunchedGameState
                expect(calledWithState).toBeInstanceOf(LaunchedGameState)
                expect(calledWithState.urlWithSessionId).toBe(
                    mockLaunchResponse.url
                )
                expect(calledWithState.activeGame).toBe(mockGame)
                expect(calledWithState).not.toBeNull()

                expect(mockDatadogRum.stopDurationVital).not.toHaveBeenCalled()
            })

            it("should handle different game types", async () => {
                const differentGame: Game = {
                    ...mockGame,
                    id: "different-game" as GameId,
                    title: "Different Game",
                    paywallType: PaywallType.Soft,
                }

                await gameLauncher.launchGame(differentGame)

                expect(mockDatadogRum.startDurationVital).toHaveBeenCalledWith(
                    "launchGame",
                    {
                        context: {
                            gameId: differentGame.id,
                        },
                        description:
                            "Time from game launch initated to game ready",
                    }
                )

                expect(
                    mockGameOrchestration["launchGame"]
                ).toHaveBeenCalledWith(differentGame.id)

                const calledWithState = mockSetLaunchedGameState.mock
                    .calls[0]?.[0] as LaunchedGameState
                expect(calledWithState.activeGame).toBe(differentGame)
            })

            it("should handle different launch response URLs", async () => {
                const differentResponse = {
                    url: "https://different-session.com/xyz-789",
                    partyId: "xyz-789",
                }
                mockGameOrchestration.launchGame.mockResolvedValue(
                    differentResponse
                )

                await gameLauncher.launchGame(mockGame)

                const calledWithState = mockSetLaunchedGameState.mock
                    .calls[0]?.[0] as LaunchedGameState
                expect(calledWithState.urlWithSessionId).toBe(
                    differentResponse.url
                )
            })
        })

        describe("error handling", () => {
            beforeEach(() => {
                mockIsGamePaywallSatisfied.mockResolvedValue(true)
            })

            it("should handle gameOrchestration.launchGame errors", async () => {
                const error = new Error("Launch failed")
                mockGameOrchestration.launchGame.mockRejectedValue(error)

                await gameLauncher.launchGame(mockGame)

                expect(mockDatadogRum.startDurationVital).toHaveBeenCalledWith(
                    "launchGame",
                    {
                        context: {
                            gameId: mockGame.id,
                        },
                        description:
                            "Time from game launch initated to game ready",
                    }
                )

                expect(mockDatadogRum.stopDurationVital).toHaveBeenCalledWith(
                    mockVitalRef,
                    {
                        context: expect.objectContaining({
                            status: "error",
                            error,
                            errorType: "Error",
                            errorMessage: "Launch failed",
                            errorCategory:
                                GAME_LAUNCHER_ERROR_DIAGNOSTICS.ERROR_CATEGORY_UNKNOWN,
                        }),
                    }
                )

                expect(mockLogger["error"]).toHaveBeenCalledWith(
                    "Error - GameLauncher - Request aborted or failed",
                    error,
                    expect.objectContaining({
                        errorType: "Error",
                        errorMessage: "Launch failed",
                        errorCategory:
                            GAME_LAUNCHER_ERROR_DIAGNOSTICS.ERROR_CATEGORY_UNKNOWN,
                        platform: expect.any(String),
                        userAgent: TEST_USER_AGENT,
                        isAbortError: false,
                    })
                )
                expect(mockSetLaunchedGameState).toHaveBeenCalledWith(null)
            })

            it("should handle LaunchedGameState constructor errors", async () => {
                mockGameOrchestration.launchGame.mockResolvedValue({
                    url: "", // Empty URL will cause LaunchedGameState constructor to throw
                })

                await gameLauncher.launchGame(mockGame)

                expect(mockDatadogRum.startDurationVital).toHaveBeenCalled()
                expect(mockDatadogRum.stopDurationVital).toHaveBeenCalledWith(
                    mockVitalRef,
                    {
                        context: expect.objectContaining({
                            status: "error",
                            error: expect.any(Error),
                            errorType: "Error",
                            errorMessage:
                                "Invalid game launch response: empty URL",
                            errorCategory:
                                GAME_LAUNCHER_ERROR_DIAGNOSTICS.ERROR_CATEGORY_UNKNOWN,
                        }),
                    }
                )

                expect(mockLogger["error"]).toHaveBeenCalledWith(
                    "Error - GameLauncher - Request aborted or failed",
                    expect.any(Error),
                    expect.objectContaining({
                        errorType: "Error",
                        errorMessage: "Invalid game launch response: empty URL",
                        errorCategory:
                            GAME_LAUNCHER_ERROR_DIAGNOSTICS.ERROR_CATEGORY_UNKNOWN,
                        platform: expect.any(String),
                        userAgent: TEST_USER_AGENT,
                        isAbortError: false,
                    })
                )
                expect(mockSetLaunchedGameState).toHaveBeenCalledWith(null)
            })

            it("should handle unexpected errors during launch", async () => {
                const unexpectedError = new Error("Unexpected error")
                mockGameOrchestration.launchGame.mockResolvedValue(
                    mockLaunchResponse
                )

                // Mock LaunchedGameState constructor to throw
                jest.spyOn(
                    require("./useLaunchedGameState"),
                    "LaunchedGameState"
                ).mockImplementation(() => {
                    throw unexpectedError
                })

                await gameLauncher.launchGame(mockGame)

                expect(mockDatadogRum.startDurationVital).toHaveBeenCalled()
                expect(mockDatadogRum.stopDurationVital).toHaveBeenCalledWith(
                    mockVitalRef,
                    {
                        context: expect.objectContaining({
                            status: "error",
                            error: unexpectedError,
                            errorType: "Error",
                            errorMessage: "Unexpected error",
                            errorCategory:
                                GAME_LAUNCHER_ERROR_DIAGNOSTICS.ERROR_CATEGORY_UNKNOWN,
                        }),
                    }
                )

                expect(mockLogger["error"]).toHaveBeenCalledWith(
                    "Error - GameLauncher - Request aborted or failed",
                    unexpectedError,
                    expect.objectContaining({
                        errorType: "Error",
                        errorMessage: "Unexpected error",
                        errorCategory:
                            GAME_LAUNCHER_ERROR_DIAGNOSTICS.ERROR_CATEGORY_UNKNOWN,
                        platform: expect.any(String),
                        userAgent: TEST_USER_AGENT,
                        isAbortError: false,
                    })
                )
                expect(mockSetLaunchedGameState).toHaveBeenCalledWith(null)
            })

            describe("diagnostic categorization", () => {
                it("should classify quick abort errors as user navigation", async () => {
                    const abortError = new Error("Request aborted")
                    abortError.name = "AbortError"
                    mockGameOrchestration.launchGame.mockRejectedValue(
                        abortError
                    )
                    const dateSpy = mockDateNowSequence(1_000, 400)

                    await gameLauncher.launchGame(mockGame)

                    const diagnostics = getLatestDiagnostics()
                    expect(diagnostics).toEqual(
                        expect.objectContaining({
                            errorType: "AbortError",
                            errorMessage: "Request aborted",
                            isAbortError: true,
                            errorCategory:
                                GAME_LAUNCHER_ERROR_DIAGNOSTICS.ERROR_CATEGORY_USER_NAVIGATION,
                            latencyMs: 400,
                            launchStartTime: 1_000,
                            platform: expect.any(String),
                            userAgent: TEST_USER_AGENT,
                        })
                    )
                    expect(
                        mockDatadogRum.stopDurationVital
                    ).toHaveBeenCalledWith(mockVitalRef, {
                        context: expect.objectContaining({
                            status: "error",
                            error: abortError,
                            errorCategory:
                                GAME_LAUNCHER_ERROR_DIAGNOSTICS.ERROR_CATEGORY_USER_NAVIGATION,
                        }),
                    })

                    dateSpy.mockRestore()
                })

                it("should classify long-running abort errors as timeouts", async () => {
                    const abortError = new Error("Request aborted")
                    abortError.name = "AbortError"
                    mockGameOrchestration.launchGame.mockRejectedValue(
                        abortError
                    )
                    const dateSpy = mockDateNowSequence(2_000, 6_000)

                    await gameLauncher.launchGame(mockGame)

                    const diagnostics = getLatestDiagnostics()
                    expect(diagnostics).toEqual(
                        expect.objectContaining({
                            errorType: "AbortError",
                            errorCategory:
                                GAME_LAUNCHER_ERROR_DIAGNOSTICS.ERROR_CATEGORY_TIMEOUT,
                            latencyMs: 6_000,
                            launchStartTime: 2_000,
                        })
                    )
                    expect(
                        mockDatadogRum.stopDurationVital
                    ).toHaveBeenCalledWith(mockVitalRef, {
                        context: expect.objectContaining({
                            status: "error",
                            errorCategory:
                                GAME_LAUNCHER_ERROR_DIAGNOSTICS.ERROR_CATEGORY_TIMEOUT,
                            error: abortError,
                        }),
                    })

                    dateSpy.mockRestore()
                })

                it("should classify Axios errors as network issues", async () => {
                    const axiosError = new Error("Network failed")
                    axiosError.name = "AxiosError"
                    mockGameOrchestration.launchGame.mockRejectedValue(
                        axiosError
                    )
                    const dateSpy = mockDateNowSequence(3_000, 2_000)

                    await gameLauncher.launchGame(mockGame)

                    const diagnostics = getLatestDiagnostics()
                    expect(diagnostics).toEqual(
                        expect.objectContaining({
                            errorType: "AxiosError",
                            isAbortError: false,
                            errorCategory:
                                GAME_LAUNCHER_ERROR_DIAGNOSTICS.ERROR_CATEGORY_NETWORK_ERROR,
                            latencyMs: 2_000,
                        })
                    )
                    expect(
                        mockDatadogRum.stopDurationVital
                    ).toHaveBeenCalledWith(mockVitalRef, {
                        context: expect.objectContaining({
                            status: "error",
                            errorCategory:
                                GAME_LAUNCHER_ERROR_DIAGNOSTICS.ERROR_CATEGORY_NETWORK_ERROR,
                            error: axiosError,
                            errorType: "AxiosError",
                        }),
                    })

                    dateSpy.mockRestore()
                })
            })
        })

        describe("integration scenarios", () => {
            it("should handle complete launch workflow", async () => {
                mockIsGamePaywallSatisfied.mockResolvedValue(true)
                mockGameOrchestration.launchGame.mockResolvedValue(
                    mockLaunchResponse
                )

                await gameLauncher.launchGame(mockGame)

                expect(mockDatadogRum.startDurationVital).toHaveBeenCalledWith(
                    "launchGame",
                    {
                        context: {
                            gameId: mockGame.id,
                        },
                        description:
                            "Time from game launch initated to game ready",
                    }
                )

                // Verify the complete flow
                expect(mockIsGamePaywallSatisfied).toHaveBeenCalledWith(
                    mockGame
                )
                expect(
                    mockGameOrchestration["launchGame"]
                ).toHaveBeenCalledWith(mockGame.id)
                const calledState = mockSetLaunchedGameState.mock
                    .calls[0]?.[0] as LaunchedGameState
                expect(calledState).toBeInstanceOf(LaunchedGameState)
                expect(calledState.urlWithSessionId).toBe(
                    mockLaunchResponse.url
                )
                expect(calledState.activeGame).toBe(mockGame)
                expect(calledState).not.toBeNull()

                expect(mockLogger["info"]).not.toHaveBeenCalledWith(
                    "GameLauncher - Game launch blocked by paywall requirements"
                )
                expect(mockLogger["error"]).not.toHaveBeenCalled()

                expect(mockDatadogRum.stopDurationVital).not.toHaveBeenCalled()
            })

            it("should handle paywall rejection workflow", async () => {
                mockIsGamePaywallSatisfied.mockResolvedValue(false)

                await gameLauncher.launchGame(mockGame)

                // Verify paywall rejection flow
                expect(mockIsGamePaywallSatisfied).toHaveBeenCalledWith(
                    mockGame
                )
                expect(mockLogger["info"]).toHaveBeenCalledWith(
                    "GameLauncher - Game launch blocked by paywall requirements"
                )
                expect(
                    mockGameOrchestration["launchGame"]
                ).not.toHaveBeenCalled()
                expect(mockSetLaunchedGameState).not.toHaveBeenCalled()

                expect(mockDatadogRum.startDurationVital).not.toHaveBeenCalled()
                expect(mockDatadogRum.stopDurationVital).not.toHaveBeenCalled()
            })

            it("should handle coming-soon game workflow", async () => {
                await gameLauncher.launchGame(mockComingSoonGame)

                // Verify coming-soon flow
                expect(mockIsGamePaywallSatisfied).not.toHaveBeenCalled()
                expect(
                    mockGameOrchestration["launchGame"]
                ).not.toHaveBeenCalled()
                expect(mockSetLaunchedGameState).not.toHaveBeenCalled()

                expect(mockLogger["error"]).not.toHaveBeenCalled()
            })
        })

        describe("async behavior", () => {
            it("should handle slow paywall check", async () => {
                let resolvePaywall: (value: boolean) => void
                const paywallPromise = new Promise<boolean>((resolve) => {
                    resolvePaywall = resolve
                })
                mockIsGamePaywallSatisfied.mockReturnValue(paywallPromise)
                mockGameOrchestration.launchGame.mockResolvedValue(
                    mockLaunchResponse
                )

                const launchPromise = gameLauncher.launchGame(mockGame)

                // At this point, the launch should be waiting for paywall
                expect(
                    mockGameOrchestration["launchGame"]
                ).not.toHaveBeenCalled()

                // Resolve the paywall check
                resolvePaywall!(true)
                await launchPromise

                expect(mockGameOrchestration["launchGame"]).toHaveBeenCalled()
                expect(mockSetLaunchedGameState).toHaveBeenCalled()
                expect(mockDatadogRum.startDurationVital).toHaveBeenCalledWith(
                    "launchGame",
                    {
                        context: {
                            gameId: mockGame.id,
                        },
                        description:
                            "Time from game launch initated to game ready",
                    }
                )
                expect(mockDatadogRum.stopDurationVital).not.toHaveBeenCalled()
            })
        })
    })

    describe("consecutive jeopardy launch tracking", () => {
        const mockNonJeopardyGame: Game = {
            ...mockGame,
            id: "wheel-of-fortune" as GameId,
            title: "Wheel of Fortune",
            trackingId: "wheel of fortune",
        }

        beforeEach(() => {
            mockIsGamePaywallSatisfied.mockResolvedValue(true)
            mockGameOrchestration.launchGame.mockResolvedValue(
                mockLaunchResponse
            )
        })

        it("should track consecutive jeopardy launches", async () => {
            let count = 0
            const mockGetItem = jest.fn(() => {
                return count > 0 ? count.toString() : null
            })
            const mockSetItem = jest.fn((key: string, value: string) => {
                if (key === "jeopardy-launch-count") {
                    count = parseInt(value, 10)
                }
            })
            Object.defineProperty(window.sessionStorage, "getItem", {
                value: mockGetItem,
                writable: true,
            })
            Object.defineProperty(window.sessionStorage, "setItem", {
                value: mockSetItem,
                writable: true,
            })

            await gameLauncher.launchGame(mockGame)
            await gameLauncher.launchGame(mockGame)
            await gameLauncher.launchGame(mockGame)

            expect(mockLogger["info"]).toHaveBeenCalledWith(
                "GameLauncher - jeopardyLaunchesInSessionWithoutReload: 0"
            )
            expect(mockLogger["info"]).toHaveBeenCalledWith(
                "GameLauncher - jeopardyLaunchesInSessionWithoutReload: 1"
            )
            expect(mockLogger["info"]).toHaveBeenCalledWith(
                "GameLauncher - jeopardyLaunchesInSessionWithoutReload: 2"
            )
        })

        it("should reload page on DEFAULT_RELOAD_THRESHOLD consecutive jeopardy launch attempt", async () => {
            let count = 0
            const mockGetItem = jest.fn((key: string) => {
                if (key === "jeopardy-launch-count") {
                    return count > 0 ? count.toString() : null
                }
                return null
            })
            const mockSetItem = jest.fn((key: string, value: string) => {
                if (key === "jeopardy-launch-count") {
                    count = parseInt(value, 10)
                }
            })
            Object.defineProperty(window.sessionStorage, "getItem", {
                value: mockGetItem,
                writable: true,
            })
            Object.defineProperty(window.sessionStorage, "setItem", {
                value: mockSetItem,
                writable: true,
            })
            const mockRemoveItem = jest.fn((key: string) => {
                if (key === "jeopardy-launch-count") {
                    count = 0
                }
            })
            Object.defineProperty(window.sessionStorage, "removeItem", {
                value: mockRemoveItem,
                writable: true,
            })

            mockGameOrchestration.launchGame.mockRejectedValue(
                new Error("Launch failed")
            )

            for (let i = 0; i < DEFAULT_RELOAD_THRESHOLD; i++) {
                await gameLauncher.launchGame(mockGame)
            }

            expect(mockLogger["info"]).toHaveBeenCalledWith(
                `GameLauncher - ${DEFAULT_RELOAD_THRESHOLD} consecutive jeopardy launches detected, reloading page to prevent OOM WASM error`
            )
            expect(mockTriggerJeopardyReload).toHaveBeenCalled()
        })

        it("should not call orchestration on 10th consecutive jeopardy launch", async () => {
            let count = 0
            const mockGetItem = jest.fn(() => {
                return count > 0 ? count.toString() : null
            })
            const mockSetItem = jest.fn((key: string, value: string) => {
                if (key === "jeopardy-launch-count") {
                    count = parseInt(value, 10)
                }
            })
            Object.defineProperty(window.sessionStorage, "getItem", {
                value: mockGetItem,
                writable: true,
            })
            Object.defineProperty(window.sessionStorage, "setItem", {
                value: mockSetItem,
                writable: true,
            })
            const mockRemoveItem = jest.fn((key: string) => {
                if (key === "jeopardy-launch-count") {
                    count = 0
                }
            })
            Object.defineProperty(window.sessionStorage, "removeItem", {
                value: mockRemoveItem,
                writable: true,
            })

            for (let i = 0; i < DEFAULT_RELOAD_THRESHOLD - 1; i++) {
                await gameLauncher.launchGame(mockGame)
            }

            mockGameOrchestration.launchGame.mockClear()
            mockSetLaunchedGameState.mockClear()

            await gameLauncher.launchGame(mockGame)

            expect(mockGameOrchestration["launchGame"]).not.toHaveBeenCalled()
            expect(mockSetLaunchedGameState).not.toHaveBeenCalled()
        })

        it("should not reset counter when non-jeopardy game is launched", async () => {
            let count = 0
            const mockGetItem = jest.fn(() => {
                return count > 0 ? count.toString() : null
            })
            const mockSetItem = jest.fn((key: string, value: string) => {
                if (key === "jeopardy-launch-count") {
                    count = parseInt(value, 10)
                }
            })
            Object.defineProperty(window.sessionStorage, "getItem", {
                value: mockGetItem,
                writable: true,
            })
            Object.defineProperty(window.sessionStorage, "setItem", {
                value: mockSetItem,
                writable: true,
            })
            const mockRemoveItem = jest.fn((key: string) => {
                if (key === "jeopardy-launch-count") {
                    count = 0
                }
            })
            Object.defineProperty(window.sessionStorage, "removeItem", {
                value: mockRemoveItem,
                writable: true,
            })

            await gameLauncher.launchGame(mockGame)
            await gameLauncher.launchGame(mockGame)
            await gameLauncher.launchGame(mockNonJeopardyGame)
            const remaining = DEFAULT_RELOAD_THRESHOLD - 2
            for (let i = 0; i < remaining; i++) {
                await gameLauncher.launchGame(mockGame)
            }

            expect(mockLogger["info"]).toHaveBeenCalledWith(
                "GameLauncher - jeopardyLaunchesInSessionWithoutReload: 0"
            )
            expect(mockLogger["info"]).toHaveBeenCalledWith(
                "GameLauncher - jeopardyLaunchesInSessionWithoutReload: 1"
            )
            expect(mockLogger["info"]).toHaveBeenCalledWith(
                "GameLauncher - jeopardyLaunchesInSessionWithoutReload: 2"
            )
            expect(mockTriggerJeopardyReload).toHaveBeenCalled()
        })

        it("should not reset counter on successful jeopardy launch", async () => {
            let count = 0
            const mockGetItem = jest.fn(() => {
                return count > 0 ? count.toString() : null
            })
            const mockSetItem = jest.fn((key: string, value: string) => {
                if (key === "jeopardy-launch-count") {
                    count = parseInt(value, 10)
                }
            })
            Object.defineProperty(window.sessionStorage, "getItem", {
                value: mockGetItem,
                writable: true,
            })
            Object.defineProperty(window.sessionStorage, "setItem", {
                value: mockSetItem,
                writable: true,
            })

            await gameLauncher.launchGame(mockGame)
            await gameLauncher.launchGame(mockGame)
            await gameLauncher.launchGame(mockGame)

            expect(mockSetLaunchedGameState).toHaveBeenCalledTimes(3)
            expect(mockTriggerJeopardyReload).not.toHaveBeenCalled()

            expect(mockLogger["info"]).toHaveBeenCalledWith(
                "GameLauncher - jeopardyLaunchesInSessionWithoutReload: 0"
            )
            expect(mockLogger["info"]).toHaveBeenCalledWith(
                "GameLauncher - jeopardyLaunchesInSessionWithoutReload: 1"
            )
            expect(mockLogger["info"]).toHaveBeenCalledWith(
                "GameLauncher - jeopardyLaunchesInSessionWithoutReload: 2"
            )
        })

        it("should not reset counter on failed jeopardy launch", async () => {
            const error = new Error("Launch failed")
            mockGameOrchestration.launchGame.mockRejectedValue(error)

            await gameLauncher.launchGame(mockGame)
            await gameLauncher.launchGame(mockGame)

            expect(mockSetLaunchedGameState).toHaveBeenCalledWith(null)
            expect(mockTriggerJeopardyReload).not.toHaveBeenCalled()
        })

        it("should handle mixed game launches correctly", async () => {
            let count = 0
            const mockGetItem = jest.fn(() => {
                return count > 0 ? count.toString() : null
            })
            const mockSetItem = jest.fn((key: string, value: string) => {
                if (key === "jeopardy-launch-count") {
                    count = parseInt(value, 10)
                }
            })
            Object.defineProperty(window.sessionStorage, "getItem", {
                value: mockGetItem,
                writable: true,
            })
            Object.defineProperty(window.sessionStorage, "setItem", {
                value: mockSetItem,
                writable: true,
            })
            const mockRemoveItem = jest.fn((key: string) => {
                if (key === "jeopardy-launch-count") {
                    count = 0
                }
            })
            Object.defineProperty(window.sessionStorage, "removeItem", {
                value: mockRemoveItem,
                writable: true,
            })

            await gameLauncher.launchGame(mockGame)
            await gameLauncher.launchGame(mockNonJeopardyGame)

            for (let i = 0; i < DEFAULT_RELOAD_THRESHOLD - 1; i++) {
                await gameLauncher.launchGame(mockGame)
            }

            expect(mockLogger["info"]).toHaveBeenCalledWith(
                `GameLauncher - ${DEFAULT_RELOAD_THRESHOLD} consecutive jeopardy launches detected, reloading page to prevent OOM WASM error`
            )
            expect(mockTriggerJeopardyReload).toHaveBeenCalled()
        })

        it("should not affect non-jeopardy games", async () => {
            await gameLauncher.launchGame(mockNonJeopardyGame)
            await gameLauncher.launchGame(mockNonJeopardyGame)
            await gameLauncher.launchGame(mockNonJeopardyGame)
            await gameLauncher.launchGame(mockNonJeopardyGame)
            await gameLauncher.launchGame(mockNonJeopardyGame)

            expect(mockGameOrchestration["launchGame"]).toHaveBeenCalledTimes(5)
            expect(mockSetLaunchedGameState).toHaveBeenCalledTimes(5)
            expect(mockTriggerJeopardyReload).not.toHaveBeenCalled()
        })
    })

    describe("getJeopardyReloadThreshold", () => {
        beforeEach(() => {
            mockExperimentManager.getVariant.mockClear()
            mockLogger.info.mockClear()
            mockLogger.warn.mockClear()
        })

        it("should return default threshold of 10 when no experiment variant is available", () => {
            mockExperimentManager.getVariant.mockReturnValue(null)

            const threshold = (gameLauncher as any).getJeopardyReloadThreshold()

            expect(threshold).toBe(10)
            expect(mockLogger["info"]).toHaveBeenCalledWith(
                "GameLauncher - using default reload threshold: 10"
            )
            expect(mockExperimentManager.getVariant).toHaveBeenCalledWith(
                "jeopardy-reload-threshold"
            )
        })

        it("should return default threshold of 10 when experiment variant has no payload", () => {
            mockExperimentManager.getVariant.mockReturnValue({
                name: "test-variant",
                payload: null,
            })

            const threshold = (gameLauncher as any).getJeopardyReloadThreshold()

            expect(threshold).toBe(10)
            expect(mockLogger["info"]).toHaveBeenCalledWith(
                "GameLauncher - using default reload threshold: 10"
            )
        })

        it("should return default threshold of 10 when experiment variant has empty payload", () => {
            mockExperimentManager.getVariant.mockReturnValue({
                name: "test-variant",
                payload: {},
            })

            const threshold = (gameLauncher as any).getJeopardyReloadThreshold()

            expect(threshold).toBe(10)
            expect(mockLogger["info"]).toHaveBeenCalledWith(
                "GameLauncher - using default reload threshold: 10"
            )
        })

        it("should return default threshold of 10 when experiment variant payload has no launchesBeforeReload", () => {
            mockExperimentManager.getVariant.mockReturnValue({
                name: "test-variant",
                payload: {
                    someOtherProperty: "value",
                },
            })

            const threshold = (gameLauncher as any).getJeopardyReloadThreshold()

            expect(threshold).toBe(10)
            expect(mockLogger["info"]).toHaveBeenCalledWith(
                "GameLauncher - using default reload threshold: 10"
            )
        })

        it("should return experiment value of 1 when payload has launchesBeforeReload: 1", () => {
            mockExperimentManager.getVariant.mockReturnValue({
                name: "treatment",
                payload: {
                    launchesBeforeReload: 1,
                },
            })

            const threshold = (gameLauncher as any).getJeopardyReloadThreshold()

            expect(threshold).toBe(1)
            expect(mockLogger["info"]).toHaveBeenCalledWith(
                "GameLauncher - using experiment reload threshold from payload: 1"
            )
            expect(mockLogger["info"]).not.toHaveBeenCalledWith(
                expect.stringContaining("using default reload threshold")
            )
        })

        it("should return experiment value of 6 when payload has launchesBeforeReload: 6", () => {
            mockExperimentManager.getVariant.mockReturnValue({
                name: "treatment",
                payload: {
                    launchesBeforeReload: 6,
                },
            })

            const threshold = (gameLauncher as any).getJeopardyReloadThreshold()

            expect(threshold).toBe(6)
            expect(mockLogger["info"]).toHaveBeenCalledWith(
                "GameLauncher - using experiment reload threshold from payload: 6"
            )
        })

        it("should return experiment value of 0 when payload has launchesBeforeReload: 0", () => {
            mockExperimentManager.getVariant.mockReturnValue({
                name: "treatment",
                payload: {
                    launchesBeforeReload: 0,
                },
            })

            const threshold = (gameLauncher as any).getJeopardyReloadThreshold()

            expect(threshold).toBe(0)
            expect(mockLogger["info"]).toHaveBeenCalledWith(
                "GameLauncher - using experiment reload threshold from payload: 0"
            )
        })

        it("should return default threshold when payload has negative launchesBeforeReload", () => {
            mockExperimentManager.getVariant.mockReturnValue({
                name: "treatment",
                payload: {
                    launchesBeforeReload: -5,
                },
            })

            const threshold = (gameLauncher as any).getJeopardyReloadThreshold()

            expect(threshold).toBe(10)
            expect(mockLogger["info"]).toHaveBeenCalledWith(
                "GameLauncher - using default reload threshold: 10"
            )
        })

        it("should handle large values from experiment payload", () => {
            mockExperimentManager.getVariant.mockReturnValue({
                name: "test-variant",
                payload: {
                    launchesBeforeReload: 999,
                },
            })

            const threshold = (gameLauncher as any).getJeopardyReloadThreshold()

            expect(threshold).toBe(999)
            expect(mockLogger["info"]).toHaveBeenCalledWith(
                "GameLauncher - using experiment reload threshold from payload: 999"
            )
        })

        it("should return default threshold when getVariant throws an error", () => {
            mockExperimentManager.getVariant.mockImplementation(() => {
                throw new Error("Experiment manager error")
            })

            const threshold = (gameLauncher as any).getJeopardyReloadThreshold()

            expect(threshold).toBe(10)
            expect(mockLogger["warn"]).toHaveBeenCalledWith(
                "GameLauncher - experiment variant not available or invalid, using default threshold"
            )
            expect(mockLogger["info"]).toHaveBeenCalledWith(
                "GameLauncher - using default reload threshold: 10"
            )
        })

        it("should handle null payload gracefully", () => {
            mockExperimentManager.getVariant.mockReturnValue({
                name: "test-variant",
                payload: null,
            })

            const threshold = (gameLauncher as any).getJeopardyReloadThreshold()

            expect(threshold).toBe(10)
            expect(mockLogger["info"]).toHaveBeenCalledWith(
                "GameLauncher - using default reload threshold: 10"
            )
            expect(mockLogger["warn"]).not.toHaveBeenCalled()
        })

        it("should handle undefined payload gracefully", () => {
            mockExperimentManager.getVariant.mockReturnValue({
                name: "test-variant",
                payload: undefined,
            })

            const threshold = (gameLauncher as any).getJeopardyReloadThreshold()

            expect(threshold).toBe(DEFAULT_RELOAD_THRESHOLD)
            expect(mockLogger["info"]).toHaveBeenCalledWith(
                `GameLauncher - using default reload threshold: ${DEFAULT_RELOAD_THRESHOLD}`
            )
            expect(mockLogger["warn"]).not.toHaveBeenCalled()
        })

        it("should prioritize experiment value over other payload properties", () => {
            mockExperimentManager.getVariant.mockReturnValue({
                name: "test-variant",
                payload: {
                    launchesBeforeReload: 3,
                    someOtherThreshold: 10,
                    defaultValue: 2,
                },
            })

            const threshold = (gameLauncher as any).getJeopardyReloadThreshold()

            expect(threshold).toBe(3)
            expect(mockLogger["info"]).toHaveBeenCalledWith(
                "GameLauncher - using experiment reload threshold from payload: 3"
            )
        })
    })

    describe("getJeopardyLaunchCount", () => {
        beforeEach(() => {
            mockIsGamePaywallSatisfied.mockResolvedValue(true)
            mockGameOrchestration.launchGame.mockResolvedValue(
                mockLaunchResponse
            )
        })

        it("should return 0 initially", () => {
            const mockGetItem = jest.fn().mockReturnValue(null)
            Object.defineProperty(window.sessionStorage, "getItem", {
                value: mockGetItem,
                writable: true,
            })
            expect(gameLauncher.getJeopardyLaunchCount()).toBe(0)
        })

        it("should return correct count after jeopardy launches", async () => {
            const mockGetItem = jest.fn().mockReturnValue(null)
            const mockSetItem = jest.fn()
            Object.defineProperty(window.sessionStorage, "getItem", {
                value: mockGetItem,
                writable: true,
            })
            Object.defineProperty(window.sessionStorage, "setItem", {
                value: mockSetItem,
                writable: true,
            })

            expect(gameLauncher.getJeopardyLaunchCount()).toBe(0)

            await gameLauncher.launchGame(mockGame)
            expect(mockSetItem).toHaveBeenCalledWith(
                "jeopardy-launch-count",
                "1"
            )
            mockGetItem.mockReturnValue("1")
            expect(gameLauncher.getJeopardyLaunchCount()).toBe(1)

            await gameLauncher.launchGame(mockGame)
            expect(mockSetItem).toHaveBeenCalledWith(
                "jeopardy-launch-count",
                "2"
            )
            mockGetItem.mockReturnValue("2")
            expect(gameLauncher.getJeopardyLaunchCount()).toBe(2)

            await gameLauncher.launchGame(mockGame)
            expect(mockSetItem).toHaveBeenCalledWith(
                "jeopardy-launch-count",
                "3"
            )
            mockGetItem.mockReturnValue("3")
            expect(gameLauncher.getJeopardyLaunchCount()).toBe(3)
        })

        it("should not increment count for non-jeopardy games", async () => {
            const nonJeopardyGame: Game = {
                ...mockGame,
                id: "wheel-of-fortune" as GameId,
                title: "Wheel of Fortune",
                trackingId: "wheel of fortune",
            }

            const mockGetItem = jest.fn().mockReturnValue(null)
            const mockSetItem = jest.fn()
            Object.defineProperty(window.sessionStorage, "getItem", {
                value: mockGetItem,
                writable: true,
            })
            Object.defineProperty(window.sessionStorage, "setItem", {
                value: mockSetItem,
                writable: true,
            })

            expect(gameLauncher.getJeopardyLaunchCount()).toBe(0)

            await gameLauncher.launchGame(nonJeopardyGame)
            expect(mockSetItem).not.toHaveBeenCalledWith(
                "jeopardy-launch-count",
                expect.any(String)
            )
            expect(gameLauncher.getJeopardyLaunchCount()).toBe(0)

            await gameLauncher.launchGame(nonJeopardyGame)
            expect(mockSetItem).not.toHaveBeenCalledWith(
                "jeopardy-launch-count",
                expect.any(String)
            )
            expect(gameLauncher.getJeopardyLaunchCount()).toBe(0)
        })

        it("should reset count to 0 after page reload on default threshold", async () => {
            mockExperimentManager.getVariant.mockReturnValue(null)
            let count = 0
            const mockGetItem = jest.fn(() => {
                return count > 0 ? count.toString() : null
            })
            const mockSetItem = jest.fn((key: string, value: string) => {
                if (key === "jeopardy-launch-count") {
                    count = parseInt(value, 10)
                }
            })
            Object.defineProperty(window.sessionStorage, "getItem", {
                value: mockGetItem,
                writable: true,
            })
            Object.defineProperty(window.sessionStorage, "setItem", {
                value: mockSetItem,
                writable: true,
            })
            const mockRemoveItem = jest.fn((key: string) => {
                if (key === "jeopardy-launch-count") {
                    count = 0
                }
            })
            Object.defineProperty(window.sessionStorage, "removeItem", {
                value: mockRemoveItem,
                writable: true,
            })

            expect(gameLauncher.getJeopardyLaunchCount()).toBe(0)

            for (let i = 1; i <= DEFAULT_RELOAD_THRESHOLD; i++) {
                await gameLauncher.launchGame(mockGame)
                const expected = i === DEFAULT_RELOAD_THRESHOLD ? 0 : i
                expect(gameLauncher.getJeopardyLaunchCount()).toBe(expected)
            }
            expect(gameLauncher.getJeopardyLaunchCount()).toBe(0)
            expect(mockTriggerJeopardyReload).toHaveBeenCalled()
            expect(mockRemoveItem).toHaveBeenCalledWith("jeopardy-launch-count")
        })
    })

    describe("isGameLaunching", () => {
        it("should return false initially", () => {
            const gameLauncher = new GameLauncher(
                mockGameOrchestration,
                mockSetLaunchedGameState,
                mockIsGamePaywallSatisfied
            )
            expect(gameLauncher.isGameLaunching).toBe(false)
        })

        it("should return true during game launch and false after launch completes", async () => {
            const gameLauncher = new GameLauncher(
                mockGameOrchestration,
                mockSetLaunchedGameState,
                mockIsGamePaywallSatisfied
            )

            mockIsGamePaywallSatisfied.mockResolvedValue(true)

            let resolvePromise: (value: any) => void
            const launchPromise: Promise<GameLaunchResponse> = new Promise(
                (resolve) => {
                    resolvePromise = resolve
                }
            )
            mockGameOrchestration.launchGame.mockReturnValue(launchPromise)

            const launchGamePromise = gameLauncher.launchGame(mockGame)

            // wait a tick for the paywall check to complete
            await new Promise((resolve) => setTimeout(resolve, 0))

            expect(gameLauncher.isGameLaunching).toBe(true)

            resolvePromise!({ url: "https://test.com" })
            await launchGamePromise

            expect(gameLauncher.isGameLaunching).toBe(false)
        })

        it("should return false after launch fails", async () => {
            const gameLauncher = new GameLauncher(
                mockGameOrchestration,
                mockSetLaunchedGameState,
                mockIsGamePaywallSatisfied
            )

            mockIsGamePaywallSatisfied.mockResolvedValue(true)

            let rejectPromise: (error: any) => void
            const launchPromise: Promise<GameLaunchResponse> = new Promise(
                (_, reject) => {
                    rejectPromise = reject
                }
            )
            mockGameOrchestration.launchGame.mockReturnValue(launchPromise)

            const launchGamePromise = gameLauncher.launchGame(mockGame)

            // wait a tick for the paywall check to complete
            await new Promise((resolve) => setTimeout(resolve, 0))

            expect(gameLauncher.isGameLaunching).toBe(true)

            rejectPromise!(new Error("Launch failed"))
            await launchGamePromise

            expect(gameLauncher.isGameLaunching).toBe(false)
        })

        it("should return false when paywall blocks launch", async () => {
            const gameLauncher = new GameLauncher(
                mockGameOrchestration,
                mockSetLaunchedGameState,
                mockIsGamePaywallSatisfied
            )
            mockIsGamePaywallSatisfied.mockResolvedValue(false)

            await gameLauncher.launchGame(mockGame)

            expect(gameLauncher.isGameLaunching).toBe(false)
        })
    })

    describe("rate limiting", () => {
        it("should enforce minimum launch interval using DEFAULT_MIN_LAUNCH_INTERVAL_MS", async () => {
            const gameLauncher = new GameLauncher(
                mockGameOrchestration,
                mockSetLaunchedGameState,
                mockIsGamePaywallSatisfied,
                {
                    minLaunchIntervalMs: DEFAULT_MIN_LAUNCH_INTERVAL_MS,
                }
            )

            mockIsGamePaywallSatisfied.mockResolvedValue(true)
            mockGameOrchestration.launchGame.mockResolvedValue(
                mockLaunchResponse
            )

            await gameLauncher.launchGame(mockGame)

            expect(mockGameOrchestration["launchGame"]).toHaveBeenCalledTimes(1)

            await gameLauncher.launchGame(mockGame)

            expect(mockGameOrchestration["launchGame"]).toHaveBeenCalledTimes(1)
            expect(mockLogger["warn"]).toHaveBeenCalledWith(
                expect.stringContaining("Rate limit: Ignoring launch request")
            )
        })

        it("should allow launch after rate limit interval has passed", async () => {
            jest.useFakeTimers()

            const gameLauncher = new GameLauncher(
                mockGameOrchestration,
                mockSetLaunchedGameState,
                mockIsGamePaywallSatisfied,
                {
                    minLaunchIntervalMs: DEFAULT_MIN_LAUNCH_INTERVAL_MS,
                }
            )

            mockIsGamePaywallSatisfied.mockResolvedValue(true)
            mockGameOrchestration.launchGame.mockResolvedValue(
                mockLaunchResponse
            )

            await gameLauncher.launchGame(mockGame)
            expect(mockGameOrchestration["launchGame"]).toHaveBeenCalledTimes(1)

            jest.advanceTimersByTime(DEFAULT_MIN_LAUNCH_INTERVAL_MS)

            await gameLauncher.launchGame(mockGame)
            expect(mockGameOrchestration["launchGame"]).toHaveBeenCalledTimes(2)

            jest.useRealTimers()
        })

        it("should not enforce rate limit when minLaunchIntervalMs is 0", async () => {
            const gameLauncher = new GameLauncher(
                mockGameOrchestration,
                mockSetLaunchedGameState,
                mockIsGamePaywallSatisfied,
                {
                    minLaunchIntervalMs: 0,
                }
            )

            mockIsGamePaywallSatisfied.mockResolvedValue(true)
            mockGameOrchestration.launchGame.mockResolvedValue(
                mockLaunchResponse
            )

            await gameLauncher.launchGame(mockGame)
            await gameLauncher.launchGame(mockGame)
            await gameLauncher.launchGame(mockGame)

            expect(mockGameOrchestration["launchGame"]).toHaveBeenCalledTimes(3)
        })
    })

    describe("circuit breaker", () => {
        it("should activate circuit breaker after DEFAULT_MAX_CONSECUTIVE_FAILURES", async () => {
            const gameLauncher = new GameLauncher(
                mockGameOrchestration,
                mockSetLaunchedGameState,
                mockIsGamePaywallSatisfied,
                {
                    minLaunchIntervalMs: 0,
                    maxConsecutiveFailures: DEFAULT_MAX_CONSECUTIVE_FAILURES,
                }
            )

            mockIsGamePaywallSatisfied.mockResolvedValue(true)
            mockGameOrchestration.launchGame.mockRejectedValue(
                new Error("Launch failed")
            )

            for (let i = 0; i < DEFAULT_MAX_CONSECUTIVE_FAILURES; i++) {
                await gameLauncher.launchGame(mockGame)
            }

            expect(mockGameOrchestration["launchGame"]).toHaveBeenCalledTimes(
                DEFAULT_MAX_CONSECUTIVE_FAILURES
            )
            expect(mockLogger["warn"]).toHaveBeenCalledWith(
                expect.stringContaining("Circuit breaker activated"),
                expect.any(Object)
            )

            await gameLauncher.launchGame(mockGame)

            expect(mockGameOrchestration["launchGame"]).toHaveBeenCalledTimes(
                DEFAULT_MAX_CONSECUTIVE_FAILURES
            )
            expect(mockLogger["warn"]).toHaveBeenCalledWith(
                expect.stringContaining("Circuit breaker active")
            )
        })

        it("should reset circuit breaker after cooldown period using DEFAULT_CIRCUIT_BREAKER_COOLDOWN_MS", async () => {
            jest.useFakeTimers()

            const gameLauncher = new GameLauncher(
                mockGameOrchestration,
                mockSetLaunchedGameState,
                mockIsGamePaywallSatisfied,
                {
                    minLaunchIntervalMs: 0,
                    maxConsecutiveFailures: DEFAULT_MAX_CONSECUTIVE_FAILURES,
                    circuitBreakerCooldownMs:
                        DEFAULT_CIRCUIT_BREAKER_COOLDOWN_MS,
                }
            )

            mockIsGamePaywallSatisfied.mockResolvedValue(true)
            mockGameOrchestration.launchGame.mockRejectedValue(
                new Error("Launch failed")
            )

            for (let i = 0; i < DEFAULT_MAX_CONSECUTIVE_FAILURES; i++) {
                await gameLauncher.launchGame(mockGame)
            }

            await gameLauncher.launchGame(mockGame)
            expect(mockLogger["warn"]).toHaveBeenCalledWith(
                expect.stringContaining("Circuit breaker active")
            )

            jest.advanceTimersByTime(DEFAULT_CIRCUIT_BREAKER_COOLDOWN_MS)

            mockGameOrchestration.launchGame.mockResolvedValue(
                mockLaunchResponse
            )
            await gameLauncher.launchGame(mockGame)

            expect(mockGameOrchestration["launchGame"]).toHaveBeenCalledTimes(
                DEFAULT_MAX_CONSECUTIVE_FAILURES + 1
            )

            jest.useRealTimers()
        })

        it("should reset consecutive failures counter on successful launch", async () => {
            const gameLauncher = new GameLauncher(
                mockGameOrchestration,
                mockSetLaunchedGameState,
                mockIsGamePaywallSatisfied,
                {
                    minLaunchIntervalMs: 0,
                    maxConsecutiveFailures: DEFAULT_MAX_CONSECUTIVE_FAILURES,
                }
            )

            mockIsGamePaywallSatisfied.mockResolvedValue(true)

            mockGameOrchestration.launchGame.mockRejectedValueOnce(
                new Error("Launch failed")
            )
            await gameLauncher.launchGame(mockGame)

            mockGameOrchestration.launchGame.mockRejectedValueOnce(
                new Error("Launch failed")
            )
            await gameLauncher.launchGame(mockGame)

            mockGameOrchestration.launchGame.mockResolvedValueOnce(
                mockLaunchResponse
            )
            await gameLauncher.launchGame(mockGame)

            mockGameOrchestration.launchGame.mockRejectedValue(
                new Error("Launch failed")
            )
            for (let i = 0; i < DEFAULT_MAX_CONSECUTIVE_FAILURES; i++) {
                await gameLauncher.launchGame(mockGame)
            }

            expect(mockLogger["warn"]).toHaveBeenCalledWith(
                expect.stringContaining("Circuit breaker activated"),
                expect.any(Object)
            )
        })

        it("should only block the failing game, not other games", async () => {
            const gameLauncher = new GameLauncher(
                mockGameOrchestration,
                mockSetLaunchedGameState,
                mockIsGamePaywallSatisfied,
                {
                    minLaunchIntervalMs: 0,
                    maxConsecutiveFailures: DEFAULT_MAX_CONSECUTIVE_FAILURES,
                }
            )

            const otherGame: Game = {
                ...mockGame,
                id: "other-game" as GameId,
                title: "Other Game",
            }

            mockIsGamePaywallSatisfied.mockResolvedValue(true)
            mockGameOrchestration.launchGame.mockRejectedValue(
                new Error("Launch failed")
            )

            for (let i = 0; i < DEFAULT_MAX_CONSECUTIVE_FAILURES; i++) {
                await gameLauncher.launchGame(mockGame)
            }

            expect(mockLogger["warn"]).toHaveBeenCalledWith(
                expect.stringContaining("Circuit breaker activated"),
                expect.any(Object)
            )

            mockGameOrchestration.launchGame.mockResolvedValue(
                mockLaunchResponse
            )

            await gameLauncher.launchGame(otherGame)

            expect(mockGameOrchestration["launchGame"]).toHaveBeenCalledTimes(
                DEFAULT_MAX_CONSECUTIVE_FAILURES + 1
            )
            expect(
                mockGameOrchestration["launchGame"]
            ).toHaveBeenLastCalledWith(otherGame.id)
        })

        it("should not reset a game's failures when a different game succeeds", async () => {
            const gameLauncher = new GameLauncher(
                mockGameOrchestration,
                mockSetLaunchedGameState,
                mockIsGamePaywallSatisfied,
                {
                    minLaunchIntervalMs: 0,
                    maxConsecutiveFailures: DEFAULT_MAX_CONSECUTIVE_FAILURES,
                }
            )

            const otherGame: Game = {
                ...mockGame,
                id: "other-game" as GameId,
                title: "Other Game",
            }

            mockIsGamePaywallSatisfied.mockResolvedValue(true)
            mockGameOrchestration.launchGame.mockRejectedValue(
                new Error("Launch failed")
            )

            for (let i = 0; i < DEFAULT_MAX_CONSECUTIVE_FAILURES - 1; i++) {
                await gameLauncher.launchGame(mockGame)
            }

            mockGameOrchestration.launchGame.mockResolvedValueOnce(
                mockLaunchResponse
            )
            await gameLauncher.launchGame(otherGame)

            mockGameOrchestration.launchGame.mockRejectedValue(
                new Error("Launch failed")
            )
            await gameLauncher.launchGame(mockGame)

            expect(mockLogger["warn"]).toHaveBeenCalledWith(
                expect.stringContaining("Circuit breaker activated"),
                expect.any(Object)
            )
        })

        it("should not activate circuit breaker if failures are below threshold", async () => {
            const gameLauncher = new GameLauncher(
                mockGameOrchestration,
                mockSetLaunchedGameState,
                mockIsGamePaywallSatisfied,
                {
                    minLaunchIntervalMs: 0,
                    maxConsecutiveFailures: DEFAULT_MAX_CONSECUTIVE_FAILURES,
                }
            )

            mockIsGamePaywallSatisfied.mockResolvedValue(true)
            mockGameOrchestration.launchGame.mockRejectedValue(
                new Error("Launch failed")
            )

            for (let i = 0; i < DEFAULT_MAX_CONSECUTIVE_FAILURES - 1; i++) {
                await gameLauncher.launchGame(mockGame)
            }

            expect(
                mockLogger["warn"].mock.calls.some(
                    ([message]) =>
                        typeof message === "string" &&
                        message.includes("Circuit breaker activated")
                )
            ).toBe(false)
        })
    })
})
