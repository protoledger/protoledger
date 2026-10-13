#!/usr/bin/env bash
# Диссектор Wireshark для «Термостенда»: файл совпадает с выгрузкой из описания,
# а tshark с ним видит те же сообщения и значения полей, что и protoledger apply.
# Использование: examples/thermostand/wireshark-check.sh <бинарник protoledger>
# Нужны tshark и jq.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
bin="${1:?укажите бинарник protoledger}"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

"$bin" export --interpretation interpretation.yaml --name thermostand --out "$tmp/thermostand.lua" 2>/dev/null
diff "$tmp/thermostand.lua" thermostand.lua || {
  echo "thermostand.lua устарел: protoledger export --interpretation interpretation.yaml --name thermostand --out thermostand.lua" >&2
  exit 1
}

# Значения одного поля диссектора во всех кадрах записи, по одному в строке.
shown() {
  tshark -X lua_script:thermostand.lua -r "sample_protocol/$1" -Y thermostand \
    -T fields -E occurrence=a -E aggregator=, -e "$2" 2>"$tmp/tshark.err" |
    tr ',' '\n' | sed '/^$/d' | sort
}

# запись | эталон apply
cases=(
  "research/01_configuration.pcap|apply-01_configuration"
  "research/02_variations.pcapng|apply-02_variations"
  "research/03_combined_messages.pcap|apply-03_combined_messages"
  "additional/04_new_observations.pcapng|apply-04_new_observations"
)

failed=0
compare() {
  if diff "$tmp/seen" "$tmp/expected" >"$tmp/diff"; then
    echo "совпало: $1 — $2 ($(wc -l <"$tmp/seen"))"
  else
    echo "ОТЛИЧИЕ: $1 — $2"
    head -20 "$tmp/diff"
    head -c 2000 "$tmp/tshark.err" >&2 || true
    failed=1
  fi
}

for c in "${cases[@]}"; do
  IFS='|' read -r capture name <<<"$c"
  result="expected/$name.json"

  shown "$capture" thermostand.message >"$tmp/seen"
  jq -r '.inputs[].streams[].messages[].messageId // empty' "$result" | sort >"$tmp/expected"
  compare "$name" "типы сообщений"

  # Знаковое поле: порог бывает отрицательным.
  shown "$capture" thermostand.set_config_req.threshold_centi_c >"$tmp/seen"
  jq -r '.inputs[].streams[].messages[] | select(.messageId == "set_config_req")
    | .fields[] | select(.name == "threshold_centi_c") | .value' "$result" | sort >"$tmp/expected"
  compare "$name" "порог в запросах"

  # Поле повторяющейся группы: температура каждого измерения.
  shown "$capture" thermostand.values_resp.measurements.temperature_centi_c >"$tmp/seen"
  jq -r '.inputs[].streams[].messages[] | select(.messageId == "values_resp")
    | .fields[] | select(.name | test("^measurements\\.[0-9]+\\.temperature_centi_c$")) | .value' "$result" |
    sort >"$tmp/expected"
  compare "$name" "температуры измерений"
done
exit "$failed"
