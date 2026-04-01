import { useEventBroker, usePlatformStatus } from "@volley/platform-sdk/react"
import React, { useCallback, useEffect, useState } from "react"

import { useBrandDocumentMeta } from "../../../hooks/useBrandDocumentMeta"
import { useDatadogIdentity } from "../../../hooks/useDatadogIdentity"
import { useExperimentInit } from "../../../hooks/useExperimentInit"
import {
    SupportOverlay,
    type SupportOverlayContext,
} from "../shared/SupportOverlay/SupportOverlay"
import { AppDownloadLanding } from "./AppDownloadLanding"

export const AppDownloadLandingWithSupport: React.FC = () => {
    useExperimentInit()
    useDatadogIdentity()
    useBrandDocumentMeta()

    const [supportContext, setSupportContext] =
        useState<SupportOverlayContext | null>(null)
    const [supportOpen, setSupportOpen] = useState(false)
    const eventBroker = useEventBroker()
    const { isReady } = usePlatformStatus()

    const handleSupportClose = useCallback((): void => {
        setSupportOpen(false)
    }, [])

    useEffect((): void | (() => void) => {
        if (!isReady) return

        const unsubscribe = eventBroker.addEventListener(
            "support:open",
            (payload) => {
                setSupportContext({
                    gameContext: payload.gameContext ?? {},
                    sdkContext: payload.sdkContext ?? {},
                })
                setSupportOpen(true)
            }
        )

        return unsubscribe
    }, [eventBroker, isReady])

    return (
        <>
            <AppDownloadLanding />
            <SupportOverlay
                open={supportOpen}
                context={supportContext}
                onClose={handleSupportClose}
            />
        </>
    )
}
