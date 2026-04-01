import { useEffect, useRef, useState } from "react"
import { v4 as uuidv4 } from "uuid"

import { VISIBILITY_DELAY_MS } from "../webCheckoutModalConstants"

interface UseModalLifecycleProps {
    isOpen: boolean
}

interface UseModalLifecycleReturn {
    isVisible: boolean
    screenDisplayedId: string | null
    openedThisRender: boolean
    setScreenDisplayedId: (id: string | null) => void
}

/**
 * Handles keeping track of the modal's visibility state and the screenDisplayedId.
 * @param props - Hook properties
 * @param props.isOpen - Whether the modal is open
 * @returns Modal lifecycle state including visibility and screen ID
 */
export const useModalLifecycle = ({
    isOpen,
}: UseModalLifecycleProps): UseModalLifecycleReturn => {
    const [isVisible, setIsVisible] = useState(false)
    const screenDisplayedIdRef = useRef<string | null>(null)
    const prevIsOpenRef = useRef(false)

    const openedThisRender = isOpen && !prevIsOpenRef.current

    if (openedThisRender && screenDisplayedIdRef.current === null) {
        screenDisplayedIdRef.current = uuidv4()
    }

    useEffect(() => {
        const hasModalOpened = isOpen && !prevIsOpenRef.current
        const hasModalClosed = !isOpen && prevIsOpenRef.current

        let timeoutId: number | undefined

        if (hasModalOpened) {
            timeoutId = window.setTimeout(() => {
                setIsVisible(true)
            }, VISIBILITY_DELAY_MS)

            const newScreenDisplayedId =
                screenDisplayedIdRef.current || uuidv4()
            screenDisplayedIdRef.current = newScreenDisplayedId
        } else if (hasModalClosed) {
            setIsVisible(false)
            screenDisplayedIdRef.current = null
        }

        prevIsOpenRef.current = isOpen

        return (): void => {
            if (timeoutId !== undefined) {
                clearTimeout(timeoutId)
            }
        }
    }, [isOpen])

    return {
        isVisible,
        screenDisplayedId: screenDisplayedIdRef.current,
        openedThisRender,
        setScreenDisplayedId: (id: string | null): void => {
            screenDisplayedIdRef.current = id
        },
    }
}
