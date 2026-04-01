import { type JSX, useCallback, useEffect, useRef, useState } from "react"

import { BASE_URL } from "../../config/envconfig"
import type { FocusTarget } from "../../hooks/useFocusTracking"
import { useImageWithFallback } from "../../utils/imageFormatFallback"
import { useArrowPress } from "./ArrowPressContext"
import styles from "./FocusIndicator.module.scss"

interface FocusIndicatorProps {
    target: FocusTarget
    initialized: boolean
    isPressed: boolean
    imagePath?: string
    scrollOffset?: number
}

/**
 * Floating focus indicator that positions via CSS transform and animates to the
 * currently focused element. Subscribes to arrow press events for position updates.
 */
export const FocusIndicator = ({
    target,
    initialized,
    isPressed,
    imagePath = `${BASE_URL}assets/images/ui/volley-focus-frame.avif`,
    scrollOffset = 0,
}: FocusIndicatorProps): JSX.Element | null => {
    const containerRef = useRef<HTMLDivElement>(null)
    const [isVisible, setIsVisible] = useState(false)
    const [fallbackImageUrl, isImageLoading] = useImageWithFallback(imagePath)
    const { arrowPressListeners } = useArrowPress()

    const updatePosition = useCallback(() => {
        if (!target.element || !containerRef.current) {
            return
        }

        const leftPosition =
            (target.element as HTMLElement).offsetLeft - scrollOffset
        containerRef.current.style.transform = `translate3d(${leftPosition}px, 0, 0.1px)`
    }, [target.element, scrollOffset])

    useEffect(() => {
        setIsVisible(
            initialized && !isImageLoading && fallbackImageUrl !== null
        )
    }, [fallbackImageUrl, initialized, isImageLoading])

    useEffect(() => {
        updatePosition()
    }, [updatePosition])

    useEffect(() => {
        const listeners = arrowPressListeners.current
        listeners.add(updatePosition)
        return (): void => {
            listeners.delete(updatePosition)
        }
    }, [arrowPressListeners, updatePosition])

    const innerClassName = `${styles.inner} ${isPressed ? styles.pressed : ""}`

    return (
        <div
            ref={containerRef}
            className={styles.focusIndicator}
            style={{
                opacity: isVisible ? target.opacity : 0,
                display: isVisible ? "block" : "none",
            }}
        >
            <div
                className={innerClassName}
                style={{
                    backgroundImage: fallbackImageUrl
                        ? `url('${fallbackImageUrl}')`
                        : "none",
                }}
            />
        </div>
    )
}
