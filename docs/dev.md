# Разработка с dev-сборкой движка

Для работы над интерфейсом не нужен Rust: движок в dev-режиме запускается из образа.

```bash
docker compose -f compose.dev.yaml up --build   # или готовый образ ghcr.io/protoledger/protoledger:dev
```

- Swagger UI: http://localhost:8080/api/docs — «Try it out» подставляет токен сам.
- Контракт: http://localhost:8080/api/docs/openapi.yaml; описание для людей — `API.md` в репозитории backend.
- Токен сессии в dev-режиме фиксирован: `PROTOLEDGER_DEV_TOKEN` (по умолчанию `dev-token-local`). Прокси фронтенда должен слать его в заголовке `X-Protoledger-Token`.
- Разрешён origin `http://localhost:3000` (dev-сервер Nuxt).
- Проекты лежат в `./workspace`; относительный путь проекта в API считается от этого каталога.
- Данные для экранов: `backend/fixtures/synthetic` (дефекты захвата), `backend/fixtures/stand` (запись стенда с журналом действий), `backend/fixtures/hostile` (злые файлы).

В образе для жюри (`docker compose up --build`) Swagger UI, `/api/docs` и режим `--dev` отсутствуют: код собирается без feature `dev-tools`, CI это проверяет.
