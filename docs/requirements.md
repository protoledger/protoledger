# Проверка требований

Каждое обязательное требование задания — и чем оно подтверждено: автоматическим тестом, командой или шагом в интерфейсе. Тесты названы так, как в коде движка ([protoledger-backend](https://github.com/protoledger/protoledger-backend)), и выполняются в CI при каждом изменении (сейчас 303 теста движка на Windows; на Linux к ним добавляются проверки символических ссылок и сверка с tshark). Примеры данных — в [`examples/`](../examples/README.md): записи стенда, набор «Термостенд» от организаторов и злые записи.

Проверить всё, что проверяется командами, одним шагом:

```bash
bash examples/check.sh protoledger      # 14 эталонов: применение описаний к записям совпадает с expected/
```

## Функциональные требования

| Требование | Как выполнено | Чем подтверждено |
|---|---|---|
| **R1.** Открыть PCAP/PCAPNG, выбрать соединение и направление, получить прикладные байты с учётом порядка TCP и повторов; перейти от результата к пакетам и байтам; неполнота и неоднозначность видны | Импорт по пути и загрузкой файла; экран «Обзор записей» — соединения с признаками и числом их срабатываний; поток показывается с картой участков (данные, дыра, неоднозначность), у каждого участка — кадры-источники; из байта потока — переход к кадру | `import_then_explore`, `ambiguous_segment_has_variants`, `pcap_and_pcapng_give_same_index`, `synthetic_streams_match_generator`, `streams_match_tshark_follow` |
| **R2.** Найти обмен по действию; сопоставить примеры с разными параметрами; различия и закономерности; сверка с байтами; средства исследования границ и структуры | Экран «Действия»: журнал и обмен в окне времени действия. «Границы»: кандидаты поля длины, сигнатуры, разделители — с долей подтверждений и первым контрпримером. «Сравнение»: постоянные и меняющиеся байты, поля-счётчики, связи значений с параметрами и результатом действия. Пары «запрос → ответ» с оценкой уверенности | `exchange_is_found_by_action_time`, `framing_hints_find_the_length_field_without_any_description`, `variability_uses_the_framing_from_a_hint`, `correlations_link_message_bytes_with_action_parameters`, `exchanges_pair_requests_with_responses`, `length_field_is_found_where_there_are_enough_messages` |
| **R3.** Задавать и менять интерпретацию, применять программно; значения из примеров разных параметров и размеров; применение к дополнительной записи без ручного описания; частичное описание с неизвестными зонами; «по правилу» и «предположение» различимы | Описание протокола — YAML ([formats.md](formats.md)): фрейминг, типы сообщений, поля, проверки. У поля статус `rule`, `hypothesis` или `unknown`; неописанные байты считаются отдельно. Экран «Интерпретация» с предпросмотром; все ревизии хранятся | `main_recording_is_fully_described`, `extra_recording_shows_values_above_u16`, `matched_message_has_decoded_fields_and_coverage`, `unknown_type_is_unmatched_not_violated`, `repeat_group_decodes_every_item_by_name`, `revisions_are_saved_validated_and_listed`; эталоны `examples/thermostand/expected/apply-04_new_observations.json` |
| **R4.** Выбрать корпус, применить, увидеть результаты с переходом к данным; нарушения и непокрытые случаи; повтор проверки и оценка изменения; сводка по всему набору; условия фильтрации видны | Прогон проверки — задача с прогрессом и отменой. Сводка по всему корпусу: совпало, нарушено, неполно, неоднозначно, не охвачено, вне области, предел реализации. Контрпримеры с якорями на байты. Фильтры корпуса сохраняются в прогоне. Сравнение двух прогонов: исправлено, ухудшено, изменено | `run_summarizes_the_whole_corpus`, `corpus_filters_are_applied_and_recorded`, `counterexamples_staleness_and_diff`, `out_of_scope_streams_are_counted_not_hidden`, `diff_tells_fixed_from_regressed_and_new` |
| **R5.** Проект хранит записи, интерпретации, настройки, наблюдения, связи, результаты; открывается после переноса без абсолютных путей; устаревшие результаты отличимы | Проект — папка ([formats.md](formats.md)); пути только относительные; перенос — копирование папки. Прогон подписан хешами описания, настроек и записей: при их изменении помечается устаревшим с причиной | `a_copied_project_verifies_and_reports_the_same`, `import_copies_into_project_and_survives_reopen`, `runs_survive_reopen_and_errors_are_clear`, `staleness_follows_the_signature`, `changing_build_settings_makes_runs_stale` |
| **R6.** Читаемый отчёт, машиночитаемая интерпретация, документированная команда повторного применения; примеры входов и ожидаемых выходов | Отчёт Markdown и HTML: основания, область применимости, результат проверки, контрпримеры, гипотезы, открытые вопросы. Команды `protoledger apply`, `verify`, `report` (`docs/cli.md` в репозитории движка). Примеры с эталонами — `examples/` | `report_describes_the_project_in_both_formats`, `apply_matches_the_committed_results`, `apply_is_deterministic_and_writes_to_a_file`; `examples/check.sh` в CI |

## Требования к данным

| Требование | Как выполнено | Чем подтверждено |
|---|---|---|
| **A1.** Источники неизменны и доступны для сверки | Запись копируется в проект под именем своего sha256, копия только читается; при открытии и в `verify` хеш сверяется | `add_source_copies_and_registers`, `tampered_or_removed_copy_is_detected`, `verify_detects_a_modified_source_copy` |
| **A2.** Результат связан с источником и диапазоном данных; смена разбиения не привязывает старое наблюдение к другим байтам незаметно | Якорь: запись, поток, диапазон и sha256 байтов. Если при другой политике сборки байты изменились, якорь помечается сломанным, а не переезжает | `observation_pins_bytes_and_cannot_be_orphaned`, `overlap_policy_changes_what_is_accepted_but_ambiguity_stays_visible` |
| **A3.** Изменение правил не меняет исходные байты и не выдаёт старую проверку за актуальную | Сохранённый прогон неизменен; новая ревизия описания делает его устаревшим | `counterexamples_staleness_and_diff`, `report_flags_a_stale_run_and_rejects_bad_input`, `interpretation_revisions_are_kept_and_immutable` |

## Дефекты захвата

Проверено на синтетических записях (`fixtures/synthetic` движка, у каждой — эталон сборки) и на восьми диагностических записях набора «Термостенд» (`examples/thermostand/expected/apply-diag-*.json`).

| Требование | Как выполнено | Чем подтверждено |
|---|---|---|
| **D1.** Переупорядочивание | Порядок по номерам последовательности, с учётом перехода через 2³² | `reorder_and_duplicates_do_not_change_stream`; `apply-diag-02_reordered` |
| **D2.** Одинаковый повтор | Байты один раз; все кадры-источники сохранены в карте участка; признак «повторы» с числом | `synthetic_streams_match_generator`, `flag_counts_match_flags_and_count_occurrences`; `apply-diag-01_retransmission` |
| **D3.** Пропуск и усечение | Участок-дыра известной длины без байтов (не нули); сообщение, задевшее дыру, — `incomplete` | `truncated_payload_is_reported`, `gap_makes_message_incomplete_with_partial_fields`; `apply-diag-03_missing_segment`, `apply-diag-04_snaplen_truncated` |
| **D4.** Разные данные в перекрытии | Участок «неоднозначно» хранит все варианты с кадрами; политика проекта `first`, `last` или `flag` — явная и воспроизводимая | `ambiguous_segment_has_variants`, `overlap_policy_last_picks_later_bytes`, `flag_policy_keeps_ambiguity_without_choosing`; `apply-diag-05_conflicting_overlap` |
| **D5.** Нет начала соединения | Роли сторон помечены как неизвестные, начало потока — как недоступное; разбор сообщений — с ближайшей сигнатуры | `connection_flags_and_close`, `sync_skips_the_tail_of_a_message_whose_start_was_not_captured`; `apply-diag-06_missing_beginning` |
| **D6.** Контрольные суммы и offloading | Политика `ignore`, `warn` или `drop`; частичные суммы offloading отличаются от повреждения | `checksum_report_tells_offloading_from_corruption`, `checksum_policy_drop_removes_bad_segments`; `apply-diag-07_checksum_offload`, `apply-diag-08_bad_checksum` |
| **D7.** Разные соединения и повторный импорт не объединяются; ошибка одной сессии не блокирует остальные; время — точки захвата | Повтор портов — новое соединение (по SYN с другим начальным номером, после FIN или RST). Повторный импорт — новая запись об импорте, а не склейка. Время сообщения — время первого и последнего кадра | `connection_flags_and_close` (сценарий `port-reuse`), `reimport_is_a_new_import_without_new_copy`, `import_of_non_capture_fails_job`, `every_hostile_file_is_handled_and_server_stays_alive` |
| **D8.** Неподдерживаемые данные диагностируются | Другой канальный уровень, IPv6, фрагменты IPv4, не TCP — кадр пропускается с диагностикой по кадрам, остальное обрабатывается | `synthetic_frames_and_diagnostics_match_expected` (сценарий `background`), `hostile_samples_match_expected_outcomes` |

## Нефункциональные требования

| Требование | Как выполнено | Чем подтверждено |
|---|---|---|
| **N1.** Среда: Linux x86-64, 4 vCPU, 8 ГиБ; запуск воспроизводим | `docker compose up --build` из чистого клона; CI собирает образ и проверяет `/api/health` | workflow `ci` этого репозитория |
| **N2.** Профиль: 100 МиБ, 250 тыс. пакетов, 1000 соединений, 100 тыс. сообщений | Запись профиля создаётся генератором (`pl-synth profile`), разбор и применение описания — без копирования данных пакетов | `profile_is_deterministic_and_close_to_the_requested_size`, `protoledger bench`; цифры — [limits.md](limits.md) |
| **N3.** Офлайн | Интерфейс встроен в бинарник; внешних шрифтов, CDN, телеметрии и сетевых запросов нет | политика содержимого `default-src 'self'` (`security_headers_on_every_response`) |
| **N4.** Долгие операции: прогресс, отмена, уже полученное доступно | Импорт и прогон — задачи: состояние, поток событий, отмена; остальные запросы продолжают работать | `finished_job_streams_state_and_closes`, `delete_cancels_running_job`, `cancellation_and_progress` |
| **N5.** Ошибки диагностируются, источник не меняется, неизвестное не подменяется | Ошибки — с понятным текстом и причиной; дыры не заполняются; неописанные байты считаются отдельно | `errors_are_problem_details`, `bad_rows_are_reported_not_hidden`, `seq_jump_becomes_a_gap_not_bytes` |
| **N6.** Детерминизм | Стабильные сортировки, без времени выполнения в результатах; повторный запуск даёт тот же вывод | `runs_are_deterministic_and_roundtrip_through_json`, `apply_is_deterministic_and_writes_to_a_file`, `report_is_deterministic_and_goes_to_a_file` |
| **N7.** Заявлены пределы, измерены время и память; превышение явно | Пределы — [limits.md](limits.md); превышение — ошибка с именем предела и значением. Замеры — `protoledger bench` | `file_size_limit`, `frame_limit`, `connection_limit_is_reported_as_problem`, `size_limit_is_enforced_without_leftovers`; замер на Linux x86-64 с 4 vCPU (профиль разбирается за 0,24 с, пик памяти 161 МиБ) — [limits.md](limits.md) |

## Набор организаторов «Термостенд»

Набор восстановлен средствами продукта: подсказки по границам нашли сигнатуру и поле длины, связи с журналом — поля параметров, затем описание проверено на корпусе. Итог — `examples/thermostand/`: описание протокола, 12 эталонов (4 записи исследования и 8 диагностических вариантов), сверяются в CI. Подробности и таблица результатов — в [`examples/thermostand/README.md`](../examples/thermostand/README.md).

## Как повторить проверку руками

```bash
# 1. Применить готовое описание к записи, которой не было при его составлении
protoledger apply --interpretation examples/thermostand/interpretation.yaml \
  --input examples/thermostand/sample_protocol/additional/04_new_observations.pcapng \
  --action-log examples/thermostand/sample_protocol/action_journal.csv \
  --mapping examples/thermostand/mapping.yaml

# 2. Перепроверить перенесённый проект: копии записей целы, прогоны воспроизводятся
protoledger verify /путь/к/проекту.protoledger

# 3. Отчёт по проекту
protoledger report /путь/к/проекту.protoledger --format html --out report.html
```

Коды возврата: `0` — совпало, `1` — есть отличия, `2` — ошибка.
