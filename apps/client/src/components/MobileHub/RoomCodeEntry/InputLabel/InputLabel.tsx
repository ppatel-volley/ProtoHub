import React from "react"

import styles from "./InputLabel.module.css"

type InputLabelProps = {
    text: string
    className?: string
}

export const InputLabel = ({
    text,
    className,
}: InputLabelProps): React.ReactElement => {
    const combinedClassName = `${styles.inputLabel}${
        className ? ` ${className}` : ""
    }`

    return (
        <span className={combinedClassName}>
            <span>{text}</span>
        </span>
    )
}
