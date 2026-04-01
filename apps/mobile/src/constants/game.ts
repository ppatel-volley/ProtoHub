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

/**
 * The type of paywall that a game uses at the hub level.
 * - Soft: the hub will show a paywall when the user tries to launch the game,
 *   but if the subscription is declined the game will launch anyway.
 * - Hard: the hub will show a paywall when the user tries to launch the game,
 *   and the game will not launch if the subscription is declined.
 * - None: the hub will not show a paywall when the user tries to launch the game,
 *   and the game will launch.
 */
export enum PaywallType {
    Soft = "soft",
    Hard = "hard",
    None = "none",
}
