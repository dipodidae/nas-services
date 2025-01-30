FROM node:20-alpine as build-stage

WORKDIR /app
RUN corepack enable

COPY .npmrc package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile

ENV NUXT_OMDBAPI_API_KEY=${NUXT_OMDBAPI_API_KEY}
ENV NUXT_TMDB_API_TOKEN=${NUXT_TMDB_API_TOKEN}
ENV NUXT_TMDB_API_KEY=${NUXT_TMDB_API_KEY}

COPY . .
RUN pnpm build

# SSR
FROM node:20-alpine as production-stage

WORKDIR /app

COPY --from=build-stage /app/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
