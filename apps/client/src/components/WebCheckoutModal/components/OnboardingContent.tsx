// Duplicated from WebCheckoutContent.tsx for the onboarding-narration experiment. Delete when experiment concludes.
import DOMPurify from "dompurify"
import React from "react"

import { BrandLogo } from "../../TvHub/BrandLogo"
import styles from "../OnboardingContent.module.scss"
import { BACK_BUTTON_TEXT } from "../webCheckoutModalConstants"

const sanitizeExperimentHtml = (dirty: string): string => {
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: ["b", "strong", "i", "em", "br"],
        ALLOWED_ATTR: [],
        FORBID_TAGS: [
            "style",
            "script",
            "iframe",
            "object",
            "embed",
            "svg",
            "math",
        ],
    })
}

interface OnboardingContentProps {
    animate: boolean
    mainHeading: string
    subtitle: string
    children: React.ReactNode
}

export const OnboardingContent: React.FC<OnboardingContentProps> = ({
    animate,
    mainHeading,
    subtitle,
    children,
}) => {
    return (
        <div className={styles.onboardingContent}>
            <BrandLogo
                className={`${styles.brandLogo} ${animate ? styles.brandLogoHighlight : ""}`}
            />
            <h1
                className={styles.welcomeText}
                dangerouslySetInnerHTML={{
                    __html: sanitizeExperimentHtml(mainHeading),
                }}
            />
            <p
                className={styles.subtitle}
                dangerouslySetInnerHTML={{
                    __html: sanitizeExperimentHtml(subtitle),
                }}
            />

            {children}

            <div className={styles.bottomShadow} />
            <div className={styles.backHint}>{BACK_BUTTON_TEXT}</div>
        </div>
    )
}
