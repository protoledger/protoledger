# protoledger

<!-- Требования организаторов: без названия команды и хакатона. -->

Лаборатория для исследования недокументированных бинарных протоколов поверх TCP: от записей трафика к проверяемому и переносимому описанию обмена.

## Какую задачу решает

<!-- 3–5 предложений: для кого, какая проблема, что получает пользователь. -->

## Возможности

- 

## Особенности решения

- 

## Быстрый старт

Требования: Linux x86-64 (проверено на 4 vCPU / 8 ГиБ), Docker 24+ с Compose v2, git.

```bash
git clone --recursive https://github.com/protoledger/protoledger.git
cd protoledger
cp .env.example .env
docker compose up --build
```

Откройте http://localhost:8080.

Без Docker — готовые сборки в [Releases](https://github.com/protoledger/protoledger/releases): распаковать и запустить `./protoledger serve`.

## Как пользоваться

<!-- Сценарии по шагам со скриншотами (docs/img). Пример команды повторного применения. -->

## Повторное применение без интерфейса

```bash
protoledger --help
```

## Структура репозитория

| Путь | Что |
|---|---|
| `backend/` | движок (сабмодуль [protoledger-backend](https://github.com/protoledger/protoledger-backend)) |
| `frontend/` | интерфейс (сабмодуль [protoledger-frontend](https://github.com/protoledger/protoledger-frontend)) |
| `examples/` | примеры входных данных и ожидаемые результаты |
| `docs/` | архитектура, форматы, ограничения, замеры |
| `bench/` | замеры времени и памяти |
| `Dockerfile`, `compose.yaml` | сборка и запуск |

## Архитектура и форматы

См. [docs/architecture.md](docs/architecture.md).

## Ограничения и замеры

См. [docs/limits.md](docs/limits.md).

## Стек

- 

## Демо

- Видео: 
- Презентация: 

## Команда

| Участник | Роль |
|---|---|
| [@sleepyhead-dev](https://github.com/sleepyhead-dev) | Backend, DevOps |
| [@OddS-Programming](https://github.com/OddS-Programming) | Backend |
| [@rinna32](https://github.com/rinna32) | Frontend |
| [@sky1768205](https://github.com/sky1768205) | Frontend |
