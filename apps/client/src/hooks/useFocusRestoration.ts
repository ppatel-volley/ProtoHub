import { setFocus } from "@noriginmedia/norigin-spatial-navigation"
import { useCallback, useEffect, useRef } from "react"

import { useArrowPress } from "../components/FocusableUI/ArrowPressContext"
import { logger } from "../utils/logger"
import type { LaunchedGameState } from "./useLaunchedGameState"

interface UseFocusRestorationOptions {
    showExitModal: boolean
    showWeekendRebrandModal: boolean
    isCarouselActive: boolean
    launchedGameState: LaunchedGameState | null
    isInitialized: boolean
    isInUpsell: boolean
}

interface UseFocusRestorationResult {
    updateLastFocusedTile: (tileKey: string) => void
}

export const FOCUS_RECOVERY_FALLBACK_DELAY_MS = 100

/**
 * Restores spatial navigation focus to the last-focused game tile after
 * overlay dismissals (exit modal, weekend rebrand modal, upsell) and
 * game exits.
 *
 * Includes a TV-specific fallback: on Fire TV, LG, and Samsung, rapidly
 * pressing navigation keys while a game iframe is closing can cause the
 * page to lose `document.hasFocus()`. The fallback monitors for this
 * condition after a short delay and re-focuses both the window and the
 * target DOM element.
 *
 * Race condition protection: if the user presses an arrow key between
 * the restoration being scheduled (via `requestAnimationFrame`) and it
 * executing, restoration is skipped to avoid fighting the user's intent.
 */
