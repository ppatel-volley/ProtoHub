# Game Lifecycle

How games get selected, launched, and monetized.

## Game Selection & Launch

| Hook | Purpose |
|------|---------|
| `useGames` | Builds the ordered game list from experiments, platform rules, and asset validation |
| `useGameLauncher` | `GameLauncher` class — orchestrates launches with rate limiting, circuit breaker, and Jeopardy reload |
| `useIsJeopardyReload` | Detects whether the current page load is a Jeopardy OOM-prevention reload |
| `useGameFocusHandler` | Manages focus behavior when a game tile is selected |
| `useLaunchedGameState` | State management for the currently launched game (URL, vitals, cleanup) |

### Game Launch Flow

```mermaid
graph TD
  UserSelect["User selects game"] --> Paywall[handleGamePaywall]
  Paywall --> NoPaywall["PaywallType.None - allow"]
  Paywall --> AlreadyPaid["Subscribed - allow"]
  Paywall --> ShowModal["Show upsell modal"]
  ShowModal --> SoftPaywall["Soft paywall - allow regardless"]
  ShowModal --> HardPaywall["Hard paywall - allow only on success"]
  NoPaywall --> Launch[GameLauncher.launchGame]
  AlreadyPaid --> Launch
  SoftPaywall --> Launch
  HardPaywall -->|success| Launch
  Launch --> JeopardyCheck["Jeopardy reload threshold check"]
  Launch --> CircuitBreaker["Circuit breaker check"]
  Launch --> RateLimit["Rate limit check"]
  Launch --> PlatformSDK["Platform SDK launchGame"]
  PlatformSDK --> RenderIframe["Set launched game state, render iframe"]
```

## Upsell & Subscription

The upsell system has multiple hooks that compose together. `useUpsell` is the unified entry point; the others are providers/implementations.

| Hook | Purpose |
|------|---------|
| `useUpsell` | Unified `subscribe()` interface — selects the right provider based on platform |
| `useImmediateUpsell` | Pre-roll upsell shown immediately after app init for unsubscribed users |
| `useGameSelectionUpsell` | Paywall enforcement when selecting a game |
| `useWebCheckoutUpsell` | Web checkout implementation — QR modal, sessionStorage payment sync |
| `useDevUpsell` | Dev-only mock upsell modal for testing |
| `useIsSubscribed` | Checks subscription status from Platform SDK |

### Upsell Provider Selection

```mermaid
graph TD
  UseUpsell["useUpsell()"] --> WebCheckoutPlatform{"LG / Samsung / Web / force-web-checkout?"}
  WebCheckoutPlatform -->|yes| WebCheckout["useWebCheckoutUpsell (QR code to pair.volley.tv)"]
  WebCheckoutPlatform -->|no| DevUpsell{"SHOULD_USE_DEV_UPSELL?"}
  DevUpsell -->|yes| DevModal["useDevUpsell (mock modal)"]
  DevUpsell -->|no| NativePayments["Platform SDK usePayments() (native flow)"]
```

### Upsell Timing

```mermaid
graph TD
  AppInit["App initialization"] --> ImmediateUpsell[useImmediateUpsell]
  ImmediateUpsell --> ImmediateCheck{"Not subscribed, not suppressed, no deeplink?"}
  ImmediateCheck -->|yes| ShowPreRoll["Show upsell (soft paywall)"]
  ImmediateCheck -->|no| SkipPreRoll["Skip"]
  ShowPreRoll --> LaunchAnyway["Show game carousel regardless of outcome"]
  GameSelect["User selects game"] --> GameSelectionUpsell[useGameSelectionUpsell]
  GameSelectionUpsell --> GameCheck{"Game has paywall, not subscribed?"}
  GameCheck -->|no| AllowLaunch["Allow launch"]
  GameCheck -->|yes| PaywallType{"Paywall type?"}
  PaywallType -->|soft| SoftUpsell["Show upsell, launch regardless"]
  PaywallType -->|hard| HardUpsell["Show upsell, block until success"]
  HardUpsell -->|subscribed| AllowLaunch
  HardUpsell -->|dismissed| BlockLaunch["Stay on carousel"]
```
