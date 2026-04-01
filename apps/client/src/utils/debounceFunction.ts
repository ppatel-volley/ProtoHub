/**
 * Simple debounce function to prevent duplicate calls
 */
export const debounce = <Args extends unknown[]>(
    func: (...args: Args) => void,
    delay: number
): ((...args: Args) => void) => {
    let timeoutId: NodeJS.Timeout | null = null

    return (...args: Args) => {
        if (timeoutId) {
            clearTimeout(timeoutId)
        }

        timeoutId = setTimeout(() => {
            func(...args)
            timeoutId = null
        }, delay)
    }
}
