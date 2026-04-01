import type {
    GameExitResponse,
    GameLaunchResponse,
    IGameOrchestration,
} from "@volley/platform-sdk/lib"

import { getCachedPlatform } from "../config/platformDetection"

export class OverridenGameOrchestration implements IGameOrchestration {
    constructor(private readonly hubSessionId: string) {}

    public launchGame(gameId: string): Promise<GameLaunchResponse> {
        const urlParams = new URLSearchParams(window.location.search)
        const encodedUrl = urlParams.get(gameId)

        if (!encodedUrl) {
            throw new Error(`Encoded URL not found for ${gameId}`)
        }

        const url = decodeURIComponent(encodedUrl)

        const urlObj = new URL(url)
        const params = new URLSearchParams(urlObj.search)

        // Not ideal! We should use the platform-sdk to get the platform and hub session id constants, but the platform-sdk does not export these and I don't have time to open PRs all over town.
        params.set("volley_platform", getCachedPlatform())
        params.set("volley_hub_session_id", this.hubSessionId)

        urlObj.search = params.toString()

        return Promise.resolve({ url: urlObj.toString() })
    }

    // No-op, this class is only to be used in testing/development,
    // no need to worry about exiting the game
    public exitGame(): Promise<GameExitResponse> {
        return Promise.resolve({ success: true })
    }
}
