import { useAccount } from "@volley/platform-sdk/react"

/**
 * Returns the authenticated user account ID.
 * This will be undefined for unauthenticated/anonymous users.
 * For device/anonymous tracking, use useDeviceId instead.
 */
export const useAccountId = (): string | undefined => {
    const { account } = useAccount()

    return account?.id
}
