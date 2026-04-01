# Hub Client

This folder contains the code for the TV Hub. The mobile hub (controller) and app download page have been extracted to `apps/mobile/`.

## Getting Started

_Please refer to the root [README](../../README.md) for information on how to start the application._

1. Set up environment variables:
    - Copy `.env.template` to create your environment file for the environment you are working in `.env`
    - Ask a teammate for a PrivateBin drop with the required environment secrets
    - For agentic tests, add `OPENAI_API_KEY=sk-...` (get from https://platform.openai.com/api-keys)

## Development Tools

### Dev Overrides

URL parameters for testing specific behaviors in non-production environments. See the [full dev overrides reference](docs/dev-overrides.md) for all available parameters.

The overrides are implemented in `src/config/devOverrides.ts` and require a non-production environment.

## Game Iframe Integration

The Hub Client renders games within iframes using the `GameIframeController` component. This architecture allows games to run in isolation while the hub maintains control over the overall user experience.

### Safe Area Support

One of the key challenges with iframe-based games is that **iframes cannot access CSS `env()` safe-area values from their parent document**. This is a web platform limitation that affects how games display on devices with notches, curved edges, or other screen intrusions.

#### How Safe Areas Work

The client handles safe areas through a two-step process:

1. **Safe Area Detection**: The `getSafeAreaValues()` function reads CSS custom properties that contain safe area inset values:

    ```typescript
    // Reads CSS variables like --safe-area-inset-top, --safe-area-inset-bottom, etc.
    const safeAreaValues = getSafeAreaValues()
    ```

2. **Query Parameter Propagation**: When constructing iframe URLs, the client appends safe area values as query parameters:
    ```typescript
    // From gameIframeControllerUrl.ts
    const url = new URL(queryParamUrl)
    url.searchParams.set("safeArea", JSON.stringify(safeAreaValues))
    ```

#### Why This Approach

-   **Iframe Limitation**: Iframes cannot access `env(safe-area-inset-*)` CSS values from their parent
-   **Cross-Origin Safety**: Games running in iframes may be on different domains, especially when running locally
-   **Consistent UI**: Games need safe area information to avoid rendering content in unsafe areas
-   **Platform Compatibility**: Works across different TV platforms (Fire TV, Android TV, etc.)

#### Safe Area Data Format

The safe area data is passed as a JSON-encoded query parameter with the following structure:

```typescript
type SafeAreaValues = {
    top: string // e.g., "44px"
    bottom: string // e.g., "34px"
    left: string // e.g., "0px"
    right: string // e.g., "0px"
}
```

#### Usage in Games

Games receive the safe area data via the `safeArea` query parameter and can parse it to apply appropriate margins or padding:

```javascript
// Example game-side implementation
const urlParams = new URLSearchParams(window.location.search)
const safeAreaData = JSON.parse(urlParams.get("safeArea") || "{}")

// Apply safe areas to game UI
document.documentElement.style.setProperty("--game-safe-top", safeAreaData.top)
document.documentElement.style.setProperty(
    "--game-safe-bottom",
    safeAreaData.bottom
)
// etc.
```

This ensures that game content avoids areas that may be obscured by device hardware or system UI elements.

## Agentic Tests

AI-powered browser testing using OpenAI's GPT-4o-mini. See [test/agentic/README.md](test/agentic/README.md) for full documentation.

### Setup

Create a `.env` file in `apps/client/` with your OpenAI API key:

```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### Running

```bash
# Run all agentic tests
pnpm test:agentic

# Run with visible browser
pnpm test:agentic:headed
```

## Functional Tests

Functional tests use Playwright to test the Hub client in a real browser environment.

### Running Tests

```bash
# Run all functional tests with real auth (default)
pnpm test:functional

# Run against staging environment
TEST_ENVIRONMENT=staging pnpm test:functional

# Run with mocks instead of real auth
USE_MOCKS=true pnpm test:functional
```

### Test Modes

| Mode | Command | Description |
|------|---------|-------------|
| **Real Auth** (default) | `pnpm test:functional` | Uses actual Identity API with test accounts |
| **Mocked** | `USE_MOCKS=true pnpm test:functional` | Uses API mocks for fast, isolated tests |

### Real Authentication

Tests authenticate against the real Identity API using dedicated test accounts:

- **Subscribed account**: `dana+hubsubscribed@volleygames.com` - For tests that require a subscribed user
- **Unsubscribed account**: `dana+hubunsubscribed2@volleygames.com` - For tests that require an unsubscribed user

The auth setup runs once before tests and saves the authenticated state to `playwright-cache/.auth/`. This state is reused across all test runs.

### Test Organization

| File/Directory | Auth Mode | Description |
|----------------|-----------|-------------|
| `hub-home/` | Subscribed | Navigation, focus, animations |
| `hub-launch/` | Subscribed | Loading, ident video, platform validation |
| `game-launch/` | Subscribed | Game launch and exit flows |
| `tracking/` | Subscribed | Analytics event tracking |
| `web-checkout/subscribed-bypass.spec.ts` | Subscribed | Verifies subscribed users bypass upsell |
| `web-checkout/upsell-ui.spec.ts` | Unsubscribed | Verifies upsell modal UI appears |
| `web-checkout/game-selection-ui.spec.ts` | Unsubscribed | Verifies game selection upsell UI |
| `web-checkout/*.mocked.spec.ts` | Mocked | Payment simulation, error scenarios |

### File Naming Convention

- `*.spec.ts` - Uses real authentication (subscribed or unsubscribed based on config)
- `*.mocked.spec.ts` - Uses API mocks for tests requiring mid-test state changes

### Adding New Tests

1. **Subscribed user tests**: Add to `hub-home/`, `hub-launch/`, `game-launch/`, or `tracking/`
2. **Unsubscribed user tests** (verify upsell UI): Add to `web-checkout/` with `*.spec.ts` naming
3. **Payment simulation tests**: Add to `web-checkout/` with `*.mocked.spec.ts` naming

## Source Documentation

- [App Initialization](docs/initialization.md) — boot sequence, dependency graph, error handling, observability
- [Platform & Configuration](docs/platform-and-config.md) — environment, platform detection, branding, safe areas
- [Game Lifecycle](docs/game-lifecycle.md) — game launch, upsell, paywall flows
- [Experiment System](docs/experiments.md) — Amplitude feature flags and A/B testing
- [Testing](docs/testing.md) — unit, functional, and agentic test infrastructure
- [Dev Overrides](docs/dev-overrides.md) — URL parameters for local testing
