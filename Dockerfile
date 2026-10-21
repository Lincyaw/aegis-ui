# Monorepo-aware build for the aegis-ui console SPA.
#
# Stages:
#   builder  - pnpm install + build (@lincyaw/aegis-ui then @lincyaw/console)
#   runner   - nginx serving the built dist/ with a templated /api proxy
#
# Build from the monorepo root so workspace deps resolve.
FROM node:24-alpine AS builder

WORKDIR /app

# Manifests first so the install layer is reused until dependencies change.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/ui/package.json ./packages/ui/
COPY apps/console/package.json ./apps/console/

# Pin pnpm to the root package.json `packageManager` so resolution matches CI.
RUN npm install -g "pnpm@$(node -p "require('./package.json').packageManager.split('@')[1]")"

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY tsconfig.base.json turbo.json ./
COPY packages ./packages
COPY apps ./apps

RUN pnpm -F @lincyaw/aegis-ui build \
 && pnpm -F @lincyaw/console build

FROM nginx:stable-alpine
COPY --from=builder /app/apps/console/dist /usr/share/nginx/html
COPY apps/console/nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 80
