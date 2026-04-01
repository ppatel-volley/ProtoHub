import { Platform } from "@volley/platform-sdk/lib"
import { useDeviceInfo } from "@volley/platform-sdk/react"
import { useEffect, useState } from "react"

import {
    BASE_URL,
    ENVIRONMENT,
    EXPERIMENT_ASSETS_CDN_URL,
} from "../config/envconfig"
import { Environment } from "../config/environment"
import {
    getCachedPlatform,
    isLGOrSamsungTV,
    isLGTV,
    isSamsungTV,
    shouldUseWebCheckout,
} from "../config/platformDetection"
import { GameId, GameStatus, PaywallType } from "../constants/game"
import { getExperimentManager } from "../experiments/ExperimentManager"
import type { ValidatedGameOrderVariant } from "../experiments/experimentSchemata"
import {
    ExperimentFlag,
    PAYLOAD_NONE_VALUE,
} from "../experiments/experimentSchemata"
import { logger } from "../utils/logger"

export { GameId, GameStatus, PaywallType }

/**
 * An object representing a game, with various properties related to
 * the display and launch of the game.
 */
export interface Game {
    id: GameId
    trackingId:
        | "hub"
        | "jeopardy"
        | "song quiz"
        | "cocomelon"
        | "wheel of fortune"
        | "wits end"
    title: string
    tileImageUrl: string
    /**
     * The URL of the game's hero image (shown fullscreen when hovering over the tile).
     */
    heroImageUrl: string
    /**
     * The URL of the game's video (shown fullscreen when hovering over the tile).
     */
    videoUrl?: string
    /**
     * The URL of the game's tile animation (shown when the tile is focused).
     */
    animationUri?: string
    status?: GameStatus
    paywallType: PaywallType
}

const FIRE_WEB_GAME_ORDER: GameId[] = [
    GameId.Jeopardy,
    GameId.SongQuiz,
    GameId.CoComelon,
    GameId.WheelOfFortune,
    GameId.WitsEnd,
]

const LG_SAMSUNG_GAME_ORDER: GameId[] = [
    GameId.SongQuiz,
    GameId.Jeopardy,
    GameId.CoComelon,
    GameId.WheelOfFortune,
    GameId.WitsEnd,
]

const PLATFORM_GAME_ORDERS: Record<Platform, GameId[]> = {
    [Platform.FireTV]: FIRE_WEB_GAME_ORDER,
    [Platform.Web]: FIRE_WEB_GAME_ORDER,
    [Platform.Mobile]: FIRE_WEB_GAME_ORDER,
    [Platform.LGTV]: LG_SAMSUNG_GAME_ORDER,
    [Platform.SamsungTV]: LG_SAMSUNG_GAME_ORDER,
}

const LEGACY_SAMSUNG_OS_VERSIONS = ["5.5", "6.0"]
const LEGACY_LG_OS_VERSIONS = ["6.0"]

const isLegacyPlatformForCoComelon = (
    osVersion: string | undefined
): boolean => {
    const isLegacySamsung =
        isSamsungTV() && LEGACY_SAMSUNG_OS_VERSIONS.includes(osVersion ?? "")
    const isLegacyLG =
        isLGTV() && LEGACY_LG_OS_VERSIONS.includes(osVersion ?? "")
    return isLegacySamsung || isLegacyLG
}

/**
 * Returns the default game order for the current platform,
 * excluding games not supported on the current environment or OS version.
 * Experiment overrides bypass these exclusions.
 * Exported for testing purposes.
 */
export const getDefaultGameOrder = (
    osVersion?: string,
    environment: Environment = ENVIRONMENT
): GameId[] => {
    const order = isLGOrSamsungTV()
        ? PLATFORM_GAME_ORDERS[Platform.LGTV]
        : PLATFORM_GAME_ORDERS[getCachedPlatform()]

    const excluded = new Set<GameId>()

    if (environment === Environment.PRODUCTION) {
        // excluded.add(GameId.WitsEnd)
    }

    if (isLegacyPlatformForCoComelon(osVersion)) {
        excluded.add(GameId.CoComelon)
    }

    return excluded.size > 0 ? order.filter((id) => !excluded.has(id)) : order
}

