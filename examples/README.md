# Примеры входных данных и ожидаемые результаты

Записи ничего не знают о протоколе устройства: `interpretation.yaml` — готовое описание («ключ ответов»), с которым проверяется работа движка. Каталоги получены генераторами движка ([protoledger-backend](https://github.com/protoledger/protoledger-backend), `fixtures/`) и не правятся руками.

## stand — запись устройства и журнал действий

«Штатный клиент» общается с учебным устройством по TCP (протокол стенда: `5A C3 | тип | сеанс | длина u16 LE | тело | сумма`).

| Файл | Что внутри |
|---|---|
| `main.pcapng`, `main.actions.csv` | Основная запись: уставка 21, 37, 1000; чтение параметров; измерения каналов 1–3; ошибка «значение вне диапазона» |
| `extra.pcapng`, `extra.actions.csv` | Дополнительная запись другим клиентом: уставка 70000, −5, 123456 — ломают гипотезу «значение — u16» |
| `mapping.yaml` | Сопоставление колонок журнала (`time,action,params,result`) |
| `interpretation.yaml` | Описание протокола стенда |
| `expected/apply-main.json`, `expected/apply-extra.json` | Результат `protoledger apply` на каждой записи |

Журнал действий: время — UTC с микросекундами, параметры и результат — `ключ=значение`, через `;`.

Повторить результат и сверить с эталоном (из корня репозитория, бинарник `protoledger` из сборки или образа):

```bash
protoledger apply --interpretation examples/stand/interpretation.yaml \
  --input examples/stand/main.pcapng \
  --action-log examples/stand/main.actions.csv --mapping examples/stand/mapping.yaml \
  > /tmp/apply-main.json
diff /tmp/apply-main.json examples/stand/expected/apply-main.json && echo совпало
```

Код возврата `0` — всё описано, `1` — есть отличия (с `--strict`), `2` — ошибка. Для `extra.pcapng` эталон содержит контрпримеры: значения не влезают в 16 бит.

Через Docker (образ запускает `protoledger`, каталог примеров подключается только для чтения):

```bash
docker compose run --rm -T -v "$PWD/examples:/examples:ro" app apply \
  --interpretation /examples/stand/interpretation.yaml --input /examples/stand/main.pcapng \
  --action-log /examples/stand/main.actions.csv --mapping /examples/stand/mapping.yaml
```

Проект с прогонами проверяется командой `protoledger verify <папка проекта>` (см. `docs/cli.md` движка).

## hostile — «злые» записи

Намеренно кривые файлы: битые длины и заголовки, скачки seq, перекрытия, HTML и управляющие символы в данных, файлы не из мира pcap. Движок не должен падать и зависать: понятная диагностика по кадрам, остальные записи доступны, строки показываются как текст. `expected.json` — ожидаемый итог разбора каждого файла; описание групп — `hostile/README.md`.
