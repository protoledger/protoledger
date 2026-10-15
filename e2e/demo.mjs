// Демо-сценарий в браузере на наборе «Термостенд»: те же нажатия, что делает человек, скриншот каждого шага.
// Движок с интерфейсом уже запущен (docker compose up, бинарник или приложение).
// Использование: node e2e/demo.mjs [адрес] [каталог скриншотов]
//   node e2e/demo.mjs http://127.0.0.1:8080 e2e/out
// Итог — e2e/out/summary.md: шаги, проверки, файлы скриншотов. Код возврата 1, если хоть одна проверка не прошла.
// DEMO_VIDEO=1 — ещё и запись экрана e2e/out/demo.webm: медленнее, с подписью шага поверх интерфейса.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = process.argv[2] ?? "http://127.0.0.1:8080";
const out = path.resolve(process.argv[3] ?? path.join(root, "e2e", "out"));
const sample = path.join(root, "examples", "thermostand", "sample_protocol");
const correct = fs.readFileSync(path.join(root, "examples", "thermostand", "interpretation.yaml"), "utf8");
// Ошибка исследователя из демо: порог прочитан как беззнаковый.
const mistaken = correct.replaceAll(/(name: threshold_centi_c, at: \d+, type: )i16be/g, "$1u16be");

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const video = process.env.DEMO_VIDEO === "1";
const viewport = { width: 1440, height: 900 };
const browser = await chromium.launch({ slowMo: video ? 120 : 0 });
const context = await browser.newContext({
  viewport,
  locale: "ru-RU",
  ...(video ? { recordVideo: { dir: out, size: viewport } } : {}),
});
const page = await context.newPage();
let caption = "";