const BASE_GAMES: Partial<Record<GameId, Game>> = {
    [GameId.Jeopardy]: {
        id: GameId.Jeopardy,
        trackingId: "jeopardy",
        title: "Jeopardy",
        tileImageUrl: `${BASE_URL}assets/images/games/tiles/jeopardy.avif`,
        heroImageUrl: `${BASE_URL}assets/images/games/heroes/jeopardy.avif`,
        animationUri: `${BASE_URL}assets/images/games/animations/jeopardy.webp`,
        paywallType: PaywallType.Soft,
    },
    [GameId.SongQuiz]: {
        id: GameId.SongQuiz,
        trackingId: "song quiz",
        title: "Song Quiz",
        tileImageUrl: `${BASE_URL}assets/images/games/tiles/song-quiz.avif`,
        heroImageUrl: `${BASE_URL}assets/images/games/heroes/song-quiz.avif`,
        animationUri: `${BASE_URL}assets/images/games/animations/song-quiz.webp`,
        paywallType: PaywallType.Soft,
    },
    [GameId.CoComelon]: {
        id: GameId.CoComelon,
        trackingId: "cocomelon",
        title: "CoComelon",
        tileImageUrl: `${BASE_URL}assets/images/games/tiles/ccm.avif`,
        heroImageUrl: `${BASE_URL}assets/images/games/heroes/ccm.avif`,
        animationUri: `${BASE_URL}assets/images/games/animations/ccm.webp`,
        paywallType: PaywallType.Hard,
    },
    [GameId.WheelOfFortune]: {
        id: GameId.WheelOfFortune,
        trackingId: "wheel of fortune",
        title: "Wheel of Fortune",
        tileImageUrl: `${BASE_URL}assets/images/games/tiles/wof.avif`,
        heroImageUrl: `${BASE_URL}assets/images/games/heroes/wof.avif`,
        status: GameStatus.ComingSoon,
        paywallType: PaywallType.Soft,
    },
    [GameId.WitsEnd]: {
        id: GameId.WitsEnd,
        trackingId: "wits end",
        title: "Wit's End",
        tileImageUrl: `${BASE_URL}assets/images/games/tiles/wits-end.webp`,
        heroImageUrl: `${BASE_URL}assets/images/games/heroes/wits-end-static.webp`,
        status: GameStatus.Beta,
        paywallType: PaywallType.Hard,
    },
}

const GAME_SET = new Set(Object.values(GameId))

/**
 * Extracts game IDs from a game order variant payload.
 * @param payload - The payload to extract game IDs from.
 * @returns The game IDs extracted from the payload.
 */
const extractGameIds = (payload: GameId[] | undefined): GameId[] => {
    if (Array.isArray(payload)) {
        return payload.filter((gameId) => {
            return typeof gameId === "string" && GAME_SET.has(gameId)
        })
    }
    return []
}

/**
 * Retrieves a game list from a game order variant.
 * @param gamesOrderVariant - The game order variant to retrieve the game list from.
 * @returns The game list extracted from the game order variant.
 */
const getGameList = (
    gamesOrderVariant: ValidatedGameOrderVariant | undefined,
    osVersion?: string,
    environment?: Environment
): GameId[] => {
    if (!gamesOrderVariant || !Array.isArray(gamesOrderVariant.payload)) {
        return getDefaultGameOrder(osVersion, environment)
    }
    return extractGameIds(gamesOrderVariant.payload)
}

/**
 * Validates an image URL by attempting to load it.
 * @param url - The URL of the image to validate.
 * @param signal - An optional AbortSignal to cancel the request.
 * @returns A boolean indicating whether the image is valid.
 */
const validateImage = async (
    url: string,
    signal: AbortSignal
): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
        let settled = false
        const img = new Image()

        const onLoad = (): void => {
            if (settled) return
            settled = true
            cleanup()
            resolve(true)
        }

        const onError = (): void => {
            if (settled) return
            settled = true
            cleanup()
            logger.warn(`Failed to validate image ${url}`)
            resolve(false)
        }

        const onAbort = (): void => {
            if (settled) return
            settled = true
            cleanup()
            resolve(false)
        }

        const cleanup = (): void => {
            img.removeEventListener("load", onLoad)
            img.removeEventListener("error", onError)
            signal.removeEventListener("abort", onAbort)
            img.src = ""
        }

        img.addEventListener("load", onLoad)
        img.addEventListener("error", onError)
        signal.addEventListener("abort", onAbort)

        if (signal.aborted) {
            onAbort()
            return
        }

        img.src = url
    })
}

/**
 * Validates a video URL by fetching it with a HEAD request.
 * @param url - The URL of the video to validate.
 * @param signal - An optional AbortSignal to cancel the request.
 * @returns A boolean indicating whether the video is valid.
 */
