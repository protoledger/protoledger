#!/usr/bin/env bash
# Сверка эталонов: protoledger apply на каждой записи примеров совпадает с expected/.
# Использование: examples/check.sh <команда protoledger>
#   examples/check.sh protoledger
#   examples/check.sh docker run --rm -v "$PWD/examples:/examples:ro" app:ci   (пути внутри — /examples)
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
[ $# -gt 0 ] || { echo "укажите команду protoledger" >&2; exit 2; }
run=("$@")
# В контейнере каталог примеров смонтирован в /examples, у локального бинарника — текущий каталог.
root="."
case " $* " in *" docker "*) root="/examples" ;; esac

# пример | эталон | запись | журнал | сопоставление колонок
cases=(
  "stand|apply-main|main.pcapng|main.actions.csv|mapping.yaml"
  "stand|apply-extra|extra.pcapng|extra.actions.csv|mapping.yaml"
  "modbus|apply-session|session.pcap|actions.csv|mapping.yaml"
  "thermostand|apply-01_configuration|sample_protocol/research/01_configuration.pcap|sample_protocol/action_journal.csv|mapping.yaml"
  "thermostand|apply-02_variations|sample_protocol/research/02_variations.pcapng|sample_protocol/action_journal.csv|mapping.yaml"
  "thermostand|apply-03_combined_messages|sample_protocol/research/03_combined_messages.pcap|sample_protocol/action_journal.csv|mapping.yaml"
  "thermostand|apply-04_new_observations|sample_protocol/additional/04_new_observations.pcapng|sample_protocol/action_journal.csv|mapping.yaml"
  "thermostand|apply-diag-01_retransmission|sample_protocol/diagnostics/01_retransmission.pcap|sample_protocol/action_journal.csv|mapping.yaml"
  "thermostand|apply-diag-02_reordered|sample_protocol/diagnostics/02_reordered.pcapng|sample_protocol/action_journal.csv|mapping.yaml"
  "thermostand|apply-diag-03_missing_segment|sample_protocol/diagnostics/03_missing_segment.pcap|sample_protocol/action_journal.csv|mapping.yaml"
  "thermostand|apply-diag-04_snaplen_truncated|sample_protocol/diagnostics/04_snaplen_truncated.pcapng|sample_protocol/action_journal.csv|mapping.yaml"
  "thermostand|apply-diag-05_conflicting_overlap|sample_protocol/diagnostics/05_conflicting_overlap.pcap|sample_protocol/action_journal.csv|mapping.yaml"
  "thermostand|apply-diag-06_missing_beginning|sample_protocol/diagnostics/06_missing_beginning.pcapng|sample_protocol/action_journal.csv|mapping.yaml"
  "thermostand|apply-diag-07_checksum_offload|sample_protocol/diagnostics/07_checksum_offload.pcap|sample_protocol/action_journal.csv|mapping.yaml"
  "thermostand|apply-diag-08_bad_checksum|sample_protocol/diagnostics/08_bad_checksum.pcapng|sample_protocol/action_journal.csv|mapping.yaml"
)

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
failed=0
for c in "${cases[@]}"; do
  IFS='|' read -r ex name input log mapping <<<"$c"
  d="$root/$ex"
  "${run[@]}" apply --interpretation "$d/interpretation.yaml" --input "$d/$input" \
    --action-log "$d/$log" --mapping "$d/$mapping" >"$tmp/$name.json" 2>"$tmp/$name.err" || true
  if diff -q "$tmp/$name.json" "$ex/expected/$name.json" >/dev/null; then
    echo "совпало: $ex/$name"
  else
    echo "ОТЛИЧИЕ: $ex/$name"
    head -c 2000 "$tmp/$name.err" >&2 || true
    diff <(tr ',' '\n' <"$ex/expected/$name.json") <(tr ',' '\n' <"$tmp/$name.json") | head -20 || true
    failed=1
  fi
done
exit "$failed"
