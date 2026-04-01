import { useEffect, useState } from "react"

import { BASE_URL } from "../config/envconfig"

/**
 * Game identifier. For now this is a plain string — Crucible game IDs
 * will come from the Registry API, not from a hard-coded enum.
 */
export type GameId = string

/**
 * An object representing a game, with various properties related to
 * the display and launch of the game.
 */
export interface Game {
    id: GameId
    title: string
    tileImageUrl: string
    /**
     * The URL of the game's hero image (shown fullscreen when hovering over the tile).
     */
    heroImageUrl: string
    /**
     * The URL of the game's video (shown fullscreen when hovering over the tile).
     */
    videoUrl?: string
    /**
     * The URL of the game's tile animation (shown when the tile is focused).
     */
    animationUri?: string
}

/**
 * Placeholder Foundry games with AI-generated artwork.
 * These will be replaced by Registry API + Bifrost prototype fetching.
 */
const PLACEHOLDER_GAMES: Game[] = [
    {
        id: "brain-blast",
        title: "Brain Blast",
        tileImageUrl: `${BASE_URL}assets/images/games/tiles/brain-blast.webp`,
        heroImageUrl: `${BASE_URL}assets/images/games/heroes/brain-blast.webp`,
    },
    {
        id: "cosmic-clash",
        title: "Cosmic Clash",
        tileImageUrl: `${BASE_URL}assets/images/games/tiles/cosmic-clash.webp`,
        heroImageUrl: `${BASE_URL}assets/images/games/heroes/cosmic-clash.webp`,
    },
    {
        id: "word-forge",
        title: "Word Forge",
        tileImageUrl: `${BASE_URL}assets/images/games/tiles/word-forge.webp`,
        heroImageUrl: `${BASE_URL}assets/images/games/heroes/word-forge.webp`,
    },
    {
        id: "rhythm-rush",
        title: "Rhythm Rush",
        tileImageUrl: `${BASE_URL}assets/images/games/tiles/rhythm-rush.webp`,
        heroImageUrl: `${BASE_URL}assets/images/games/heroes/rhythm-rush.webp`,
    },
    {
        id: "draw-duel",
        title: "Draw Duel",
        tileImageUrl: `${BASE_URL}assets/images/games/tiles/draw-duel.webp`,
        heroImageUrl: `${BASE_URL}assets/images/games/heroes/draw-duel.webp`,
    },
]

/**
 * Provides the ordered list of games for the carousel.
 * Currently returns placeholder games — will be wired to the Crucible Registry API.
 */
export const useGames = (): Game[] => {
    const [games, setGames] = useState<Game[]>([])

    useEffect(() => {
        // TODO: Fetch from Crucible Registry API + Bifrost prototypes
        setGames(PLACEHOLDER_GAMES)
    }, [])

    return games
}
