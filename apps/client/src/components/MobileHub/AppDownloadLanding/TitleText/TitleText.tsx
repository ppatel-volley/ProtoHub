import React from "react"

import styles from "./TitleText.module.css"

interface TitleTextProps {
    text?: string
    leftAligned?: boolean
}

export const TitleText: React.FC<TitleTextProps> = ({
    text = "Download the app to play",
    leftAligned = false,
}) => {
    return (
        <h2 className={`${styles.text} ${leftAligned ? styles.left : ""}`}>
            {text}
        </h2>
    )
}
