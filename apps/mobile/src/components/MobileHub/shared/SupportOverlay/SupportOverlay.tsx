import type { SupportContext } from "@volley/platform-sdk/lib"
import { useSupport } from "@volley/platform-sdk/react"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { v4 as uuidv4 } from "uuid"

import { ENVIRONMENT } from "../../../../config/envconfig"
import { Environment } from "../../../../config/environment"
import { MobileHubEventName } from "../../../../constants/tracking"
import { useBranding } from "../../../../hooks/useBranding"
import { useGames } from "../../../../hooks/useGames"
import { useHubTracking } from "../../../../hooks/useHubTracking"
import { logger } from "../../../../utils/logger"
import { Label } from "../Label"
import { Select } from "../Select"
import styles from "./SupportOverlay.module.css"

/**
 * Context data for the support overlay.
 * Uses the canonical SupportContext type from the SDK.
 */
export type SupportOverlayContext = {
    gameContext?: Record<string, unknown>
    sdkContext?: SupportContext
}

type SupportOverlayProps = {
    open: boolean
    context: SupportOverlayContext | null
    onClose: () => void
}

type FormState = {
    game: string
    issue: string
    body: string
    email: string
}

const DEFAULT_FORM_STATE: FormState = {
    game: "Hub",
    issue: "",
    body: "",
    email: "",
}

const ISSUES = [
    "Game won't load",
    "No sound",
    "Starting a subscription",
    "Remote is laggy",
    "Microphone issues",
    "Slow/glitchy experience",
    "Payment issues",
    "Account issues",
    "Other",
]

const SUPPORT_SCREEN_TEXT =
    "Need help? Submit a support request and we'll get back to you soon."
const DISPLAY_CHOICES = ["Submit", "Cancel"] as const
const EVENT_CATEGORY = "menu"
const EVENT_SUB_CATEGORY = "support"

// Games options will be derived from useGames() to avoid duplication

