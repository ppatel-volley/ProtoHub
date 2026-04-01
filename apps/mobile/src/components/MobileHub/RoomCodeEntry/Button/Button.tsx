import cn from "classnames"
import React from "react"

import styles from "./Button.module.css"

export type ButtonProps = {
    disabled?: boolean
    disabledStyle?: string
    className?: string
    image?: {
        src: string
        className?: string
        alt?: string
        width?: number
        height?: number
    }
    onClick?: () => void
}

export default function Button({
    disabled,
    disabledStyle,
    className,
    image,
    onClick,
}: ButtonProps): React.ReactElement {
    const imageElement = image ? (
        <img
            src={image.src}
            className={image.className}
            alt={image.alt ?? "alt"}
            width={image.width}
            height={image.height}
        />
    ) : null
    return (
        <button
            className={cn(
                styles.button,
                disabled && cn(disabledStyle, styles.disabled),
                className
            )}
            onClick={onClick}
            disabled={disabled}
        >
            {imageElement}
            <span>Play</span>
        </button>
    )
}
