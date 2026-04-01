import { useSyncExternalStore } from "react"

import {
    type Brand,
    getActiveBrand,
    isWeekendRebrandActive,
    subscribeToBrand,
} from "../config/branding"

interface UseBrandingReturn {
    brand: Brand
    weekendRebrandActive: boolean
}

/**
 * React hook that provides branding state reactive to experiment initialization
 * and pre-auth brand resolution.
 */
export function useBranding(): UseBrandingReturn {
    const brand = useSyncExternalStore(subscribeToBrand, getActiveBrand)
    const weekendRebrandActive = useSyncExternalStore(
        subscribeToBrand,
        isWeekendRebrandActive
    )

    return {
        brand,
        weekendRebrandActive,
    }
}
