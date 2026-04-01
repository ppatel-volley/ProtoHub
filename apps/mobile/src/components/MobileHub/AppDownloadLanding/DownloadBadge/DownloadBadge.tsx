import React from "react"

import { BRANCH_STATIC_QUICK_LINK } from "../../../../constants/BRANCH_STATIC_QUICK_LINK"
import appleStoreBadgeSvg from "./assets/appleStoreBadge.svg"
import googlePlayImage from "./assets/googlePlayBadge.svg"
import styles from "./DownloadBadge.module.css"

interface DownloadBadgeProps {
    onGooglePlayClick?: () => void
    onAppStoreClick?: () => void
    leftAligned?: boolean
}

export const DownloadBadge: React.FC<DownloadBadgeProps> = ({
    onGooglePlayClick,
    onAppStoreClick,
    leftAligned = false,
}) => {
    return (
        <div
            className={`${styles.badgeContainer} ${
                leftAligned ? styles.leftContainer : ""
            }`}
        >
            <a
                href={BRANCH_STATIC_QUICK_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.badgeLink}
                onClick={onGooglePlayClick}
            >
                <img
                    src={googlePlayImage}
                    alt="Get it on Google Play"
                    className={styles.googlePlayBadge}
                />
            </a>
            <a
                href={BRANCH_STATIC_QUICK_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.badgeLink}
                onClick={onAppStoreClick}
            >
                <img
                    src={appleStoreBadgeSvg}
                    alt="Download on the App Store"
                    className={styles.appleStoreBadge}
                />
            </a>
        </div>
    )
}
