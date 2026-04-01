import { useCallback, useEffect, useRef } from "react"

import { logger } from "../utils/logger"

export type NativeMessages = "nativeFocusIn" | "nativeFocusOut"

export let lastFocus = true
/**
 * Will initially call the function matching the last focus state.
 * On unmount will call blur.
 * @param onFocus
 * @param onBlur
 */
export const useNativeFocus = (
    onFocus: () => void,
    onBlur: () => void
): void => {
    const lastLocalFocusState = useRef(lastFocus)
    const handleOnFocus = useCallback(() => {
        if (!lastLocalFocusState.current) {
            onFocus()
        }
        lastFocus = true
        lastLocalFocusState.current = true
    }, [onFocus])

    const handleOnBlur = useCallback(() => {
        if (lastLocalFocusState.current) {
            onBlur()
        }
        lastFocus = false
        lastLocalFocusState.current = false
    }, [onBlur])

    useEffect(() => {
        if (lastFocus) {
            onFocus()
        } else {
            onBlur()
        }
    }, [onFocus, onBlur])

    useEffect(() => {
        const messageHandler = (e: MessageEvent): void => {
            if (
                e.origin !== window.location.origin ||
                typeof e.data !== "string"
            ) {
                return
            }

            const data = e.data
            switch (data) {
                case "nativeFocusIn":
                    handleOnFocus()
                    break
                case "nativeFocusOut":
                    handleOnBlur()
                    break
                default:
                    logger.info("AudioManager ignoring message", { data })
            }
        }

        const visChange = (): void => {
            if (document.visibilityState === "visible") {
                handleOnFocus()
            } else {
                handleOnBlur()
            }
        }

        window.addEventListener("message", messageHandler)
        document.addEventListener("visibilitychange", visChange)
        window.addEventListener("blur", handleOnBlur)
        window.addEventListener("focus", handleOnFocus)

        return (): void => {
            window.removeEventListener("message", messageHandler)
            document.removeEventListener("visibilitychange", visChange)
            window.removeEventListener("blur", handleOnBlur)
            window.removeEventListener("focus", handleOnFocus)
        }
    }, [handleOnBlur, handleOnFocus])
}
