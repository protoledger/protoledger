# syntax=docker/dockerfile:1
# Итоговая сборка: SPA фронтенда встраивается в бинарник движка.

FROM node:24-trixie-slim AS ui
WORKDIR /ui
RUN corepack enable
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm generate

FROM rust:1-trixie AS engine
WORKDIR /src
COPY backend/ ./
COPY --from=ui /ui/.output/public /ui-dist
ENV UI_DIST=/ui-dist
RUN cargo build --release --locked && cp target/release/protoledger /protoledger

FROM debian:trixie-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --system --uid 10001 --create-home app
COPY --from=engine /protoledger /usr/local/bin/protoledger
USER app
WORKDIR /data
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s CMD curl -fsS http://127.0.0.1:8080/api/health || exit 1
ENTRYPOINT ["protoledger"]
CMD ["serve", "--host", "0.0.0.0", "--port", "8080", "--workspace", "/data"]
