// Демо-сценарий в браузере на наборе «Термостенд»: те же нажатия, что делает человек, скриншот каждого шага.
// Движок с интерфейсом уже запущен (docker compose up, бинарник или приложение), проект ещё не открыт.
// Использование: node e2e/demo.mjs [адрес] [каталог скриншотов]
//   node e2e/demo.mjs http://127.0.0.1:8080 e2e/out
// Итог — e2e/out/summary.md: шаги, проверки, файлы скриншотов. Код возврата 1, если хоть одна проверка не прошла.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:8080";
const out = path.resolve(process.argv[3] ?? path.join(path.dirname(new URL(import.meta.url).pathname), "out"));
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ru-RU" });
const page = await context.newPage();
const consoleErrors = [];
page.on("pageerror", (e) => consoleErrors.push(String(e)));

const steps = [];
let current = null;
let shot = 0;

async function step(title, body) {
  current = { title, checks: [], shots: [], error: null };
  steps.push(current);
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

async function snap(name) {
  shot += 1;
  const file = `${String(shot).padStart(2, "0")}-${name}.png`;
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, file) });
  current.shots.push(file);
}

// Мягкая проверка: шаг продолжается, итог — в сводке.
async function check(what, locator, timeout = 15_000) {
  const ok = await locator.first().waitFor({ state: "visible", timeout }).then(() => true).catch(() => false);
  current.checks.push({ what, ok });
}

async function go(route) {
  await page.goto(`${base}${route}`);
  await page.waitForLoadState("networkidle");
}

const button = (name) => page.getByRole("button", { name });
const message = (name) => page.locator("nav button").filter({ hasText: name }).first();
const fieldRow = (name) => page.locator("tbody tr").filter({ hasText: name }).first();

async function waitIdle() {
  await page.waitForTimeout(800);
  await page.getByText(/Проверка идёт|Сохраняю|Разбираю записи|Загружаю и проверяю/).first().waitFor({ state: "detached", timeout: 180_000 }).catch(() => {});
  await page.waitForLoadState("networkidle");
}

await step("1. Открыть пример: записи и журнал действий", async () => {
  await go("/");
  await check("стартовый экран", button(/Открыть записи/));
  await snap("старт");
  await button(/Открыть пример/).click();
  await check("записи загружены", button(/Добавить записи/), 180_000);
  await check("11 записей", page.getByText("записи трафика").locator("xpath=..").getByText("11", { exact: true }));
  await check("109 действий в журнале", page.getByText("действий в журнале").locator("xpath=..").getByText("109", { exact: true }));
  await snap("записи");
  await page.locator("tr", { hasText: "07_checksum_offload" }).click();
  await check("замечания к записи", page.getByText("Замечания к записи"));
  await snap("дефекты-захвата");
});

await step("2. Составить описание протокола", async () => {
  await go("/protocol");
  await check("пустое описание", button("Составить описание"));
  await snap("протокол-пусто");
  await button("Составить описание").click();
  await check("границы найдены", page.getByText(/Длина сообщения — поле/), 180_000);
  await check("сигнатура A6 5C", page.getByText(/A6 5C/));
  await check("команды", message("Запрос, команда 0x20"));
  await message("Запрос, команда 0x20").click();
  await snap("протокол");
  await page.getByRole("button", { name: /Заголовок, общий/ }).click();
  await snap("заголовок");
});

await step("3. Проверить описание на всех записях", async () => {
  await button(/Проверить на записях/).click();
  await waitIdle();
  await check("итог проверки", page.getByText(/Последняя проверка: 200 сообщений/), 120_000);
  await message("Запрос, команда 0x20").click();
  await check("порог совпал", fieldRow("threshold").getByText(/совпало в \d+ из \d+/));
  await snap("проверено");
});

await step("4. Дополнительная запись без правки описания", async () => {
  await button("Проверить на ней").click();
  await waitIdle();
  await check("16 из 16", page.getByText(/04_new_observations.pcapng: 16 сообщений, совпало 16, расхождений 0/), 120_000);
  await snap("новая-запись");
});

