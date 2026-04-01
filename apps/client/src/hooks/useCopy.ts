import { useSyncExternalStore } from "react"

import { type CopyKey, getCopy, subscribeToBrand } from "../config/branding"

/**
 * React hook that returns branded copy for the given key,
 * reactive to brand changes from experiment initialization or pre-auth resolution.
 */
export function useCopy(key: CopyKey): string {
    return useSyncExternalStore(subscribeToBrand, () => getCopy(key))
}
