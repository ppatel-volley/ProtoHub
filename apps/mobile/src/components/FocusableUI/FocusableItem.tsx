import type { JSX, ReactNode } from "react"

export const CAROUSEL_DEBOUNCE_TIME = 150

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
    onArrowPress?: (
        direction: string,
        event: unknown,
        details: unknown
    ) => boolean
    onArrowRelease?: (direction: string) => void
    onAnimationEnd?: (e: React.AnimationEvent<HTMLDivElement>) => void
    dataAttributes?: Record<string, string>
}

// Stub for mobile — only exists so test mocks resolve
export const FocusableItem = ({
    children,
    className = "",
}: FocusableItemProps): JSX.Element => {
    return <div className={className}>{children}</div>
}
