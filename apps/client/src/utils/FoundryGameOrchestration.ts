import type {
    GameExitResponse,
    GameLaunchResponse,
    IGameOrchestration,
} from "@volley/platform-sdk/lib"

import { getCachedPlatform } from "../config/platformDetection"
import { getSafeAreaValues } from "../config/getSafeAreaValues"
import type { Game } from "../hooks/useGames"
import { logger } from "./logger"

/**
 * Game orchestration that supports multiple game sources:
 *
 * - **platform-api**: Delegates to the real Platform SDK orchestration
 * - **crucible/bifrost**: Constructs a direct URL from game.deploymentUrl
 * - **placeholder**: Logs a warning (no launch possible)
 *
 * This replaces OverridenGameOrchestration for Foundry use.
 */
export class FoundryGameOrchestration implements IGameOrchestration {
    constructor(
        private readonly platformOrchestration: IGameOrchestration,
        private readonly hubSessionId: string,
        private readonly gamesByIdFn: () => Map<string, Game>
    ) {}

    public async launchGame(gameId: string): Promise<GameLaunchResponse> {
        const gamesById = this.gamesByIdFn()
        const game = gamesById.get(gameId)

        if (!game) {
            throw new Error(`Game not found: ${gameId}`)
        }

        if (game.source === "crucible" || game.source === "bifrost") {
            return this.launchDirectUrl(game)
        }

        if (game.source === "placeholder") {
            logger.warn(
                `Cannot launch placeholder game: ${gameId}. Configure Registry API or Bifrost API.`
            )
            throw new Error(
                `${game.title} is a placeholder and cannot be launched.`
            )
        }

        // Default: Platform SDK
        return this.platformOrchestration.launchGame(gameId)
    }

    public async exitGame(
        gameId: string,
        sessionId: string
    ): Promise<GameExitResponse> {
        return this.platformOrchestration.exitGame(gameId, sessionId)
    }

    /**
     * For Crucible/Bifrost games: construct the display URL with
     * session, platform, and safe area parameters.
     */
    private launchDirectUrl(game: Game): Promise<GameLaunchResponse> {
        if (!game.deploymentUrl) {
            throw new Error(
                `Game ${game.id} has source "${game.source}" but no deploymentUrl`
            )
        }

        const url = new URL(game.deploymentUrl)
        const params = url.searchParams

        params.set("sessionId", this.hubSessionId)
        params.set("volley_hub_session_id", this.hubSessionId)
        params.set("volley_platform", getCachedPlatform())

        // Inject safe area so games avoid TV overscan
        try {
            const safeArea = getSafeAreaValues()
            if (safeArea) {
                params.set("safeArea", JSON.stringify(safeArea))
            }
        } catch {
            // Safe area is optional — don't block launch
        }

        logger.info(
            `FoundryGameOrchestration - direct URL launch: ${game.id} (${game.source}) → ${url.toString()}`
        )

        return Promise.resolve({ url: url.toString() })
    }
}
