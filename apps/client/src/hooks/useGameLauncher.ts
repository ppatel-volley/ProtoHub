import type { IGameOrchestration } from "@volley/platform-sdk/lib"

import { getCachedPlatform } from "../config/platformDetection"
import { GAME_LAUNCHER_ERROR_DIAGNOSTICS } from "../constants"
import { GameStatus } from "../constants/game"
import { getExperimentManager } from "../experiments/ExperimentManager"
import { ExperimentFlag } from "../experiments/experimentSchemata"
import type { DurationVitalReference } from "../utils/datadog"
import { safeDatadogRum } from "../utils/datadog"
import { getMemoryUsage } from "../utils/getMemoryUsage"
import { logger } from "../utils/logger"
import { type Game, GameId } from "./useGames"
import { triggerJeopardyReload } from "./useIsJeopardyReload"
import { LaunchedGameState } from "./useLaunchedGameState"

export const DEFAULT_MIN_LAUNCH_INTERVAL_MS = 2000
export const DEFAULT_MAX_CONSECUTIVE_FAILURES = 3
export const DEFAULT_CIRCUIT_BREAKER_COOLDOWN_MS = 30000
export const DEFAULT_RELOAD_THRESHOLD = 10

/** Configuration for {@link GameLauncher} safety mechanisms. */
export interface GameLauncherConfig {
    /** Minimum milliseconds between launch attempts. Prevents double-tap launches. Default: 2000ms. */
    minLaunchIntervalMs?: number
    /** Number of consecutive failures before the circuit breaker activates. Default: 3. */
    maxConsecutiveFailures?: number
    /** How long the circuit breaker stays active after tripping, in milliseconds. Default: 30000ms. */
    circuitBreakerCooldownMs?: number
}

/**
 * Orchestrates game launches with built-in safety mechanisms:
 *
 * - **Rate limiting**: Enforces a minimum interval between launches to prevent double-taps
 * - **Circuit breaker**: After N consecutive failures of a specific game, blocks that game for a cooldown period
 * - **Jeopardy reload**: Tracks Jeopardy launches per session and triggers a full page reload
 *   after a configurable threshold to prevent WebAssembly OOM errors
 * - **Paywall enforcement**: Delegates to `isGamePaywallSatisfied` before launching
 * - **Duration vitals**: Reports launch timing to Datadog for performance monitoring
 *
 * @see useIsJeopardyReload for the reload detection mechanism on the receiving end
 */
export class GameLauncher {
    private readonly CIRCUIT_BREAKER_COOLDOWN_MS: number

    private failuresByGame = new Map<
        string,
        { consecutiveFailures: number; circuitBreakerUntil: number }
    >()

    private isLaunching = false

    private readonly JEOPARDY_LAUNCH_COUNT_KEY = "jeopardy-launch-count"

    private lastLaunchTime = 0

    private readonly MAX_CONSECUTIVE_FAILURES: number

    private readonly MIN_LAUNCH_INTERVAL_MS: number

    public get isGameLaunching(): boolean {
        return this.isLaunching
    }

    constructor(
        private readonly gameOrchestration: IGameOrchestration,
        private readonly setLaunchedGameState: (
            state: LaunchedGameState | null
        ) => void,
        private readonly isGamePaywallSatisfied: (
            game: Game
        ) => Promise<boolean>,
        config: GameLauncherConfig = {}
    ) {
        this.MIN_LAUNCH_INTERVAL_MS =
            config.minLaunchIntervalMs ?? DEFAULT_MIN_LAUNCH_INTERVAL_MS
        this.MAX_CONSECUTIVE_FAILURES =
            config.maxConsecutiveFailures ?? DEFAULT_MAX_CONSECUTIVE_FAILURES
        this.CIRCUIT_BREAKER_COOLDOWN_MS =
            config.circuitBreakerCooldownMs ??
            DEFAULT_CIRCUIT_BREAKER_COOLDOWN_MS
        this.resetJeopardyLaunchCount()
    }

    /** Returns the number of Jeopardy launches in the current session without a reload. */
    public getJeopardyLaunchCount(): number {
        return this.getJeopardyLaunchesInSessionWithoutReload()
    }

    public resetJeopardyLaunchCount(): void {
        logger.info("GameLauncher - resetting jeopardy launch count")
        sessionStorage.removeItem(this.JEOPARDY_LAUNCH_COUNT_KEY)
    }