const validateVideo = async (
    url: string,
    signal: AbortSignal
): Promise<boolean> => {
    try {
        await fetch(url, {
            method: "HEAD",
            signal,
            mode: "no-cors",
        })
        return true
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            logger.info(
                `Video validation aborted for ${url}: ${
                    error.message || "No reason provided"
                }`
            )
            return false
        }
        if (error instanceof Error) {
            logger.warn(`Failed to validate video ${url}:`, error)
        } else {
            logger.warn(`Failed to validate video ${url}:`, {
                error: String(error),
            })
        }
        return false
    }
}

/**
 * Retrieves a game payload override from the experiment manager.
 * @param experimentManager - The experiment manager to retrieve the override from.
 * @param gameId - The ID of the game to retrieve the override for.
 * @returns The game payload override, or null if no override is found.
 */
const getGamePayloadOverride = (
    experimentManager: ReturnType<typeof getExperimentManager>,
    gameId: GameId
): Game | null => {
    let flag: ExperimentFlag
    switch (gameId) {
        case GameId.Jeopardy:
            flag = ExperimentFlag.JeopardyPayloadSwap
            break
        case GameId.SongQuiz:
            flag = ExperimentFlag.SongQuizPayloadSwap
            break
        case GameId.CoComelon:
            flag = ExperimentFlag.CoComelonPayloadSwap
            break
        case GameId.WheelOfFortune:
            flag = ExperimentFlag.WheelOfFortunePayloadSwap
            break
        case GameId.WitsEnd:
            flag = ExperimentFlag.WitsEndPayloadSwap
            break
    }

    const variant = experimentManager.getVariant(flag)

    if (!variant?.payload) {
        return null
    }

    const processedPayload = Object.fromEntries(
        Object.entries(variant?.payload).map(([key, value]) => {
            // "none" is used as a sentinel to explicitly disable optional properties
            // (status, videoUrl, animationUri), since Amplitude doesn't send down undefined values.
            //
            // however,paywallType "none" is a valid enum value meaning "no paywall",
            // not a sentinel, and we need to preserve it.
            const isNoneSentinel =
                value === false || value === PAYLOAD_NONE_VALUE
            const isPaywallTypeNone = key === "paywallType" && value === "none"
            if (isNoneSentinel && !isPaywallTypeNone) {
                return [key, undefined]
            }

            if (
                typeof value === "string" &&
                value.includes("volley-assets-public.s3") &&
                value.includes("hub-experiment-overrides/")
            ) {
                const pathMatch = value.match(/hub-experiment-overrides\/(.+)$/)
                if (pathMatch) {
                    const cdnUrl = `${EXPERIMENT_ASSETS_CDN_URL}/hub-experiment-overrides/${pathMatch[1]}`
                    logger.info(
                        `Experiment Asset Override for ${gameId} - ${cdnUrl}`
                    )
                    return [key, cdnUrl]
                }
            }

            return [key, value]
        })
    )

    const baseGame = BASE_GAMES[gameId]

    return baseGame
        ? {
              ...baseGame,
              ...processedPayload,
          }
        : null
}

/**
 * A type representing a validatable property of a game.
 */
type ValidatableProperty = {
    key: "tileImageUrl" | "heroImageUrl" | "videoUrl"
    validate: (value: string, signal: AbortSignal) => Promise<boolean>
}

/**
 * A list of validatable properties of a game.
 */
const PROPERTIES_TO_VALIDATE: ValidatableProperty[] = [
    { key: "tileImageUrl", validate: validateImage },
    { key: "heroImageUrl", validate: validateImage },
    { key: "videoUrl", validate: validateVideo },
]

/**
 * Validates the properties of a game.
 * If the property is not valid, it will be replaced with the default value.
 * @param game - The game to validate.
 * @param signal - An optional AbortSignal to cancel the request.
 * @returns The validated game.
 */
const validateGameProperties = async (
    game: Game,
    signal: AbortSignal
): Promise<Game> => {
    const baseGame = BASE_GAMES[game.id]

    const updates: Partial<Game> = {}

    for (const { key, validate } of PROPERTIES_TO_VALIDATE) {
        const newValue = game[key]
        const defaultValue = baseGame?.[key]

        if (newValue && newValue !== defaultValue) {
            const isValid = await validate(newValue, signal)
            if (!isValid) {
                updates[key] = defaultValue
            }
        }
    }

    return Object.keys(updates).length > 0 ? { ...game, ...updates } : game
}

