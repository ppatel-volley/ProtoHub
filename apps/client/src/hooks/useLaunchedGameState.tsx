import { useState } from "react"

import type { DurationVitalReference } from "../utils/datadog"
import type { Game } from "./useGames"

export class LaunchedGameState {
    constructor(
        public readonly urlWithSessionId: string,
        public readonly activeGame: Game,
        public readonly launchVitalRef: DurationVitalReference | null
    ) {
        if (
            typeof urlWithSessionId !== "string" ||
            urlWithSessionId.trim() === ""
        ) {
            throw new Error(
                "LaunchedGameState requires urlWithSessionId to be a non-empty string"
            )
        }
    }
}

export const useLaunchedGameState = (): [
    LaunchedGameState | null,
    (state: LaunchedGameState | null) => void,
] => {
    return useState<LaunchedGameState | null>(null)
}
