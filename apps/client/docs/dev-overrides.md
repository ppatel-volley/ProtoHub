# Dev Overrides

URL parameters for testing specific behaviors in non-production environments. All overrides require `local`, `dev`, or `staging` — they are disabled in production.

| Parameter | Value | Effect |
|-----------|-------|--------|
| `dev-upsell` | `true` | Mock upsell modal (disabled on FireTV) |
| `force-web-checkout` | `true` | Force web checkout flow regardless of platform |
| `force-platform-error` | `true` | Simulate platform initialization error |
| `force-chunk-error` | `true` | Simulate chunk load error |
| `identity-api-override` | `true` | Use hardcoded identity API responses |
| `skip-video` | `true` | Skip ident video playback |
| `simulateLG` | `true` | Simulate LG platform detection |
| `simulateSamsung` | `true` | Simulate Samsung platform detection |
| `identAutoplay` | `fail` | Simulate ident video autoplay failure |
| `identUrl` | URL string | Override ident video URL |
| `force-weekend-rebrand` | `true` | Force Weekend brand (instead of Volley) |
| `force-unsubscribed` | `true` | Force unsubscribed user state |
| `force-weekend-modal` | `true` | Force Weekend rebrand informational modal |
| `forceAppDownloadPage` | `true` | Force app download page |
| `experiment-override` | `flag:value,...` | Override experiment variants (comma-separated `flag:value` pairs) |

## Examples

```
http://localhost:5173/?dev-upsell=true
http://localhost:5173/?simulateLG=true&skip-video=true
http://localhost:5173/?experiment-override=reorder-mp-tiles:treatment,suppress-immediate-upsell:on
```

## Implementation

`src/config/devOverrides.ts` uses `createDevOverride(param, matchValue)` which reads from `URLSearchParams` and gates on `isNamedNonProductionEnvironment` (local, dev, or staging).
