import { useSyncExternalStore } from "react"

import { type AssetKey, getAsset, subscribeToBrand } from "../config/branding"

/**
 * React hook that returns a branded asset path for the given key,
 * reactive to brand changes from experiment initialization or pre-auth resolution.
 */
export function useAsset(key: AssetKey): string {
    return useSyncExternalStore(subscribeToBrand, () => getAsset(key))
}
