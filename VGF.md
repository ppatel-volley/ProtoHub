# Volley Games Framework (VGF)

(aka Very Good Framework)

VGF is a powerful framework that allows developers to build multiplayer voice-controlled games quickly by abstracting the socket communication layer between connected clients in a party. It provides an opinionated way to architect games in code, handling state synchronization and action dispatching between server and clients.

## Core Concepts

VGF abstracts away the complexity of real-time multiplayer game development by:
- Managing socket connections between clients in a party
- Synchronizing game state across all clients
- Providing a structured way to define game logic through phases and actions
- Handling voice input and audio output through sequencing


## How it Works

1. The server defines game logic with phases and actions
2. Clients connect to the server via WebSockets
3. When a client dispatches an action, it's sent to the server
4. The server processes the action, updates the game state, and broadcasts to all clients
5. All clients receive the updated state and re-render accordingly

VGF handles all the complexities of state management, networking, and synchronization, allowing developers to focus on building engaging game experiences.


## Game Definition

Games in VGF are defined by a ruleset object that specifies setup, actions, and phases:

```typescript
import type { IGameRuleset } from "@volley/vgf/types"
import { Phase, type GameState } from "./shared/types"

export const SongQuizGame = {
    // Function to set up initial game state
    setup: setupGameState,
    
    // Global actions that can be triggered in any phase
    actions: {},
    
    // Phase-specific logic and actions
    phases: {
        [Phase.MainMenu]: MainMenuPhase,
        [Phase.PlaylistSelection]: PlaylistSelectionPhase,
        [Phase.Matchmaking]: MatchmakingPhase,
        [Phase.SongGuess]: SongGuessPhase,
        [Phase.SongGuessResults]: SongGuessResultsPhase,
        [Phase.GameResults]: GameResultsPhase,
    },
} as const satisfies IGameRuleset<GameState>
```

## Defining Phases and Actions (Server)

Phases are defined as objects that contain actions, conditions for phase transitions, and the next phase:

```typescript
import type { IPhase } from "@volley/vgf/types"
import type { GameMode, GameState } from "../../shared/types"
import { Phase } from "../../shared/types"

export const MainMenuPhase = {
    // Phase-specific actions
    actions: {
        SelectGameMode: {
            // Every action receives the current game state as the first parameter,
            // followed by any additional parameters needed for the action.
            // The action MUST return the updated game state.
            action: async (
                state: GameState,  // Current game state (always first parameter)
                gameMode: GameMode // Additional parameters from client
            ): Promise<GameState> => {
                // Return the updated game state
                return Promise.resolve({
                    ...state,
                    gameMode,
                })
            },
        },
    },
    // Condition to automatically transition to next phase
    endIf: (state): boolean => state.gameMode !== undefined,
    // The next phase to transition to
    next: Phase.PlaylistSelection,
} satisfies IPhase<GameState>
```

## Client Integration

> **Note**: Client-side VGF integration in the Hub is currently disabled. The hooks in `apps/client/src/hooks/VGF.ts` are commented out pending restoration. The server-side VGF ruleset is still active. The examples below show how VGF client integration works in other Volley games (e.g. Song Quiz) and would apply to Hub if re-enabled.

### VGF Provider

The VGF Provider component connects the client to the server and provides game state and actions to all child components:

```typescript
import { songQuizGameActions } from "@hub/server"
import type { GameState } from "@hub/server/types"
import { VGFProvider } from "@volley/vgf/client"
import React from "react"

// Wrap your application with the VGF Provider
<VGFProvider<GameState>
    gameActions={songQuizGameActions}
    host={BACKEND_SERVER_ENDPOINT}
    partyId={"party-123"}
    userId={"user-123"}
>
    <App />
</VGFProvider>
```

### Using Actions (Client)

VGF provides hooks to access game state and dispatch actions from React components:

```typescript
import { useActions, useStateSync } from "../hooks"

const MyComponent = () => {
    // Get typed actions
    const dispatchAction = useDispatchAction()
    // Get synchronized game state
    const state = useStateSync()
    
    return (
        <button onClick={() => dispatchAction("SelectGameMode", "SOLO")}>
            Play Solo
        </button>
    )
}
```

### Sequencing Events (Client)

VGF provides a powerful sequencing system for coordinating audio, text, delays, and function calls:

```typescript
import { useSequence } from "@volley/vgf/sequencing"
import { BuildAudioSequenceEvent, BuildTextSequenceEvent } from "@volley/vgf/util"

const GameComponent = () => {
    // Run a sequence of events
    useSequence([
        // Play audio
        BuildAudioSequenceEvent("https://example.com/sound.mp3"),
        // Wait 2 seconds
        { type: SequenceEventType.DELAY, ms: 2000 },
        // Text-to-speech
        BuildTextSequenceEvent("Welcome to Song Quiz!"),
        // Execute a function
        { 
            type: SequenceEventType.FUNCTION, 
            fn: () => console.log("Sequence complete!") 
        }
    ])
    
    return <div>Game Interface</div>
}
```
