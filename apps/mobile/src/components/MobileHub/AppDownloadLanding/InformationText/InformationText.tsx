import React from "react"

import styles from "./InformationText.module.css"

interface InformationTextProps {
    text?: string
    leftAligned?: boolean
}

export const InformationText: React.FC<InformationTextProps> = ({
    text = "Now available for Android and iOS.",
    leftAligned = false,
}) => {
    return (
        <p className={`${styles.text} ${leftAligned ? styles.left : ""}`}>
            {text}
        </p>
    )
}
