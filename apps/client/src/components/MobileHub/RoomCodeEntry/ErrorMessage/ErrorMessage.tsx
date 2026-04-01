import cn from "classnames"
import React from "react"

import styles from "./ErrorMessage.module.css"

type ErrorMessageProps = {
    text: string
    className?: string
}

export const ErrorMessage = ({
    text,
    className,
}: ErrorMessageProps): React.ReactElement => {
    return <span className={cn(styles.errorMessage, className)}>{text}</span>
}
