import { SubscriptionFlowResult } from "@volley/platform-sdk/lib"
import { useAccount } from "@volley/platform-sdk/react"
import { useRef, useState } from "react"

import { SKU_OVERRIDE } from "../config/consts"
import type { Deeplink } from "../config/deeplink"
import {
    SHOULD_FORCE_WEB_CHECKOUT,
    SHOULD_USE_DEV_UPSELL,
} from "../config/devOverrides"
import { PAYMENT_SUCCESS_SESSION_KEY } from "../constants"
import { PaywallType } from "../constants/game"
import { UpsellEventSubCategory } from "../constants/tracking"
import { logger } from "../utils/logger"
import type { Game } from "./useGames"
import { useUpsell } from "./useUpsell"

interface GameSelectionUpsellResult {
    isInGameSelectionUpsell: boolean
    handleGamePaywall: (game: Game) => Promise<boolean>
}

/**
 * Manages the upsell flow triggered when a user selects a game with a paywall.
 *
 * Decision tree for `handleGamePaywall(game)`:
 * 1. Deeplink launch → bypass (first launch only)
 * 2. `PaywallType.None` → allow
 * 3. Session already has successful payment → allow
 * 4. User is subscribed → allow
 * 5. Otherwise → show upsell modal:
 *    - Soft paywall: always allow game launch regardless of upsell outcome
 *    - Hard paywall: block launch unless subscription succeeds
 *
 * @param deeplink - Active deeplink. First deeplink launch bypasses the paywall entirely.
 * @returns `isInGameSelectionUpsell` (modal visible) and `handleGamePaywall` (call before launching a game)
 */
export const useGameSelectionUpsell = (
    deeplink?: Deeplink
): GameSelectionUpsellResult => {
    const [isInGameSelectionUpsell, setIsInGameSelectionUpsell] =
        useState(false)
    const payments = useUpsell()
    const { account } = useAccount()

    const cameInViaDeeplinkRef = useRef(!!deeplink)

    const handleGamePaywall = async (game: Game): Promise<boolean> => {
        if (cameInViaDeeplinkRef.current) {
            logger.info("Bypassing game selection upsell for deeplink launch")
            cameInViaDeeplinkRef.current = false
            return true
        }

        if (game.paywallType === PaywallType.None) {
            return true
        }

        let hasSuccessfulPayment = false
        try {
            const stored = sessionStorage.getItem(PAYMENT_SUCCESS_SESSION_KEY)
            hasSuccessfulPayment = stored === "true"
        } catch {
            logger.warn("Failed to get successful payment from sessionStorage")
        }

        logger.info(
            `GameSelectionUpsell - checking paywall for ${game.id}: account=${account ? "loaded" : "null"}, isSubscribed=${account?.isSubscribed}, hasSuccessfulPayment=${hasSuccessfulPayment}, devUpsell=${SHOULD_USE_DEV_UPSELL}, forceWebCheckout=${SHOULD_FORCE_WEB_CHECKOUT}`
        )

        if (
            hasSuccessfulPayment &&
            !(SHOULD_USE_DEV_UPSELL || SHOULD_FORCE_WEB_CHECKOUT)
        ) {
            logger.info(
                `GameSelectionUpsell - bypassing upsell for user with successful payment in session`
            )
            return true
        }

        if (
            account?.isSubscribed &&
            !(SHOULD_USE_DEV_UPSELL || SHOULD_FORCE_WEB_CHECKOUT)
        ) {
            logger.info(
                `GameSelectionUpsell - bypassing upsell for subscribed user`
            )
            return true
        }

        logger.info(
            `Starting upsell flow for game: ${game.id}, type: ${game.paywallType}`
        )
        setIsInGameSelectionUpsell(true)

        try {
            const result = await payments.subscribe({
                overrideSku: SKU_OVERRIDE,
                eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
                upsellContext: {
                    type: "game-selection",
                    game,
                },
            })
            logger.info(
                `Game selection upsell result: ${result?.status}, result object: ${JSON.stringify(result)}`
            )

            if (result.status === SubscriptionFlowResult.AlreadyPurchased) {
                logger.info(
                    `GameSelectionUpsell - user already subscribed, allowing launch`
                )
                return true
            }

            if (game.paywallType === PaywallType.Soft) {
                logger.info("Soft paywall: allowing game launch")
                return true
            }

            if (game.paywallType === PaywallType.Hard) {
                if (result.status === SubscriptionFlowResult.Successful) {
                    return true
                } else {
                    return false
                }
            }

            return true
        } catch (error) {
            logger.error("Game selection upsell error", error)

            if (game.paywallType === PaywallType.Soft) {
                logger.info("Soft paywall: allowing game launch despite error")
                return true
            }

            logger.info("Hard paywall: blocking game launch due to error")
            return false
        } finally {
            setIsInGameSelectionUpsell(false)
        }
    }

    return {
        isInGameSelectionUpsell,
        handleGamePaywall,
    }
}
