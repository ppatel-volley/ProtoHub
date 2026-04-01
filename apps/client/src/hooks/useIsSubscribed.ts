import { useAccount } from "@volley/platform-sdk/react"

import {
    SHOULD_FORCE_WEB_CHECKOUT,
    SHOULD_USE_DEV_UPSELL,
} from "../config/devOverrides"

/**
 * Returns whether the current user is subscribed.
 * Respects dev overrides that force subscription status to false for testing.
 */
export const useIsSubscribed = (): boolean => {
    const { account } = useAccount()

    if (SHOULD_USE_DEV_UPSELL || SHOULD_FORCE_WEB_CHECKOUT) {
        return false
    }

    return account?.isSubscribed ?? false
}
