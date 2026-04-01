import { useEffect, useState } from "react"

const KONAMI_CODE = [
    "ArrowUp",
    "ArrowUp",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
]

export interface KonamiCodeState {
    currentIndex: number
    isComplete: boolean
    isEnteringCode: boolean
}

export const useKonamiCode = (
    onComplete: () => void
): {
    konamiState: KonamiCodeState
    resetKonami: () => void
} => {
    const [konamiState, setKonamiState] = useState<KonamiCodeState>({
        currentIndex: 0,
        isComplete: false,
        isEnteringCode: false,
    })

    const [enterPressCount, setEnterPressCount] = useState(0)

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent): void => {
            if (konamiState.isComplete && event.key === "Enter") {
                setEnterPressCount((prev) => prev + 1)

                // Prevent game launch only during completion state
                event.preventDefault()
                event.stopPropagation()
                event.stopImmediatePropagation()

                if (enterPressCount >= 1) {
                    onComplete()
                    setKonamiState({
                        currentIndex: 0,
                        isComplete: false,
                        isEnteringCode: false,
                    })
                    setEnterPressCount(0)
                }
                return
            }

            const expectedKey = KONAMI_CODE[konamiState.currentIndex]

            if (
                expectedKey &&
                event.key.toLowerCase() === expectedKey.toLowerCase()
            ) {
                const newIndex = konamiState.currentIndex + 1

                if (newIndex === KONAMI_CODE.length) {
                    setKonamiState({
                        currentIndex: newIndex,
                        isComplete: true,
                        isEnteringCode: true,
                    })
                } else {
                    setKonamiState({
                        currentIndex: newIndex,
                        isComplete: false,
                        isEnteringCode: true,
                    })
                }
            } else if (konamiState.isEnteringCode) {
                setKonamiState({
                    currentIndex: 0,
                    isComplete: false,
                    isEnteringCode: false,
                })
            }
        }

        window.addEventListener("keydown", handleKeyDown, true)

        return (): void => {
            window.removeEventListener("keydown", handleKeyDown, true)
        }
    }, [konamiState, enterPressCount, onComplete])

    const resetKonami = (): void => {
        setKonamiState({
            currentIndex: 0,
            isComplete: false,
            isEnteringCode: false,
        })
        setEnterPressCount(0)
    }

    return {
        konamiState,
        resetKonami,
    }
}

export { KONAMI_CODE }
