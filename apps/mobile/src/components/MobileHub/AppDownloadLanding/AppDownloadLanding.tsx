import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { v4 as uuidv4 } from "uuid"

import { MobileHubEventName } from "../../../constants/tracking"
import { useBranding } from "../../../hooks/useBranding"
import { useHubTracking } from "../../../hooks/useHubTracking"
import { logger } from "../../../utils/logger"
import backgroundAnimation from "../shared/assets/faceoff-shapes.json"
import { Background } from "../shared/Background/Background"
import { SupportLink } from "../shared/SupportLink/SupportLink"
import styles from "./AppDownloadLanding.module.css"
import { DownloadBadge } from "./DownloadBadge/DownloadBadge"
import { Icon } from "./Icon/Icon"
import { InformationText } from "./InformationText/InformationText"
import { TitleText } from "./TitleText/TitleText"
import { WeekendNavbar } from "./WeekendNavbar/WeekendNavbar"

const DISPLAY_CHOICES = ["Google Play", "App Store", "Support"] as const
const TITLE_TEXT = "Download the app to play"
const INFO_TEXT = "Now available for Android and iOS."
const PAGE_TEXT = `${TITLE_TEXT}. ${INFO_TEXT}`
const EVENT_CATEGORY = "download app"

export const AppDownloadLanding: React.FC = () => {
    const { weekendRebrandActive } = useBranding()
    const { track } = useHubTracking()
    const [screenDisplayedId] = useState<string>(() => uuidv4())
    const hasTrackedScreenDisplayed = useRef(false)

    // Detect if user came from QR code scan (pairing or gameIframeControllerUrl params present in QR URLs)
    const entrySource = useMemo(() => {
        const params = new URLSearchParams(window.location.search)
        return params.has("pairing") || params.has("gameIframeControllerUrl")
            ? "QR"
            : undefined
    }, [])

    // Track screen displayed event
    useEffect(() => {
        if (hasTrackedScreenDisplayed.current) return
        hasTrackedScreenDisplayed.current = true

        logger.info("Tracking screen displayed for AppDownloadLanding")
        track(MobileHubEventName.WEB_APP_SCREEN_DISPLAYED, {
            screenDisplayedId,
            displayChoices: DISPLAY_CHOICES,
            eventCategory: EVENT_CATEGORY,
            eventSubCategory: EVENT_CATEGORY,
            text: PAGE_TEXT,
            ...(entrySource && { entrySource }),
        })
    }, [track, screenDisplayedId, entrySource])

    const handleGooglePlayClick = useCallback((): void => {
        track(MobileHubEventName.WEB_APP_BUTTON_PRESSED, {
            choiceValue: "Google Play",
            displayChoices: DISPLAY_CHOICES,
            eventCategory: EVENT_CATEGORY,
            eventSubCategory: EVENT_CATEGORY,
            screenDisplayedId,
            text: PAGE_TEXT,
            ...(entrySource && { entrySource }),
        })
    }, [track, screenDisplayedId, entrySource])

    const handleAppStoreClick = useCallback((): void => {
        track(MobileHubEventName.WEB_APP_BUTTON_PRESSED, {
            choiceValue: "App Store",
            displayChoices: DISPLAY_CHOICES,
            eventCategory: EVENT_CATEGORY,
            eventSubCategory: EVENT_CATEGORY,
            screenDisplayedId,
            text: PAGE_TEXT,
            ...(entrySource && { entrySource }),
        })
    }, [track, screenDisplayedId, entrySource])

    const handleSupportClick = useCallback((): void => {
        track(MobileHubEventName.WEB_APP_BUTTON_PRESSED, {
            choiceValue: "Support",
            displayChoices: DISPLAY_CHOICES,
            eventCategory: EVENT_CATEGORY,
            eventSubCategory: EVENT_CATEGORY,
            screenDisplayedId,
            text: PAGE_TEXT,
            ...(entrySource && { entrySource }),
        })
    }, [track, screenDisplayedId, entrySource])

    return (
        <Background animationData={backgroundAnimation}>
            {weekendRebrandActive && <WeekendNavbar />}
            <div
                className={
                    weekendRebrandActive
                        ? styles.weekendContainer
                        : styles.appDownloadContainer
                }
            >
                <div
                    className={
                        weekendRebrandActive
                            ? styles.weekendContent
                            : styles.appDownloadContent
                    }
                >
                    {weekendRebrandActive ? (
                        <>
                            <div className={styles.weekendHeader}>
                                <Icon />
                                <TitleText
                                    text="Download the Weekend app to play"
                                    leftAligned
                                />
                                <InformationText
                                    text="Your phone is your controller."
                                    leftAligned
                                />
                            </div>
                            <DownloadBadge
                                onGooglePlayClick={handleGooglePlayClick}
                                onAppStoreClick={handleAppStoreClick}
                                leftAligned
                            />
                            <SupportLink
                                onSupportClick={handleSupportClick}
                                leftAligned
                                hideIcon
                            />
                        </>
                    ) : (
                        <>
                            <Icon />
                            <TitleText text={TITLE_TEXT} />
                            <InformationText text={INFO_TEXT} />
                            <DownloadBadge
                                onGooglePlayClick={handleGooglePlayClick}
                                onAppStoreClick={handleAppStoreClick}
                            />
                            <SupportLink
                                onSupportClick={handleSupportClick}
                                compact
                            />
                        </>
                    )}
                </div>
            </div>
        </Background>
    )
}
