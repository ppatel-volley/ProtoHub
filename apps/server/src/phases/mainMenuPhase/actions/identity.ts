import type { GameActionContext } from "@volley/vgf/types"

import type { HubState } from "../../../shared"

export const identity = (ctx: GameActionContext<HubState>): HubState => {
    const newState = ctx.party.state

    return newState
}
