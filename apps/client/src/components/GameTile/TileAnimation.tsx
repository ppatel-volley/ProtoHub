import { useEffect, useRef, useState } from "react"

import styles from "./GameTile.module.scss"

export const TILE_ANIMATION_START_DELAY_MS = 600

interface TileAnimationProps {
    isFocused: boolean
    src: string
    isCarouselActive?: boolean
}

export const TileAnimation: React.FC<TileAnimationProps> = ({
    isFocused,
    src,
    isCarouselActive,
}) => {
    const imgRef = useRef<HTMLImageElement>(null)
    const timeoutRef = useRef<number | undefined>(undefined)
    const [shouldShowAnimation, setShouldShowAnimation] = useState(false)
    const [cacheBustedSrc, setCacheBustedSrc] = useState("")

    useEffect(() => {
        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current)
            timeoutRef.current = undefined
        }

        setShouldShowAnimation(false)
        setCacheBustedSrc("")

        if (isFocused && isCarouselActive) {
            timeoutRef.current = window.setTimeout(() => {
                const newCacheBustedSrc = `${src}${
                    src.includes("?") ? "&" : "?"
                }_t=${Date.now()}`
                setCacheBustedSrc(newCacheBustedSrc)
                setShouldShowAnimation(true)
                timeoutRef.current = undefined
            }, TILE_ANIMATION_START_DELAY_MS)
        }

        return (): void => {
            if (timeoutRef.current) {
                window.clearTimeout(timeoutRef.current)
                timeoutRef.current = undefined
            }
        }
    }, [isFocused, isCarouselActive, src])

    if (!shouldShowAnimation) return null

    return (
        <div className={styles.tileAnimation}>
            <div>
                <img
                    ref={imgRef}
                    src={cacheBustedSrc}
                    loading="eager"
                    decoding="async"
                    data-testid="tile-animation"
                />
            </div>
        </div>
    )
}
