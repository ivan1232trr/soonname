FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/types/package.json packages/types/package.json

RUN pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS build

ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

COPY . .

RUN pnpm --filter @citypulse/types build
RUN pnpm --filter @citypulse/web build

FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/tsconfig.base.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/web/package.json ./apps/web/package.json
COPY --from=build /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=build /app/apps/web/.next ./apps/web/.next
COPY --from=build /app/apps/web/next-env.d.ts ./apps/web/next-env.d.ts
COPY --from=build /app/apps/web/tsconfig.json ./apps/web/tsconfig.json
COPY --from=build /app/apps/web/src ./apps/web/src
COPY --from=build /app/packages/types/package.json ./packages/types/package.json
COPY --from=build /app/packages/types/dist ./packages/types/dist

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["pnpm", "exec", "next", "start", "--hostname", "0.0.0.0", "--port", "3000"]
