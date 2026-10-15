// Собирает проект examples/thermostand/project заново через API движка — тем же путём, что интерфейс.
// По пути проверяет шаги исследования: если движок перестал находить то, на чём оно строится
// (границы, обмен по действию, связи с журналом, контрпримеры, подсказка типа), сборка падает.
// Использование (из корня репозитория):  node examples/thermostand/build-project.mjs <путь к protoledger>
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const bin = path.resolve(process.argv[2] ?? "protoledger");
const out = path.join(here, "project");
const sample = path.join(here, "sample_protocol");
const port = 18473;
const base = `http://127.0.0.1:${port}`;

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const server = spawn(bin, ["serve", "--workspace", out, "--port", String(port)], { stdio: "ignore" });
const stop = () => server.kill();
process.on("exit", stop);

async function waitHealth() {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("движок не запустился");
}

let token = "";
async function api(method, url, body) {
  const response = await fetch(`${base}/api${url}`, {
    method,
    headers: { "X-Protoledger-Token": token, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${url}: ${response.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

async function job(started) {
  for (;;) {
    const state = await api("GET", `/jobs/${started.jobId}`);
    if (state.state === "succeeded") return state.result;
    if (state.state !== "running" && state.state !== "queued") {
      throw new Error(`задача ${started.jobId}: ${JSON.stringify(state.error)}`);
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}

const expect = (ok, what) => {
  if (!ok) throw new Error(`проверка не прошла: ${what}`);
};

const importCapture = async (rel) =>
  (await job(await api("POST", "/sources", { path: path.join(sample, rel) }))).sourceSha256;

await waitHealth();
token = /name="protoledger-token" content="([^"]+)"/.exec(await (await fetch(base)).text())[1];

await api("POST", "/project", { path: "thermostand.protoledger", mode: "create" });

// 1. Записи исследования и диагностические варианты, журнал действий.
const research = ["01_configuration.pcap", "02_variations.pcapng", "03_combined_messages.pcap"];
const shas = {};
for (const name of research) shas[name] = await importCapture(`research/${name}`);
for (const name of fs.readdirSync(path.join(sample, "diagnostics")).sort()) {
  await importCapture(`diagnostics/${name}`);
}
await api("POST", "/action-logs", {
  path: path.join(sample, "action_journal.csv"),
  mapping: {
    time: "start_utc",
    action: "action",
    params: "parameters",
    result: "observed_result",
    paramsFormat: "json",
    resultFormat: "json",
    source: "capture",
  },
});

// Границы сообщений находятся по одним байтам, без описания.
const source = shas["01_configuration.pcap"];
const connection = (await api("GET", `/connections?source=${source}&limit=1`)).items[0];
const stream = connection.streams[0].id;
const requests = [];
for (const name of research) {
  const c = (await api("GET", `/connections?source=${shas[name]}&limit=1`)).items[0];
  requests.push(c.streams[0].id);
}
const hints = await api("POST", "/analysis/framing", {
  streams: connection.streams.map((x) => x.id),
});
const candidate = hints.length[0];
expect(
  candidate?.at === 2 && candidate.width === 2 && candidate.bigEndian && candidate.adjust === 8,
  "границы: первый кандидат — длина u16 BE по смещению 2, поправка 8",
);
expect(candidate.scorePermille === 1000 && !candidate.firstCounterexample, "границы: без контрпримеров");
expect(
  hints.signatures.some((x) => x.bytes.startsWith("a65c")),
  "границы: сигнатура A6 5C",
);
const columns = await api("POST", "/analysis/variability", { streams: requests, framing: candidate.framing });
expect(columns.regions[0]?.kind === "constant" && columns.regions[0].bytes.startsWith("a65c"), "изменчивость: постоянное начало A6 5C");

// Обмен по действию из журнала: запрос и ответ в окне времени действия.
const logId = (await api("GET", "/action-logs")).items[0].id;
const actions = (await api("GET", `/action-logs/${logId}/actions?limit=200`)).items;
const withThreshold = actions.find((a) => a.params && "threshold_c" in a.params);
expect(withThreshold, "журнал: есть действие с порогом");
const exchange = await api("GET", `/action-logs/${logId}/actions/${withThreshold.line}/exchange`);
expect(exchange.frames.length >= 2, "обмен по действию: найдены кадры запроса и ответа");

// 2. Первое описание — с ошибкой исследователя: порог считается беззнаковым.
const correct = fs.readFileSync(path.join(here, "interpretation.yaml"), "utf8");
const mistaken = correct.replaceAll(
  /(name: threshold_centi_c, at: \d+, type: )i16be/g,
  "$1u16be",
);
if (mistaken === correct) throw new Error("в описании не найдено поле порога");
await api("PUT", "/interpretation", { yaml: mistaken });
await job(await api("POST", "/runs", {}));

// Ошибка ловится на данных: тест гипотезы опровергнут, подсказка называет верный тип.
const firstRun = await api("GET", "/runs/run-0001");
expect(
  firstRun.hypotheses.find((h) => h.id === "H6")?.verdict === "refuted",
  "run-0001: гипотеза H6 опровергнута",
);
expect(firstRun.summary.messages === 200, "run-0001: 200 сообщений");
const typeHint = await api("POST", "/interpretation/field-hints", {
  messageId: "set_config_req",
  field: "threshold_centi_c",
});
expect(typeHint.suggested === "i16be", "подсказка типа: u16be → i16be");
const links = await api("POST", "/analysis/correlations", { streams: requests, messageId: "set_config_req" });
expect(
  links.values.some((v) => v.param === "params.period_ms" && v.scale === 1),
  "связи: период из журнала найден в байтах",
);
expect(
  links.values.some((v) => v.param === "params.threshold_c" && v.scale === 100),
  "связи: порог из журнала найден в байтах в сотых долях",
);

// 3. Наблюдения на байтах первой записи: адреса берутся из предпросмотра, а не вписаны руками.
const preview = await api("POST", "/interpretation/preview", { stream, limit: 200 });
const first = preview.items[0];
const setConfig = preview.items.find((m) => m.messageId === "set_config_req");
const field = (message, name) => message.fields.find((f) => f.name === name);
const anchor = (f) => ({ source, stream, start: f.at, end: f.at + f.len });
const observe = async (f, comment) => (await api("POST", "/observations", { anchor: anchor(f), comment })).id;

const signature = await observe(
  field(first, "signature"),
  "Каждое сообщение начинается с A6 5C: сигнатура найдена подсказкой «Границы» на всех началах сообщений.",
);
const length = await observe(
  field(first, "length"),
  "u16, старший байт первым: длина тела. Размер сообщения = значение + 8 — вариант поля длины без расхождений.",
);
const threshold = await observe(
  field(setConfig, "threshold_centi_c"),
  "Два байта запроса set-config меняются вместе с порогом из журнала действий: значение равно порогу в сотых долях °C.",
);

// 4. Гипотезы и вопросы исследователя.
const unsigned = await api("POST", "/hypotheses", {
  statement: "Порог — беззнаковое 16-битное число в сотых долях °C",
  basis: [threshold],
  test: "threshold_centi_c >= 0",
});
const question = await api("POST", "/questions", { text: "Порог знаковый или беззнаковый?" });
await api("POST", "/questions", {
  text: "Есть ли у устройства команды кроме 0x10, 0x20 и 0x30? В записях другие коды встречаются только в контрольной отправке клиента, устройство отвечает статусом 1.",
});

// 5. Дополнительная запись: то же описание без ручной правки, прогон только по ней.
shas.additional = await importCapture("additional/04_new_observations.pcapng");
await job(await api("POST", "/runs", { corpus: { sources: [shas.additional] } }));
const second = await api("GET", "/runs/run-0002");
expect(
  second.summary.messages === 16 && second.summary.counts.matched === 16,
  "run-0002: новая запись разобрана без правки описания, 16 из 16",
);
expect(
  second.hypotheses.find((h) => h.id === "H6")?.verdict === "refuted",
  "run-0002: H6 опровергнута на новой записи",
);

// 6. Уточнение: порог знаковый. Новая ревизия, прогон по всему корпусу.
await api("PUT", `/hypotheses/${unsigned.id}`, {
  status: "refuted",
  note: "В записях есть отрицательные пороги (−2,5 и −10 °C). При беззнаковом чтении они давали 65286 и 64536 и расходились с журналом: расхождения предположения H6 в проверках run-0001 и run-0002.",
});
await api("POST", "/hypotheses", {
  statement: "Порог — знаковое 16-битное число в сотых долях °C",
  basis: [threshold, signature, length],
  test: "threshold_centi_c == dec(action.params.threshold_c, 2)",
  status: "supported",
  note: "Проверена на всех записях набора, включая дополнительную; это не доказательство для значений вне наблюдавшегося диапазона.",
});
await api("PUT", `/questions/${question.id}`, {
  status: "closed",
  answer: "Знаковый (i16): отрицательные пороги из журнала совпадают с байтами только при знаковом чтении.",
});
await api("PUT", "/interpretation", { yaml: correct });
await job(await api("POST", "/runs", {}));

// Уточнение видно в сравнении прогонов, прежний прогон помечен устаревшим.
const third = await api("GET", "/runs/run-0003");
expect(third.summary.messages === 216 && third.summary.counterexamples === 0, "run-0003: 216 сообщений без контрпримеров");
const diff = await api("GET", "/runs/diff?a=run-0001&b=run-0003");
expect(
  diff.hypotheses.some((h) => h.id === "H6" && h.kind === "fixed"),
  "сравнение прогонов: H6 исправлена",
);
expect(diff.staleA === true && diff.staleB === false, "устаревание: run-0001 устарел, run-0003 актуален");
const text = (await api("POST", "/reports", { format: "md" })).content;
expect(text.includes("run-0003") && text.includes("Открытые вопросы"), "отчёт собран по последнему прогону");

stop();
await new Promise((r) => server.once("exit", r));

// 7. Отчёт — командой, как его получит другой инженер.
const project = path.join(out, "thermostand.protoledger");
for (const format of ["md", "html"]) {
  execFileSync(bin, ["report", project, "--format", format, "--out", path.join(out, `report.${format}`)]);
}
fs.rmSync(path.join(project, ".cache"), { recursive: true, force: true });
console.log(`проект собран: ${path.relative(process.cwd(), project)}`);
