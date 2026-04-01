// Commented out pending restoration of VGF

// import type { HubRuleset, HubState, PhaseName } from "@hub/server/types"
// import { getVGFHooks } from "@volley/vgf/client"

// /**
//  * NOTE: You should not need to update this file, it's purely to get type safety on the VGF Hooks.
//  */

// type VGFHooks = ReturnType<typeof getVGFHooks<HubRuleset, HubState, PhaseName>>

// type UseDispatchActionHook = VGFHooks["useDispatchAction"]
// type UseStateSyncHook = VGFHooks["useStateSync"]
// type UsePhaseHook = VGFHooks["usePhase"]
// type UseEventsHook = VGFHooks["useEvents"]

// const vgfHooks = getVGFHooks<HubRuleset, HubState, PhaseName>()

// export const useDispatchAction: UseDispatchActionHook =
//     vgfHooks.useDispatchAction
// export const useStateSync: UseStateSyncHook = vgfHooks.useStateSync
// export const usePhase: UsePhaseHook = vgfHooks.usePhase
// export const useEvents: UseEventsHook = vgfHooks.useEvents
