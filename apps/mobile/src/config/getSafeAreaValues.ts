type SafeAreaValues = {
    top: string
    bottom: string
    left: string
    right: string
}

/**
 * Reads safe area inset values from CSS custom properties (overscan, notches on TV platforms).
 * Returns top, bottom, left, right as strings from --safe-area-inset-* variables.
 */
export function getSafeAreaValues(): SafeAreaValues {
    const styles = getComputedStyle(document.documentElement)

    const safeAreaInsetTop = styles.getPropertyValue("--safe-area-inset-top")
    const safeAreaInsetBottom = styles.getPropertyValue(
        "--safe-area-inset-bottom"
    )
    const safeAreaInsetLeft = styles.getPropertyValue("--safe-area-inset-left")
    const safeAreaInsetRight = styles.getPropertyValue(
        "--safe-area-inset-right"
    )

    return {
        top: safeAreaInsetTop,
        bottom: safeAreaInsetBottom,
        left: safeAreaInsetLeft,
        right: safeAreaInsetRight,
    }
}