    /**
     * Attempts to launch a game. Applies all safety checks in order:
     * 1. Skip if game is "Coming Soon"
     * 2. Jeopardy: check launch count against reload threshold, reload page if exceeded
     * 3. Circuit breaker: reject if in cooldown
     * 4. Rate limit: reject if too soon after previous launch
     * 5. Paywall: check subscription/payment status
     * 6. Call Platform SDK `gameOrchestration.launchGame()`
     * 7. On success: update launched game state, reset failure counter
     * 8. On failure: log diagnostics, increment failure counter, maybe trip circuit breaker
     */
    public async launchGame(game: Game): Promise<void> {
        if (game.status === GameStatus.ComingSoon) {
            return
        }

        logger.info(`GameLauncher - launching game: ${game.id} (${game.title})`)

        if (game.id === GameId.Jeopardy) {
            const memoryBefore = getMemoryUsage()
            if (memoryBefore) {
                logger.info(
                    `GameLauncher - memory before Jeopardy launch: ${memoryBefore.used}MB/${memoryBefore.limit}MB (${memoryBefore.percentage}%)`
                )
            }

            const currentCount =
                this.getJeopardyLaunchesInSessionWithoutReload()
            logger.info(
                `GameLauncher - jeopardyLaunchesInSessionWithoutReload: ${currentCount}`
            )
            const newCount = currentCount + 1
            const reloadThreshold = this.getJeopardyReloadThreshold()
            this.setJeopardyLaunchesInSessionWithoutReload(newCount)

            if (newCount >= reloadThreshold) {
                logger.info(
                    `GameLauncher - ${reloadThreshold} consecutive jeopardy launches detected, reloading page to prevent OOM WASM error`
                )

                this.resetJeopardyLaunchCount()
                triggerJeopardyReload()
                return
            }
        }

        const now = Date.now()

        const gameFailures = this.failuresByGame.get(game.id)
        if (gameFailures && now < gameFailures.circuitBreakerUntil) {
            const remainingSeconds = Math.ceil(
                (gameFailures.circuitBreakerUntil - now) / 1000
            )
            logger.warn(
                `GameLauncher - Circuit breaker active for ${game.id}. Too many consecutive failures. Try again in ${remainingSeconds}s`
            )
            return
        }

        const timeSinceLastLaunch = now - this.lastLaunchTime
        if (
            this.lastLaunchTime > 0 &&
            timeSinceLastLaunch < this.MIN_LAUNCH_INTERVAL_MS
        ) {
            const remainingMs =
                this.MIN_LAUNCH_INTERVAL_MS - timeSinceLastLaunch
            logger.warn(
                `GameLauncher - Rate limit: Ignoring launch request. Min interval: ${this.MIN_LAUNCH_INTERVAL_MS}ms, time since last: ${timeSinceLastLaunch}ms, wait ${remainingMs}ms`
            )
            return
        }

        const shouldLaunchGame = await this.isGamePaywallSatisfied(game)
        if (!shouldLaunchGame) {
            logger.info(
                "GameLauncher - Game launch blocked by paywall requirements"
            )
            return
        }
        this.lastLaunchTime = now

        this.isLaunching = true

        let launchVitalRef: DurationVitalReference | null = null

        launchVitalRef = safeDatadogRum.startDurationVital("launchGame", {
            context: {
                gameId: game.id,
            },
            description: "Time from game launch initated to game ready",
        })

        try {
            logger.info(
                `GameLauncher - launching game: ${game.id} (${game.title})`
            )
            const response = await this.gameOrchestration.launchGame(game.id)

            if (!response.url || response.url.trim() === "") {
                throw new Error("Invalid game launch response: empty URL")
            }

            logger.info(`GameLauncher - launchGame response: ${response.url}`)

            this.setLaunchedGameState(
                new LaunchedGameState(response.url, game, launchVitalRef)
            )

            this.failuresByGame.delete(game.id)
        } catch (error) {
            const diagnostics = this.extractErrorDiagnostics(
                error,
                this.lastLaunchTime
            )
            logger.error(
                "Error - GameLauncher - Request aborted or failed",
                error,
                diagnostics
            )

            if (launchVitalRef) {
                safeDatadogRum.stopDurationVital(launchVitalRef, {
                    context: {
                        status: "error",
                        error: error as Error,
                        ...diagnostics,
                    },
                })
            }

            this.setLaunchedGameState(null)

            const entry = this.failuresByGame.get(game.id) ?? {
                consecutiveFailures: 0,
                circuitBreakerUntil: 0,
            }
            entry.consecutiveFailures++
            if (entry.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
                entry.circuitBreakerUntil =
                    Date.now() + this.CIRCUIT_BREAKER_COOLDOWN_MS
                logger.warn(
                    `GameLauncher - Circuit breaker activated for ${game.id} after ${entry.consecutiveFailures} consecutive failures. Cooldown for ${this.CIRCUIT_BREAKER_COOLDOWN_MS}ms`,
                    diagnostics
                )
            }
            this.failuresByGame.set(game.id, entry)
        } finally {
            this.isLaunching = false
        }
    }