/**
 * Applies platform-specific paywall rules to games.
 * @param games - The games to process.
 * @returns The games with platform-specific paywall types applied.
 */
const applyPlatformPaywallRules = (games: Game[]): Game[] => {
    const useHardPaywalls = shouldUseWebCheckout()

    if (!useHardPaywalls) {
        return games
    }

    return games.map((game) => ({
        ...game,
        paywallType:
            game.paywallType === PaywallType.Soft
                ? PaywallType.Hard
                : game.paywallType,
    }))
}

/**
 * Retrieves games from experiments.
 * @param experimentManager - The experiment manager to retrieve the games from.
 * @returns The games list as specified by the experiments.
 */
const getGamesFromExperiments = (
    experimentManager: ReturnType<typeof getExperimentManager>,
    osVersion?: string,
    environment?: Environment
): Game[] => {
    try {
        const gamesOrderVariant = experimentManager.getVariant(
            ExperimentFlag.ReorderMpTiles
        )
        const gameIds = getGameList(gamesOrderVariant, osVersion, environment)

        const games = gameIds
            .map((gameId) => {
                const overridePayload = getGamePayloadOverride(
                    experimentManager,
                    gameId
                )
                return overridePayload || BASE_GAMES[gameId]
            })
            .filter((game): game is Game => game !== undefined)

        return applyPlatformPaywallRules(games)
    } catch (_error) {
        logger.warn("No games order variant found, using default game list")
        const games = getDefaultGameOrder(osVersion, environment)
            .map((gameId) => BASE_GAMES[gameId])
            .filter((game): game is Game => game !== undefined)
        return applyPlatformPaywallRules(games)
    }
}

/**
 * Provides the ordered list of games for the carousel, driven by experiment configuration
 * and platform-specific rules.
 *
 * Flow:
 * 1. Waits for `ExperimentManager` to initialize (returns `[]` until then)
 * 2. Reads game order from `ReorderMpTiles` experiment, falling back to platform defaults
 * 3. Applies per-game payload overrides (tile images, hero images, status, paywall type)
 * 4. Filters games by platform (e.g. CoComelon excluded on legacy Samsung OS)
 * 5. Applies platform paywall rules (web checkout platforms use hard paywalls)
 * 6. Validates experiment-overridden asset URLs asynchronously, reverting to defaults on failure
 *
 * @returns Ordered array of {@link Game} objects, or `[]` before initialization
 */
export const useGames = (): Game[] => {
    const [games, setGames] = useState<Game[]>([])
    const [isInitialized, setIsInitialized] = useState(false)
    const deviceInfo = useDeviceInfo()
    const osVersion = deviceInfo.getOSVersion()

    useEffect(() => {
        const experimentManager = getExperimentManager()
        let mounted = true
        const controller = new AbortController()

        const cleanup = experimentManager.onInitialized(() => {
            const updatedGames = getGamesFromExperiments(
                experimentManager,
                osVersion
            )

            if (mounted) {
                setGames(updatedGames)
                setIsInitialized(true)
            }

            // Validate games asynchronously
            const validateGames = async (): Promise<void> => {
                try {
                    const validatedGames = await Promise.all(
                        updatedGames.map((game) =>
                            validateGameProperties(game, controller.signal)
                        )
                    )
                    if (mounted) {
                        // Only update if any validation failed
                        const hasChanges = validatedGames.some(
                            (validatedGame, index) => {
                                const originalGame = updatedGames[index]
                                if (!originalGame) return false
                                return (
                                    validatedGame.tileImageUrl !==
                                        originalGame.tileImageUrl ||
                                    validatedGame.heroImageUrl !==
                                        originalGame.heroImageUrl ||
                                    validatedGame.videoUrl !==
                                        originalGame.videoUrl
                                )
                            }
                        )
                        if (hasChanges) {
                            setGames(validatedGames)
                        }
                    }
                } catch (error) {
                    if (error instanceof Error && error.name === "AbortError") {
                        return
                    }
                    logger.error("Failed to validate game properties", error)
                }
            }

            void validateGames()
        })

        return (): void => {
            mounted = false
            controller.abort("useGames cleanup: component unmounting")
            cleanup()
        }
    }, [osVersion])

    // Return empty array until experiment manager is initialized
    if (!isInitialized) {
        return []
    }

    return games
}
