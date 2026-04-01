import type { GameActionContext, Phase } from "@volley/vgf/types"

import type { HubState } from "../../shared/types"
import { PhaseName } from "../../shared/types"
import { identity } from "./actions"

/**
 * The sole VGF phase for Hub. Contains a single `identity` action and never terminates.
 * This phase exists to satisfy VGF's phase-based architecture while keeping Hub's
 * server as thin as possible.
 */
export const mainPhase = {
    actions: {
        identity: {
            action: identity,
        },
    },
    endIf: (_: GameActionContext<HubState>) => false,
    next: PhaseName.Main,
} as const satisfies Phase<HubState>
