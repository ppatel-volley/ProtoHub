import {
    FocusContext,
    useFocusable,
} from "@noriginmedia/norigin-spatial-navigation"
import type { ReactNode } from "react"
import { type JSX, useCallback, useEffect } from "react"

interface FocusableContainerProps {
    children: ReactNode
    className?: string
    style?: React.CSSProperties
    defaultFocusKey?: string
    focusable?: boolean
    saveLastFocusedChild?: boolean
    containerId?: string
    ref?: React.RefObject<HTMLDivElement | null>
    autoFocus?: boolean
}

/**
 * Wraps norigin-spatial-navigation's useFocusable to provide a focus context
 * for nested focusable items. Acts as a focus boundary with child tracking.
 */
export const FocusableContainer = ({
    children,
    className = "",
    style,
    defaultFocusKey,
    focusable = true,
    saveLastFocusedChild = true,
    containerId,
    ref: externalRef,
    autoFocus = true,
}: FocusableContainerProps): JSX.Element => {
    const { ref, focusKey, focusSelf } = useFocusable({
        focusable,
        saveLastFocusedChild,
        preferredChildFocusKey: defaultFocusKey,
        trackChildren: true,
        isFocusBoundary: true,
        autoRestoreFocus: true,
    })

    // Combine refs if external ref is provided  to avoid "Component added without a node reference"
    const setRefs = useCallback(
        (node: HTMLDivElement | null) => {
            ref.current = node
            if (externalRef) {
                externalRef.current = node
            }
        },
        [ref, externalRef]
    )

    useEffect(() => {
        if (focusable && autoFocus) {
            requestAnimationFrame(() => {
                focusSelf()
            })
        }
    }, [focusable, focusSelf, autoFocus])

    return (
        <FocusContext.Provider value={focusKey}>
            <div
                ref={setRefs}
                className={className}
                style={style}
                id={containerId}
            >
                {children}
            </div>
        </FocusContext.Provider>
    )
}
