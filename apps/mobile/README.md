# Mobile

This folder contains the code for the Mobile Hub (controller) and App Download Landing page, deployed independently at `/mobile/`.

## Routing

The app routes between two experiences based on the `volley_platform` query parameter:

- `?volley_platform=MOBILE` (set by VWR in native app iframe) → **MobileHub controller** — room code entry, game iframe
- No `volley_platform` param (web browser) → **App Download page** — prompts users to download the native app

## Getting Started

_Please refer to the root [README](../../README.md) for installation and prerequisites._

```bash
# Run the mobile app in development
cd apps/mobile
pnpm dev
```

In dev mode, the app is served at `http://localhost:5174/` (not `/mobile/` — the `/mobile/` prefix is only applied for production builds).

To test the MobileHub controller route locally, append `?volley_platform=MOBILE` to the URL.

## Deployment

The mobile app has its own independent release pipeline, separate from the TV Hub client:

- **Release workflow**: `create-release-mobile.yml` — triggers on pushes to `main` that change `apps/mobile/**`
- **Deploy workflow**: `deploy-mobile.yml` — deploys to `/mobile/` on the same S3 bucket and CloudFront distribution as the TV Hub
- **Tag prefix**: `mobile-v*` (e.g., `mobile-v0.1.0`)
- **GitHub environments**: `dev-mobile`, `staging-mobile`, `production-mobile`

## Relationship to `apps/client`

During the transition period, both `apps/client` and `apps/mobile` serve the mobile experiences:

- `apps/client` still contains the MobileHub and AppDownload code (served at `/hub/` for existing traffic)
- `apps/mobile` is the new standalone deployment (served at `/mobile/`)

Once all mobile traffic is migrated to VWR and game teams have updated QR code URLs from `/hub` to `/mobile`, the mobile code will be removed from `apps/client`.
