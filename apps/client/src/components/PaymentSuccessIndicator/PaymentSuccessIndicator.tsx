import React, { useEffect, useRef, useState } from "react"

import { useSuccessAudio } from "../../utils/AudioManager"
import { CheckmarkIcon } from "./CheckmarkIcon"
import styles from "./PaymentSuccessIndicator.module.scss"

interface PaymentSuccessIndicatorProps {
    isVisible: boolean
    onAnimationComplete: () => void
}

export const PaymentSuccessIndicator: React.FC<
    PaymentSuccessIndicatorProps
> = ({ isVisible, onAnimationComplete }) => {
    const [animate, setAnimate] = useState(false)
    const checkmarkRef = useRef<HTMLDivElement>(null)
    const successAudio = useSuccessAudio()

    useEffect(() => {
        if (!isVisible) return

        successAudio.play()

        setAnimate(true)
    }, [isVisible, successAudio])

    if (!isVisible) return null

    return (
        <div
            className={styles.successCheckmark}
            aria-label="Payment successful"
        >
            <div
                ref={checkmarkRef}
                className={`${styles.checkmarkInner} ${animate ? styles.animate : ""}`}
                onAnimationEnd={onAnimationComplete}
            >
                <CheckmarkIcon />
            </div>
        </div>
    )
}
