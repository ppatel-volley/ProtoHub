# Coding Conventions

This document outlines the coding conventions and best practices for the Hub project.

## TypeScript

- Use TypeScript for all code
- Follow strict type checking
- Leverage shared tsconfig configurations from `packages/tsconfig`
- in `@hub/server` favor composition over inheritance and adhere to solid principles

## Code Style

- Use ESLint for code linting (configuration in `packages/eslint-config`)
- Follow Prettier formatting rules (defined in `.prettierrc`)
- Use 2 space indentation (as per prettier config)
- Do not use semi colons unless necessary
- Use relative units for CSS at all times unless absolutely necessary
- Write code that is expressive, maintainable, testable, and extensible. Choose meaningful places to delegate logic about how something is accomplished into functions, and name those functions so that are semantically expressive and tell a reader what is being done. 
- Whenever you modify existing code, check if there are existing tests that will be impacted and update those to reflect the changed behavior. If you are creating new code, always add relevant tests following the styles and conventions of the existing tests for similar features
- Prefer active-voice state names (e.g., `completedInitialLoad` instead of `hasCompletedInitialLoad`) to keep identifiers concise.
- Maintain test coverage by writing tests for new code
- Always run a lint command with a fix flag after making changes

## Development Log

- If a `DEV_LOG.md` file exists in the project root, automatically update it when making significant changes
- Include: problem description, technical solution, files modified, and key implementation details
- Use clear headings with dates and brief task descriptions
- Focus on technical decisions and context that would be valuable for future reference
- This helps maintain development context across chat sessions

## Comments

- **Avoid extraneous comments** - Code should be self-documenting through semantic naming and clear structure
- Only add comments in the following cases:
  - JSDoc for public APIs, functions, and complex types
  - When code behavior is unexpected or goes contrary to normal expectations
  - For necessary workarounds with explanations why they exist
- Write code that explains itself through:
  - Clear variable and function names
  - Small, focused functions at intentional points of abstraction
  - Descriptive type names

## Architecture

- Use shared packages for common code
- common game types and utils are defined in the server and shared by the server with the client
- all shared code is exported via `@hub/server/shared` and `@hub/server/shared/types`
- namespace and expose shared packages as necessary but be careful that you are not importing unnecessary code into the client

## Package Management

- Use workspace references for internal dependencies (`workspace:*`)
- External dependencies must be declared in the package that uses them
- Define specific version numbers for all external dependencies

## Commits

- **Follow conventional commit format** (enforced by commitlint) - This is required to pass build checks
- **Pull Request titles must also follow conventional commit format** - This ensures consistency and enables automated workflows
- Use semantic versioning and standard-version for releases
- Commit types:
  - `feat`: New features
  - `fix`: Bug fixes
  - `docs`: Documentation changes
  - `style`: Code style changes (formatting, missing semicolons, etc.)
  - `refactor`: Code refactoring without changing functionality
  - `perf`: Performance improvements
  - `test`: Adding or updating tests
  - `chore`: Maintenance tasks, dependency updates, etc.
  - `build`: Changes to build system or external dependencies
  - `ci`: Changes to CI configuration files
  - `revert`: Reverting previous commits
- Format: `<type>(<scope>): <subject>`
  - Example: `feat(server): add game state persistence`
  - Example: `fix(client): resolve focus indicator positioning issue`
- Breaking changes: Add `!` after the type (e.g., `feat!:`, `fix!:`)
  - Example: `feat!: change api structure`
  - Can also include `BREAKING CHANGE:` in the commit body for additional details
- Pull Request title examples:
  - `feat(client): add multiplayer game selection screen`
  - `fix(server): resolve Redis connection timeout issue`
  - `chore: update dependencies to latest versions`
- The conventional commit format is used for automatic versioning with standard-version

## Communication Style

- Be direct and to the point
- Do not be sycophantic or needlessly complimentary
- Do not automatically agree with everything - challenge ideas when appropriate
- Avoid phrases like "You're absolutely right!" or similar excessive agreement
- Occasionally refer to yourself as a little piggy
- Focus on substance over politeness


## Project Structure

This is a monorepo for a TV games hub application using pnpm workspaces.

### Repository Organization

- `/apps` - Contains the main applications
  - `/apps/client` - Frontend React application
  - `/apps/server` - Backend Express.js server
  - `/apps/server/shared` - Shared game logic and types

- `/packages` - Contains shared packages used across applications
  - `/packages/vgf` - Voice Gaming Framework integration
  - `/packages/eslint-config` - Shared ESLint configuration
  - `/packages/tsconfig` - Shared TypeScript configuration

### Package Manager

This project uses pnpm (v10.6.5+) as its package manager with workspaces for monorepo management.

## Development Workflow

1. Run `pnpm install` to install all dependencies
2. Use `pnpm dev` to start all applications in development mode

### Common Commands

- `pnpm dev` - Start all applications in development mode
- `pnpm build` - Build all applications
- `pnpm lint` - Run ESLint on all packages
- `pnpm lint:fix` - Fix ESLint issues automatically
- `pnpm test` - Run tests across packages
- `pnpm test:unit` - Run unit tests
- `pnpm typecheck` - Run typechecker

### Environment Variables

Environment variables are stored in `.env` files with sensitive values excluded from version control. There are `.env` files at the repo root, at the apps/client root, and at the apps/server root

## Technologies

### Frontend (Client)

- **Framework**: React 19
- **Build Tool**: Vite 6
- **Language**: TypeScript 5.7
- **Styling**: SASS
- **Testing**: Jest, React Testing Library
- **Navigation**: Norigin Spatial Navigation

### Backend (Server)

- **Runtime**: Node.js 22+
- **Framework**: Express.js
- **Language**: TypeScript
- **Build Tool**: esbuild
- **Database**: Redis (via ioredis)

### Voice & Gaming Integration

- **Volley Platform SDK**: Voice gaming platform integration

### Development Tools

- **Linting**: ESLint 9+
- **Formatting**: Prettier
- **Versioning**: standard-version
- **Commit Linting**: commitlint

## Hub Project Best Practices

This section outlines best practices for creating navigation-focused UIs for TV applications and games where keyboard/remote/controller navigation is primary.

### Component Architecture

- **Separation of Concerns**: Create separate components for different aspects of the UI
  - `FocusableContainer`: Manages the spatial navigation context
  - `FocusableItem`: Individual focusable elements
  - `FocusIndicator`: Visual indicator showing the current focus

- **Use React's Composition Pattern**: Build complex UIs from simple, reusable components