// Подпись шага для записи экрана; на скриншотах её нет.
async function showCaption() {
  if (!video || !caption) return;
  await page.evaluate((t) => {
    let el = document.getElementById("demo-caption");
    if (!el) {
      el = document.createElement("div");
      el.id = "demo-caption";
      el.style.cssText =
        "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99999;padding:10px 18px;" +
        "background:rgba(20,20,24,.92);color:#fff;font:600 18px/1.3 system-ui,sans-serif;border-radius:6px;" +
        "pointer-events:none;max-width:80vw;text-align:center";
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, caption);
}
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("pageerror", (e) => consoleErrors.push(String(e)));

const steps = [];
let current = null;
let shot = 0;

async function step(title, body) {
  current = { title, checks: [], shots: [], error: null };
  steps.push(current);
  caption = title;
  await showCaption().catch(() => {});
  const started = Date.now();
  try {
    await body();
  } catch (e) {
    current.error = String(e?.message ?? e).split("\n")[0];
    await snap("ошибка").catch(() => {});
  }
  current.ms = Date.now() - started;
  console.log(`${current.error || current.checks.some((c) => !c.ok) ? "ОШИБКА" : "ок    "} ${title}`);
}

// Нижняя панель на скриншотах свёрнута: она одинакова на всех экранах и отнимает место.
// bottom: true — оставить её открытой (на «Проекте» она к месту).
async function snap(name, { bottom = false } = {}) {
  shot += 1;
  const toggle = page.getByRole("region", { name: "Нижнее окно" }).getByRole("button", { name: bottom ? "Развернуть" : "Свернуть" });
  if (await toggle.count()) await toggle.click();
  const file = `${String(shot).padStart(2, "0")}-${name}.png`;
  await page.waitForTimeout(300);
  const hide = (v) => document.getElementById("demo-caption")?.style.setProperty("visibility", v);
  await page.evaluate(hide, "hidden").catch(() => {});
  await page.screenshot({ path: path.join(out, file) });
  await page.evaluate(hide, "visible").catch(() => {});
  current.shots.push(file);
  // В записи экрана зрителю нужно время рассмотреть шаг.
  if (video) await page.waitForTimeout(1800);
}

// Мягкая проверка: шаг продолжается, итог — в сводке.
async function check(what, locator, timeout = 15_000) {
  const ok = await locator
    .first()
    .waitFor({ state: "visible", timeout })
    .then(() => true)
    .catch(() => false);
  current.checks.push({ what, ok });
}

async function go(route) {
  await page.goto(`${base}${route}`);
  await page.waitForLoadState("networkidle");
  await showCaption();
}

const text = (t) => page.getByText(t, { exact: false });

async function importCapture(rel) {
  await page.locator('input[type="file"][accept=".pcap,.pcapng"]').setInputFiles(path.join(sample, rel));
  const name = path.basename(rel);
  await page.locator("tr", { hasText: name }).getByText("готово").waitFor({ timeout: 60_000 });
}

async function saveInterpretation(yaml) {
  await go("/interpretation");
  const yamlMode = page.getByRole("radio", { name: "YAML" });
  if (await yamlMode.count()) await yamlMode.click();
  const area = page.getByLabel("Текст интерпретации, YAML");
  await area.fill(yaml);
  await page.getByTitle("Сохранить ревизией (Ctrl+S)").click();
  await page.waitForLoadState("networkidle");
}

async function run(only) {
  await go("/verify");
  if (only) {
    await page.getByRole("button", { name: "Корпус…" }).click();
    await page.getByRole("button", { name: `Только ${only}` }).click();
    await page.getByRole("button", { name: "Запустить на корпусе" }).click();
  } else {
    await page.locator("button.pl-btn-primary", { hasText: /Запустить|Проверить/ }).first().click();
  }
  await page.waitForTimeout(500);
  await page.waitForLoadState("networkidle");
  await page.getByText(/сообщени/i).first().waitFor({ timeout: 60_000 });
}

await step("1. Создать проект", async () => {
  await go("/");
  await page.locator("#project-path").fill("thermostand.protoledger");
  await snap("стартовый-экран");
  await page.getByRole("button", { name: "Создать новый" }).click();
  // Папка проектов уже с прошлого прогона — тогда новый проект рядом.
  if (await page.getByRole("alert").isVisible().catch(() => false)) {
    await page.locator("#project-path").fill(`thermostand-${Date.now()}.protoledger`);
    await page.getByRole("button", { name: "Создать новый" }).click();
  }
  await check("экран проекта открыт", page.getByRole("button", { name: "+ Импорт записей" }));
  await snap("пустой-проект");
});

await step("2. Импорт записей и журнала действий", async () => {
  for (const f of ["01_configuration.pcap", "02_variations.pcapng", "03_combined_messages.pcap"]) {
    await importCapture(`research/${f}`);
  }
  for (const f of fs.readdirSync(path.join(sample, "diagnostics")).sort()) {
    await importCapture(`diagnostics/${f}`);
  }
  await check("11 записей готовы", page.locator("tr", { hasText: "08_bad_checksum" }).getByText("готово"));
  await snap("записи");
  await page.locator('input[type="file"][accept=".csv,.tsv,.txt"]').setInputFiles(path.join(sample, "action_journal.csv"));
  await check("колонки журнала угаданы", page.locator("#al-time"));
  await snap("журнал-сопоставление");
  await page.getByRole("button", { name: "Импортировать" }).click();
  await check("журнал разобран", text("разобрано действий"));
  await snap("журнал-разобран");
  // У диалога два «Закрыть»: крестик и кнопка внизу — нажимаем кнопку, как человек.
  await page.getByRole("dialog").getByRole("button", { name: "Закрыть", exact: true }).last().click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await check("журнал сопоставлен", text("сопоставлено"));
  // Замечания к записи с дефектами захвата.
  await page.locator("tr", { hasText: "07_checksum_offload" }).click();
  await check("замечания к записи", text("Замечания к записи"));
  await snap("диагностика-записи", { bottom: true });
});

await step("3. Соединение и собранный поток", async () => {
  await go("/overview");
  await page.locator("tbody tr").first().click();
  await check("поток показан", page.getByRole("radiogroup", { name: "Направление" }));
  // Первое сообщение потока — 11 байт: справа видно, из какого оно кадра и смещения.
  // Протяжка мышью, как у человека (двойной Shift в интерфейсе открывает поиск).
  const cells = page.getByRole("grid").getByRole("gridcell");
  const from = await cells.nth(0).boundingBox();
  const to = await cells.nth(10).boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await page.mouse.up();
  await check("выделено 11 байт", page.getByText("Выделение · 11 байт"));
  await snap("поток");
});

await step("4. Границы сообщений", async () => {
  await go("/bounds");
  await check("первый кандидат — u16 BE @2 +8", page.locator("tr", { hasText: "u16 BE" }).filter({ hasText: "+8" }), 30_000);
  await check("сигнатура A6 5C", text("A6 5C"));
  await snap("границы");
  await page.getByRole("button", { name: "Применить как фрейминг" }).click();
  await check("фрейминг сохранён ревизией", page.getByText(/интерпретация\s*rev 1/i));
  await snap("фрейминг-применён");
});

await step("5. Обмен для действия set-config", async () => {
  await go("/actions");
  const row = page.locator("tbody tr", { hasText: "set-config" }).filter({ hasText: /threshold_c\D{0,4}19\b/ }).first();
  await row.click();
  await check("обмен найден", page.getByRole("img", { name: /Окно времени действия/ }), 30_000);
  // Порог 19 °C = 1900 = 07 6C в запросе.
  await check("в запросе 07 6C", page.locator("text=07").locator("xpath=following-sibling::*[1][normalize-space()='6C']"));
  await snap("обмен");
});

await step("6. Сравнение примеров", async () => {
  await go("/compare");
  const select = page.getByLabel("Действие журнала для сравнения");
  if (await select.count()) {
    const option = await select.locator("option", { hasText: "set-config" }).first().getAttribute("value");
    if (option !== null) await select.selectOption(option);
  }
  await page.waitForLoadState("networkidle");
  await check("кнопка «наблюдение»", page.getByRole("button", { name: "Выделение → наблюдение" }), 30_000);
  await check("сообщения рядом без ошибки", page.getByText(/Нужен фрейминг|Сначала нужны границы/), 1_000).then(() => {
    const last = current.checks.at(-1);
    last.ok = !last.ok;
    last.what = "нет просьбы о фрейминге";
  });
  await snap("сравнение");
});

await step("7. Описание с ошибкой: порог u16", async () => {
  await saveInterpretation(mistaken);
  await check("ревизия сохранена", text("ревизия"));
  await snap("описание");
});

await step("8. Проверка на корпусе", async () => {
  await run();
  await check("200 сообщений в наборе", page.getByText("сообщений в наборе").locator("xpath=..").getByText("200", { exact: true }), 30_000);
  await check("H6 опровергнута", page.locator("tr", { hasText: "H6" }).getByText(/опровергнута/));
  await check("H12 опровергнута", page.locator("tr", { hasText: "H12" }).getByText(/опровергнута/));
  await snap("проверка");
  await go("/hypotheses");
  await check("гипотезы", text("H6"));
  await snap("гипотезы");
});

await step("9. Дополнительная запись без правки описания", async () => {
  await go("/project");
  await importCapture("additional/04_new_observations.pcapng");
  await run("04_new_observations.pcapng");
  await check("16 сообщений в наборе", page.getByText("сообщений в наборе").locator("xpath=..").getByText("16", { exact: true }), 30_000);
  await check("H6 опровергнута на новой записи", page.locator("tr", { hasText: "H6" }).getByText(/опровергнута/));
  await snap("доп-запись");
});

await step("10. Уточнение: порог i16, повторная проверка", async () => {
  await saveInterpretation(correct);
  await run();
  await check("216 сообщений в наборе", page.getByText("сообщений в наборе").locator("xpath=..").getByText("216", { exact: true }), 30_000);
  await check("0 контрпримеров", page.getByText("контрпримеров", { exact: true }).locator("xpath=..").getByText("0", { exact: true }));
  await snap("проверка-после-уточнения");
});

await step("11. Отчёт", async () => {
  await go("/report");
  await check("отчёт собран", page.getByRole("button", { name: "Скачать HTML" }), 30_000);
  await snap("отчёт");
  await page.mouse.wheel(0, 1600);
  await snap("отчёт-гипотезы");
});

const recording = page.video();
await context.close();
await browser.close();
if (recording) fs.renameSync(await recording.path(), path.join(out, "demo.webm"));

const failed = steps.filter((s) => s.error || s.checks.some((c) => !c.ok));
const lines = [
  `# Прогон демо в браузере`,
  "",
  `Адрес: ${base}. Шагов: ${steps.length}, с ошибками: ${failed.length}.`,
  "",
  "| Шаг | Время | Проверки | Скриншоты |",
  "|---|---|---|---|",
  ...steps.map(
    (s) =>
      `| ${s.title} | ${(s.ms / 1000).toFixed(1)} с | ${[
        ...s.checks.map((c) => `${c.ok ? "да" : "НЕТ"}: ${c.what}`),
        ...(s.error ? [`ошибка: ${s.error.replaceAll("|", "/")}`] : []),
      ].join("<br>")} | ${s.shots.join("<br>")} |`,
  ),
  "",
  consoleErrors.length ? `Ошибки консоли браузера (${consoleErrors.length}):\n\n${consoleErrors.slice(0, 20).map((e) => `- ${e.slice(0, 300)}`).join("\n")}` : "Ошибок в консоли браузера нет.",
];
fs.writeFileSync(path.join(out, "summary.md"), lines.join("\n") + "\n");
console.log(`\nИтог: ${path.join(out, "summary.md")}`);
process.exit(failed.length ? 1 : 0);
