import { useCallback, useRef, useState } from "react"

// Only track position, not dimensions
export interface FocusTarget {
    element: Element | null
    opacity: number
}

interface UseFocusTrackingOptions {
    fadeInDelay?: number
}

interface UseFocusTrackingResult {
    focusTarget: FocusTarget
    initialized: boolean
    initializeWithElement: (element: Element) => void
    updateFocusTarget: (element: Element) => void
}

/**
 * Tracks the currently focused element for the floating focus indicator.
 *
 * The focus indicator is a separate DOM element that animates to the
 * position of the focused tile via CSS transitions. This hook manages
 * which element it should track and handles the initial fade-in to
 * prevent a visible jump from (0,0) to the first tile's position.
 *
 * Callbacks are intentionally memoized with empty dependency arrays to
 * prevent re-render loops with norigin-spatial-navigation's `onFocus`.
 */
export const useFocusTracking = ({
    fadeInDelay = 200,
}: UseFocusTrackingOptions = {}): UseFocusTrackingResult => {
    // Store configuration in refs so they don't trigger re-renders
    const fadeInDelayRef = useRef(fadeInDelay)

    const [focusTarget, setFocusTarget] = useState<FocusTarget>({
        element: null,
        opacity: 0,
    })
    const [initialized, setInitialized] = useState(false)

    // Store the initialized state in a ref too
    const initializedRef = useRef(initialized)
    // Update the ref when the state changes
    initializedRef.current = initialized

    // Used to get the initial element for focus - memoized with no dependencies
    const initializeWithElement = useCallback((element: Element): void => {
        if (!element) return

        setFocusTarget({
            element,
            opacity: 0,
        })

        // Delay making it visible
        setTimeout(() => {
            setInitialized(true)
            setFocusTarget((prev) => ({
                ...prev,
                opacity: 1,
            }))
        }, fadeInDelayRef.current)
    }, []) // No dependencies to prevent re-creation

    // Used when focus changes - memoized with no dependencies
    const updateFocusTarget = useCallback((element: Element): void => {
        // Do not wait for initialization before being able to change the element
        if (!element) return

        setFocusTarget({
            element,
            opacity: 1,
        })
    }, []) // No dependencies to prevent re-creation

    return {
        focusTarget,
        initialized,
        initializeWithElement,
        updateFocusTarget,
    }
}
