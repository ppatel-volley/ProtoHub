import { useEffect, useState } from "react"

interface FocusDebugInfo {
    activeElement: string
    activeElementId: string | null
    activeElementClass: string | null
    activeElementTagName: string | null
    hasFocus: boolean
    windowFocused: boolean
    documentVisibility: string
}

export const UPDATE_INTERVAL_MS = 1000

export const useFocusDebug = (): FocusDebugInfo => {
    const [focusInfo, setFocusInfo] = useState<FocusDebugInfo>({
        activeElement: "none",
        activeElementId: null,
        activeElementClass: null,
        activeElementTagName: null,
        hasFocus: false,
        windowFocused: true,
        documentVisibility: "visible",
    })

    useEffect(() => {
        const updateFocusInfo = (): void => {
            const activeEl = document.activeElement
            const hasFocus = document.hasFocus()

            let elementDescription = "none"
            let elementId = null
            let elementClass = null
            let elementTagName = null

            if (activeEl) {
                elementTagName = activeEl.tagName?.toLowerCase() || null
                elementId = activeEl.id || null
                elementClass =
                    typeof activeEl.className === "string"
                        ? activeEl.className
                        : null

                if (activeEl.id) {
                    elementDescription = `#${activeEl.id}`
                } else if (
                    typeof activeEl.className === "string" &&
                    activeEl.className
                ) {
                    const classes = activeEl.className
                        .split(" ")
                        .filter(Boolean)
                    if (classes.length > 0) {
                        elementDescription = `.${classes[0]}`
                    }
                } else if (activeEl.tagName) {
                    elementDescription = activeEl.tagName?.toLowerCase() || ""
                }

                const dataFocusKey = activeEl.getAttribute("data-focus-key")
                if (dataFocusKey) {
                    elementDescription += ` [${dataFocusKey}]`
                }

                const dataIndex = activeEl.getAttribute("data-index")
                if (dataIndex) {
                    elementDescription += ` (${dataIndex})`
                }
            }

            setFocusInfo((prev) => ({
                ...prev,
                activeElement: elementDescription,
                activeElementId: elementId,
                activeElementClass: elementClass,
                activeElementTagName: elementTagName,
                hasFocus,
                documentVisibility: document.visibilityState,
            }))
        }

        const handleWindowFocus = (): void => {
            setFocusInfo((prev) => ({ ...prev, windowFocused: true }))
            updateFocusInfo()
        }

        const handleWindowBlur = (): void => {
            setFocusInfo((prev) => ({ ...prev, windowFocused: false }))
        }

        const handleVisibilityChange = (): void => {
            setFocusInfo((prev) => ({
                ...prev,
                documentVisibility: document.visibilityState,
            }))
        }

        updateFocusInfo() // Initial update

        document.addEventListener("focusin", updateFocusInfo, true)
        document.addEventListener("focusout", updateFocusInfo, true)

        window.addEventListener("focus", handleWindowFocus)
        window.addEventListener("blur", handleWindowBlur)

        document.addEventListener("visibilitychange", handleVisibilityChange)

        const interval = setInterval(updateFocusInfo, UPDATE_INTERVAL_MS)

        return (): void => {
            document.removeEventListener("focusin", updateFocusInfo, true)
            document.removeEventListener("focusout", updateFocusInfo, true)
            window.removeEventListener("focus", handleWindowFocus)
            window.removeEventListener("blur", handleWindowBlur)
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            )
            clearInterval(interval)
        }
    }, [])

    return focusInfo
}
