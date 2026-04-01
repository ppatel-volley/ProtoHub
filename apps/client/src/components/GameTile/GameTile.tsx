import { type JSX, useState } from "react"

import type { GameId } from "../../hooks/useGames"
import { type Game } from "../../hooks/useGames"
import { useSelectionAudio } from "../../utils/AudioManager"
import { FallbackImage } from "../FallbackImage"
import { FocusableItem } from "../FocusableUI/FocusableItem"
import styles from "./GameTile.module.scss"
import { StatusBanner } from "./StatusBanner"
import { TileAnimation } from "./TileAnimation"

interface GameTileProps {
    index: number
    game: Game
    onFocus: (element: HTMLDivElement) => void
    onSelect: () => void
    isCarouselActive: boolean
    isPressed: boolean
    onBlur: (state: null | GameId) => void
}

export const GameTile = ({
    index,
    game,
    onFocus,
    onSelect,
    isCarouselActive,
    isPressed,
    onBlur,
}: GameTileProps): JSX.Element => {
    const [isFocused, setIsFocused] = useState(false)

    const handleFocus = (element: HTMLDivElement): void => {
        setIsFocused(true)
        onFocus(element)
    }

    const handleBlur = (): void => {
        setIsFocused(false)
        onBlur(null)
    }
    const selectionSound = useSelectionAudio()

    const handleSelect = (): void => {
        selectionSound.stop()
        selectionSound.play()
        onSelect()
    }

    const handleAnimationEnd = (
        e: React.AnimationEvent<HTMLDivElement>
    ): void => {
        if (e.animationName === "pressScale") {
            onBlur(null)
        }
    }

    const tileClassName = `${styles.gameTile} ${isPressed ? styles.pressed : ""}`

    return (
        <FocusableItem
            focusKey={`game-tile-${index}`}
            className={tileClassName}
            focusedClassName={styles.focused}
            focusable={isCarouselActive}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onEnterPress={handleSelect}
            onClick={handleSelect}
            onAnimationEnd={handleAnimationEnd}
            dataAttributes={{ index: index.toString() }}
        >
            <a href="#" onClick={(e) => e.preventDefault()}>
                <FallbackImage
                    src={game.tileImageUrl}
                    alt={`Game ${index + 1}`}
                />
                {game.status && <StatusBanner status={game.status} />}
                {game.animationUri && (
                    <TileAnimation
                        isFocused={isFocused}
                        src={game.animationUri}
                        isCarouselActive={isCarouselActive}
                    />
                )}
            </a>
        </FocusableItem>
    )
}
