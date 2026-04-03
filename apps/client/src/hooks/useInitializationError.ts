import type { Account } from "@volley/platform-sdk/lib"
import { usePlatformStatus } from "@volley/platform-sdk/react"
import { useMemo } from "react"

import { SHOULD_FORCE_PLATFORM_ERROR } from "../config/devOverrides"
import { isMobile } from "../config/platformDetection"
import type { InitializationError } from "./useFailedInitializationModal"

interface UseInitializationErrorParams {
    platformInitializationError: string | null
    account: Account | null
}

/** Derives a single InitializationError from platform status, device auth, and anonymous ID. Returns null when no error. Supports dev override for testing. */
export const useInitializationError = ({
    platformInitializationError,
    account,
}: UseInitializationErrorParams): InitializationError | null => {
    const platformStatus = usePlatformStatus()

    return useMemo((): InitializationError | null => {
        if (SHOULD_FORCE_PLATFORM_ERROR) {
            return {
                type: "TEST_ERROR",
                message: "TEST_ERROR",
                trigger: "dev_override",
                context: "dev_override",
            }
        }

        if (platformInitializationError) {
            return {
                type: "DEVICE_AUTH_ERROR",
                message: platformInitializationError,
                trigger: "device_auth_error",
                context: "device_auth_initialization",
            }
        }

        // Foundry: treat platform errors as non-fatal.
        // The game carousel works without full platform auth.
        // On Fire TV via VWR, auth-dev.volley.tv returns 401 which
        // causes a platform error — but the app should still render.
        if (platformStatus.error) {
            console.warn("Platform init error (non-fatal):", platformStatus.error.message)
        }

        if (account && !account.anonymousId && !isMobile()) {
            return {
                type: "ANONYMOUS_ID_ERROR",
                message: "Missing anonymous ID for experiment cohorting",
                trigger: "experiment_identity_error",
                context: "experiment_identity_initialization",
            }
        }

        return null
    }, [platformStatus.error, platformInitializationError, account])
}
