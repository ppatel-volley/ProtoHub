# Platform & Configuration

How the Hub client adapts to different devices and environments.

## Config Files

| File | Purpose |
|------|---------|
| `platformDetection.ts` | Platform detection (FireTV, LG, Samsung, Web, Mobile) via Platform SDK and user agent |
| `envconfig.ts` | Environment variable access — `getEnvVar()` for Vite build-time vars, `getWindowVar()` for runtime `config.js` vars |
| `environment.ts` | `Environment` enum (LOCAL, DEVELOPMENT, STAGING, PRODUCTION) |
| `devOverrides.ts` | URL parameter dev overrides for testing (see [dev-overrides.md](dev-overrides.md)) |
| `branding.ts` | Volley vs Weekend dual-brand asset/copy resolution, experiment-driven |
| `deeplink.ts` | Deeplink URL parameter parsing (`?deeplink=gameId_campaignId`) |
| `gameIframeControllerUrl.ts` | Game iframe URL construction with safe area injection |
| `getSafeAreaValues.ts` | Reads CSS custom properties for safe area insets (passed to game iframes) |
| `consts.ts` | SKU constants |
| `isDemo.ts` | Demo mode detection via `?demo=true` |

## Environment Variables

The app uses a two-tier environment variable system:

**Build-time** (`VITE_*` via `import.meta.env`) — baked into the bundle at build. The same build artifact is reused across dev, staging, and production, so these values are environment-agnostic:

- `VITE_STAGE` — local development stage identifier
- `VITE_VOLLEY_LOGO_DISPLAY_MILLIS` — ident logo display duration
- `VITE_EXPERIMENT_ASSETS_CDN_URL` — CDN for experiment-controlled assets
- `VITE_OVERRIDE_GAME_ORCHESTRATION` — enable local game orchestration override

**Runtime** (`window.APP_CONFIG` via `config.js`) — generated per-environment at deploy time by the `create-environment-config` GitHub Action. This is what enables artifact reuse (same build, different config):

- `BACKEND_SERVER_ENDPOINT` — server WebSocket URL
- `AMPLITUDE_EXPERIMENT_KEY` — Amplitude Experiment SDK key
- `SEGMENT_WRITE_KEY` — Segment analytics write key
- `DATADOG_APPLICATION_ID` / `DATADOG_CLIENT_TOKEN` — Datadog RUM credentials
- `environment` — current environment string
- `version` — deployed version

Access helpers: `getEnvVar(key)` for build-time, `getWindowVar(key)` for runtime. Both provide type-safe access with optional defaults.

## Platform Detection

`platformDetection.ts` provides functions to identify the current platform. `getCachedPlatform()` calls `getPlatform()` from the Platform SDK once and caches the result for the session.

Detection methods:

| Platform | Primary detection | Fallback (user agent) |
|----------|-------------------|----------------------|
| FireTV | Platform SDK `getPlatform()` | `Android` + `AFT[A-Z]+` pattern |
| LG (webOS) | Platform SDK | `Web0S` + `SmartTV` |
| Samsung (Tizen) | Platform SDK | `Tizen` + `SMART-TV` |
| Mobile | Platform SDK `Platform.Mobile` | Common mobile UA regex |
| Web | Default when no other matches | — |

**Simulation overrides**: `?simulateLG=true` and `?simulateSamsung=true` make `isLGTV()` / `isSamsungTV()` return `true` regardless of actual platform. Useful for testing platform-specific behavior in a browser.

**Test overrides**: `window.__TEST_PLATFORM_OVERRIDES` allows Playwright tests to override `isWeb()` and `shouldUseWebCheckout()` without URL parameters.

**Web checkout routing**: `shouldUseWebCheckout()` returns `true` for LG, Samsung, Web, or when `force-web-checkout` override is active.

## Branding

The app supports two brands: **Volley** and **Weekend**. Brand selection is experiment-driven via the `WeekendRebrand` Amplitude flag.

`branding.ts` provides:

- `getActiveBrand()` — returns `"volley"` or `"weekend"` based on experiment state
- `getAsset(key)` / `getCopy(key)` — returns brand-specific asset paths and copy strings
- `subscribeToBrand(listener)` — `useSyncExternalStore`-compatible subscription for reactive brand updates
- `isWeekendRebrandActive()` — checks the experiment with fallback to pre-auth brand resolution

Brand-specific assets (logos, video idents, focus frames, favicons) and copy (modal headings, subtitles, error messages) are defined as lookup tables in `BRANDED_ASSETS` and `BRANDED_COPY`.

## Platform & Initialization Hooks

| Hook | Purpose |
|------|---------|
| `usePlatformReadiness` | Tracks platform SDK initialization state and readiness |
| `useAnonymousId` | Retrieves the device-level anonymous ID from Platform SDK |
| `useAccountId` | Retrieves the user-level account ID from Platform SDK |
| `useUserId` | Retrieves the user ID |
| `useDeviceAuthorization` | Manages the QR code device authorization flow |
| `useInitializationError` | Handles and surfaces platform initialization errors |
| `useInitializationDatadogRUMEvents` | Reports initialization timing to Datadog |
| `usePreloadImages` | Priority-tiered image preloading for game assets |

## Focus & Navigation Hooks

| Hook | Purpose |
|------|---------|
| `useFocusTracking` | Floating focus indicator position management |
| `useFocusRestoration` | Saves and restores focus position when returning from a game |
| `useFocusDebug` | Development overlay showing focus state |
| `useGameFocusHandler` | Focus behavior specific to game tile selection |
| `useNativeFocus` | Native browser focus management for non-spatial-navigation contexts |

## Branding Hooks

| Hook | Purpose |
|------|---------|
| `useBranding` | Returns brand-specific assets and copy (Volley vs Weekend) |
| `useAsset` | Resolves brand-aware asset paths |
| `useCopy` | Resolves brand-aware copy strings |
