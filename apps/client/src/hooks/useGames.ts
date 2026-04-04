import { useCallback, useEffect, useRef, useState } from "react"

import { BASE_URL, ENVIRONMENT } from "../config/envconfig"
import { Environment } from "../config/environment"
import { logger } from "../utils/logger"

/**
 * Game identifier. Dynamic string — Crucible game IDs come from the
 * Registry API, Bifrost prototype names, or local placeholders.
 */
export type GameId = string

/**
 * Where this game comes from. Controls the launch flow:
 * - "platform-api": Use Platform SDK gameOrchestration (default Hub games)
 * - "crucible": Published via Crucible Registry — direct URL launch
 * - "bifrost": Bifrost prototype — direct URL launch
 * - "placeholder": Local placeholder (no launch, display only)
 */
export type GameSource = "platform-api" | "crucible" | "bifrost" | "placeholder"

/**
 * An object representing a game, with various properties related to
 * the display and launch of the game.
 */
export interface Game {
    id: GameId
    title: string
    tileImageUrl: string
    /** The URL of the game's hero image (shown fullscreen when hovering). */
    heroImageUrl: string
    /** The URL of the game's video (shown fullscreen when hovering). */
    videoUrl?: string
    /** The URL of the game's tile animation (shown when focused). */
    animationUri?: string
    /** Where this game comes from — determines the launch flow. */
    source: GameSource
    /** For crucible/bifrost games: the base deployment URL. */
    deploymentUrl?: string
    /** Display status badge on the tile (e.g. "beta" for prototypes). */
    status?: "coming-soon" | "beta" | "new"
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Registry API and Bifrost API URLs from runtime config.
 */
const REGISTRY_API_URL = window.APP_CONFIG?.CRUCIBLE_REGISTRY_API_URL ?? null
const BIFROST_API_URL = window.APP_CONFIG?.BIFROST_API_URL ?? null

const POLL_INTERVAL_MS = 15_000

function getEnvSlug(): string {
    switch (ENVIRONMENT) {
        case Environment.PRODUCTION:
            return "prod"
        case Environment.STAGING:
            return "staging"
        default:
            return "dev"
    }
}

// ---------------------------------------------------------------------------
// Default tile/hero for prototypes without custom artwork
// ---------------------------------------------------------------------------

const DEFAULT_PROTOTYPE_TILE = `${BASE_URL}assets/images/games/tiles/default-prototype.webp`
const DEFAULT_PROTOTYPE_HERO = `${BASE_URL}assets/images/games/heroes/default-prototype.webp`

// ---------------------------------------------------------------------------
// Placeholder Foundry games (shown when APIs are not configured)
// ---------------------------------------------------------------------------

// Known Bifrost prototypes — hardcoded until the Bifrost API is externally
// accessible (currently resolves to private 10.x IPs, unreachable from Fire TV).
// These will be replaced by live API data once Cole adds an external ingress.
const KNOWN_BIFROST_GAMES: Game[] = [
    {
        id: "word-smiths",
        title: "Word Smiths",
        tileImageUrl: `${BASE_URL}assets/images/games/tiles/word-smiths.webp`,
        heroImageUrl: `${BASE_URL}assets/images/games/heroes/word-smiths.webp`,
        source: "bifrost",
        deploymentUrl: "https://word-smiths.volley-services.net",
        status: "beta",
    },
    {
        id: "space-invaders",
        title: "Space Invaders",
        tileImageUrl: `${BASE_URL}assets/images/games/tiles/space-invaders.webp`,
        heroImageUrl: `${BASE_URL}assets/images/games/heroes/space-invaders.webp`,
        source: "bifrost",
        deploymentUrl: "https://space-invaders.volley-services.net",
        status: "beta",
    },
    {
        id: "tictactoe",
        title: "Tic-Tac-Toe",
        tileImageUrl: `${BASE_URL}assets/images/games/tiles/tictactoe.webp`,
        heroImageUrl: `${BASE_URL}assets/images/games/heroes/tictactoe.webp`,
        source: "bifrost",
        deploymentUrl: "https://tictactoe.volley-services.net",
        status: "beta",
    },
]

const PLACEHOLDER_GAMES: Game[] = [
    {
        id: "brain-blast",
        title: "Brain Blast",
        tileImageUrl: `${BASE_URL}assets/images/games/tiles/brain-blast.webp`,
        heroImageUrl: `${BASE_URL}assets/images/games/heroes/brain-blast.webp`,
        source: "placeholder",
    },
    {
        id: "cosmic-clash",
        title: "Cosmic Clash",
        tileImageUrl: `${BASE_URL}assets/images/games/tiles/cosmic-clash.webp`,
        heroImageUrl: `${BASE_URL}assets/images/games/heroes/cosmic-clash.webp`,
        source: "placeholder",
    },
    {
        id: "word-forge",
        title: "Word Forge",
        tileImageUrl: `${BASE_URL}assets/images/games/tiles/word-forge.webp`,
        heroImageUrl: `${BASE_URL}assets/images/games/heroes/word-forge.webp`,
        source: "placeholder",
    },
    {
        id: "rhythm-rush",
        title: "Rhythm Rush",
        tileImageUrl: `${BASE_URL}assets/images/games/tiles/rhythm-rush.webp`,
        heroImageUrl: `${BASE_URL}assets/images/games/heroes/rhythm-rush.webp`,
        source: "placeholder",
    },
    {
        id: "draw-duel",
        title: "Draw Duel",
        tileImageUrl: `${BASE_URL}assets/images/games/tiles/draw-duel.webp`,
        heroImageUrl: `${BASE_URL}assets/images/games/heroes/draw-duel.webp`,
        source: "placeholder",
    },
]

// ---------------------------------------------------------------------------
// API Fetchers
// ---------------------------------------------------------------------------

interface RegistryGameEntry {
    gameId: string
    displayName: string
    description?: string
    environments?: Record<
        string,
        { status: string; imageTag?: string }
    >
    tile?: { imageUrl?: string; heroImageUrl?: string }
}

interface BifrostPrototype {
    name: string
    displayName?: string
    phase: string
    hostname?: string
    port?: number
}

/**
 * Fetch published games from the Crucible Registry API.
 */
async function fetchRegistryGames(apiUrl: string): Promise<Game[]> {
    const response = await fetch(`${apiUrl}/games`)
    if (!response.ok) {
        throw new Error(`Registry API ${response.status}: ${response.statusText}`)
    }
    const data = (await response.json()) as { games: RegistryGameEntry[] }
    if (!Array.isArray(data.games)) {
        logger.warn("Registry API response missing 'games' array", data)
        return []
    }
    return data.games.map((entry) => ({
        id: entry.gameId,
        title: entry.displayName ?? entry.gameId,
        tileImageUrl: entry.tile?.imageUrl ?? DEFAULT_PROTOTYPE_TILE,
        heroImageUrl: entry.tile?.heroImageUrl ?? DEFAULT_PROTOTYPE_HERO,
        source: "crucible" as const,
        deploymentUrl: `https://crucible-games-${getEnvSlug()}.volley-services.net/${entry.gameId}`,
    }))
}

/**
 * Fetch running prototypes from the Bifrost API.
 */
async function fetchBifrostPrototypes(apiUrl: string): Promise<Game[]> {
    const response = await fetch(`${apiUrl}/prototypes`)
    if (!response.ok) {
        throw new Error(`Bifrost API ${response.status}: ${response.statusText}`)
    }
    const data = (await response.json()) as {
        prototypes: BifrostPrototype[]
    }
    if (!Array.isArray(data.prototypes)) {
        logger.warn("Bifrost API response missing 'prototypes' array", data)
        return []
    }
    return data.prototypes
        .filter((p) => p.phase === "Running" && p.hostname)
        .map((p) => ({
            id: p.name,
            title: p.displayName ?? p.name,
            tileImageUrl: DEFAULT_PROTOTYPE_TILE,
            heroImageUrl: DEFAULT_PROTOTYPE_HERO,
            source: "bifrost" as const,
            deploymentUrl: p.hostname
                ? `https://${p.hostname}`
                : undefined,
            status: "beta" as const,
        }))
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Provides the ordered list of games for the carousel.
 *
 * Merges games from three sources:
 * 1. Crucible Registry API (published games)
 * 2. Bifrost API (running prototypes)
 * 3. Placeholder games (fallback when APIs are not configured)
 *
 * Re-fetches on a 15-second interval so new games/prototypes appear quickly.
 */
export const useGames = (): Game[] => {
    const [games, setGames] = useState<Game[]>([])
    const mountedRef = useRef(true)

    const fetchGames = useCallback(async () => {
        const allGames: Game[] = []

        // 1. Registry API (published Crucible games)
        if (REGISTRY_API_URL) {
            try {
                const registryGames = await fetchRegistryGames(REGISTRY_API_URL)
                allGames.push(...registryGames)
            } catch (err) {
                logger.warn("Failed to fetch Registry API games", err)
            }
        }

        // 2. Bifrost API (running prototypes)
        if (BIFROST_API_URL) {
            try {
                const prototypes = await fetchBifrostPrototypes(BIFROST_API_URL)
                allGames.push(...prototypes)
            } catch (err) {
                logger.warn("Failed to fetch Bifrost prototypes", err)
            }
        }

        // 3. If no Bifrost API games, use known prototypes as fallback
        const hasBifrostGames = allGames.some((g) => g.source === "bifrost")
        if (!hasBifrostGames) {
            allGames.push(...KNOWN_BIFROST_GAMES)
        }

        // 4. Always include placeholder games for variety
        allGames.push(...PLACEHOLDER_GAMES)

        if (mountedRef.current) {
            // Only update state if the game list actually changed
            // (avoids re-render cascade that resets selected game on poll)
            setGames((prev) => {
                const prevIds = prev.map((g) => g.id).join(",")
                const nextIds = allGames.map((g) => g.id).join(",")
                return prevIds === nextIds ? prev : allGames
            })
        }
    }, [])

    useEffect(() => {
        mountedRef.current = true
        fetchGames()

        // Poll for new games/prototypes
        const interval = setInterval(fetchGames, POLL_INTERVAL_MS)

        return () => {
            mountedRef.current = false
            clearInterval(interval)
        }
    }, [fetchGames])

    return games
}
