// Презентация в PDF: docs/presentation/slides.html → docs/presentation.pdf (страница 1920×1080 на слайд).
// Использование (из контейнера Playwright, как e2e/run.sh): node e2e/slides-pdf.mjs
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(pathToFileURL(path.join(root, "docs", "presentation", "slides.html")).href);
await page.waitForLoadState("networkidle");
await page.pdf({ path: path.join(root, "docs", "presentation.pdf"), width: "1920px", height: "1080px", printBackground: true });
// Каждый слайд картинкой — чтобы просмотреть без программы для PDF.
const sections = page.locator("section");
for (let i = 0; i < (await sections.count()); i++) {
  await sections.nth(i).screenshot({ path: path.join(root, "e2e", "out", `slide-${String(i + 1).padStart(2, "0")}.png`), scale: "css" });
}
await browser.close();
console.log("docs/presentation.pdf");