await step("5. Ошибка исследователя: порог без знака", async () => {
  await message("Запрос, команда 0x20").click();
  await fieldRow("threshold").getByRole("button", { name: "Изменить" }).click();
  await page.getByLabel("Как читать байты").selectOption("u16be");
  await snap("правка-поля");
  await button("Сохранить").click();
  await page.getByText(/Сохранено как версия/).waitFor({ timeout: 30_000 });
  await button(/Проверить на записях/).click();
  await waitIdle();
  await message("Запрос, команда 0x20").click();
  await check("расхождения по порогу", fieldRow("threshold").getByText(/расхождени/), 60_000);
  await snap("расхождения");
});

await step("6. Исправление по подсказке и повторная проверка", async () => {
  await fieldRow("threshold").getByRole("button", { name: "Как исправить" }).click();
  await check("подсказка: число со знаком", page.getByText(/читать как число со знаком/), 60_000);
  await snap("как-исправить");
  await button("Применить и проверить").first().click();
  await waitIdle();
  await message("Запрос, команда 0x20").click();
  await check("порог снова совпадает", fieldRow("threshold").getByText(/совпало в \d+ из \d+/), 60_000);
  await snap("исправлено");
});

await step("7. Проверка: сводка и сравнение с прошлой", async () => {
  await go("/verify");
  await check("сводка", page.getByText("сообщений в наборе"));
  await snap("проверка");
});

await step("8. Отчёт: описание протокола для людей", async () => {
  await go("/report");
  await check("раздел «Описание протокола»", page.getByRole("heading", { name: "Описание протокола" }), 30_000);
  await snap("отчёт");
});

await step("9. Подробно: байты, журнал, сравнение", async () => {
  await go("/overview");
  await page.locator("tbody tr").first().click().catch(() => {});
  const cells = page.getByRole("grid").getByRole("gridcell");
  const from = await cells.nth(0).boundingBox();
  const to = await cells.nth(10).boundingBox();
  if (from && to) {
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
    await page.mouse.up();
  }
  await check("выделено 11 байт", page.getByText("Выделение · 11 байт"));
  await snap("байты");
  await go("/actions");
  await page.locator("tbody tr", { hasText: "set-config" }).filter({ hasText: /threshold_c\D{0,4}19\b/ }).first().click();
  await check("обмен найден", page.getByRole("img", { name: /Окно времени действия/ }), 30_000);
  await snap("журнал");
  await go("/compare");
  await check("связь с журналом", page.getByText("Связь с журналом действий"), 30_000);
  await snap("сравнение");
});

await context.close();
await browser.close();

const failed = steps.filter((s) => s.error || s.checks.some((c) => !c.ok));
const lines = [
  "# Прогон демо в браузере",
  "",
  `Адрес: ${base}. Шагов: ${steps.length}, с ошибками: ${failed.length}.`,
  "",
  "| Шаг | Время | Проверки | Скриншоты |",
  "|---|---|---|---|",
  ...steps.map((s) => `| ${s.title} | ${(s.ms / 1000).toFixed(1)} с | ${[...s.checks.map((c) => `${c.ok ? "да" : "НЕТ"}: ${c.what}`), ...(s.error ? [`ошибка: ${s.error.replaceAll("|", "/")}`] : [])].join("<br>")} | ${s.shots.join("<br>")} |`),
  "",
  consoleErrors.length ? `Ошибки страницы (${consoleErrors.length}):\n\n${consoleErrors.slice(0, 20).map((e) => `- ${e.slice(0, 300)}`).join("\n")}` : "Ошибок на странице нет.",
];
fs.writeFileSync(path.join(out, "summary.md"), lines.join("\n") + "\n");
console.log(`\nИтог: ${path.join(out, "summary.md")}`);
process.exit(failed.length ? 1 : 0);
