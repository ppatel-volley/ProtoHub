/**
 * Display status shown on a game tile.
 * - ComingSoon: game is not yet available
 * - Beta: game is in beta testing
 * - New: game was recently released
 */
export enum GameStatus {
    ComingSoon = "coming-soon",
    Beta = "beta",
    New = "new",
}

// GameId enum removed — Foundry uses dynamic string IDs from useGames.ts
// PaywallType removed — Foundry games are free (no subscription system)
