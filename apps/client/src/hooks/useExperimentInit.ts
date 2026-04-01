import { useAccount, useTracking } from "@volley/platform-sdk/react"
import { useEffect, useRef, useState } from "react"

import {
    createExperimentIdentity,
    getExperimentManager,
} from "../experiments/ExperimentManager"
import { logger } from "../utils/logger"

interface UseExperimentInitReturn {
    experimentsReady: boolean
}

export function useExperimentInit(): UseExperimentInitReturn {
    const [experimentsReady, setExperimentsReady] = useState(false)
    const experimentsInitializedRef = useRef(false)

    const { account } = useAccount()
    const tracking = useTracking()

    useEffect(() => {
        if (experimentsInitializedRef.current) return
        if (!account) return

        const identity = createExperimentIdentity(
            account.anonymousId,
            account.id
        )

        if (identity) {
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
    }, [account, tracking])

    return { experimentsReady }
}
