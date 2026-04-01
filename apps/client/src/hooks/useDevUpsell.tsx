import type { SubscribeOptions } from "@volley/platform-sdk/lib"
import type { SubscriptionFlowResult } from "@volley/platform-sdk/lib"
import React, { useState } from "react"

import { DevUpsellModal } from "../components/DevUpsellModal"
import { createTypedContext } from "../utils/createTypedContext"

export interface DevUpsellContextType {
    subscribe: (
        options: SubscribeOptions
    ) => Promise<{ status: SubscriptionFlowResult }>
}

const [DevUpsellCtx, useDevUpsell] =
    createTypedContext<DevUpsellContextType>("DevUpsell")

export { useDevUpsell }

/**
 * Development-only upsell provider that shows a mock subscription modal.
 * Activated via `SHOULD_USE_DEV_UPSELL` URL parameter override.
 * Useful for testing upsell flows without a real Stripe integration or platform SDK.
 */
export const DevUpsellProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [currentOptions, setCurrentOptions] = useState<SubscribeOptions>({})
    const [resolvePromise, setResolvePromise] = useState<
        ((result: { status: SubscriptionFlowResult }) => void) | null
    >(null)

    const subscribe = (
        options: SubscribeOptions
    ): Promise<{ status: SubscriptionFlowResult }> => {
        return new Promise((resolve) => {
            setCurrentOptions(options)
            setResolvePromise(() => resolve)
            setIsModalOpen(true)
        })
    }

    const handleResult = (status: SubscriptionFlowResult): void => {
        setIsModalOpen(false)
        if (resolvePromise) {
            resolvePromise({ status })
            setResolvePromise(null)
        }
    }

    return (
        <DevUpsellCtx.Provider value={{ subscribe }}>
            {children}
            <DevUpsellModal
                isOpen={isModalOpen}
                subscribeOptions={currentOptions}
                onResult={handleResult}
            />
        </DevUpsellCtx.Provider>
    )
}
