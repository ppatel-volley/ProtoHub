# Repository Guidelines

## Project Overview
Hub is Volley’s multiplatform launcher for casual games. A single React + Vite client adapts to Fire TV, LG webOS, Samsung Tizen, and modern browsers via `src/config/platformDetection.ts`. Games load inside managed iframes; safe-area data keeps layouts intact on notched or overscanned screens.

## Project Structure & Module Organization
Client code lives in `apps/client/`. Inside `apps/client/src`, feature areas sit under `components/`, `hooks/`, `experiments/`, `config/`, `apis/`, `contexts/`, `utils/`, and `gev/`, with `.test.tsx` files colocated. Static assets and generated config ship from `apps/client/public/` or `dist/`. The server lives in `apps/server/` with shared code exported via `@hub/server` and `@hub/server/types`. Shared ESLint and TypeScript baselines live in `packages/eslint-config/` and `packages/tsconfig/`, the identity API client is in `packages/identity-client/`, and developer scripts stay in the root `scripts/` directory.

## Build, Test, and Development Commands
Install dependencies with `pnpm install` (Node ≥22, pnpm ≥10.6). Set `VITE_STAGE="local"` in `apps/client/.env`, then run `pnpm dev` (served on `http://localhost:5173/`). Validate using `pnpm lint`, `pnpm typecheck`, and `pnpm test`.

## Coding Style & Naming Conventions
Do not add comments unless absolutely necessary with the exception of adding JSDoc to new classes and functions. ESLint + Prettier rules come from `@hub/eslint-config` and enforce 2-space indentation, explicit return types, camelCase variables, and PascalCase React components. Imports must stay sorted (`simple-import-sort`). Favour composition helpers over inheritance, park cross-cutting utilities in `src/utils/`, and surface shared constants via barrel files. Follow `DEVELOPER.md` guidance for booleans (`is/has/should`) and plural array names. Prefer active-voice state names (e.g., `completedInitialLoad` instead of `hasCompletedInitialLoad`) to keep identifiers concise.

## Testing Guidelines
Add tests verifying any new or changing functionality. Unit suites use Jest with `ts-jest`; colocate specs next to the code and lean on React Testing Library for JSX assertions. Functional smoke tests live in `apps/client/test/functional/` and run through Playwright; `testHelpers.ts` wires auth fixtures and LG/Samsung simulations. Before calling a task complete, run `pnpm test:unit` and spot-check critical journeys (`pnpm test`). 

## Commit Guidelines
Commits follow Conventional Commits (`feat`, `fix`, `docs`, `chore`, `test`), and for breaking changes include `!` like `feat!:`. Scope each commit tightly and mention platform impacts in the body when relevant (e.g., FireTV focus, LG safe area). Do not open pull requests unless the maintainer explicitly asks—stop after committing and report back instead. Prefer active-voice state names (e.g., `completedInitialLoad` instead of `hasCompletedInitialLoad`).


