import { useCallback, useMemo } from "react"

import { debounce } from "../utils/debounceFunction"
import { forceGarbageCollection } from "../utils/forceGarbageCollection"
import { getMemoryUsage } from "../utils/getMemoryUsage"
import { logMemoryDelta } from "../utils/logMemoryDelta"

export const CLEANUP_DEBOUNCE_DELAY = 1000

/** Debounced memory cleanup that forces GC and logs delta. Use after heavy operations (e.g. unloading games) to reclaim memory on TV devices. */
export const useMemoryCleanup = (): {
    performMemoryCleanup: (context: string) => void
} => {
    const debouncedCleanup = useMemo(
        () =>
            debounce(
                (
                    context: string,
                    memoryBefore: ReturnType<typeof getMemoryUsage>
                ) => {
                    forceGarbageCollection()
                    logMemoryDelta(context, memoryBefore)
                },
                CLEANUP_DEBOUNCE_DELAY
            ),
        []
    )

    const performMemoryCleanup = useCallback(
        (context: string): void => {
            const memoryBefore = getMemoryUsage()
            debouncedCleanup(context, memoryBefore)
        },
        [debouncedCleanup]
    )

    return { performMemoryCleanup }
}
