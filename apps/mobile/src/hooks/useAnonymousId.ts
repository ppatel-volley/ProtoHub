import { useAccount } from "@volley/platform-sdk/react"

/**
 * Returns the anonymous ID for device/anonymous user tracking.
 * For authenticated user tracking, use useAccountId instead.
 */
export const useAnonymousId = (): string | undefined => {
    const { account } = useAccount()

    return account?.anonymousId
}
