import type { JSX, ReactNode } from "react"

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

// Stub for mobile — only exists so test mocks resolve
export const FocusableContainer = ({
    children,
    className = "",
    style,
    containerId,
}: FocusableContainerProps): JSX.Element => {
    return (
        <div className={className} style={style} id={containerId}>
            {children}
        </div>
    )
}
