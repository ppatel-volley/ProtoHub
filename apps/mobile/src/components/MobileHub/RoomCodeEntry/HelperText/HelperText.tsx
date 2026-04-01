import cn from "classnames"
import React from "react"

import styles from "./HelperText.module.css"

type HelperTextProps = {
    text: string
    className?: string
}

export const HelperText = ({
    text,
    className,
}: HelperTextProps): React.ReactElement => {
    return <p className={cn(styles.helperText, className)}>{text}</p>
}
