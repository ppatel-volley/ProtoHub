import type { GameRuleset } from "@volley/vgf/types"

import { mainPhase } from "./phases/mainMenuPhase"
import type { HubState } from "./shared/types"
import { PhaseName } from "./shared/types"
import { setupGameState } from "./utils/setupGame"

/**
 * Hub's VGF game ruleset. Defines a single {@link PhaseName.Main | Main} phase with
 * an `identity` action. The phase never ends (`endIf` always returns false) and
 * loops back to itself.
 *
 * This is intentionally minimal — Hub coordinates multiplayer sessions but
 * delegates actual game logic to individual game servers.
 */
export const hubSession = {
    setup: setupGameState,
    actions: {},
    phases: {
        [PhaseName.Main]: mainPhase,
    },
} as const satisfies GameRuleset<HubState>
