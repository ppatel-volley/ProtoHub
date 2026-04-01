import { useAccount, useTracking } from "@volley/platform-sdk/react"
import { useEffect, useRef, useState } from "react"

import {
    createExperimentIdentity,
    getExperimentManager,
} from "../experiments/ExperimentManager"
import { logger } from "../utils/logger"
import { useAccountId } from "./useAccountId"
import { useAnonymousId } from "./useAnonymousId"
import { usePlatformReadiness } from "./usePlatformReadiness"

interface UseExperimentInitReturn {
    experimentsReady: boolean
}

export function useExperimentInit(): UseExperimentInitReturn {
    const [experimentsReady, setExperimentsReady] = useState(false)
    const experimentsInitializedRef = useRef(false)

    const anonymousId = useAnonymousId()
    const accountId = useAccountId()
    const { account } = useAccount()
    const isPlatformReady = usePlatformReadiness()
    const tracking = useTracking()

    useEffect(() => {
        if (experimentsInitializedRef.current) return

        const identity = createExperimentIdentity(anonymousId, accountId)

        if (identity && isPlatformReady) {
            experimentsInitializedRef.current = true

            const manager = getExperimentManager()
            manager.onInitialized(() => {
                setExperimentsReady(true)
            })

            const userProperties = tracking.getBaseUserProperties()
            manager
                .initialize(identity, userProperties)
                .catch((error: unknown) =>
                    logger.error(
                        "Failed to initialize experiment manager",
                        error
                    )
                )
        }
    }, [anonymousId, accountId, isPlatformReady, tracking, account])

    return { experimentsReady }
}
