# Architecture Decisions

Short explanations for non-obvious design decisions in the Hub and Web Checkout codebases. These are things that look unusual or over-engineered but exist for specific reasons.

---

## Why is the Hub server so minimal?

The Hub server (`apps/server/`) uses the Voice Gaming Framework (VGF) with a single `MainMenuPhase` and essentially one action (`identity`). The state is a single `stateId` counter.

This is not vestigial — VGF provides the WebSocket infrastructure that the Hub client uses for multiplayer session management. The server acts as the session coordinator, not as a game logic server. Individual games have their own VGF rulesets with real phase/action complexity. Hub's server is intentionally thin because the Hub itself is a launcher, not a game.

The server deployment workflow (`deploy-server.yml`) was never activated in production. Hub was originally scaffolded similarly to other VGF apps (e.g. Song Quiz) with the expectation of independent server deployment, but during the development of the multiplayer system, game launch orchestration was moved into the platform layer and the concept of hosting a game party in the Hub itself was descoped. The server workflow remains in the repo but has never been used.

---

## Why does Jeopardy have a page reload mechanism?

For not-fully-understood reasons, destroying the Jeopardy Iframe does not free all its allocated memory. After several Jeopardy launches in a single session, the accumulated unreclaimable WASM memory causes out-of-memory crashes, especially on memory-constrained TV devices.

The workaround: `GameLauncher` tracks the number of Jeopardy launches per session via `sessionStorage`. When the count reaches a configurable threshold (controlled by the `JeopardyReloadThreshold` experiment flag, default: 10), the launcher calls `triggerJeopardyReload()` which sets a `sessionStorage` flag and reloads the page. On the next load, `useIsJeopardyReload()` detects the flag and the app skips the loading screen, going directly to the Jeopardy launch.

Relevant code:
- `useGameLauncher.ts` — threshold check and reload trigger
- `useIsJeopardyReload.ts` — reload detection and flag consumption
- `experimentSchemata.ts` — `JeopardyReloadThreshold` schema

---

## Why are safe-area values passed via URL parameters to iframes?

CSS `env(safe-area-inset-*)` values are not accessible inside iframes — they only exist in the top-level document. On TVs with curved screens or overscan (LG, Samsung), games running inside iframes need to know the safe area to avoid rendering content behind the screen edges.

The solution: the Hub client reads the safe-area values from CSS via `getSafeAreaValues()`, serializes them as JSON, and appends them as a `safeArea` query parameter on the game iframe URL. The game iframe controller reads this parameter and applies the values.

Relevant code:
- `config/getSafeAreaValues.ts` — reads CSS env values
- `config/gameIframeControllerUrl.ts` — appends values to iframe URL

---

## Why does the experiment system use Zod validation?

Amplitude Experiment payloads are arbitrary JSON configured in a dashboard. A misconfigured payload (wrong type, missing field, unexpected structure) could crash the client at runtime. Zod schemas in `experimentSchemata.ts` validate payloads at read time, catching configuration errors before they reach application code.

The validation happens inside `ExperimentManager.getVariant()`. If a payload fails validation, Zod throws a parse error which is caught and logged, and `undefined` is returned instead. This means a bad experiment configuration degrades gracefully to "no experiment" rather than crashing.

---

## Why does game launching have a circuit breaker?

`GameLauncher` implements a circuit breaker pattern to prevent cascading failures when the Platform SDK's game orchestration service is down or degraded.

After 3 consecutive launch failures (configurable), all launch attempts are blocked for a 30-second cooldown. Without this, a user repeatedly tapping a game tile during an outage would hammer the orchestration service and flood error logs.

There's also a rate limiter (minimum 2 seconds between launches) to prevent double-tap launches.

---


## Why do web checkout platforms use hard paywalls?

On platforms that use web checkout (LG, Samsung, Web), all soft paywalls are upgraded to hard paywalls via `applyPlatformPaywallRules()` in `useGames.ts`.

On FireTV, the native Amazon payment flow allows games to more easily integrate payment flows than LG/Samsung, which require the web checkout flow, which (as of Q1 2026) has not been implemented in the games. On these platforms, we need a hard paywall in the hub.