export const useFocusRestoration = ({
    showExitModal,
    showWeekendRebrandModal,
    isCarouselActive,
    launchedGameState,
    isInitialized,
    isInUpsell,
}: UseFocusRestorationOptions): UseFocusRestorationResult => {
    const { arrowPressListeners } = useArrowPress()
    const lastFocusedTileRef = useRef<string>("game-tile-0")
    const prevIsCarouselActiveRef = useRef(isCarouselActive)
    const prevShowExitModalRef = useRef(showExitModal)
    const prevShowWeekendRebrandModalRef = useRef(showWeekendRebrandModal)
    const prevActiveGameRef = useRef(launchedGameState?.activeGame ?? null)
    const tvFocusRecoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const userHasNavigatedRef = useRef<boolean>(false)

    const currentIsCarouselActiveRef = useRef(isCarouselActive)
    const currentShowExitModalRef = useRef(showExitModal)
    const currentShowWeekendRebrandModalRef = useRef(showWeekendRebrandModal)
    const currentIsInUpsellRef = useRef(isInUpsell)

    // Listen for arrow key presses to detect user navigation
    // This prevents focus restoration from interfering with user navigation
    useEffect(() => {
        const handleArrowPress = (): void => {
            userHasNavigatedRef.current = true
        }

        arrowPressListeners.current.add(handleArrowPress)
        const curr = arrowPressListeners.current
        return (): void => {
            curr.delete(handleArrowPress)
        }
    }, [arrowPressListeners])

    /**
     * It was observed that on TV platforms (FireTV, LG, Samsung), pressing navigation
     * keys quickly while exiting a game can cause the page to lose focus. This fallback
     * monitoring is used to restore focus to the last focused tile if the page does not
     * have focus after a brief delay after a game is exited.
     */
    const startTvFocusRecoveryFallbackMonitoring = useCallback((): void => {
        if (tvFocusRecoveryTimeoutRef.current) {
            clearTimeout(tvFocusRecoveryTimeoutRef.current)
        }

        tvFocusRecoveryTimeoutRef.current = setTimeout(() => {
            const currentHasFocus = document.hasFocus()
            const isVisible = document.visibilityState === "visible"
            const shouldMonitorFocus =
                currentIsCarouselActiveRef.current &&
                !currentShowExitModalRef.current &&
                !currentShowWeekendRebrandModalRef.current &&
                !currentIsInUpsellRef.current

            if (shouldMonitorFocus && isVisible && !currentHasFocus) {
                const tileToRestore = lastFocusedTileRef.current

                logger.warn(
                    `TV Focus Recovery: Page visible but no focus detected after ${FOCUS_RECOVERY_FALLBACK_DELAY_MS}ms. ` +
                        `Attempting to restore focus to ${tileToRestore}`
                )

                try {
                    window.focus()
                    setFocus(tileToRestore)

                    // Additionally, try to focus the actual DOM element to ensure document.hasFocus() returns true
                    const element = document.querySelector(
                        `[data-focus-key="${tileToRestore}"]`
                    )
                    if (element instanceof HTMLElement) {
                        element.focus()
                        logger.info(
                            `TV Focus Recovery: Re-focused ${tileToRestore} (DOM element focused)`
                        )
                    } else {
                        logger.info(
                            `TV Focus Recovery: Re-focused ${tileToRestore} (spatial nav only)`
                        )
                    }
                } catch (error) {
                    logger.error("TV Focus Recovery failed", error)
                }
            }
        }, FOCUS_RECOVERY_FALLBACK_DELAY_MS)
    }, [])

    useEffect(() => {
        currentIsCarouselActiveRef.current = isCarouselActive
        currentShowExitModalRef.current = showExitModal
        currentShowWeekendRebrandModalRef.current = showWeekendRebrandModal
        currentIsInUpsellRef.current = isInUpsell
    }, [isCarouselActive, showExitModal, showWeekendRebrandModal, isInUpsell])

    useEffect(() => {
        return (): void => {
            if (tvFocusRecoveryTimeoutRef.current) {
                clearTimeout(tvFocusRecoveryTimeoutRef.current)
            }
        }
    }, [])

    useEffect(() => {
        if (!isInitialized) {
            return
        }

        const gameJustEnded =
            launchedGameState === null && prevActiveGameRef.current !== null
        const exitModalJustClosed =
            prevShowExitModalRef.current && !showExitModal && isCarouselActive
        const weekendRebrandModalJustClosed =
            prevShowWeekendRebrandModalRef.current &&
            !showWeekendRebrandModal &&
            isCarouselActive
        const carouselJustActivated =
            !prevIsCarouselActiveRef.current &&
            isCarouselActive &&
            !showExitModal &&
            !showWeekendRebrandModal

        const shouldRestoreFocus =
            exitModalJustClosed ||
            weekendRebrandModalJustClosed ||
            carouselJustActivated ||
            (gameJustEnded &&
                !showExitModal &&
                !showWeekendRebrandModal &&
                isCarouselActive)

        if (shouldRestoreFocus) {
            const tileToFocus = lastFocusedTileRef.current
            let reason
            switch (true) {
                case exitModalJustClosed && carouselJustActivated:
                    reason = "exit modal close and carousel activation"
                    break
                case exitModalJustClosed:
                    reason = "exit modal close"
                    break
                case weekendRebrandModalJustClosed:
                    reason = "weekend rebrand modal close"
                    break
                case carouselJustActivated:
                    reason = "carousel activation"
                    break
                case gameJustEnded:
                    reason = "game ended"
                    break
            }
            userHasNavigatedRef.current = false

            requestAnimationFrame(() => {
                if (userHasNavigatedRef.current) {
                    logger.info(
                        `Skipping focus restoration to ${tileToFocus} after ${reason} - user has navigated`
                    )
                    return
                }

                logger.info(`Restoring focus to ${tileToFocus} after ${reason}`)
                setFocus(tileToFocus)
                startTvFocusRecoveryFallbackMonitoring()
            })
        }

        prevShowExitModalRef.current = showExitModal
        prevShowWeekendRebrandModalRef.current = showWeekendRebrandModal
        prevIsCarouselActiveRef.current = isCarouselActive
        prevActiveGameRef.current = launchedGameState?.activeGame ?? null
    }, [
        showExitModal,
        showWeekendRebrandModal,
        isCarouselActive,
        isInitialized,
        isInUpsell,
        launchedGameState?.activeGame,
        launchedGameState,
        startTvFocusRecoveryFallbackMonitoring,
    ])

    const updateLastFocusedTile = (tileKey: string): void => {
        lastFocusedTileRef.current = tileKey
        userHasNavigatedRef.current = true
    }

    return {
        updateLastFocusedTile,
    }
}
