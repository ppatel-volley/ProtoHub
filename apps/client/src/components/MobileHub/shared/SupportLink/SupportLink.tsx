import { usePlatformStatus, useSupport } from "@volley/platform-sdk/react"
import React, { useCallback } from "react"

import { SupportIcon } from "../SupportIcon/SupportIcon"
import styles from "./SupportLink.module.css"

type SupportLinkProps = {
    hidden?: boolean
    roomCode?: string | null | undefined
    onSupportClick?: () => void
    text?: string
    compact?: boolean
    leftAligned?: boolean
    hideIcon?: boolean
}

export const SupportLink = ({
    hidden,
    roomCode,
    onSupportClick,
    text,
    compact = false,
    leftAligned = false,
    hideIcon = false,
}: SupportLinkProps): React.ReactElement | null => {
    const { isReady } = usePlatformStatus()
    const support = useSupport()

    const handleClick = useCallback(
        (event: React.MouseEvent<HTMLAnchorElement>): void => {
            event.preventDefault()

            onSupportClick?.()

            if (!isReady) {
                return
            }

            support.showSupportModal(roomCode ? { roomCode } : undefined)
        },
        [isReady, roomCode, support, onSupportClick]
    )

    const isAppDownloadPage = leftAligned

    if (hidden) {
        return null
    }

    const renderText = (): React.ReactElement => {
        if (isAppDownloadPage) {
            return (
                <>
                    <span className={styles.needHelp}>Need Help? </span>
                    <span className={styles.contactUs}>Contact us</span>
                </>
            )
        }
        return <span>{text ?? "Support"}</span>
    }

    return (
        <a
            href=""
            className={`${styles.supportLink} ${
                compact ? styles.compact : ""
            } ${leftAligned ? styles.left : ""}`}
            onClick={handleClick}
        >
            {!hideIcon && <SupportIcon />}
            {renderText()}
        </a>
    )
}
