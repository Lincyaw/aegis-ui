# Monorepo-aware build for the aegis-ui console SPA.
#
# Stages:
#   builder  - pnpm install + build (@lincyaw/aegis-ui then @lincyaw/console)
#   runner   - nginx serving the built dist/ with a templated /api proxy
#
# Build from the monorepo root so workspace deps resolve.
FROM node:20-alpine AS builder

RUN apk add --no-cache jq libc6-compat \
    && pm=$(jq -r '.packageManager|split("@")[0]' /dev/null 2>/dev/null || echo pnpm) \
    && true

# Pin pnpm to the version declared by the root package.json so workspace
# resolution matches CI.
COPY package.json ./package.json
RUN ver=$(jq -r '.packageManager|split("@")[1]' package.json) \
 && npm install -g "pnpm@$ver"

WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml .npmrc* ./
COPY package.json tsconfig.base.json turbo.json ./
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

RUN pnpm -F @lincyaw/aegis-ui build \
 && pnpm -F @lincyaw/console build

FROM nginx:stable-alpine
COPY --from=builder /app/apps/console/dist /usr/share/nginx/html
COPY apps/console/nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 80