export const SupportOverlay = ({
    open,
    context,
    onClose,
}: SupportOverlayProps): React.ReactElement | null => {
    const support = useSupport()
    const { track } = useHubTracking()
    const gamesList = useGames()
    const { weekendRebrandActive } = useBranding()
    const [formState, setFormState] = useState<FormState>(DEFAULT_FORM_STATE)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [countdown, setCountdown] = useState<number | null>(null)
    const previouslyOpen = useRef(false)
    const closeTimer = useRef<NodeJS.Timeout | null>(null)
    const focusRef = useRef<HTMLButtonElement | null>(null)
    const screenDisplayedIdRef = useRef<string | null>(null)

    const customerSupportEndpoint = useMemo(() => {
        if (ENVIRONMENT === Environment.PRODUCTION) {
            return "https://customer-support.volley-services.net/submit-to-front"
        }
        if (ENVIRONMENT === Environment.LOCAL) {
            return "http://localhost:8080/submit-to-front"
        }
        return "https://customer-support-staging.volley-services.net/submit-to-front"
    }, [])

    const technicalDetails = useMemo(() => {
        if (!context) {
            return "No technical context provided."
        }

        const payload = {
            gameContext: context.gameContext ?? {},
            sdkContext: context.sdkContext ?? {},
        }

        try {
            return JSON.stringify(payload, null, 2)
        } catch {
            return "Could not serialize technical details."
        }
    }, [context])

    const computedGames = useMemo(() => {
        const baseNames = gamesList.map((g) => g.title)
        const withExtras = ["Hub", ...baseNames, "N/A or Other"]
        const unique = Array.from(new Set(withExtras))
        const gameContextGame = context?.gameContext?.game
        if (typeof gameContextGame === "string") {
            const trimmed = gameContextGame.trim()
            if (trimmed && !unique.includes(trimmed)) {
                return [trimmed, ...unique]
            }
        }
        return unique
    }, [gamesList, context])

    useEffect((): void | (() => void) => {
        return (): void => {
            if (closeTimer.current) {
                clearTimeout(closeTimer.current)
            }
        }
    }, [])

    useEffect((): void => {
        if (open && !previouslyOpen.current) {
            const gameContextGame = context?.gameContext?.game
            setFormState({
                game:
                    typeof gameContextGame === "string" &&
                    gameContextGame.trim()
                        ? gameContextGame
                        : "Hub",
                issue: "",
                body: "",
                email: "",
            })
            setSubmitting(false)
            setError(null)
            setSuccess(false)
            setCountdown(null)
            const newScreenDisplayedId = uuidv4()
            screenDisplayedIdRef.current = newScreenDisplayedId

            track(MobileHubEventName.WEB_APP_SCREEN_DISPLAYED, {
                eventCategory: EVENT_CATEGORY,
                eventSubCategory: EVENT_SUB_CATEGORY,
                displayChoices: DISPLAY_CHOICES,
                screenDisplayedId: newScreenDisplayedId,
                text: SUPPORT_SCREEN_TEXT,
            })
        }

        previouslyOpen.current = open
    }, [open, track, context])

    useEffect((): void | (() => void) => {
        if (!open || !success || countdown === null) {
            return
        }

        closeTimer.current = setTimeout(() => {
            setCountdown((value) => {
                if (value === null) return value
                if (value <= 1) {
                    setTimeout(() => {
                        onClose()
                    }, 0)
                    return null
                }
                return value - 1
            })
        }, 1000)

        return (): void => {
            if (closeTimer.current) {
                clearTimeout(closeTimer.current)
            }
        }
    }, [open, success, countdown, onClose])

    useEffect((): void => {
        if (open && focusRef.current) {
            focusRef.current.focus()
        }
    }, [open])

    const handleCancel = useCallback(() => {
        track(MobileHubEventName.WEB_APP_BUTTON_PRESSED, {
            eventCategory: EVENT_CATEGORY,
            eventSubCategory: EVENT_SUB_CATEGORY,
            choiceValue: "Cancel",
            text: SUPPORT_SCREEN_TEXT,
            displayChoices: DISPLAY_CHOICES,
            screenDisplayedId: screenDisplayedIdRef.current ?? uuidv4(),
        })
        setTimeout(() => {
            onClose()
        }, 0)
    }, [onClose, track])

    useEffect((): void | (() => void) => {
        if (!open) return

        const handleEscape = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                handleCancel()
            }
        }

        document.addEventListener("keydown", handleEscape)
        return (): void => {
            document.removeEventListener("keydown", handleEscape)
        }
    }, [open, handleCancel])

    const handleChange = useCallback(
        (
            field: keyof FormState,
            value:
                | React.ChangeEvent<
                      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
                  >
                | string
        ) => {
            const newValue =
                typeof value === "string" ? value : value.currentTarget.value
            setFormState((prev) => ({
                ...prev,
                [field]: newValue,
            }))
        },
        []
    )

    const handleSubmit = useCallback(
        async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
            event.preventDefault()

            if (submitting) return

            setSubmitting(true)
            setError(null)

            try {
                const sdk: Partial<SupportContext> =
                    context?.sdkContext ?? ({} as Partial<SupportContext>)

                // Build payload with only defined values
                const rawPayload = {
                    // Required support fields
                    body: formState.body,
                    game: formState.game,
                    issue: formState.issue,
                    email: formState.email,
                    timestamp: new Date().toISOString(),
                    source: "mobile-hub",
                    supportEmail:
                        support.getSupportEmail?.(weekendRebrandActive) ??
                        (weekendRebrandActive
                            ? "support@weekend.com"
                            : "support@volley.tv"),

                    // Session/Game context
                    gameId: sdk.gameId,
                    userId: sdk.userId,
                    clientId: sdk.clientId,
                    sessionId: sdk.sessionId,
                    hubSessionId: sdk.hubSessionId,
                    micPermission: sdk.micPermission,
                    roomCode: sdk.roomCode,
                    scene: sdk.scene,
                    playerNumber: sdk.playerNumber,
                    datadogSessionReplayLink: sdk.datadogSessionReplayLink,

                    // Device/platform
                    model: sdk.model,
                    os: sdk.os,
                    browser: sdk.browser,
                    userAgent: sdk.userAgent ?? window.navigator.userAgent,
                    inferredDeviceName: sdk.inferredDeviceName,
                    rokuDeviceId: sdk.rokuDeviceId,
                    rokuModel: sdk.rokuModel,
                    rokuOsVersion: sdk.rokuOsVersion,
                    deviceId: sdk.deviceId,
                    manufacturer: sdk.manufacturer,
                    osVersion: sdk.osVersion,
                    webViewVersion: sdk.webViewVersion,
                    platform: sdk.platform,
                    networkType: sdk.networkType,
                    networkEffectiveType: sdk.networkEffectiveType,

                    // Game context (extra info from game)
                    ...(context?.gameContext
                        ? { gameContext: context.gameContext }
                        : {}),
                }

                logger.info("MobileHub SupportOverlay rawPayload", {
                    rawPayload,
                })

                // Filter out undefined values
                const payload = Object.fromEntries(
                    Object.entries(rawPayload).filter(
                        ([, value]) => value !== undefined
                    )
                )

                logger.info("MobileHub SupportOverlay payload", {
                    payload,
                })

                const requestBody = JSON.stringify(payload)
                logger.info("MobileHub SupportOverlay request", {
                    url: customerSupportEndpoint,
                    body: requestBody,
                })

                const response = await fetch(customerSupportEndpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: requestBody,
                })

                if (!response.ok) {
                    throw new Error(`Failed with status ${response.status}`)
                }

                track(MobileHubEventName.WEB_APP_BUTTON_PRESSED, {
                    eventCategory: EVENT_CATEGORY,
                    eventSubCategory: EVENT_SUB_CATEGORY,
                    choiceValue: "Submit",
                    displayChoices: DISPLAY_CHOICES,
                    screenDisplayedId: screenDisplayedIdRef.current ?? uuidv4(),
                    text: formState.issue,
                })

                setSuccess(true)
                setCountdown(3)
            } catch (_err) {
                setError("Something went wrong. Please try again.")
                track("Error Occurred", {
                    errorId: "support-submission-failed",
                })
            } finally {
                setSubmitting(false)
            }
        },
        [
            context,
            customerSupportEndpoint,
            formState,
            submitting,
            support,
            track,
            weekendRebrandActive,
        ]
    )

    if (!open) {
        return null
    }

    return (
        <div className={styles.overlay} role="dialog" aria-modal>
            <div className={styles.modal}>
                <button
                    type="button"
                    className={styles.closeButton}
                    onClick={handleCancel}
                    aria-label="Close support form"
                >
                    ×
                </button>
                <h1 className={styles.title}>Support</h1>
                <p className={styles.description}>
                    Need help? Submit a support request and we&apos;ll get back
                    to you soon.
                </p>
                <form
                    className={styles.form}
                    onSubmit={(e): void => {
                        void handleSubmit(e)
                    }}
                >
                    <Label htmlFor="support-game">Game</Label>
                    <Select
                        id="support-game"
                        name="game"
                        value={formState.game}
                        onChange={(e) => handleChange("game", e)}
                        required
                        options={[
                            { value: "", label: "Select a game" },
                            ...computedGames.map((game) => ({
                                value: game,
                                label: game,
                            })),
                        ]}
                    />

                    <Label htmlFor="support-issue">Issue Type</Label>
                    <Select
                        id="support-issue"
                        name="issue"
                        value={formState.issue}
                        onChange={(e) => handleChange("issue", e)}
                        required
                        options={[
                            { value: "", label: "Select an issue" },
                            ...ISSUES.map((issue) => ({
                                value: issue,
                                label: issue,
                            })),
                        ]}
                    />

                    <Label htmlFor="support-body">Description</Label>
                    <textarea
                        id="support-body"
                        className={styles.textarea}
                        value={formState.body}
                        onChange={(e) => handleChange("body", e)}
                        placeholder="Please describe your issue in detail..."
                        required
                    />

                    <Label htmlFor="support-email">Email</Label>
                    <input
                        id="support-email"
                        className={styles.input}
                        type="email"
                        value={formState.email}
                        onChange={(e) => handleChange("email", e)}
                        placeholder="your.email@example.com"
                        required
                    />

                    <details className={styles.context}>
                        <summary className={styles.contextTitle}>
                            Technical details
                        </summary>
                        <pre>{technicalDetails}</pre>
                    </details>

                    {error ? (
                        <div className={`${styles.feedback} ${styles.error}`}>
                            {error}
                        </div>
                    ) : null}

                    {success ? (
                        <div className={`${styles.feedback} ${styles.success}`}>
                            Thank you! We will reply back soon.
                            {countdown !== null ? (
                                <div className={styles.countdown}>
                                    Closing in {countdown}s...
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    <div className={styles.actions}>
                        <button
                            ref={focusRef}
                            type="submit"
                            className={`${styles.button} ${styles.primaryButton}`}
                            disabled={
                                submitting ||
                                !formState.game ||
                                !formState.issue ||
                                !formState.body ||
                                !formState.email
                            }
                        >
                            {submitting ? "Submitting…" : "Submit"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
