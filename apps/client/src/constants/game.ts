/**
 * Unique identifier for each game available in the hub.
 */
export enum GameId {
    Jeopardy = "jeopardy",
    SongQuiz = "song-quiz",
    CoComelon = "cocomelon",
    WheelOfFortune = "wheel-of-fortune",
    WitsEnd = "wits-end",
}

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

// PaywallType removed — Proto-Hub games are free (no subscription system)
