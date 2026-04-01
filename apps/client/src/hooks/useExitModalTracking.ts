import { useEffect, useRef, useState } from "react"
import { v4 as uuidv4 } from "uuid"

import { logger } from "../utils/logger"
import { useHubTracking } from "./useHubTracking"

/**
 * Hook to track "Hub Screen Displayed" event when the exit confirmation modal is shown.
 * Tracks each time the modal is opened.
 * Returns the current screenDisplayedId for use in button press events.
 */
export const useExitModalTracking = (
    isModalOpen: boolean
): { screenDisplayedId: string | null } => {
    const { track } = useHubTracking()
    const prevModalStateRef = useRef(false)
    const [screenDisplayedId, setScreenDisplayedId] = useState<string | null>(
        null
    )

    useEffect(() => {
        // Track when modal opens (transitions from false to true)
        if (isModalOpen && !prevModalStateRef.current) {
            const newScreenDisplayedId = uuidv4()
            setScreenDisplayedId(newScreenDisplayedId)

            logger.info(
                `Tracking Hub Screen Displayed for exit modal with ID: ${newScreenDisplayedId}`
            )

            void track("Hub Screen Displayed", {
                screenDisplayedId: newScreenDisplayedId,
                displayChoices: ["yes", "no"],
                eventCategory: "menu",
                eventSubCategory: "exit modal selection",
                text: "",
            })
        }

        if (!isModalOpen && prevModalStateRef.current) {
            setScreenDisplayedId(null)
        }

        prevModalStateRef.current = isModalOpen
    }, [isModalOpen, track])

    return { screenDisplayedId }
}
