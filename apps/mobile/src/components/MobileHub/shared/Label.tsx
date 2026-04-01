import React, { type ReactNode } from "react"

import styles from "./Label.module.css"

interface LabelProps {
    htmlFor: string
    children: ReactNode
    className?: string
}

export const Label = ({
    htmlFor,
    children,
    className,
}: LabelProps): React.ReactElement => {
    return (
        <label
            htmlFor={htmlFor}
            className={`${styles.label} ${className || ""}`}
        >
            {children}
        </label>
    )
}
