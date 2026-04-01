import { useEffect, useRef, useState } from "react"
import { v4 as uuidv4 } from "uuid"

import { logger } from "../utils/logger"
import { useHubTracking } from "./useHubTracking"

const EVENT_CATEGORY = "menu" as const
const EVENT_SUB_CATEGORY = "weekend rebrand modal" as const
const BUTTON_TEXT = "Got it"

export const useWeekendRebrandModalTracking = (
    isModalOpen: boolean
): { screenDisplayedId: string | null; trackButtonPress: () => void } => {
    const { track } = useHubTracking()
    const prevModalStateRef = useRef(false)
    const [screenDisplayedId, setScreenDisplayedId] = useState<string | null>(
        null
    )

    useEffect(() => {
        if (isModalOpen && !prevModalStateRef.current) {
            const newScreenDisplayedId = uuidv4()
            setScreenDisplayedId(newScreenDisplayedId)

            logger.info(
                `Tracking Hub Screen Displayed for weekend rebrand modal with ID: ${newScreenDisplayedId}`
            )

            void track("Hub Screen Displayed", {
                screenDisplayedId: newScreenDisplayedId,
                displayChoices: [BUTTON_TEXT],
                eventCategory: EVENT_CATEGORY,
                eventSubCategory: EVENT_SUB_CATEGORY,
            })
        }

        if (!isModalOpen && prevModalStateRef.current) {
            setScreenDisplayedId(null)
        }

        prevModalStateRef.current = isModalOpen
    }, [isModalOpen, track])

    const trackButtonPress = (): void => {
        if (!screenDisplayedId) {
            logger.warn(
                "Weekend rebrand modal: no screenDisplayedId for button press tracking"
            )
            return
        }

        void track("Hub Button Pressed", {
            eventCategory: EVENT_CATEGORY,
            eventSubCategory: EVENT_SUB_CATEGORY,
            screenDisplayedId,
            displayChoices: [BUTTON_TEXT],
            choiceValue: BUTTON_TEXT,
        })
    }

    return { screenDisplayedId, trackButtonPress }
}
