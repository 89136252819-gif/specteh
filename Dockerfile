FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates sqlite3 \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci && npm install web-push@3.6.7 --no-save --no-audit --no-fund

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_YANDEX_SUGGEST_KEY=
ENV NEXT_PUBLIC_YANDEX_SUGGEST_KEY=$NEXT_PUBLIC_YANDEX_SUGGEST_KEY
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:./prisma/build.db
ENV TZ=Asia/Omsk
RUN npx prisma generate
RUN npx prisma db push --skip-generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV TZ=Asia/Omsk
ENV DATABASE_URL=file:/data/app.db
ENV DB_PATH=/data/app.db

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/fonts ./src/fonts
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/scripts/docker-entrypoint.js ./docker-entrypoint.js
COPY --from=builder /app/scripts/bootstrap-prod.js ./bootstrap-prod.js
COPY --from=builder /app/scripts/apply-prices.js ./apply-prices.js
COPY --from=builder /app/scripts/ensure-schema.js ./ensure-schema.js
COPY --from=builder /app/certs ./certs
RUN cp ./certs/russian_trusted_root_ca.cer /usr/local/share/ca-certificates/russian_trusted_root_ca.crt \
  && cp ./certs/russian_trusted_sub_ca.cer /usr/local/share/ca-certificates/russian_trusted_sub_ca.crt \
  && update-ca-certificates

RUN mkdir -p /data /app/public/uploads

EXPOSE 3000
CMD ["node", "docker-entrypoint.js"]
