import { useAccount, useAuth } from "@volley/platform-sdk/react"
import { useEffect, useRef, useState } from "react"

import { SKU_OVERRIDE } from "../config/consts"
import type { Deeplink } from "../config/deeplink"
import {
    SHOULD_FORCE_UNSUBSCRIBED,
    SHOULD_FORCE_WEB_CHECKOUT,
    SHOULD_USE_DEV_UPSELL,
} from "../config/devOverrides"
import { shouldUseWebCheckout } from "../config/platformDetection"
import { UpsellEventSubCategory } from "../constants/tracking"
import { getExperimentManager } from "../experiments/ExperimentManager"
import { ExperimentFlag } from "../experiments/experimentSchemata"
import { logger } from "../utils/logger"
import { useUpsell } from "./useUpsell"

interface ImmediateUpsellResult {
    isInImmediateUpsell: boolean | null
}

/**
 * Triggers the pre-roll upsell modal for unsubscribed users immediately after app initialization.
 *
 * Conditions for showing the upsell:
 * - `shouldStart` is true (platform is ready)
 * - User is not subscribed (unless dev overrides force unsubscribed state)
 * - `SuppressImmediateUpsell` experiment flag is not "on"
 * - No deeplink is active (deeplinked users skip to their target game)
 *
 * Supports deferred subscription: if `canSubscribe` is false (e.g. waiting for device auth),
 * the upsell decision is made immediately but the `subscribe()` call is delayed until
 * `canSubscribe` becomes true.
 *
 * @param shouldStart - Whether platform initialization is complete and upsell can begin
 * @param deeplink - Active deeplink, if any. Deeplinked users bypass the immediate upsell.
 * @param canSubscribe - Whether the subscribe() call can be made (may be deferred for web checkout auth)
 * @returns `isInImmediateUpsell`: `null` before resolution, `true` while modal is showing, `false` after dismissed
 */
export const useImmediateUpsell = (
    shouldStart: boolean,
    deeplink?: Deeplink,
    canSubscribe = true
): ImmediateUpsellResult => {
    const { account } = useAccount()
    const { authStatus } = useAuth()
    const payments = useUpsell()

    const [isInImmediateUpsell, setIsInImmediateUpsell] = useState<
        boolean | null
    >(null)
    const hasResolvedUpsell = useRef(false)
    const hasCalledSubscribe = useRef(false)
    const [pendingSubscribe, setPendingSubscribe] = useState(false)
    const prevAccountRef = useRef<typeof account | undefined>(undefined)

    useEffect(() => {
        if (prevAccountRef.current !== account) {
            logger.info("Immediate upsell: account state changed", {
                wasNull: prevAccountRef.current === null,
                isNowNull: account === null,
                wasUndefined: prevAccountRef.current === undefined,
                isNowUndefined: account === undefined,
                wasSubscribed: prevAccountRef.current?.isSubscribed,
                isNowSubscribed: account?.isSubscribed,
                authenticated: authStatus?.authenticated,
                authInProgress: authStatus?.authInProgress,
            })
            prevAccountRef.current = account
        }

        if (!shouldStart || hasResolvedUpsell.current) {
            return
        }

        hasResolvedUpsell.current = true

        if (account === null && !shouldUseWebCheckout()) {
            logger.error(
                "Account not loaded after loading for platform payments"
            )
            setIsInImmediateUpsell(false)
            return
        } else if (account === null && shouldUseWebCheckout()) {
            logger.warn(
                "Account not loaded after loading for web checkout - waiting for account to load",
                {
                    shouldStart,
                    authenticated: authStatus?.authenticated,
                    authInProgress: authStatus?.authInProgress,
                }
            )
            hasResolvedUpsell.current = false
            return
        }

        const isSubscribed =
            SHOULD_USE_DEV_UPSELL ||
            SHOULD_FORCE_WEB_CHECKOUT ||
            SHOULD_FORCE_UNSUBSCRIBED
                ? false
                : account?.isSubscribed
        const experimentManager = getExperimentManager()
        const shouldSuppressImmediateUpsell = experimentManager.getVariant(
            ExperimentFlag.SuppressImmediateUpsell
        )

        if (
            !isSubscribed &&
            !(shouldSuppressImmediateUpsell?.value === "on") &&
            !deeplink
        ) {
            setIsInImmediateUpsell(true)

            if (canSubscribe) {
                logger.info(
                    "Immediate upsell: triggering for unsubscribed user",
                    {
                        isSubscribed,
                        authenticated: authStatus?.authenticated,
                        authInProgress: authStatus?.authInProgress,
                    }
                )
                hasCalledSubscribe.current = true
                void payments
                    .subscribe({
                        overrideSku: SKU_OVERRIDE,
                        eventCategory:
                            UpsellEventSubCategory.IMMEDIATE_PRE_ROLL,
                        upsellContext: {
                            type: "immediate",
                        },
                    })
                    .then((result) => {
                        logger.info(`Immediate upsell: ${result.status}`)
                        setIsInImmediateUpsell(false)
                    })
                    .catch((error: Error) => {
                        logger.error(`Immediate upsell failed`, error)
                        setIsInImmediateUpsell(false)
                    })
            } else {
                logger.info(
                    "Immediate upsell: deferred (waiting for canSubscribe)"
                )
                setPendingSubscribe(true)
            }
        } else {
            logger.info("Immediate upsell bypassed", {
                isSubscribed,
                authenticated: authStatus?.authenticated,
                authInProgress: authStatus?.authInProgress,
                experimentSuppressed:
                    shouldSuppressImmediateUpsell?.value === "on",
                hasDeeplink: !!deeplink,
            })
            setIsInImmediateUpsell(false)
        }
    }, [shouldStart, account, payments, deeplink, authStatus, canSubscribe])

    useEffect(() => {
        if (!pendingSubscribe || !canSubscribe || hasCalledSubscribe.current) {
            return
        }

        hasCalledSubscribe.current = true
        logger.info("Immediate upsell: deferred subscribe firing", {
            authenticated: authStatus?.authenticated,
            authInProgress: authStatus?.authInProgress,
        })
        void payments
            .subscribe({
                overrideSku: SKU_OVERRIDE,
                eventCategory: UpsellEventSubCategory.IMMEDIATE_PRE_ROLL,
                upsellContext: {
                    type: "immediate",
                },
            })
            .then((result) => {
                logger.info(`Immediate upsell: ${result.status}`)
                setIsInImmediateUpsell(false)
            })
            .catch((error: Error) => {
                logger.error(`Immediate upsell failed`, error)
                setIsInImmediateUpsell(false)
            })
    }, [pendingSubscribe, canSubscribe, payments, authStatus])

    return {
        isInImmediateUpsell,
    }
}
