import type { SubscribeOptions } from "@volley/platform-sdk/lib"
import { useCallback, useEffect, useRef } from "react"

import { UpsellEventSubCategory } from "../../../constants"
import { useHubTracking } from "../../../hooks/useHubTracking"
import { logger } from "../../../utils/logger"
import type { UpsellContext } from "../webCheckoutModalConfig"
import { BACK_BUTTON_TEXT } from "../webCheckoutModalConstants"

interface UseWebCheckoutTrackingProps {
    isOpen: boolean
    screenDisplayedId: string | null
    upsellContext: UpsellContext
    subscribeOptions: SubscribeOptions
    setConnectionId: (connectionId: string) => void
    mainHeading: string
    subtitle: string
}

interface UseWebCheckoutTrackingReturn {
    trackScreenDisplayed: () => void
    trackBackButton: () => void
}

/**
 * Handles tracking the modal's screen displayed and button presses.
 * @param props - Hook properties
 * @param props.isOpen - Whether the modal is open
 * @param props.screenDisplayedId - The ID of the screen displayed
 * @param props.upsellContext - The context of the upsell
 * @param props.subscribeOptions - The options for the subscription
 * @param props.setConnectionId - A function to set the connection ID
 * @returns Tracking functions for screen displays and button presses
 */
export const useWebCheckoutTracking = ({
    isOpen,
    screenDisplayedId,
    upsellContext,
    subscribeOptions,
    setConnectionId,
    mainHeading,
    subtitle,
}: UseWebCheckoutTrackingProps): UseWebCheckoutTrackingReturn => {
    const { track } = useHubTracking()
    const prevIsOpenRef = useRef(false)
    const hasTrackedScreenDisplayedRef = useRef(false)

    const getEventSubCategory = useCallback((): UpsellEventSubCategory => {
        return upsellContext.type === "immediate"
            ? UpsellEventSubCategory.IMMEDIATE_PRE_ROLL
            : UpsellEventSubCategory.HUB_PRE_ROLL
    }, [upsellContext.type])

    useEffect(() => {
        const hasModalOpened = isOpen && !prevIsOpenRef.current

        if (
            hasModalOpened &&
            screenDisplayedId &&
            !hasTrackedScreenDisplayedRef.current
        ) {
            void setConnectionId(screenDisplayedId)

            const eventSubCategory = getEventSubCategory()

            void track("Hub Screen Displayed", {
                screenDisplayedId,
                displayChoices: [BACK_BUTTON_TEXT],
                eventCategory: "account pairing",
                eventSubCategory,
                text: `${mainHeading} ${subtitle}`,
            })

            hasTrackedScreenDisplayedRef.current = true
        }

        if (!isOpen && prevIsOpenRef.current) {
            hasTrackedScreenDisplayedRef.current = false
        }

        prevIsOpenRef.current = isOpen
    }, [
        isOpen,
        screenDisplayedId,
        track,
        upsellContext,
        subscribeOptions,
        setConnectionId,
        getEventSubCategory,
        mainHeading,
        subtitle,
    ])

    const trackBackButton = (): void => {
        if (screenDisplayedId) {
            const eventSubCategory = getEventSubCategory()

            void track("Hub Button Pressed", {
                choiceValue: BACK_BUTTON_TEXT,
                displayChoices: [BACK_BUTTON_TEXT],
                eventCategory: "account pairing",
                eventSubCategory,
                screenDisplayedId,
            })
        } else {
            logger.warn(
                "Could not track Hub Button Pressed due to missing screenDisplayedId"
            )
        }
    }

    const trackScreenDisplayed = (): void => {
        if (screenDisplayedId) {
            const eventSubCategory = getEventSubCategory()

            void track("Hub Screen Displayed", {
                screenDisplayedId,
                displayChoices: [BACK_BUTTON_TEXT],
                eventCategory: "account pairing",
                eventSubCategory,
                text: `${mainHeading} ${subtitle}`,
            })
        }
    }

    return {
        trackScreenDisplayed,
        trackBackButton,
    }
}
