import type { HubState } from "../shared/types"

/** Creates the initial Hub game state. Called by VGF when a new session is created. */
export const setupGameState = (setupData: Partial<HubState> = {}): HubState => {
    return {
        stateId: 0,
        ...setupData,
    }
}
