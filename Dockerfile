# Οδοιπορικό — self-hosted image. Data (SQLite database + photos) lives in the /data volume:
#   /data/app.db       the database (DATABASE_URL=file:/data/app.db)
#   /data/uploads/     photos, served by app/uploads/[name] (and old /media/photos/… addresses)
# On every start the migrations run first (scripts/migrate.mjs, idempotent), then the server.

FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
ARG SITE_URL
ARG APP_BUILD_ID=docker
ENV SITE_URL=$SITE_URL APP_BUILD_ID=$APP_BUILD_ID NEXT_TELEMETRY_DISABLED=1
# Pages generated at build time read a throwaway database with the sample content.
RUN DATABASE_URL=file:/tmp/build.db MIGRATE_SCHEMA_ONLY=1 node scripts/migrate.mjs && DATABASE_URL=file:/tmp/build.db npx next build && npm prune --omit=dev

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 DATABASE_URL=file:/data/app.db
ARG SITE_URL
ARG APP_BUILD_ID=docker
ENV SITE_URL=$SITE_URL APP_BUILD_ID=$APP_BUILD_ID
COPY --from=build /app/package.json /app/next.config.ts ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/lib ./lib
COPY --from=build /app/data ./data
COPY --from=build /app/assets ./assets
RUN mkdir -p /data && ln -s /data/uploads /app/uploads && chown -R node:node /data /app/.next
USER node
VOLUME /data
EXPOSE 3000
CMD ["sh", "-c", "mkdir -p /data/uploads && node scripts/migrate.mjs && exec node_modules/.bin/next start"]
