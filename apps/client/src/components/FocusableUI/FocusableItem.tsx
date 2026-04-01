import {
    type ArrowPressHandler,
    type ArrowReleaseHandler,
    setFocus,
    useFocusable,
} from "@noriginmedia/norigin-spatial-navigation"
import type { ReactNode } from "react"
import { type JSX, useCallback, useRef } from "react"

import { useArrowPress } from "./ArrowPressContext"

interface FocusableItemProps {
    focusKey: string
    children: ReactNode
    className?: string
    focusedClassName?: string
    focusable?: boolean
    onFocus?: (element: HTMLDivElement) => void
    onBlur?: (element: HTMLDivElement) => void
    onEnterPress?: () => void
    onClick?: () => void
    onArrowPress?: ArrowPressHandler<unknown>
    onArrowRelease?: ArrowReleaseHandler<unknown>
    onAnimationEnd?: (e: React.AnimationEvent<HTMLDivElement>) => void
    dataAttributes?: Record<string, string>
}

export const CAROUSEL_DEBOUNCE_TIME = 150
export const MOUSE_SUPPRESS_AFTER_KEYPRESS_MS = 200

/**
 * Individual focusable element wrapper using useFocusable. Debounces opposite-direction
 * arrow presses within CAROUSEL_DEBOUNCE_TIME to avoid focus thrashing in carousels.
 */
export const FocusableItem = ({
    focusKey,
    children,
    className = "",
    focusedClassName = "focused",
    focusable = true,
    onFocus,
    onBlur,
    onEnterPress,
    onArrowPress,
    onArrowRelease,
    onClick,
    onAnimationEnd,
    dataAttributes = {},
}: FocusableItemProps): JSX.Element => {
    const elementRef = useRef<HTMLDivElement>(null)
    const { lastArrowPress, arrowPressListeners } = useArrowPress()

    const handleArrowPress = useCallback<ArrowPressHandler<unknown>>(
        (direction, event, details) => {
            const now = Date.now()
            const lastPress = lastArrowPress.current

            const isDoubleTap =
                lastPress && now - lastPress.timestamp < CAROUSEL_DEBOUNCE_TIME
            if (isDoubleTap) {
                const lastDirection = lastPress.direction
                const areTapsOpposite =
                    (direction === "left" && lastDirection === "right") ||
                    (direction === "right" && lastDirection === "left") ||
                    (direction === "up" && lastDirection === "down") ||
                    (direction === "down" && lastDirection === "up")

                if (areTapsOpposite) {
                    return false
                }
            }

            lastArrowPress.current = { direction, timestamp: now }

            // Notify all listeners that an arrow key was pressed
            arrowPressListeners.current.forEach((listener) => listener())

            if (onArrowPress) {
                return onArrowPress(direction, event, details)
            }
            return true
        },
        [onArrowPress, lastArrowPress, arrowPressListeners]
    )

    const handleMouseEnter = useCallback(() => {
        const lastPress = lastArrowPress.current
        if (
            lastPress &&
            Date.now() - lastPress.timestamp < MOUSE_SUPPRESS_AFTER_KEYPRESS_MS
        ) {
            return
        }
        setFocus(focusKey)
    }, [focusKey, lastArrowPress])

    const { ref, focused } = useFocusable({
        focusKey,
        focusable,
        onEnterPress,
        onArrowPress: handleArrowPress,
        onArrowRelease,
        onFocus: () => {
            if (elementRef.current && onFocus) {
                onFocus(elementRef.current)
            }
        },
        onBlur: () => {
            if (elementRef.current && onBlur) {
                onBlur(elementRef.current)
            }
        },
    })

    // Combine the Norigin ref with our own ref
    const setRefs = (element: HTMLDivElement | null): void => {
        if (element) {
            ;(ref as React.MutableRefObject<HTMLDivElement>).current = element
            elementRef.current = element
        }
    }

    // Prepare data attributes
    const dataProps: Record<string, string> = {}
    Object.entries(dataAttributes).forEach(([key, value]) => {
        dataProps[`data-${key}`] = value
    })

    return (
        <div
            ref={setRefs}
            className={`${className} ${focused ? focusedClassName : ""}`}
            onMouseEnter={handleMouseEnter}
            onClick={(e) => {
                e.preventDefault()
                if (onClick) onClick()
            }}
            onAnimationEnd={onAnimationEnd}
            role="button"
            tabIndex={0}
            data-focusable="true"
            data-focus-key={focusKey}
            {...dataProps}
        >
            {children}
        </div>
    )
}
