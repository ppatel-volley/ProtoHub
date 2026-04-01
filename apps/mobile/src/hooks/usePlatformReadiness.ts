import { usePlatformStatus } from "@volley/platform-sdk/react"
import { useEffect } from "react"

import { logger } from "../utils/logger"

export function usePlatformReadiness(): boolean {
    const platformStatus = usePlatformStatus()

    useEffect(() => {
        if (platformStatus.error) {
            logger.error(
                "Platform status error:",
                platformStatus.error.originalError
            )
        }
    }, [platformStatus.error])

    return platformStatus.isReady
}
