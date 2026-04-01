import type {
    SubscribeOptions,
    SubscriptionFlowResult,
} from "@volley/platform-sdk/lib"
import { usePayments } from "@volley/platform-sdk/react"

import type { ExtendedSubscribeOptions } from "../components/WebCheckoutModal/webCheckoutModalConfig"
import {
    SHOULD_FORCE_WEB_CHECKOUT,
    SHOULD_USE_DEV_UPSELL,
} from "../config/devOverrides"
import { shouldUseWebCheckout } from "../config/platformDetection"
import { useDevUpsell } from "./useDevUpsell"
import { useWebCheckoutUpsell } from "./useWebCheckoutUpsell"

interface UpsellHook {
    subscribe: (
        options: ExtendedSubscribeOptions
    ) => Promise<{ status: SubscriptionFlowResult }>
}

const extractBaseOptions = (
    options: ExtendedSubscribeOptions
): SubscribeOptions => {
    const { upsellContext: _upsellContext, ...baseOptions } = options
    return baseOptions
}

const useSafeWebCheckoutUpsell = (): UpsellHook | null => {
    try {
        return useWebCheckoutUpsell()
    } catch {
        return null
    }
}

const useSafeDevUpsell = (): {
    subscribe: (
        options: SubscribeOptions
    ) => Promise<{ status: SubscriptionFlowResult }>
} | null => {
    try {
        return useDevUpsell()
    } catch {
        return null
    }
}

/**
 * Unified subscription upsell hook that selects the appropriate payment provider
 * based on platform and dev overrides.
 *
 * Provider selection:
 * - Web checkout platforms (LG, Samsung, Web) or `SHOULD_FORCE_WEB_CHECKOUT` → {@link useWebCheckoutUpsell}
 * - Dev mode with `SHOULD_USE_DEV_UPSELL` → {@link useDevUpsell} (mock modal for testing)
 * - All other platforms → Platform SDK's native `usePayments()`
 *
 * Wraps all providers behind a common `subscribe(options)` interface so callers
 * don't need to know which payment flow is active.
 */
export const useUpsell = (): UpsellHook => {
    const originalPayments = usePayments()
    const webCheckoutUpsell = useSafeWebCheckoutUpsell()
    const devUpsell = useSafeDevUpsell()

    const shouldUseWebCheckoutPayments =
        shouldUseWebCheckout() || SHOULD_FORCE_WEB_CHECKOUT

    if (shouldUseWebCheckoutPayments && webCheckoutUpsell) {
        return webCheckoutUpsell
    }

    const wrappedPayments: UpsellHook = {
        subscribe: (options: ExtendedSubscribeOptions) => {
            const baseOptions = extractBaseOptions(options)
            const provider =
                SHOULD_USE_DEV_UPSELL && devUpsell
                    ? devUpsell
                    : originalPayments
            return provider.subscribe(baseOptions)
        },
    }

    return wrappedPayments
}
