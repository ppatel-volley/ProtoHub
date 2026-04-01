import Lottie from "lottie-react"
import React from "react"

import { useBranding } from "../../../../hooks/useBranding"
import styles from "./Background.module.css"

type BackgroundProps = {
    animationData: object
    children: React.ReactNode
}

export const Background = ({
    animationData,
    children,
}: BackgroundProps): React.ReactElement => {
    const { weekendRebrandActive } = useBranding()

    const highlights = [
        { className: styles.topHighlight, key: "top" },
        { className: styles.bottomHighlight, key: "bottom" },
    ]

    return (
        <div
            className={
                weekendRebrandActive
                    ? styles.weekendBackground
                    : styles.background
            }
        >
            {!weekendRebrandActive && (
                <>
                    {/* Highlights */}
                    {highlights.map((highlight) => (
                        <div
                            key={highlight.key}
                            className={highlight.className}
                        />
                    ))}

                    {/* Top animation */}
                    <Lottie
                        animationData={animationData}
                        className={styles.topLottie}
                        loop
                        autoplay
                    />

                    {/* Bottom animation */}
                    <Lottie
                        animationData={animationData}
                        className={styles.bottomLottie}
                        loop
                        autoplay
                    />
                </>
            )}

            {children}
        </div>
    )
}
