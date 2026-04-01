import { type JSX, type ReactNode, type RefObject, useRef } from "react"

import { createTypedContext } from "../../utils/createTypedContext"

interface ArrowPressState {
    direction: string
    timestamp: number
}

interface ArrowPressContextType {
    lastArrowPress: RefObject<ArrowPressState | null>
    arrowPressListeners: RefObject<Set<() => void>>
}

const [ArrowPressCtx, useArrowPress] =
    createTypedContext<ArrowPressContextType>("ArrowPress")

export { useArrowPress }

export const ArrowPressProvider = ({
    children,
}: {
    children: ReactNode
}): JSX.Element => {
    const lastArrowPress = useRef<ArrowPressState | null>(null)
    const arrowPressListeners = useRef<Set<() => void>>(new Set())

    return (
        <ArrowPressCtx.Provider value={{ lastArrowPress, arrowPressListeners }}>
            {children}
        </ArrowPressCtx.Provider>
    )
}
