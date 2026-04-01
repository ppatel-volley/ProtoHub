import DOMPurify from "dompurify"
import React from "react"

import { BrandLogo } from "../../TvHub/BrandLogo"
import styles from "../WebCheckoutModal.module.scss"
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

interface WebCheckoutContentProps {
    mainHeading: string
    subtitle: string
    children: React.ReactNode
}

export const WebCheckoutContent: React.FC<WebCheckoutContentProps> = ({
    mainHeading,
    subtitle,
    children,
}) => {
    return (
        <div className={styles.content}>
            <BrandLogo />
            <h1
                className={styles.mainHeading}
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
