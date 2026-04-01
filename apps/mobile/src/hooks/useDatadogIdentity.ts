import { datadogLogs } from "@datadog/browser-logs"
import { getAppVersion } from "@volley/platform-sdk/lib"
import { useSessionId } from "@volley/platform-sdk/react"
import { useEffect, useRef } from "react"

import { safeDatadogRum } from "../utils/datadog"
import { useAccountId } from "./useAccountId"
import { usePlatformReadiness } from "./usePlatformReadiness"

export function useDatadogIdentity(): void {
    const accountId = useAccountId()
    const isPlatformReady = usePlatformReadiness()
    const sessionId = useSessionId()
    const lastSetAccountIdRef = useRef<string | undefined>(undefined)

    useEffect(() => {
        if (!isPlatformReady || !accountId) return
        if (lastSetAccountIdRef.current === accountId) return
        lastSetAccountIdRef.current = accountId

        void safeDatadogRum.setUser({ id: accountId })
        datadogLogs.setUser({ id: accountId })
        datadogLogs.setAccount({ id: accountId })
    }, [accountId, isPlatformReady])

    useEffect(() => {
        if (sessionId) {
            datadogLogs.setGlobalContextProperty("hubSessionId", sessionId)
        }
    }, [sessionId])

    useEffect(() => {
        if (!isPlatformReady) return
        const shellVersion = getAppVersion()
        if (shellVersion) {
            datadogLogs.setGlobalContextProperty("shellVersion", shellVersion)
        }
    }, [isPlatformReady])
}
