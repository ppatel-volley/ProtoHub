FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

ARG NPM_TOKEN
RUN npm config set //registry.npmjs.org/:_authToken=${NPM_TOKEN}

FROM base AS production
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile --force

# Build all packages first
RUN pnpm run -r build
# Deploy to server directory with dependencies
RUN pnpm deploy --prod --filter=@hub/server ./server
WORKDIR /app/server

EXPOSE 3000
CMD [ "pnpm", "start" ]