    private getJeopardyReloadThreshold(): number {
        try {
            const variant = getExperimentManager().getVariant(
                ExperimentFlag.JeopardyReloadThreshold
            )

            if (
                variant?.payload?.launchesBeforeReload !== undefined &&
                variant.payload.launchesBeforeReload >= 0
            ) {
                logger.info(
                    `GameLauncher - using experiment reload threshold from payload: ${variant.payload.launchesBeforeReload}`
                )
                return variant.payload.launchesBeforeReload
            }
        } catch (_error) {
            logger.warn(
                "GameLauncher - experiment variant not available or invalid, using default threshold"
            )
        }

        const defaultThreshold = DEFAULT_RELOAD_THRESHOLD
        logger.info(
            `GameLauncher - using default reload threshold: ${defaultThreshold}`
        )
        return defaultThreshold
    }

    private getJeopardyLaunchesInSessionWithoutReload(): number {
        const count = sessionStorage.getItem(this.JEOPARDY_LAUNCH_COUNT_KEY)
        return count ? parseInt(count, 10) : 0
    }

    private setJeopardyLaunchesInSessionWithoutReload(count: number): void {
        sessionStorage.setItem(this.JEOPARDY_LAUNCH_COUNT_KEY, count.toString())
    }

    /**
     * Capture error classification (AbortError vs network errors), timing information, platform
     * details, and user agent data. This helps identify if issues are user-initiated (navigation),
     * network-related, or timeout-related, particularly for platform-specific problems like FireTV
     * connectivity.
     */
    private extractErrorDiagnostics(
        error: unknown,
        launchStartTime: number
    ): Record<string, unknown> {
        const now = Date.now()
        const latencyMs = now - launchStartTime
        const errorObj =
            error instanceof Error ? error : new Error(String(error))

        const errorName = errorObj.name || "Unknown"
        const errorMessage = errorObj.message || ""
        const isAbortError = errorName === "AbortError"

        const userAgent = navigator.userAgent
        const platform = getCachedPlatform()
        const errorCategory = this.categorizeErrorCause(
            isAbortError,
            errorName,
            latencyMs
        )

        return {
            errorType: errorName,
            errorMessage,
            isAbortError,
            errorCategory,
            latencyMs,
            launchStartTime,
            platform: platform?.toString(),
            userAgent,
            timestamp: new Date().toISOString(),
        }
    }

    /**
     * Categorize the likely cause of a launch error based on error type and latency.
     * Uses heuristics to distinguish between user-initiated navigation, network failures,
     * and request timeouts.
     *
     * @param isAbortError - Whether the error is an AbortError
     * @param errorType - The error name/type
     * @param latencyMs - Time elapsed from launch start to error
     * @returns One of: "userNavigation", "networkError", "timeout", or "unknown"
     */
    private categorizeErrorCause(
        isAbortError: boolean,
        errorType: string,
        latencyMs: number
    ): string {
        if (isAbortError) {
            if (
                latencyMs <
                GAME_LAUNCHER_ERROR_DIAGNOSTICS.ERROR_LATENCY_USER_NAVIGATION_THRESHOLD_MS
            ) {
                return GAME_LAUNCHER_ERROR_DIAGNOSTICS.ERROR_CATEGORY_USER_NAVIGATION
            }
            if (
                latencyMs >
                GAME_LAUNCHER_ERROR_DIAGNOSTICS.ERROR_LATENCY_TIMEOUT_THRESHOLD_MS
            ) {
                return GAME_LAUNCHER_ERROR_DIAGNOSTICS.ERROR_CATEGORY_TIMEOUT
            }
        }

        if (errorType.includes("AxiosError")) {
            return GAME_LAUNCHER_ERROR_DIAGNOSTICS.ERROR_CATEGORY_NETWORK_ERROR
        }

        return GAME_LAUNCHER_ERROR_DIAGNOSTICS.ERROR_CATEGORY_UNKNOWN
    }
}
