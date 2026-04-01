export const GameIdConstant = {
    Hub: "hub",
    SongQuiz: "song-quiz",
    Jeopardy: "jeopardy",
    CoComelon: "cocomelon",
    WheelOfFortune: "wheel-of-fortune",
} as const

export const GameId = {
    jeopardy: "jeopardy",
    "song-quiz": "song-quiz",
    cocomelon: "cocomelon",
    hub: "hub",
    "wheel-of-fortune": "wheel-of-fortune",
} as const

export const HUB_EVENT_SCHEMA_MAP = {
    "Hub Screen Displayed": {},
    "Hub Button Pressed": {},
}
